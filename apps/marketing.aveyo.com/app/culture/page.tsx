"use client";

import { useEffect, useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { canManageCultureFromSession } from "@/lib/auth/culture-access";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import {
  deleteCultureAnnouncement,
  deleteCultureEvent,
  getEventPosters,
  listCultureFeed,
  type CultureAnnouncement,
  type CultureEvent
} from "@/lib/culture";
import { EventPosterCarousel } from "./event-poster-carousel";
import { CreateCultureAnnouncementModal } from "./create-announcement-modal";
import {
  CulturePencilIcon,
  CultureTrashIcon
} from "./culture-icons";
import { CultureEventModal } from "./create-event-modal";
import { EventInfoModal } from "./event-info-modal";
import styles from "./culture-page.module.css";

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric"
});
const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});
const announcementDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});
const announcementTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

function formatEventDate(value: string): string {
  const parsed = Date.parse(`${value}T00:00:00`);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return eventDateFormatter.format(new Date(parsed));
}

function formatEventDateRange(startDate: string, endDate: string | null): string {
  const formattedStart = formatEventDate(startDate);
  if (!endDate || endDate === startDate) {
    return formattedStart;
  }
  return `${formattedStart} - ${formatEventDate(endDate)}`;
}

function formatEventTime(value: string, isAllDay: boolean): string {
  if (isAllDay) {
    return "All day";
  }
  const parsed = Date.parse(`1970-01-01T${value}`);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return eventTimeFormatter.format(new Date(parsed));
}

function isUpcomingEvent(event: CultureEvent): boolean {
  const finalDate = event.endDate ?? event.date;
  const parsed = Date.parse(`${finalDate}T23:59:59`);
  if (Number.isNaN(parsed)) {
    return true;
  }
  return parsed >= Date.now();
}

function sortCultureEvents(events: CultureEvent[]) {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(`${left.date}T${left.time}`);
    const rightTime = Date.parse(`${right.date}T${right.time}`);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return left.title.localeCompare(right.title);
    }
    return leftTime - rightTime;
  });
}

