"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SiteLoadingScreen } from "./site-loading-screen";

type OverlayPhase = "visible" | "fading" | "hidden";

export interface AppLoadingOverlayProps {
  routeKey: string;
  minVisibleMs?: number;
  fadeOutMs?: number;
  zIndex?: number;
  skipWhenHashPresent?: boolean;
}

const DEFAULT_Z_INDEX = 2_147_483_647;

function getHashTargetElement(hash: string) {
  const normalizedHash = hash.trim();
  if (!normalizedHash || normalizedHash === "#") {
    return null;
  }

  const rawId = normalizedHash.replace(/^#/, "");
  if (!rawId) {
    return null;
  }

  try {
    const decodedId = decodeURIComponent(rawId);
    return document.getElementById(decodedId);
  } catch {
    return document.getElementById(rawId);
  }
}

export function AppLoadingOverlay({
  routeKey,
  minVisibleMs = 2000,
  fadeOutMs = 3220,
  zIndex = DEFAULT_Z_INDEX,
  skipWhenHashPresent = false
}: AppLoadingOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>("visible");
  const routeSequenceRef = useRef(0);
  const pendingHashRef = useRef("");
  const skipCurrentRouteRef = useRef(false);

  useLayoutEffect(() => {
    routeSequenceRef.current += 1;
    pendingHashRef.current = typeof window === "undefined" ? "" : window.location.hash;
    skipCurrentRouteRef.current = skipWhenHashPresent && pendingHashRef.current.length > 0;
    setPhase(skipCurrentRouteRef.current ? "hidden" : "visible");
  }, [routeKey, skipWhenHashPresent]);

  useEffect(() => {
    if (phase === "hidden") {
      document.documentElement.style.removeProperty("overflow");
      document.body.style.removeProperty("overflow");
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [phase]);

  useEffect(() => {
    if (skipCurrentRouteRef.current) {
      return;
    }

    const currentSequence = routeSequenceRef.current;
    let cancelled = false;
    let fadeTimer: number | null = null;

    const visibleTimer = window.setTimeout(() => {
      if (cancelled || currentSequence !== routeSequenceRef.current) {
        return;
      }

      setPhase("fading");
      fadeTimer = window.setTimeout(() => {
        if (!cancelled && currentSequence === routeSequenceRef.current) {
          setPhase("hidden");
        }
      }, fadeOutMs);
    }, minVisibleMs);

    return () => {
      cancelled = true;
      window.clearTimeout(visibleTimer);
      if (fadeTimer !== null) {
        window.clearTimeout(fadeTimer);
      }
    };
  }, [fadeOutMs, minVisibleMs, routeKey]);

  useEffect(() => {
    if (phase !== "hidden" || typeof window === "undefined") {
      return;
    }

    const targetElement = getHashTargetElement(pendingHashRef.current || window.location.hash);
    if (!targetElement) {
      return;
    }

    let timeoutId: number | null = null;
    const scrollToHashTarget = () => {
      targetElement.scrollIntoView({ block: "start" });
    };

    const frameId = window.requestAnimationFrame(() => {
      scrollToHashTarget();
      timeoutId = window.setTimeout(scrollToHashTarget, 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [phase, routeKey]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      data-app-loading-overlay="true"
      aria-hidden={phase !== "visible"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        opacity: phase === "fading" ? 0 : 1,
        pointerEvents: phase === "fading" ? "none" : "auto",
        transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <SiteLoadingScreen phase={phase === "fading" ? "fading" : "visible"} />
    </div>
  );
}
