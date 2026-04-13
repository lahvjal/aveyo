"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import { PLATFORM_UTILITY_NAV_ITEMS } from "@packages/ui/src/platform-nav";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import {
  type PlatformSideNavLinkRendererProps,
  type PlatformUtilityNavItem
} from "@packages/ui/src/shell/types";
import {
  appendTimelineMessage,
  createEmptyConversation,
  createTicketFromQueueRecord,
  mapConversationCustomerDetailsToPanelData,
  mapSupportAgentNoteToHistoryNote,
  normalizeDraft
} from "@/lib/dashboard-state";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { useSupportPresence } from "@/lib/use-support-presence";
import {
  claimHandoffApi,
  createRepresentativeMessageApi,
  createSupportNoteApi,
  getConversationCustomerDetailsApi,
  getConversationApi,
  getRealtimeEventsApi,
  listConversationsApi,
  listQueueApi,
  listSupportNotesApi,
  publishRepresentativeTypingApi,
  resolveHandoffApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { useAvaReplySuggestion } from "@/lib/dashboard-ava-suggestion";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { ChatColumn } from "./chat-column";
import { DetailColumn } from "./detail-column";
import { QueueColumn } from "./queue-column";

const sideNavUtilityItems: PlatformUtilityNavItem[] = PLATFORM_UTILITY_NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon
}));

