"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { isAdminRole } from "@/lib/auth/roles";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { readCultureEvents, type CultureEvent } from "@/lib/culture-events";

function CulturePageContent() {
  const session = useRequireAuth();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CultureEvent[]>([]);

  useEffect(() => {
    if (!session.authenticated) {
      return;
    }
    setEvents(readCultureEvents());
  }, [session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  const canCreateEvents = isAdminRole(session.role);
  const wasEventJustCreated = searchParams.get("created") === "1";

  return (
    <MarketingShell
      session={session}
      currentPath="/culture"
      title="Culture Events"
      description="Company events, updates, and team culture moments."
    >
      {wasEventJustCreated ? (
        <div className="notice success">New culture event created successfully.</div>
      ) : null}

      <div className="card">
        <div className="button-row">
          {canCreateEvents ? (
            <Link href="/culture/create" className="secondary-button">
              Create event
            </Link>
          ) : (
            <p className="helper-text">Only admins can create events.</p>
          )}
        </div>

        <div className="events-grid">
          {events.map((event) => (
            <article key={event.id} className="event-card">
              <h3>{event.title}</h3>
              <div className="event-meta">
                <span>
                  <strong>Date:</strong> {event.date}
                </span>
                <span>
                  <strong>Time:</strong> {event.time}
                </span>
                <span>
                  <strong>Location:</strong> {event.location}
                </span>
                <span>
                  <strong>Owner:</strong> {event.owner}
                </span>
              </div>
              <p className="event-description">{event.description}</p>
            </article>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}

export default function CulturePage() {
  return (
    <Suspense fallback={<main className="loading-shell">Loading culture page...</main>}>
      <CulturePageContent />
    </Suspense>
  );
}
