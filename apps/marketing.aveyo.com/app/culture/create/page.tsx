"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { isAdminRole } from "@/lib/auth/roles";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { createCultureEvent } from "@/lib/culture-events";

interface CreateEventFormState {
  title: string;
  date: string;
  time: string;
  location: string;
  owner: string;
  description: string;
}

const defaultFormState: CreateEventFormState = {
  title: "",
  date: "",
  time: "",
  location: "",
  owner: "",
  description: ""
};

export default function CreateCultureEventPage() {
  const session = useRequireAuth();
  const router = useRouter();
  const [formState, setFormState] = useState<CreateEventFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fallbackOwner = session.user?.name?.trim();
    if (!session.authenticated || !fallbackOwner) {
      return;
    }
    setFormState((currentState) => {
      if (currentState.owner) {
        return currentState;
      }
      return { ...currentState, owner: fallbackOwner };
    });
  }, [session.authenticated, session.user?.name]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  const canCreateEvents = isAdminRole(session.role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateEvents || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      createCultureEvent(formState);
      router.push("/culture?created=1");
    } catch {
      setErrorMessage("Unable to create event. Please try again.");
      setIsSaving(false);
    }
  }

  if (!canCreateEvents) {
    return (
      <MarketingShell
        session={session}
        currentPath="/culture/create"
        title="Create Culture Event"
        description="Admin-only event creation page."
      >
        <div className="access-denied">
          You do not have permission to create events.
          <div className="button-row">
            <Link href="/culture" className="secondary-button">
              Back to events
            </Link>
          </div>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell
      session={session}
      currentPath="/culture/create"
      title="Create Culture Event"
      description="Publish a company culture event for everyone on the platform."
    >
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="event-title">Event title</label>
              <input
                id="event-title"
                required
                value={formState.title}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, title: event.target.value }))
                }
                placeholder="Customer Success Appreciation Lunch"
              />
            </div>

            <div className="field">
              <label htmlFor="event-owner">Owner</label>
              <input
                id="event-owner"
                required
                value={formState.owner}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, owner: event.target.value }))
                }
                placeholder="People Team"
              />
            </div>

            <div className="field">
              <label htmlFor="event-date">Date</label>
              <input
                id="event-date"
                type="date"
                required
                value={formState.date}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, date: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="event-time">Time</label>
              <input
                id="event-time"
                type="time"
                required
                value={formState.time}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, time: event.target.value }))
                }
              />
            </div>

            <div className="field full">
              <label htmlFor="event-location">Location</label>
              <input
                id="event-location"
                required
                value={formState.location}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, location: event.target.value }))
                }
                placeholder="Main Office Atrium"
              />
            </div>

            <div className="field full">
              <label htmlFor="event-description">Details</label>
              <textarea
                id="event-description"
                required
                value={formState.description}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, description: event.target.value }))
                }
                placeholder="Add the event purpose, what attendees should expect, and any required preparation."
              />
            </div>
          </div>

          {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create event"}
            </button>
            <Link href="/culture" className="secondary-button">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </MarketingShell>
  );
}