function renderSideNavLink({
  key,
  href,
  className,
  title,
  ariaLabel,
  children
}: PlatformSideNavLinkRendererProps) {
  if (href.startsWith("/")) {
    return (
      <Link key={key} href={href} className={className} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <a key={key} href={href} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function getInitials(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "AV";
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "AV";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function toRoleLabel(role: string | null | undefined) {
  if (role === "super_admin") {
    return "Platform Admin";
  }
  if (role === "support_agent") {
    return "Support Agent";
  }
  if (role === "customer") {
    return "Customer";
  }
  return "Support Agent";
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DashboardShell() {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);

  const { isOnline, syncing: presenceSyncing, toggleOnline } = useSupportPresence(authSession);
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [conversationMap, setConversationMap] = useState<Record<string, ConversationThread>>({});
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeNote, setComposeNote] = useState("");
  const [sidebarNote, setSidebarNote] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);
  const representativeTypingSentRef = useRef(false);
  const representativeTypingConversationRef = useRef<string | null>(null);
  const representativeTypingLastSentAtMsRef = useRef(0);

  const activeRecord = useMemo(() => {
    const selected = activeRequestId
      ? queueRecords.find((item) => item.requestId === activeRequestId)
      : undefined;

    if (selected?.status === "active") {
      return selected;
    }

    return queueRecords.find((item) => item.status === "active") ?? null;
  }, [activeRequestId, queueRecords]);

  const pendingRecords = useMemo(
    () => queueRecords.filter((item) => item.status === "pending"),
    [queueRecords]
  );

  const activeTicket = useMemo<Ticket | null>(() => {
    if (!activeRecord) {
      return null;
    }
    return createTicketFromQueueRecord(
      activeRecord,
      conversationMap[activeRecord.conversationId]
    );
  }, [activeRecord, conversationMap]);

  const pendingQueue = useMemo(
    () =>
      pendingRecords.map((record) =>
        createTicketFromQueueRecord(record, conversationMap[record.conversationId])
      ),
    [conversationMap, pendingRecords]
  );
  const isChatEmptyState = conversation.id === seededConversation.id;
  const hasActiveChat = Boolean(activeTicket);
  const hasPendingChats = pendingQueue.length > 0;
  const composerConversationId =
    activeRecord?.conversationId ??
    (conversation.id !== seededConversation.id ? conversation.id : null);
  const agentInitials = getInitials(authSession.user?.name);
  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const shellHintMessage = useMemo(() => {
    if (operationError || hasActiveChat) {
      return null;
    }

    if (!isOnline) {
      return "You're offline. Go online to receive and claim incoming chat requests.";
    }

    if (hasPendingChats) {
      const pendingLabel = pendingQueue.length === 1 ? "request" : "requests";
      return `${pendingQueue.length} pending ${pendingLabel} waiting. Claim one to start messaging.`;
    }

    return "No active conversations right now. New requests will appear in the pending queue.";
  }, [hasActiveChat, hasPendingChats, isOnline, operationError, pendingQueue.length]);
  const avaSuggestion = useAvaReplySuggestion({
    conversation,
    conversationId: composerConversationId,
    enabled:
      authSession.authenticated &&
      Boolean(composerConversationId) &&
      !isChatEmptyState &&
      hasActiveChat
  });

  const refreshDashboardData = useCallback(
    async (options?: { preferredConversationId?: string }) => {
      const [queueResult, conversationResult] = await Promise.all([
        listQueueApi(),
        listConversationsApi()
      ]);
      setOperationError(null);

      const visibleQueue = queueResult.queue.filter(
        (record) => record.status !== "resolved"
      );
      setQueueRecords(visibleQueue);

      const conversationEntries = conversationResult.conversations.map((item) => [
        item.id,
        item
      ]);
      const nextConversationMap = Object.fromEntries(conversationEntries) as Record<
        string,
        ConversationThread
      >;
      setConversationMap(nextConversationMap);

      const selectedActiveRequest =
        activeRequestId &&
        visibleQueue.some(
          (record) =>
            record.requestId === activeRequestId && record.status === "active"
        )
          ? activeRequestId
          : (visibleQueue.find((record) => record.status === "active")?.requestId ?? null);
      setActiveRequestId(selectedActiveRequest);

      const preferredConversationId =
        options?.preferredConversationId ??
        visibleQueue.find((record) => record.requestId === selectedActiveRequest)?.conversationId ??
        visibleQueue.find((record) => record.status === "pending")?.conversationId;

      if (!preferredConversationId) {
        setConversation(seededConversation);
        return;
      }

      const fromList = nextConversationMap[preferredConversationId];
      if (fromList) {
        setConversation(fromList);
        return;
      }

      const fetchedConversation = await getConversationApi(preferredConversationId);
      setConversation(fetchedConversation.conversation);
      setConversationMap((current) => ({
        ...current,
        [fetchedConversation.conversation.id]: fetchedConversation.conversation
      }));
    },
    [activeRequestId, seededConversation]
  );
  const handleToggleOnline = useCallback(async () => {
    try {
      await toggleOnline();
      setOperationError(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Unable to update online status."
      );
    }
  }, [toggleOnline]);

  const publishRepresentativeTyping = useCallback(
    (conversationId: string, isTyping: boolean, force = false) => {
      if (!authSession.authenticated || !authSession.user) {
        return;
      }

      const sameConversation = representativeTypingConversationRef.current === conversationId;
      const nowMs = Date.now();
      const underHeartbeatWindow =
        sameConversation && nowMs - representativeTypingLastSentAtMsRef.current < 2500;
      if (!force && isTyping && representativeTypingSentRef.current && underHeartbeatWindow) {
        return;
      }
      if (
        !force &&
        !isTyping &&
        (!representativeTypingSentRef.current || !sameConversation)
      ) {
        return;
      }

      representativeTypingConversationRef.current = conversationId;
      representativeTypingSentRef.current = isTyping;
      representativeTypingLastSentAtMsRef.current = nowMs;

      void publishRepresentativeTypingApi({ conversationId, isTyping }).catch(() => null);
    },
    [authSession.authenticated, authSession.user]
  );

  useEffect(() => {
    realtimeCursorRef.current = undefined;

    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setQueueRecords([]);
      setConversationMap({});
      setActiveRequestId(null);
      setConversation(seededConversation);
      setHistoryNotes([]);
      setCustomerDetails(null);
      setCustomerDetailsLoading(false);
      return;
    }

    let cancelled = false;
    const loadDashboard = async () => {
      try {
        await refreshDashboardData();
      } catch (error) {
        if (!cancelled) {
          setOperationError(
            error instanceof Error ? error.message : "Unable to load dashboard data."
          );
          setQueueRecords([]);
          setConversationMap({});
          setActiveRequestId(null);
          setConversation(seededConversation);
          setHistoryNotes([]);
          setCustomerDetails(null);
          setCustomerDetailsLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [
    authSession.loading,
    authSession.authenticated,
    authSession.user?.id,
    refreshDashboardData,
    seededConversation
  ]);

  useEffect(() => {
    return () => {
      const conversationId = representativeTypingConversationRef.current;
      if (!conversationId || !representativeTypingSentRef.current) {
        return;
      }
      void publishRepresentativeTypingApi({ conversationId, isTyping: false }).catch(() => null);
    };
  }, []);

  useEffect(() => {
    const previousConversationId = representativeTypingConversationRef.current;
    if (previousConversationId && previousConversationId !== composerConversationId) {
      publishRepresentativeTyping(previousConversationId, false, true);
      representativeTypingSentRef.current = false;
    }

    representativeTypingConversationRef.current = composerConversationId;

    if (!authSession.authenticated || !composerConversationId) {
      if (previousConversationId && representativeTypingSentRef.current) {
        publishRepresentativeTyping(previousConversationId, false, true);
      }
      representativeTypingSentRef.current = false;
      return;
    }

    const hasDraft = Boolean(normalizeDraft(composeNote));
    publishRepresentativeTyping(composerConversationId, hasDraft);
  }, [authSession.authenticated, composerConversationId, composeNote, publishRepresentativeTyping]);

  useEffect(() => {
    if (!authSession.authenticated || !isOnline) {
      return;
    }

    let cancelled = false;
    const pollRealtime = async () => {
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
        if (result.cursorStale) {
          await refreshDashboardData({
            preferredConversationId:
              activeRecord?.conversationId ??
              (conversation.id !== seededConversation.id ? conversation.id : undefined)
          });
          return;
        }
        if (result.events.length === 0) {
          return;
        }

        await refreshDashboardData({
          preferredConversationId:
            activeRecord?.conversationId ??
            (conversation.id !== seededConversation.id ? conversation.id : undefined)
        });
      } catch (error) {
        if (!cancelled) {
          setOperationError(
            error instanceof Error
              ? error.message
              : "Realtime updates are temporarily unavailable."
          );
        }
      } finally {
        realtimeBusyRef.current = false;
      }
    };

    void pollRealtime();
    const intervalId = window.setInterval(() => {
      void pollRealtime();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeRecord?.conversationId,
    authSession.authenticated,
    conversation.id,
    isOnline,
    refreshDashboardData,
    seededConversation.id
  ]);

  useEffect(() => {
    if (!authSession.authenticated || conversation.id === seededConversation.id) {
      setHistoryNotes([]);
      return;
    }

    let cancelled = false;
    setHistoryNotes([]);
    const loadNotes = async () => {
      try {
        const result = await listSupportNotesApi(conversation.id);
        if (cancelled) {
          return;
        }
        setHistoryNotes(result.notes.map(mapSupportAgentNoteToHistoryNote));
      } catch {
        if (!cancelled) {
          setHistoryNotes([]);
        }
      }
    };

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, conversation.id, seededConversation.id]);

  useEffect(() => {
    if (!authSession.authenticated || conversation.id === seededConversation.id) {
      setCustomerDetails(null);
      setCustomerDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerDetailsLoading(true);

    const loadCustomerDetails = async () => {
      try {
        const result = await getConversationCustomerDetailsApi(conversation.id);
        if (cancelled) {
          return;
        }
        setCustomerDetails(mapConversationCustomerDetailsToPanelData(result.details));
      } catch {
        if (!cancelled) {
          setCustomerDetails(null);
        }
      } finally {
        if (!cancelled) {
          setCustomerDetailsLoading(false);
        }
      }
    };

    void loadCustomerDetails();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, conversation.id, seededConversation.id]);

  const claimChat = async (ticketId: string) => {
    if (!authSession.authenticated || !authSession.user) {
      return;
    }

    const queueRecord = queueRecords.find((item) => item.requestId === ticketId);
    if (!queueRecord) {
      return;
    }

    try {
      const result = await claimHandoffApi({
        requestId: queueRecord.requestId,
        representative: {
          id: authSession.user.id,
          name: authSession.user.name,
          avatarUrl: authSession.user.avatarUrl ?? undefined
        }
      });

      setActiveRequestId(result.queue.requestId);
      setConversation(result.thread);
      await refreshDashboardData({ preferredConversationId: result.thread.id });
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to claim this handoff.");
    }
  };

  const resolveChat = async () => {
    if (!authSession.authenticated || !activeRecord) {
      return;
    }

    try {
      const result = await resolveHandoffApi({
        conversationId: activeRecord.conversationId
      });

      setConversation(result.thread);
      await refreshDashboardData({ preferredConversationId: result.thread.id });
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to resolve this handoff.");
    }
  };

  const sendRepMessage = async () => {
    if (!authSession.authenticated || !authSession.user) {
      return;
    }

    const targetConversationId =
      activeRecord?.conversationId ??
      (conversation.id !== seededConversation.id ? conversation.id : undefined);
    if (!targetConversationId) {
      return;
    }

    const messageText = normalizeDraft(composeNote);
    if (!messageText) {
      return;
    }

    publishRepresentativeTyping(targetConversationId, false, true);

    try {
      const result = await createRepresentativeMessageApi({
        conversationId: targetConversationId,
        text: messageText,
        representativeId: authSession.user.id,
        clientMessageId: generateClientMessageId()
      });

      setConversation((current) => appendTimelineMessage(current, result.message));
      setComposeNote("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to send message.");
    }
  };

  const addSidebarNote = async () => {
    if (!authSession.authenticated || conversation.id === seededConversation.id) {
      return;
    }

    const noteBody = normalizeDraft(sidebarNote);
    if (!noteBody) {
      return;
    }

    try {
      const result = await createSupportNoteApi(conversation.id, { body: noteBody });
      setHistoryNotes((current) => [mapSupportAgentNoteToHistoryNote(result.note), ...current]);
      setSidebarNote("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to save support note.");
    }
  };

  const signOutAgent = async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    try {
      if (typeof window !== "undefined") {
        await logoutAuthSession();
        const returnTo = `${window.location.origin}/`;
        window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
        return;
      }
      router.replace("/");
    } finally {
      setSignOutPending(false);
    }
  };

  return (
    <div className={`rep-shell${isNavCollapsed ? " primary-collapsed" : ""}`}>
      <PlatformSideNav
        pathname="/"
        storageKey="ava-primary-nav-collapsed"
        iconPrefix="/images/"
        sameAppHrefByItemId={{
          ava: "/"
        }}
        renderLink={renderSideNavLink}
        isPrimaryItemActive={(itemId) => itemId === "ava"}
        utilityItems={sideNavUtilityItems}
        role={authSession.role}
        userType={authSession.userType}
        onCollapsedChange={setIsNavCollapsed}
        profile={{
          displayName: authSession.user?.name?.trim() || "Ava Agent",
          roleLabel: toRoleLabel(authSession.role),
          avatarUrl: typeof agentAvatarUrl === "string" ? agentAvatarUrl.trim() : "",
          initials: getInitials(authSession.user?.name),
          disabled: signOutPending,
          onClick: () => {
            void signOutAgent();
          }
        }}
      />

      <section className="rep-main-shell">
        <AvaSecondaryNav activeRoute="dashboard" />
        {operationError ? (
          <p className="rep-shell-error" role="alert">
            {operationError}
          </p>
        ) : null}
        {!operationError && shellHintMessage ? (
          <p className="rep-shell-hint" role="status">
            {shellHintMessage}
          </p>
        ) : null}

        <div className="rep-main-columns">
          <QueueColumn
            isOnline={isOnline}
            onlineStatusPending={presenceSyncing}
            activeTicket={activeTicket}
            pendingQueue={pendingQueue}
            onToggleOnline={() => {
              void handleToggleOnline();
            }}
            onResolveChat={resolveChat}
            onClaimChat={claimChat}
          />

          <ChatColumn
            conversation={conversation}
            activeTicket={activeTicket}
            hasActiveChat={hasActiveChat}
            hasPendingChats={hasPendingChats}
            isOnline={isOnline}
            isEmptyState={isChatEmptyState}
            composeNote={composeNote}
            showAvaSuggestion={avaSuggestion.hasPendingCustomerQuestion}
            avaSuggestionText={avaSuggestion.suggestionText}
            avaSuggestionLoading={avaSuggestion.isLoading}
            avaSuggestionError={avaSuggestion.error}
            agentInitials={agentInitials}
            agentAvatarUrl={agentAvatarUrl}
            onComposeNoteChange={setComposeNote}
            onSendMessage={sendRepMessage}
            onUseAvaSuggestion={() => {
              if (!avaSuggestion.suggestionText) {
                return;
              }
              setComposeNote(avaSuggestion.suggestionText);
            }}
            onRefreshAvaSuggestion={avaSuggestion.refreshSuggestion}
          />

          <DetailColumn
            activeTicket={activeTicket}
            customerDetails={customerDetails}
            customerDetailsLoading={customerDetailsLoading}
            sidebarNote={sidebarNote}
            historyNotes={historyNotes}
            onSidebarNoteChange={setSidebarNote}
            onAddSidebarNote={() => {
              void addSidebarNote();
            }}
          />
        </div>
      </section>
    </div>
  );
}
