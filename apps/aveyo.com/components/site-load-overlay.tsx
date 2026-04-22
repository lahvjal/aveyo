"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SiteLoadingScreen } from "@/components/ui/site-loading-screen";

const MAX_WAIT_MS = 12000;
const MIN_VISIBLE_MS = 450;
const FADE_OUT_MS = 520;
const HERO_VIDEO_SELECTOR = "video[data-site-hero-video='true']";
const SITE_LOAD_OVERLAY_Z_INDEX = 2_147_483_647;

type OverlayPhase = "visible" | "fading" | "hidden";

function waitForAnimationFrames(count: number) {
  return new Promise<void>((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(() => step(remaining - 1));
    };

    step(count);
  });
}

function getHeroVideo() {
  const candidate = document.querySelector(HERO_VIDEO_SELECTOR);
  return candidate instanceof HTMLVideoElement ? candidate : null;
}

function waitForHeroVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || video.error) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      resolve();
    };

    video.addEventListener("loadeddata", done);
    video.addEventListener("canplay", done);
    video.addEventListener("error", done);
  });
}

async function waitForHeroVideoReady() {
  await waitForAnimationFrames(2);
  const heroVideo = getHeroVideo();
  if (!heroVideo) {
    return;
  }
  await waitForHeroVideo(heroVideo);
}

function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => {
      window.setTimeout(() => resolve(undefined), timeoutMs);
    })
  ]);
}

export function SiteLoadOverlay() {
  const pathname = usePathname() ?? "";
  const routeKey = pathname;
  const [phase, setPhase] = useState<OverlayPhase>("visible");
  const routeSequenceRef = useRef(0);

  useLayoutEffect(() => {
    routeSequenceRef.current += 1;
    setPhase("visible");
  }, [routeKey]);

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
    const currentSequence = routeSequenceRef.current;
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    let cancelled = false;
    let fadeTimer: number | null = null;

    const finish = () => {
      if (cancelled || currentSequence !== routeSequenceRef.current) {
        return;
      }

      setPhase("fading");
      fadeTimer = window.setTimeout(() => {
        if (!cancelled && currentSequence === routeSequenceRef.current) {
          setPhase("hidden");
        }
      }, FADE_OUT_MS);
    };

    const preparePage = async () => {
      await waitWithTimeout(waitForHeroVideoReady(), MAX_WAIT_MS);

      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), remaining);
        });
      }

      finish();
    };

    void preparePage();

    return () => {
      cancelled = true;
      if (fadeTimer !== null) {
        window.clearTimeout(fadeTimer);
      }
    };
  }, [routeKey]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      data-site-load-overlay="true"
      className={`fixed inset-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ zIndex: SITE_LOAD_OVERLAY_Z_INDEX }}
      aria-hidden={phase !== "visible"}
    >
      <SiteLoadingScreen
        className="min-h-screen"
        phase={phase === "fading" ? "fading" : "visible"}
      />
    </div>
  );
}
