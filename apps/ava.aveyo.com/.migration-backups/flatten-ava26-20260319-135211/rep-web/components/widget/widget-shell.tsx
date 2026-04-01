"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  createImpersonationConversationApi,
  createConversationApi,
  createCustomerMessageApi,
  getConversationApi,
  getRealtimeEventsApi,
  listImpersonationCustomersApi,
  listConversationsApi,
  type ImpersonationCustomer,
  requestHandoffApi
} from "@/lib/widget-api";
import {
  appendMessage,
  createSystemStatusMessage,
  createTestModeConversation,
  createLoggedOutConversation,
  createStarterConversation,
  normalizeMessageDraft
} from "@/lib/widget-state";
import { LauncherButton } from "./launcher-button";
import { WidgetComposer } from "./widget-composer";
import { WidgetTestMode } from "./widget-test-mode";
import { WidgetTimeline } from "./widget-timeline";

interface ActiveImpersonation {
  projectRef: string;
  label: string;
}

export function WidgetShell({ embedMode = false }: { embedMode?: boolean }) {
  const authSession = useAuthSession();
  const starterConversation = useMemo(() => createStarterConversation(), []);
  const loggedOutConversation = useMemo(() => createLoggedOutConversation(), []);
  const testModeConversation = useMemo(() => createTestModeConversation(), []);
  const [thread, setThread] = useState<ConversationThread>(starterConversation);
  const [conversationReady, setConversationReady] = useState(false);
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [testModeSearchQuery, setTestModeSearchQuery] = useState("");
  const [impersonationCustomers, setImpersonationCustomers] = useState<ImpersonationCustomer[]>([]);
  const [selectedImpersonationProjectRef, setSelectedImpersonationProjectRef] = useState("");
  const [activeImpersonation, setActiveImpersonation] = useState<ActiveImpersonation | null>(null);
  const [testModeBusy, setTestModeBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isPanelMounted, setIsPanelMounted] = useState(true);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

  const canUseTestMode =
    authSession.authenticated &&
    (authSession.role === "support_agent" || authSession.role === "super_admin");
  const activeThread = authSession.authenticated ? thread : loggedOutConversation;
  const hasActiveImpersonation = activeImpersonation !== null;

  const toImpersonationLabel = (customer: ImpersonationCustomer) =>
    customer.email || customer.customerName || customer.customerId || customer.projectRef;

  const loadImpersonationCustomers = async (query?: string) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await listImpersonationCustomersApi(query, 25);
      setImpersonationCustomers(result.customers);
      setSelectedImpersonationProjectRef((current) => {
        if (current && result.customers.some((customer) => customer.projectRef === current)) {
          return current;
        }
        return "";
      });
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to load impersonation customers."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const beginImpersonation = async (projectRef: string) => {
    if (!canUseTestMode || !isTestModeEnabled || !projectRef || testModeBusy) {
      return;
    }

    const selectedCustomer = impersonationCustomers.find(
      (customer) => customer.projectRef === projectRef
    );
    if (!selectedCustomer) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await createImpersonationConversationApi({
        projectRef: selectedCustomer.projectRef,
        customerName: selectedCustomer.customerName ?? undefined,
        customerEmail: selectedCustomer.email ?? undefined
      });

      const label = toImpersonationLabel(selectedCustomer);
      const statusMessage = createSystemStatusMessage(
        result.conversation.id,
        `Impersonating ${label}`
      );
      setThread(appendMessage(result.conversation, statusMessage));
      setActiveImpersonation({
        projectRef: selectedCustomer.projectRef,
        label
      });
      setConversationReady(true);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
      setDraft("");
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to start impersonation."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const cancelImpersonation = () => {
    setActiveImpersonation(null);
    setConversationReady(false);
    setShowRequestModal(false);
    setRequestReason("");
    setThread((current) => {
      if (!isTestModeEnabled || current.id === testModeConversation.id) {
        return testModeConversation;
      }
      return appendMessage(
        current,
        createSystemStatusMessage(current.id, "Impersonation cancelled")
      );
    });
  };

  const setTestMode = (enabled: boolean) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setIsTestModeEnabled(enabled);
    setShowRequestModal(false);
    setRequestReason("");
    setDraft("");
    setRequestError(null);

    if (!enabled) {
      setActiveImpersonation(null);
      setConversationReady(false);
      setThread(testModeConversation);
      return;
    }

    setConversationReady(false);
    setThread(testModeConversation);
    void loadImpersonationCustomers(testModeSearchQuery);
  };

  const sendDraft = async () => {
    if (
      !authSession.authenticated ||
      !conversationReady ||
      isSubmitting ||
      testModeBusy ||
      (canUseTestMode && !isTestModeEnabled)
    ) {
      return;
    }

    const messageText = normalizeMessageDraft(draft);
    if (!messageText) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCustomerMessageApi({
        conversationId: thread.id,
        text: messageText
      });

      setThread((current) => appendMessage(current, result.message));
      setDraft("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to send message right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitHandoffRequest = async () => {
    if (
      !authSession.authenticated ||
      !conversationReady ||
      isSubmitting ||
      !isTestModeEnabled
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestHandoffApi({
        conversationId: thread.id,
        customerName: authSession.user?.name ?? "Customer",
        reason: requestReason.trim() || undefined
      });

      setThread(result.thread);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to request handoff right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    realtimeCursorRef.current = undefined;

    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setConversationReady(false);
      setThread(loggedOutConversation);
      setIsTestModeEnabled(false);
      setImpersonationCustomers([]);
      setSelectedImpersonationProjectRef("");
      setActiveImpersonation(null);
      setTestModeSearchQuery("");
      setTestModeBusy(false);
      return;
    }

    if (canUseTestMode) {
      if (!isTestModeEnabled) {
        setConversationReady(false);
        setThread(testModeConversation);
      } else if (!hasActiveImpersonation) {
        setConversationReady(false);
      }
      return;
    }

    let cancelled = false;
    const loadConversation = async () => {
      try {
        setRequestError(null);
        const listResult = await listConversationsApi();
        const latestConversation =
          listResult.conversations.length > 0 ? listResult.conversations[0] : null;

        const conversation =
          latestConversation ??
          (
            await createConversationApi({
              greetingText: authSession.user?.name
                ? `Hi, ${authSession.user.name}! How can I help you today?`
                : "Hi! How can I help you today?"
            })
          ).conversation;

        if (cancelled) {
          return;
        }

        setThread(conversation);
        setConversationReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setConversationReady(false);
        setRequestError(
          error instanceof Error ? error.message : "Unable to load your conversation."
        );
      }
    };

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [
    authSession.loading,
    authSession.authenticated,
    authSession.user?.id,
    authSession.user?.name,
    loggedOutConversation,
    canUseTestMode,
    isTestModeEnabled,
    hasActiveImpersonation,
    testModeConversation
  ]);

  useEffect(() => {
    if (canUseTestMode) {
      return;
    }

    setIsTestModeEnabled(false);
    setActiveImpersonation(null);
    setImpersonationCustomers([]);
    setSelectedImpersonationProjectRef("");
    setTestModeSearchQuery("");
    setTestModeBusy(false);
  }, [canUseTestMode]);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      return;
    }

    let cancelled = false;
    const conversationId = thread.id;

    const syncRealtime = async () => {
      if (realtimeBusyRef.current) {
        return;
      }

      realtimeBusyRef.current = true;
      try {
        const result = await getRealtimeEventsApi(realtimeCursorRef.current);
        if (cancelled) {
          return;
        }

        realtimeCursorRef.current = result.cursor;
        const hasConversationUpdate = result.events.some(
          (event) => event.conversationId === conversationId
        );

        if (!hasConversationUpdate) {
          return;
        }

        const refreshed = await getConversationApi(conversationId);
        if (cancelled) {
          return;
        }
        setThread(refreshed.conversation);
      } catch {
        // No-op: polling should continue and recover on next interval.
      } finally {
        realtimeBusyRef.current = false;
      }
    };

    void syncRealtime();
    const intervalId = window.setInterval(() => {
      void syncRealtime();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authSession.authenticated, conversationReady, thread.id]);

  const openPanel = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    requestAnimationFrame(() => {
      setIsPanelVisible(true);
      setIsOpen(true);
    });
  };

  const closePanel = () => {
    setIsPanelVisible(false);
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 240);
  };

  const togglePanel = () => {
    if (embedMode) {
      return;
    }
    if (isOpen) {
      closePanel();
      return;
    }
    openPanel();
  };

  const composerDisabled =
    authSession.loading ||
    !authSession.authenticated ||
    !conversationReady ||
    isSubmitting ||
    testModeBusy;

  const testModeOptions = impersonationCustomers.map((customer) => ({
    projectRef: customer.projectRef,
    label: customer.projectStatus
      ? `${toImpersonationLabel(customer)} - ${customer.projectRef} (${customer.projectStatus})`
      : `${toImpersonationLabel(customer)} - ${customer.projectRef}`
  }));

  const iframeEmbedSnippet = `<iframe
  src="https://ava.aveyo.com/ava"
  title="Ava support chat"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  style="position:fixed;right:24px;bottom:24px;width:440px;height:760px;border:0;z-index:2147483000;"
></iframe>`;

  return (
    <div className="host-surface">
      <div className="floating-widget">
        {isPanelMounted ? (
          <section
            className={`widget-panel ${isPanelVisible ? "is-open" : "is-closed"}`}
            aria-hidden={!isPanelVisible}
          >
            {canUseTestMode && isTestModeEnabled ? (
              <WidgetTestMode
                searchQuery={testModeSearchQuery}
                onSearchQueryChange={setTestModeSearchQuery}
                onSearch={() => {
                  void loadImpersonationCustomers(testModeSearchQuery);
                }}
                options={testModeOptions}
                selectedProjectRef={selectedImpersonationProjectRef}
                onSelectProjectRef={(projectRef) => {
                  setSelectedImpersonationProjectRef(projectRef);
                  if (!projectRef) {
                    cancelImpersonation();
                    return;
                  }
                  void beginImpersonation(projectRef);
                }}
                activeImpersonationLabel={activeImpersonation?.label}
                onCancelImpersonation={cancelImpersonation}
                disabled={!authSession.authenticated}
                busy={testModeBusy || isSubmitting}
              />
            ) : null}

            <WidgetTimeline
              thread={activeThread}
              showRequestModal={showRequestModal}
              requestReason={requestReason}
              onRequestReasonChange={setRequestReason}
              onCancelRequest={() => setShowRequestModal(false)}
              onSubmitRequest={() => {
                void submitHandoffRequest();
              }}
            />

            <WidgetComposer
              disabled={composerDisabled}
              showTalkToRep={isTestModeEnabled}
              showTestModeToggle={canUseTestMode}
              testModeEnabled={isTestModeEnabled}
              testModeToggleDisabled={
                authSession.loading ||
                !authSession.authenticated ||
                testModeBusy ||
                isSubmitting
              }
              draft={draft}
              onDraftChange={setDraft}
              onSendDraft={() => {
                void sendDraft();
              }}
              onTestModeChange={setTestMode}
              onOpenRequestModal={() => {
                if (!composerDisabled && isTestModeEnabled) {
                  setShowRequestModal(true);
                }
              }}
            />
          </section>
        ) : null}

        {!embedMode ? <LauncherButton isOpen={isOpen} onToggle={togglePanel} /> : null}
      </div>

      {!embedMode ? (
        <div className="embed-note">
          <p className="embed-note-title">Embedding instructions</p>
          <ol className="embed-note-steps">
            <li>
              Host URL: <code>https://ava.aveyo.com/ava</code>.
            </li>
            <li>
              Keep auth cookies scoped to `.aveyo.com` so logged-in sessions are shared with the
              embed.
            </li>
            <li>Paste this iframe snippet on the host page where you want the launcher to appear.</li>
          </ol>
          <pre className="embed-note-code">
            <code>{iframeEmbedSnippet}</code>
          </pre>
          <p className="embed-note-footnote">
            Local testing URL: <code>http://localhost:3001/ava</code>
          </p>
          {requestError ? (
            <p className="embed-note-error">{requestError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
