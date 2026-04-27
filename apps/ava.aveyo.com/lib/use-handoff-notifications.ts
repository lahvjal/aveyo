"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const OPEN_CONVERSATION_STORAGE_KEY = "ava-open-conversations-v1";
const OPEN_CONVERSATION_TTL_MS = 20_000;
const OPEN_CONVERSATION_HEARTBEAT_MS = 10_000;

type NotificationPermissionState = NotificationPermission | "unsupported";

interface PendingHandoffNotificationTarget {
  requestId: string;
  customerName?: string | null;
}

interface ActiveReplyNotificationTarget {
  requestId: string;
  conversationId: string;
  customerName?: string | null;
  claimedByAuthUserId?: string | null;
  hasUnreadCustomerReply?: boolean;
  lastMessageAt?: string | null;
  transferRequest?: {
    id: string;
    requestedAt: string;
    requestedBy: {
      id: string;
      name: string;
    };
    target: {
      id: string;
      name: string;
    };
  };
}

interface OpenConversationRecord {
  tabId: string;
  conversationId: string;
  updatedAt: number;
}

function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function canSendNotification() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    getNotificationPermissionState() === "granted"
  );
}

function getBrowserTabId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existingId = window.sessionStorage.getItem("ava-browser-tab-id");
  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem("ava-browser-tab-id", nextId);
  return nextId;
}

function pruneOpenConversationRecords(
  records: OpenConversationRecord[],
  nowMs: number = Date.now()
) {
  return records.filter(
    (record) =>
      typeof record.tabId === "string" &&
      record.tabId.length > 0 &&
      typeof record.conversationId === "string" &&
      record.conversationId.length > 0 &&
      typeof record.updatedAt === "number" &&
      nowMs - record.updatedAt <= OPEN_CONVERSATION_TTL_MS
  );
}

function readOpenConversationRecords() {
  if (typeof window === "undefined") {
    return [] as OpenConversationRecord[];
  }

  try {
    const raw = window.localStorage.getItem(OPEN_CONVERSATION_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return pruneOpenConversationRecords(parsed as OpenConversationRecord[]);
  } catch {
    return [];
  }
}

function writeOpenConversationRecords(records: OpenConversationRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const nextRecords = pruneOpenConversationRecords(records);
    if (nextRecords.length === 0) {
      window.localStorage.removeItem(OPEN_CONVERSATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(OPEN_CONVERSATION_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {
    // Storage access can fail in private browsing or locked-down contexts.
  }
}

function setOpenConversationRecord(conversationId: string | null | undefined) {
  const tabId = getBrowserTabId();
  if (typeof window === "undefined" || !tabId) {
    return;
  }

  const records = readOpenConversationRecords().filter((record) => record.tabId !== tabId);
  if (conversationId) {
    records.push({
      tabId,
      conversationId,
      updatedAt: Date.now()
    });
  }
  writeOpenConversationRecords(records);
}

function isConversationOpenInAnotherTab(conversationId: string) {
  const tabId = getBrowserTabId();
  if (!tabId) {
    return false;
  }

  return readOpenConversationRecords().some(
    (record) => record.conversationId === conversationId && record.tabId !== tabId
  );
}

function openHandoffWorkspace(requestId: string, conversationId?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const path = conversationId
    ? `/handoff/${encodeURIComponent(requestId)}?conversationId=${encodeURIComponent(conversationId)}`
    : "/";
  window.open(path, "_blank");
}

export function useOpenConversationRegistration(conversationId?: string | null) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setOpenConversationRecord(conversationId);

    if (!conversationId) {
      return;
    }

    const refreshRegistration = () => {
      setOpenConversationRecord(conversationId);
    };
    const handleBeforeUnload = () => {
      setOpenConversationRecord(null);
    };

    const heartbeatId = window.setInterval(refreshRegistration, OPEN_CONVERSATION_HEARTBEAT_MS);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOpenConversationRecord(null);
    };
  }, [conversationId]);
}

