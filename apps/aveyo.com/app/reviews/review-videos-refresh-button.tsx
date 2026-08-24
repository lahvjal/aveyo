"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RefreshReviewVideosResponse {
  count?: number;
  error?: string;
}

export function ReviewVideosRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleRefresh() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/reviews/refresh", {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const payload = (await response.json().catch(() => ({}))) as RefreshReviewVideosResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to check YouTube right now.");
      }

      router.refresh();
      setStatusMessage(
        `${payload.count ?? 0} customer ${payload.count === 1 ? "video" : "videos"} found.`
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to check YouTube right now."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="shrink-0 lg:text-right">
      <button
        type="button"
        onClick={() => {
          void handleRefresh();
        }}
        disabled={isRefreshing}
        className="inline-flex items-center justify-center gap-2 rounded-full rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9] disabled:cursor-wait disabled:opacity-60"
      >
        <svg
          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 6v5h-5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11a7.5 7.5 0 1 0-.8 5.8"
          />
        </svg>
        {isRefreshing ? "Checking YouTube..." : "Check For New Stories"}
      </button>
      <p
        className="mt-2 min-h-5 text-sm text-[color:var(--site-text-muted)]"
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}
