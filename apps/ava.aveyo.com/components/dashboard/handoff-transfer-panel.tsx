import { type TransferCandidate } from "@/lib/dashboard-api";
import { type Ticket } from "@/lib/dashboard-types";

interface HandoffTransferPanelProps {
  currentAgentId: string | null;
  pendingTransfer?: Ticket["transferRequest"];
  targets: TransferCandidate[];
  targetsLoading?: boolean;
  targetsError?: string | null;
  selectedTargetAgentId: string;
  actionPending?: boolean;
  onSelectedTargetChange: (value: string) => void;
  onRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}

export function HandoffTransferPanel({
  currentAgentId,
  pendingTransfer,
  targets,
  targetsLoading = false,
  targetsError,
  selectedTargetAgentId,
  actionPending = false,
  onSelectedTargetChange,
  onRequest,
  onAccept,
  onDecline,
  onCancel
}: HandoffTransferPanelProps) {
  const isRequester = Boolean(
    pendingTransfer && currentAgentId && pendingTransfer.requestedBy.id === currentAgentId
  );
  const isTarget = Boolean(pendingTransfer && currentAgentId && pendingTransfer.target.id === currentAgentId);
  const requestDisabled =
    actionPending || targetsLoading || !currentAgentId || !selectedTargetAgentId || Boolean(pendingTransfer);

  if (pendingTransfer) {
    return (
      <div className="handoff-transfer-panel">
        <div className="handoff-transfer-panel-copy">
          <strong>Transfer pending</strong>
          <p>
            {pendingTransfer.requestedBy.name} requested a handoff to {pendingTransfer.target.name}.
          </p>
        </div>

        {isTarget ? (
          <div className="handoff-transfer-panel-actions">
            <button
              type="button"
              className="handoff-transfer-button secondary"
              onClick={onDecline}
              disabled={actionPending}
            >
              Decline
            </button>
            <button
              type="button"
              className="handoff-transfer-button primary"
              onClick={onAccept}
              disabled={actionPending}
            >
              Accept
            </button>
          </div>
        ) : isRequester ? (
          <div className="handoff-transfer-panel-actions">
            <button
              type="button"
              className="handoff-transfer-button secondary"
              onClick={onCancel}
              disabled={actionPending}
            >
              Cancel request
            </button>
          </div>
        ) : (
          <p className="handoff-transfer-panel-meta">Waiting for the requested agent to respond.</p>
        )}
      </div>
    );
  }

  return (
    <div className="handoff-transfer-panel">
      <div className="handoff-transfer-panel-copy">
        <strong>Request a handoff</strong>
        <p>Choose the agent who should take over this chat.</p>
      </div>

      <div className="handoff-transfer-picker">
        <select
          value={selectedTargetAgentId}
          onChange={(event) => onSelectedTargetChange(event.target.value)}
          disabled={targetsLoading || actionPending}
        >
          <option value="">Select an agent</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name} ({target.status})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="handoff-transfer-button primary"
          onClick={onRequest}
          disabled={requestDisabled}
        >
          {actionPending ? "Sending..." : "Request handoff"}
        </button>
      </div>

      {targetsError ? <p className="handoff-transfer-panel-error">{targetsError}</p> : null}
      {!targetsError && targetsLoading ? (
        <p className="handoff-transfer-panel-meta">Loading support agents...</p>
      ) : null}
      {!targetsError && !targetsLoading && targets.length === 0 ? (
        <p className="handoff-transfer-panel-meta">No transfer targets are available right now.</p>
      ) : null}
    </div>
  );
}
