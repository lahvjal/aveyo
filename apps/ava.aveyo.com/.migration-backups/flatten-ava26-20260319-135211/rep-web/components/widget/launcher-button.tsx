"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  applyLauncherFollow,
  getEntryImpulse,
  getPointerMetrics,
  resetLauncherFluidMotion
} from "@/lib/launcher-motion";

interface LauncherButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function LauncherButton({ isOpen, onToggle }: LauncherButtonProps) {
  const hoverKickTimerRef = useRef<number | null>(null);

  const clearHoverKickTimer = () => {
    if (hoverKickTimerRef.current !== null) {
      window.clearTimeout(hoverKickTimerRef.current);
      hoverKickTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearHoverKickTimer();
    };
  }, []);

  const handlePointerEnter = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoverKickTimer();
    const button = event.currentTarget;
    const { xNorm, yNorm, nx, ny } = getPointerMetrics(button, event.clientX, event.clientY);
    const impulse = getEntryImpulse(xNorm, yNorm);

    button.style.setProperty("--launcher-shift-x", `${impulse.x.toFixed(2)}px`);
    button.style.setProperty("--launcher-shift-y", `${impulse.y.toFixed(2)}px`);
    button.style.setProperty("--launcher-tilt", `${(impulse.x * 1.1).toFixed(2)}deg`);
    button.style.setProperty("--launcher-grad-shift-x", `${(impulse.x * 1.4).toFixed(2)}px`);
    button.style.setProperty("--launcher-grad-shift-y", `${(impulse.y * 1.4).toFixed(2)}px`);
    button.style.setProperty("--launcher-grad-rot", `${(-impulse.x * 1.6).toFixed(2)}deg`);

    hoverKickTimerRef.current = window.setTimeout(() => {
      applyLauncherFollow(button, nx, ny);
      hoverKickTimerRef.current = null;
    }, 130);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoverKickTimer();
    const button = event.currentTarget;
    const { nx, ny } = getPointerMetrics(button, event.clientX, event.clientY);
    applyLauncherFollow(button, nx, ny);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoverKickTimer();
    resetLauncherFluidMotion(event.currentTarget);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoverKickTimer();
    const button = event.currentTarget;
    const { nx, ny } = getPointerMetrics(button, event.clientX, event.clientY);
    button.style.setProperty("--launcher-scale", "0.86");
    button.style.setProperty("--launcher-grad-scale", "1.17");
    button.style.setProperty("--launcher-shift-x", `${(-nx * 11.5).toFixed(2)}px`);
    button.style.setProperty("--launcher-shift-y", `${(-ny * 11.5).toFixed(2)}px`);
    button.style.setProperty("--launcher-tilt", `${(-nx * 19).toFixed(2)}deg`);
    button.style.setProperty("--launcher-grad-shift-x", `${(-nx * 15).toFixed(2)}px`);
    button.style.setProperty("--launcher-grad-shift-y", `${(-ny * 15).toFixed(2)}px`);
    button.style.setProperty("--launcher-grad-rot", `${(nx * 24 - ny * 14).toFixed(2)}deg`);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const { nx, ny } = getPointerMetrics(button, event.clientX, event.clientY);
    button.style.setProperty("--launcher-scale", "1");
    button.style.setProperty("--launcher-grad-scale", "1.08");
    applyLauncherFollow(button, nx, ny);
  };

  return (
    <button
      type="button"
      className="launcher-button"
      onClick={onToggle}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerLeave}
      aria-label={isOpen ? "Close Ava widget" : "Open Ava widget"}
    >
      <span className="launcher-label">{isOpen ? "Close Ava widget" : "Open Ava widget"}</span>
      <span className="launcher-gradient-layer" aria-hidden />
      <span className="launcher-icon" aria-hidden>
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g className="launcher-liquid-core">
            <path
              className="launcher-liquid-shape"
              d="M23.6958 30.57C24.6443 27.2441 27.244 24.6444 30.5699 23.6959L50.8524 17.9116C51.6065 17.6966 52.3034 18.3935 52.0884 19.1476L46.3041 39.4301C45.3556 42.756 42.7559 45.3557 39.43 46.3042L19.1475 52.0884C18.3935 52.3035 17.6965 51.6065 17.9116 50.8525L23.6958 30.57Z"
              fill="white"
            />
          </g>
        </svg>
      </span>
    </button>
  );
}
