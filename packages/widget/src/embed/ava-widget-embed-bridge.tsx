"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSignedOutSnapshot,
  normalizeHostSessionSnapshot,
  resolveDefaultApiBaseUrl,
  resolveDefaultWidgetUrl
} from "../session";
import type { HostSessionSnapshot, WidgetMessagePayload } from "../types";

const DEFAULT_CLOSED_IFRAME_SIZE_PX = 150;
const DEFAULT_OPEN_IFRAME_WIDTH_PX = 480;
const DEFAULT_OPEN_IFRAME_HEIGHT_PX = 800;
const DEFAULT_HOST_SESSION_POLL_INTERVAL_MS = 30000;
const DEFAULT_WIDGET_URL = "https://ava.aveyo.com/embed";

interface LegacyAvaSessionData {
  email?: string;
  userId?: string;
  id?: string;
  name?: string;
  role?: string;
  userType?: string;
  avatarUrl?: string | null;
  customData?: {
    role?: string;
    userType?: string;
  };
}

interface AvaAuthWindowApi {
  setSession: (sessionData: LegacyAvaSessionData) => void;
  clearSession: () => void;
  getSession: () => HostSessionSnapshot | null;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

export interface AvaWidgetEmbedBridgeProps {
  widgetUrl?: string;
  hostSessionSnapshot?: HostSessionSnapshot | null;
  fetchHostSessionSnapshot?: () => Promise<HostSessionSnapshot | null>;
  sessionPollIntervalMs?: number;
  registerGlobalApi?: boolean;
  iframeTitle?: string;
  closedIframeSizePx?: number;
  openIframeWidthPx?: number;
  openIframeHeightPx?: number;
}

function normalizeLegacySession(value: LegacyAvaSessionData): HostSessionSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const userIdRaw =
    typeof value.userId === "string"
      ? value.userId
      : typeof value.id === "string"
        ? value.id
        : "";
  const userId = userIdRaw.trim() || email;
  if (!userId && !email) {
    return null;
  }

  const roleFromCustomData =
    value.customData && typeof value.customData.role === "string"
      ? value.customData.role
      : undefined;
  const userTypeFromCustomData =
    value.customData && typeof value.customData.userType === "string"
      ? value.customData.userType
      : undefined;

  const normalized = normalizeHostSessionSnapshot({
    authenticated: true,
    role: value.role ?? roleFromCustomData ?? "customer",
    userType: value.userType ?? userTypeFromCustomData ?? "customer",
    user: {
      id: userId || "customer-session",
      email: email || null,
      name: typeof value.name === "string" && value.name.trim() ? value.name : email || "Customer",
      avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null
    }
  });
  return normalized;
}

