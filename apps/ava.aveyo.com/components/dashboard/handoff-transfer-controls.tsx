"use client";

import { useMemo, useState } from "react";
import {
  acceptHandoffTransferApi,
  cancelHandoffTransferApi,
  declineHandoffTransferApi,
  getTransferTargetsApi,
  requestHandoffTransferApi,
  type TransferCandidate
} from "@/lib/dashboard-api";
import { type Ticket } from "@/lib/dashboard-types";
import { HandoffTransferPanel } from "./handoff-transfer-panel";

interface HandoffTransferControlsProps {
  requestId: string;
  currentAgentId: string | null;
  pendingTransfer?: Ticket["transferRequest"];
  canRequestTransfer: boolean;
  onAfterMutation?: (message: string) => Promise<void> | void;
}

function HandoffButtonIcon() {
  return (
    <span className="workspace-handoff-button-icon" aria-hidden="true">
      <svg viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.25 6.5H12.35M12.35 6.5L8.95 3.1M12.35 6.5L8.95 9.9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function HandoffTransferControls({
  requestId,
  currentAgentId,
  pendingTransfer,
  canRequestTransfer,
  onAfterMutation
}: HandoffTransferControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targets, setTargets] = useState<TransferCandidate[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedTargetAgentId, setSelectedTargetAgentId] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const isRequester = Boolean(
    pendingTransfer && currentAgentId && pendingTransfer.requestedBy.id === currentAgentId
  );
  const isTarget = Boolean(pendingTransfer && currentAgentId && pendingTransfer.target.id === currentAgentId);
  const canShowButton = canRequestTransfer || isRequester || isTarget;

  const buttonAriaLabel = useMemo(() => {
    if (isTarget) {
      return "Review handoff request";
    }
    if (isRequester) {
      return "Review pending handoff";
    }
    return "Request handoff";
  }, [isRequester, isTarget]);

  const loadTargets = async () => {
    if (targetsLoading) {
      return;
    }

    setTargetsLoading(true);
    setTargetsError(null);
    try {
      const result = await getTransferTargetsApi();
      setTargets(result.agents);
    } catch (error) {
      setTargetsError(error instanceof Error ? error.message : "Unable to load support agents.");
    } finally {
      setTargetsLoading(false);
    }
  };

  const openPanel = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !pendingTransfer && targets.length === 0) {
      await loadTargets();
    }
  };

  const handleAfterMutation = async (message: string) => {
    setIsOpen(false);
    setTargetsError(null);
    setSelectedTargetAgentId("");
    await onAfterMutation?.(message);
  };

  const handleRequest = async () => {
    if (!selectedTargetAgentId || actionPending) {
      return;
    }

    setActionPending(true);
    try {
      const result = await requestHandoffTransferApi({
        requestId,
        targetAgentId: selectedTargetAgentId
      });
      await handleAfterMutation(`Handoff request sent to ${result.targetAgent.name}.`);
    } catch (error) {
      setTargetsError(error instanceof Error ? error.message : "Unable to request handoff.");
    } finally {
      setActionPending(false);
    }
  };

  const handleAccept = async () => {
    if (!pendingTransfer || actionPending) {
      return;
    }

    setActionPending(true);
    try {
      await acceptHandoffTransferApi({
        transferRequestId: pendingTransfer.id
      });
      await handleAfterMutation("Handoff accepted. This chat is now assigned to you.");
    } catch (error) {
      setTargetsError(error instanceof Error ? error.message : "Unable to accept handoff.");
    } finally {
      setActionPending(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingTransfer || actionPending) {
      return;
    }

    setActionPending(true);
    try {
      await declineHandoffTransferApi({
        transferRequestId: pendingTransfer.id
      });
      await handleAfterMutation("Handoff request declined.");
    } catch (error) {
      setTargetsError(error instanceof Error ? error.message : "Unable to decline handoff.");
    } finally {
      setActionPending(false);
    }
  };

  const handleCancel = async () => {
    if (!pendingTransfer || actionPending) {
      return;
    }

    setActionPending(true);
    try {
      await cancelHandoffTransferApi({
        transferRequestId: pendingTransfer.id
      });
      await handleAfterMutation("Handoff request cancelled.");
    } catch (error) {
      setTargetsError(error instanceof Error ? error.message : "Unable to cancel handoff.");
    } finally {
      setActionPending(false);
    }
  };

  if (!canShowButton) {
    return null;
  }

  return (
    <div className="handoff-transfer-controls">
      <button
        type="button"
        className={`workspace-handoff-button${isTarget ? " is-target" : ""}${
          isRequester ? " is-pending" : ""
        }`}
        onClick={() => {
          void openPanel();
        }}
        disabled={actionPending}
        aria-label={buttonAriaLabel}
        aria-expanded={isOpen}
      >
        <span>Handoff</span>
        <HandoffButtonIcon />
      </button>

      {isOpen ? (
        <div className="workspace-transfer-panel-wrap">
          <HandoffTransferPanel
            currentAgentId={currentAgentId}
            pendingTransfer={pendingTransfer}
            targets={targets}
            targetsLoading={targetsLoading}
            targetsError={targetsError}
            selectedTargetAgentId={selectedTargetAgentId}
            actionPending={actionPending}
            onSelectedTargetChange={setSelectedTargetAgentId}
            onRequest={() => {
              void handleRequest();
            }}
            onAccept={() => {
              void handleAccept();
            }}
            onDecline={() => {
              void handleDecline();
            }}
            onCancel={() => {
              void handleCancel();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