function buildEventSummary(event: CultureEvent): string {
  return `${event.title} at ${event.location} from ${formatEventDateRange(event.date, event.endDate)} at ${formatEventTime(event.time, event.isAllDay)}. Hosted by ${event.owner}.`;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatAnnouncementTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const now = new Date();
  if (isSameCalendarDay(parsed, now)) {
    return `Today at ${announcementTimeFormatter.format(parsed)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(parsed, yesterday)) {
    return `Yesterday at ${announcementTimeFormatter.format(parsed)}`;
  }

  return announcementDateTimeFormatter.format(parsed);
}

type EventModalState =
  | {
      mode: "create";
      event: null;
    }
  | {
      mode: "edit";
      event: CultureEvent;
    }
  | null;

export default function CulturePage() {
  const session = useRequireAuth();
  const [events, setEvents] = useState<CultureEvent[]>([]);
  const [announcements, setAnnouncements] = useState<CultureAnnouncement[]>([]);
  const [hasLoadedCulture, setHasLoadedCulture] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [eventModalState, setEventModalState] = useState<EventModalState>(null);
  const [infoEvent, setInfoEvent] = useState<CultureEvent | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    if (!session.authenticated) {
      return;
    }

    let cancelled = false;

    async function loadCulture() {
      setHasLoadedCulture(false);
      setLoadErrorMessage("");
      try {
        const payload = await listCultureFeed();
        if (cancelled) {
          return;
        }

        setEvents(sortCultureEvents(payload.events));
        setAnnouncements(payload.announcements);
        setHasLoadedCulture(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setEvents([]);
        setAnnouncements([]);
        setHasLoadedCulture(true);
        setLoadErrorMessage(
          error instanceof Error ? error.message : "Unable to load culture content."
        );
      }
    }

    void loadCulture();
    return () => {
      cancelled = true;
    };
  }, [session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  const canManageCulture = canManageCultureFromSession(session);
  const upcomingEvents = events.filter((event) => isUpcomingEvent(event));
  function openCreateModal() {
    setStatusMessage("");
    setLoadErrorMessage("");
    setInfoEvent(null);
    setEventModalState({
      mode: "create",
      event: null
    });
  }

  function openEditModal(event: CultureEvent) {
    setStatusMessage("");
    setLoadErrorMessage("");
    setInfoEvent(null);
    setEventModalState({
      mode: "edit",
      event
    });
  }

  function openInfoModal(event: CultureEvent) {
    setInfoEvent(event);
  }

  function closeEventModal() {
    setEventModalState(null);
  }

  function closeInfoModal() {
    setInfoEvent(null);
  }

  function openAnnouncementModal() {
    setStatusMessage("");
    setLoadErrorMessage("");
    setIsAnnouncementModalOpen(true);
  }

  function closeAnnouncementModal() {
    setIsAnnouncementModalOpen(false);
  }

  function handleEventSaved(event: CultureEvent, mode: "create" | "edit") {
    setLoadErrorMessage("");
    setEvents((currentEvents) =>
      sortCultureEvents([...currentEvents.filter((entry) => entry.id !== event.id), event])
    );
    setInfoEvent((currentEvent) => (currentEvent?.id === event.id ? event : currentEvent));
    setEventModalState(null);
    setStatusMessage(
      mode === "edit"
        ? "Culture event updated successfully."
        : "New culture event created successfully."
    );
  }

  function handleAnnouncementCreated(announcement: CultureAnnouncement) {
    setLoadErrorMessage("");
    setAnnouncements((currentAnnouncements) => [
      announcement,
      ...currentAnnouncements.filter((entry) => entry.id !== announcement.id)
    ]);
    setIsAnnouncementModalOpen(false);
    setStatusMessage("Announcement published successfully.");
  }

  async function handleDeleteEvent(event: CultureEvent) {
    if (!canManageCulture || deletingEventId || deletingAnnouncementId) {
      return;
    }

    const confirmed = window.confirm(`Delete "${event.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingEventId(event.id);
    setStatusMessage("");
    setLoadErrorMessage("");

    try {
      await deleteCultureEvent(event.id);
      setEvents((currentEvents) => currentEvents.filter((entry) => entry.id !== event.id));
      if (eventModalState?.event?.id === event.id) {
        setEventModalState(null);
      }
      if (infoEvent?.id === event.id) {
        setInfoEvent(null);
      }
      setStatusMessage("Culture event deleted successfully.");
    } catch (error) {
      setLoadErrorMessage(
        error instanceof Error ? error.message : "Unable to delete culture event."
      );
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleDeleteAnnouncement(announcement: CultureAnnouncement) {
    if (!canManageCulture || deletingAnnouncementId || deletingEventId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete announcement "${announcement.title}"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingAnnouncementId(announcement.id);
    setStatusMessage("");
    setLoadErrorMessage("");

    try {
      await deleteCultureAnnouncement(announcement.id);
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.filter((entry) => entry.id !== announcement.id)
      );
      setStatusMessage("Announcement deleted successfully.");
    } catch (error) {
      setLoadErrorMessage(
        error instanceof Error ? error.message : "Unable to delete announcement."
      );
    } finally {
      setDeletingAnnouncementId(null);
    }
  }

  return (
    <MarketingShell
      session={session}
      currentPath="/culture"
      title="Coming Up!"
      hideHeader
    >
      {statusMessage ? <div className={styles.statusNotice}>{statusMessage}</div> : null}
      {loadErrorMessage ? <div className="notice warning">{loadErrorMessage}</div> : null}

      <div className={styles.pageLayout}>
        <section className={styles.eventBoard} aria-label="Upcoming culture events">
          <div className={styles.boardHeader}>
            <p className={styles.boardCount}>{upcomingEvents.length} Event(s)</p>
            <div className={styles.boardActions}>
              {canManageCulture ? (
                <button
                  type="button"
                  className={styles.createEventButton}
                  onClick={openCreateModal}
                >
                  <span className={styles.createEventIcon} aria-hidden="true">
                    +
                  </span>
                  <span>Create Event</span>
                </button>
              ) : (
                <p className={styles.boardHint}>
                  Only marketing team members can create, edit, or delete events.
                </p>
              )}
            </div>
          </div>

          <div className={styles.eventGrid}>
            {upcomingEvents.map((event) => (
              <article
                key={event.id}
                className={styles.eventCard}
                aria-label={buildEventSummary(event)}
              >
                <button
                  type="button"
                  className={styles.eventPosterButton}
                  onClick={() => openInfoModal(event)}
                  aria-label={`Open details for ${buildEventSummary(event)}`}
                >
                  <div className={styles.eventVisual} aria-hidden="true">
                    <EventPosterCarousel posters={getEventPosters(event)} />
                  </div>
                </button>
                {canManageCulture ? (
                  <div className={styles.eventActionOverlay}>
                    <button
                      type="button"
                      className={styles.eventActionIconButton}
                      onClick={() => openEditModal(event)}
                      disabled={deletingEventId === event.id}
                      aria-label={`Edit ${event.title}`}
                    >
                      <CulturePencilIcon className={styles.eventActionIcon} />
                    </button>
                    <button
                      type="button"
                      className={styles.eventActionIconButton}
                      onClick={() => {
                        void handleDeleteEvent(event);
                      }}
                      disabled={deletingEventId === event.id}
                      aria-label={`Delete ${event.title}`}
                    >
                      <CultureTrashIcon className={styles.eventActionIcon} />
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.announcementsPanel} aria-label="Culture announcements">
          <div className={styles.announcementsHeader}>
            <h2 className={styles.announcementsTitle}>Announcements</h2>
            {canManageCulture ? (
              <button
                type="button"
                className={styles.panelAddButton}
                onClick={openAnnouncementModal}
                aria-label="Add announcement"
              >
                <span className={styles.createEventIcon} aria-hidden="true">
                  +
                </span>
              </button>
            ) : null}
          </div>
          <div className={styles.announcementList}>
            {announcements.map((announcement) => (
              <article key={announcement.id} className={styles.announcementItem}>
                <span className={styles.announcementAvatar} aria-hidden="true">
                  {announcement.authorInitials}
                </span>
                <div className={styles.announcementCopy}>
                  <div className={styles.announcementTopRow}>
                    <h3 className={styles.announcementHeading}>{announcement.title}</h3>
                    {canManageCulture ? (
                      <button
                        type="button"
                        className={styles.announcementDeleteButton}
                        onClick={() => {
                          void handleDeleteAnnouncement(announcement);
                        }}
                        disabled={deletingAnnouncementId === announcement.id}
                      >
                        {deletingAnnouncementId === announcement.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                  <p className={styles.announcementMessage}>{announcement.message}</p>
                  <span className={styles.announcementTimestamp}>
                    {formatAnnouncementTimestamp(announcement.publishedAt)}
                  </span>
                </div>
              </article>
            ))}
            {hasLoadedCulture && !announcements.length ? (
              <div className={styles.announcementEmptyState}>No announcements yet.</div>
            ) : null}
          </div>
        </aside>
      </div>

      <CultureEventModal
        isOpen={Boolean(eventModalState)}
        mode={eventModalState?.mode ?? "create"}
        event={eventModalState?.event ?? null}
        canManageEvents={canManageCulture}
        currentUserName={session.user?.name}
        onClose={closeEventModal}
        onSaved={handleEventSaved}
      />
      <EventInfoModal
        isOpen={Boolean(infoEvent)}
        event={infoEvent}
        canManageEvents={canManageCulture}
        isDeleting={deletingEventId === infoEvent?.id}
        onClose={closeInfoModal}
        onEdit={openEditModal}
        onDelete={(event) => {
          void handleDeleteEvent(event);
        }}
      />
      <CreateCultureAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        canCreateAnnouncements={canManageCulture}
        currentUserName={session.user?.name}
        onClose={closeAnnouncementModal}
        onCreated={handleAnnouncementCreated}
      />
    </MarketingShell>
  );
}