export function AvaWidgetEmbedBridge({
  widgetUrl,
  hostSessionSnapshot,
  fetchHostSessionSnapshot,
  sessionPollIntervalMs = DEFAULT_HOST_SESSION_POLL_INTERVAL_MS,
  registerGlobalApi = false,
  iframeTitle = "Ava support chat",
  closedIframeSizePx = DEFAULT_CLOSED_IFRAME_SIZE_PX,
  openIframeWidthPx = DEFAULT_OPEN_IFRAME_WIDTH_PX,
  openIframeHeightPx = DEFAULT_OPEN_IFRAME_HEIGHT_PX
}: AvaWidgetEmbedBridgeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [resolvedWidgetUrl, setResolvedWidgetUrl] = useState(widgetUrl ?? DEFAULT_WIDGET_URL);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [polledHostSessionSnapshot, setPolledHostSessionSnapshot] = useState<HostSessionSnapshot | null>(
    null
  );
  const [overriddenHostSessionSnapshot, setOverriddenHostSessionSnapshot] =
    useState<HostSessionSnapshot | null>(null);
  const [desiredOpenState, setDesiredOpenState] = useState<boolean | null>(null);

  useEffect(() => {
    setResolvedWidgetUrl(widgetUrl ?? resolveDefaultWidgetUrl());
  }, [widgetUrl]);

  useEffect(() => {
    setIframeLoaded(false);
  }, [resolvedWidgetUrl]);

  const widgetOrigin = useMemo(() => {
    try {
      return new URL(resolvedWidgetUrl).origin;
    } catch {
      return "";
    }
  }, [resolvedWidgetUrl]);

  const effectiveHostSessionSnapshot =
    hostSessionSnapshot ?? overriddenHostSessionSnapshot ?? polledHostSessionSnapshot;

  const postAuthSessionSnapshot = useCallback(() => {
    if (
      !widgetOrigin ||
      !iframeLoaded ||
      !effectiveHostSessionSnapshot ||
      !iframeRef.current?.contentWindow
    ) {
      return;
    }

    iframeRef.current.contentWindow.postMessage(
      {
        source: "aveyo-host",
        type: "auth-session-snapshot",
        payload: effectiveHostSessionSnapshot
      },
      widgetOrigin
    );
  }, [widgetOrigin, iframeLoaded, effectiveHostSessionSnapshot]);

  const postOpenStateCommand = useCallback(
    (open: boolean) => {
      if (!widgetOrigin || !iframeRef.current?.contentWindow) {
        return;
      }
      iframeRef.current.contentWindow.postMessage(
        {
          source: "aveyo-host",
          type: "set-open-state",
          open
        },
        widgetOrigin
      );
    },
    [widgetOrigin]
  );

  useEffect(() => {
    if (desiredOpenState === null) {
      return;
    }
    if (!iframeLoaded) {
      return;
    }
    postOpenStateCommand(desiredOpenState);
  }, [desiredOpenState, iframeLoaded, postOpenStateCommand]);

  useEffect(() => {
    if (hostSessionSnapshot) {
      return;
    }

    let cancelled = false;
    const defaultApiBaseUrl = resolveDefaultApiBaseUrl();

    const loadHostSessionSnapshot = async () => {
      try {
        if (fetchHostSessionSnapshot) {
          const snapshot = await fetchHostSessionSnapshot();
          if (!cancelled) {
            setPolledHostSessionSnapshot(snapshot);
          }
          return;
        }

        if (!defaultApiBaseUrl) {
          return;
        }

        const response = await fetch(`${defaultApiBaseUrl}/api/auth/session`, {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) {
          return;
        }

        const normalized = normalizeHostSessionSnapshot(payload);
        if (normalized) {
          setPolledHostSessionSnapshot(normalized);
          return;
        }

        if (response.status === 401) {
          setPolledHostSessionSnapshot(createSignedOutSnapshot());
        }
      } catch {
        // No-op: iframe can still resolve auth on its own.
      }
    };

    void loadHostSessionSnapshot();
    const intervalId = window.setInterval(() => {
      void loadHostSessionSnapshot();
    }, sessionPollIntervalMs);

    const onFocus = () => {
      void loadHostSessionSnapshot();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [hostSessionSnapshot, fetchHostSessionSnapshot, sessionPollIntervalMs]);

  useEffect(() => {
    postAuthSessionSnapshot();
  }, [postAuthSessionSnapshot]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!widgetOrigin || event.origin !== widgetOrigin) {
        return;
      }

      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (!event.data || typeof event.data !== "object") {
        return;
      }

      const payload = event.data as WidgetMessagePayload;
      if (payload.source !== "ava-widget") {
        return;
      }

      if (payload.type === "open-state") {
        setIsWidgetOpen(Boolean(payload.open));
        return;
      }

      if (payload.type === "request-auth-session") {
        postAuthSessionSnapshot();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postAuthSessionSnapshot, widgetOrigin]);

  useEffect(() => {
    if (!registerGlobalApi) {
      return;
    }

    const windowWithAvaAuth = window as Window & { AvaAuth?: AvaAuthWindowApi };
    const previousApi = windowWithAvaAuth.AvaAuth;
    windowWithAvaAuth.AvaAuth = {
      setSession: (sessionData: LegacyAvaSessionData) => {
        const normalized = normalizeLegacySession(sessionData);
        if (!normalized) {
          return;
        }
        setOverriddenHostSessionSnapshot(normalized);
      },
      clearSession: () => {
        setOverriddenHostSessionSnapshot(createSignedOutSnapshot());
      },
      getSession: () => effectiveHostSessionSnapshot ?? null,
      open: () => {
        setDesiredOpenState(true);
        postOpenStateCommand(true);
      },
      close: () => {
        setDesiredOpenState(false);
        postOpenStateCommand(false);
      },
      isOpen: () => isWidgetOpen
    };

    return () => {
      windowWithAvaAuth.AvaAuth = previousApi;
    };
  }, [registerGlobalApi, effectiveHostSessionSnapshot, postOpenStateCommand, isWidgetOpen]);

  const iframeStyle: CSSProperties = {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: isWidgetOpen
      ? `min(${openIframeWidthPx}px, calc(100vw - 24px))`
      : `${closedIframeSizePx}px`,
    height: isWidgetOpen
      ? `min(${openIframeHeightPx}px, calc(100vh - 24px))`
      : `${closedIframeSizePx}px`,
    border: 0,
    zIndex: 2147483000,
    background: "transparent"
  };

  return (
    <iframe
      ref={iframeRef}
      src={resolvedWidgetUrl}
      title={iframeTitle}
      loading="lazy"
      onLoad={() => setIframeLoaded(true)}
      referrerPolicy="strict-origin-when-cross-origin"
      style={iframeStyle}
    />
  );
}