export function useHandoffNotifications() {
  const previousPendingIdsRef = useRef<Set<string>>(new Set());
  const pendingInitializedRef = useRef(false);
  const previousUnreadReplyKeysRef = useRef<Map<string, string>>(new Map());
  const unreadRepliesInitializedRef = useRef(false);
  const previousTransferRequestIdsRef = useRef<Map<string, string>>(new Map());
  const transferRequestsInitializedRef = useRef(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() =>
    getNotificationPermissionState()
  );

  useEffect(() => {
    const refreshPermissionState = () => {
      setPermissionState(getNotificationPermissionState());
    };

    refreshPermissionState();
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("focus", refreshPermissionState);
    document.addEventListener("visibilitychange", refreshPermissionState);

    return () => {
      window.removeEventListener("focus", refreshPermissionState);
      document.removeEventListener("visibilitychange", refreshPermissionState);
    };
  }, []);

  const requestBrowserNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionState("unsupported");
      return "unsupported" as const;
    }

    if (Notification.permission !== "default") {
      setPermissionState(Notification.permission);
      return Notification.permission;
    }

    const nextPermission = await Notification.requestPermission();
    setPermissionState(nextPermission);
    return nextPermission;
  }, []);

  const notifyNewPendingHandoffs = useCallback(
    (pendingHandoffs: PendingHandoffNotificationTarget[]) => {
      const currentIds = new Set(pendingHandoffs.map((handoff) => handoff.requestId));
      const previousIds = previousPendingIdsRef.current;

      if (!pendingInitializedRef.current) {
        pendingInitializedRef.current = true;
        previousPendingIdsRef.current = currentIds;
        return;
      }

      const newHandoffs = pendingHandoffs.filter((handoff) => !previousIds.has(handoff.requestId));
      previousPendingIdsRef.current = currentIds;

      if (newHandoffs.length === 0) {
        return;
      }

      if (!canSendNotification()) {
        return;
      }

      const body =
        newHandoffs.length === 1
          ? `${newHandoffs[0]?.customerName?.trim() || "A customer"} is waiting in the pending queue.`
          : `${newHandoffs.length} new customer handoffs are waiting in the pending queue.`;

      try {
        const notification = new Notification("Ava — New Handoff", {
          body,
          icon: "/images/aveyo-icon.svg",
          tag: "ava-pending-handoff"
        });
        notification.onclick = () => {
          window.focus();
          if (newHandoffs.length === 1) {
            openHandoffWorkspace(newHandoffs[0].requestId);
          }
          notification.close();
        };
      } catch {
        // Notifications may not be supported in some contexts.
      }
    },
    []
  );

  const notifyUnreadActiveReplies = useCallback(
    ({
      activeChats,
      currentAgentId,
      selectedConversationId
    }: {
      activeChats: ActiveReplyNotificationTarget[];
      currentAgentId?: string | null;
      selectedConversationId?: string | null;
    }) => {
      const relevantChats = activeChats.filter((chat) =>
        currentAgentId ? chat.claimedByAuthUserId === currentAgentId : true
      );
      const nextUnreadReplyKeys = new Map<string, string>();

      relevantChats.forEach((chat) => {
        if (!chat.hasUnreadCustomerReply) {
          return;
        }
        const replyKey = chat.lastMessageAt ?? "unread";
        nextUnreadReplyKeys.set(chat.requestId, replyKey);
      });

      const previousUnreadReplyKeys = previousUnreadReplyKeysRef.current;
      if (!unreadRepliesInitializedRef.current) {
        unreadRepliesInitializedRef.current = true;
        previousUnreadReplyKeysRef.current = nextUnreadReplyKeys;
        return;
      }

      previousUnreadReplyKeysRef.current = nextUnreadReplyKeys;

      const chatsToNotify = relevantChats.filter((chat) => {
        const nextReplyKey = nextUnreadReplyKeys.get(chat.requestId);
        if (!nextReplyKey) {
          return false;
        }
        if (previousUnreadReplyKeys.get(chat.requestId) === nextReplyKey) {
          return false;
        }
        if (chat.conversationId === selectedConversationId) {
          return false;
        }
        if (isConversationOpenInAnotherTab(chat.conversationId)) {
          return false;
        }
        return true;
      });

      if (chatsToNotify.length === 0 || !canSendNotification()) {
        return;
      }

      chatsToNotify.forEach((chat) => {
        try {
          const notification = new Notification("Ava — New Customer Message", {
            body: `${chat.customerName?.trim() || "A customer"} sent a new message.`,
            icon: "/images/aveyo-icon.svg",
            tag: `ava-active-reply-${chat.requestId}`
          });
          notification.onclick = () => {
            window.focus();
            openHandoffWorkspace(chat.requestId, chat.conversationId);
            notification.close();
          };
        } catch {
          // Notifications may not be supported in some contexts.
        }
      });
    },
    []
  );

  const notifyTransferRequests = useCallback(
    ({
      activeChats,
      currentAgentId,
      selectedConversationId
    }: {
      activeChats: ActiveReplyNotificationTarget[];
      currentAgentId?: string | null;
      selectedConversationId?: string | null;
    }) => {
      const nextTransferRequestIds = new Map<string, string>();

      activeChats.forEach((chat) => {
        const transferRequest = chat.transferRequest;
        if (!transferRequest || !currentAgentId || transferRequest.target.id !== currentAgentId) {
          return;
        }
        nextTransferRequestIds.set(chat.requestId, transferRequest.id);
      });

      const previousTransferRequestIds = previousTransferRequestIdsRef.current;
      if (!transferRequestsInitializedRef.current) {
        transferRequestsInitializedRef.current = true;
        previousTransferRequestIdsRef.current = nextTransferRequestIds;
        return;
      }

      previousTransferRequestIdsRef.current = nextTransferRequestIds;

      const chatsToNotify = activeChats.filter((chat) => {
        const transferRequest = chat.transferRequest;
        if (!transferRequest || !currentAgentId || transferRequest.target.id !== currentAgentId) {
          return false;
        }
        if (previousTransferRequestIds.get(chat.requestId) === transferRequest.id) {
          return false;
        }
        if (chat.conversationId === selectedConversationId) {
          return false;
        }
        if (isConversationOpenInAnotherTab(chat.conversationId)) {
          return false;
        }
        return true;
      });

      if (chatsToNotify.length === 0 || !canSendNotification()) {
        return;
      }

      chatsToNotify.forEach((chat) => {
        if (!chat.transferRequest) {
          return;
        }

        try {
          const notification = new Notification("Ava — Handoff Request", {
            body: `${chat.transferRequest.requestedBy.name} requested you take over ${
              chat.customerName?.trim() || "this chat"
            }.`,
            icon: "/images/aveyo-icon.svg",
            tag: `ava-transfer-request-${chat.transferRequest.id}`
          });
          notification.onclick = () => {
            window.focus();
            openHandoffWorkspace(chat.requestId, chat.conversationId);
            notification.close();
          };
        } catch {
          // Notifications may not be supported in some contexts.
        }
      });
    },
    []
  );

  return {
    permissionState,
    notificationsSupported: permissionState !== "unsupported",
    requestBrowserNotificationPermission,
    notifyNewPendingHandoffs,
    notifyUnreadActiveReplies,
    notifyTransferRequests
  };
}
