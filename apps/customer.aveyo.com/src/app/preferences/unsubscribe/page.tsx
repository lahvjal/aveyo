"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "idle" | "checking" | "submitting" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim().toLowerCase());
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => (searchParams.get("email") || "").trim(), [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    async function checkExistingUnsubscribe() {
      if (!initialEmail || !isEmail(initialEmail)) {
        return;
      }

      setStatus("checking");
      try {
        const response = await fetch(
          `/api/preferences/unsubscribe?email=${encodeURIComponent(initialEmail)}`,
          { method: "GET" }
        );
        const payload = (await response.json()) as { unsubscribed?: boolean };
        if (response.ok && payload.unsubscribed) {
          setStatus("success");
          setMessage("This address is already unsubscribed.");
          return;
        }

        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    }

    void checkExistingUnsubscribe();
  }, [initialEmail]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmail(normalizedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address to unsubscribe.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/preferences/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-unsubscribe-source": "preferences-page"
        },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to unsubscribe right now.");
      }

      setStatus("success");
      setMessage(payload.message || "You have been unsubscribed.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to unsubscribe right now.");
    }
  }

  const isBusy = status === "checking" || status === "submitting";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--customer-color-text-primary)]">
          Unsubscribe From Email
        </h1>
        <p className="mt-3 text-sm text-[var(--customer-color-text-subtle)]">
          Stop receiving Aveyo marketing updates at this email address. You may still receive
          essential account or project communications.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-[var(--customer-color-text-primary)]" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            placeholder="you@example.com"
            disabled={isBusy}
            required
          />

          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Unsubscribing..." : "Unsubscribe"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-5 text-sm ${
              status === "success" ? "text-green-700" : "text-red-600"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
