"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseCarouselAutoplayOptions = {
  durationMs?: number;
  restartKey: number | string;
  autoPlay?: boolean;
  onAdvance: () => void;
};

const DEFAULT_DURATION_MS = 5000;

function subscribeToReducedMotionPreference(onChange: (matches: boolean) => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches);

  onChange(mediaQuery.matches);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }

  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
}

export function useCarouselAutoplay({
  durationMs = DEFAULT_DURATION_MS,
  restartKey,
  autoPlay = true,
  onAdvance,
}: UseCarouselAutoplayOptions) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(durationMs);
  const onAdvanceRef = useRef(onAdvance);
  const resumeOnVisibleRef = useRef(false);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => subscribeToReducedMotionPreference(setPrefersReducedMotion), []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && startedAtRef.current !== null) {
      const elapsedMs = window.performance.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(durationMs - elapsedMs, 0);
    }

    startedAtRef.current = null;
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer, durationMs]);

  const play = useCallback(() => {
    if (remainingMsRef.current <= 0 || remainingMsRef.current > durationMs) {
      remainingMsRef.current = durationMs;
    }
    setIsPlaying(true);
  }, [durationMs]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play();
  }, [isPlaying, pause, play]);

  useEffect(() => {
    if (!prefersReducedMotion) {
      return;
    }

    remainingMsRef.current = durationMs;
    startedAtRef.current = null;
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer, durationMs, prefersReducedMotion]);

  useEffect(() => {
    remainingMsRef.current = durationMs;
    startedAtRef.current = null;
    clearTimer();

    if (!isPlaying) {
      return;
    }

    startedAtRef.current = window.performance.now();
    timeoutRef.current = window.setTimeout(() => {
      remainingMsRef.current = durationMs;
      startedAtRef.current = null;
      onAdvanceRef.current();
    }, remainingMsRef.current);

    return clearTimer;
  }, [clearTimer, durationMs, restartKey]);

  useEffect(() => {
    clearTimer();

    if (!isPlaying) {
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = window.performance.now();
    timeoutRef.current = window.setTimeout(() => {
      remainingMsRef.current = durationMs;
      startedAtRef.current = null;
      onAdvanceRef.current();
    }, remainingMsRef.current);

    return clearTimer;
  }, [clearTimer, durationMs, isPlaying]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (!isPlaying) {
          return;
        }

        resumeOnVisibleRef.current = true;
        pause();
        return;
      }

      if (!resumeOnVisibleRef.current) {
        return;
      }

      resumeOnVisibleRef.current = false;
      play();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, pause, play]);

  return {
    isPlaying,
    prefersReducedMotion,
    autoplayDurationMs: durationMs,
    pause,
    play,
    toggle,
  };
}
