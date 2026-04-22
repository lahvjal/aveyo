"use client";

import { useCallback, useRef } from "react";
import type { WheelEvent } from "react";

type UseCarouselWheelNavigationOptions = {
  onNext: () => void;
  onPrevious: () => void;
  threshold?: number;
  cooldownMs?: number;
};

const DEFAULT_THRESHOLD = 48;
const DEFAULT_COOLDOWN_MS = 420;
const GESTURE_RESET_MS = 180;

export function useCarouselWheelNavigation({
  onNext,
  onPrevious,
  threshold = DEFAULT_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: UseCarouselWheelNavigationOptions) {
  const accumulatedDeltaRef = useRef(0);
  const lastEventAtRef = useRef(0);
  const cooldownUntilRef = useRef(0);

  return useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const isHorizontalGesture =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        (event.shiftKey && Math.abs(event.deltaY) > 0);

      if (!isHorizontalGesture) {
        return;
      }

      const now =
        typeof window !== "undefined" && window.performance
          ? window.performance.now()
          : Date.now();

      if (now < cooldownUntilRef.current) {
        event.preventDefault();
        return;
      }

      const delta =
        Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (!delta) {
        return;
      }

      if (now - lastEventAtRef.current > GESTURE_RESET_MS) {
        accumulatedDeltaRef.current = 0;
      }

      lastEventAtRef.current = now;
      accumulatedDeltaRef.current += delta;

      if (Math.abs(accumulatedDeltaRef.current) < threshold) {
        event.preventDefault();
        return;
      }

      const direction = Math.sign(accumulatedDeltaRef.current);
      accumulatedDeltaRef.current = 0;
      cooldownUntilRef.current = now + cooldownMs;

      event.preventDefault();

      if (direction > 0) {
        onNext();
        return;
      }

      onPrevious();
    },
    [cooldownMs, onNext, onPrevious, threshold]
  );
}
