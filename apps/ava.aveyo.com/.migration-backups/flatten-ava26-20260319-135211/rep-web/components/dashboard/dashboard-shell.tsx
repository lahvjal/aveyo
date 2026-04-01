"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
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
  resolveHandoffApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import { AppSideRail } from "@/components/app-side-rail";
import { ChatColumn } from "./chat-column";
import { DetailColumn } from "./detail-column";
import { QueueColumn } from "./queue-column";

function getInitials(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "AG";
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "AG";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function DashboardShell() {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);

  const [isOnline, setIsOnline] = useState(true);
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [conversationMap, setConversationMap] = useState<Record<string, ConversationThread>>({});
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeNote, setComposeNote] = useState("");
  const [sidebarNote, setSidebarNote] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

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
  const agentInitials = getInitials(authSession.user?.name);
  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;

  const refreshDashboardData = useCallback(
    async (options?: { preferredConversationId?: string }) => {
      const [queueResult, conversationResult] = await Promise.all([
        listQueueApi(),
        listConversationsApi()
      ]);

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
      } catch {
        if (!cancelled) {
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
        if (result.events.length === 0) {
          return;
        }

        await refreshDashboardData({
          preferredConversationId: activeRecord?.conversationId ?? conversation.id
        });
      } catch {
        // No-op: next interval retry.
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
    refreshDashboardData
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
    } catch {
      // No-op for now; polling refresh keeps state eventually consistent.
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
    } catch {
      // No-op for now; polling refresh keeps state eventually consistent.
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

    try {
      const result = await createRepresentativeMessageApi({
        conversationId: targetConversationId,
        text: messageText,
        representativeId: authSession.user.id
      });

      setConversation((current) => appendTimelineMessage(current, result.message));
      setComposeNote("");
    } catch {
      // No-op: polling will reconcile state.
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
    } catch {
      // No-op: note refresh on conversation change/realtime keeps dashboard consistent.
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
    <div className="rep-shell">
      <AppSideRail
        activeRoute="dashboard"
        userName={authSession.user?.name}
        userAvatarUrl={agentAvatarUrl}
        signOutPending={signOutPending}
        onSignOut={() => {
          void signOutAgent();
        }}
      />

      <QueueColumn
        isOnline={isOnline}
        activeTicket={activeTicket}
        pendingQueue={pendingQueue}
        onToggleOnline={() => setIsOnline((state) => !state)}
        onResolveChat={resolveChat}
        onClaimChat={claimChat}
      />

      <ChatColumn
        conversation={conversation}
        activeTicket={activeTicket}
        isEmptyState={isChatEmptyState}
        composeNote={composeNote}
        agentInitials={agentInitials}
        agentAvatarUrl={agentAvatarUrl}
        onComposeNoteChange={setComposeNote}
        onSendMessage={sendRepMessage}
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
  );
}
