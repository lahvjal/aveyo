"use client";

import { useEffect, useId } from "react";
import { getEventPosters, type CultureEvent } from "@/lib/culture";
import { EventPosterCarousel } from "./event-poster-carousel";
import {
  CultureCalendarIcon,
  CultureCloseIcon,
  CultureLocationIcon,
  CulturePencilIcon,
  CultureTrashIcon
} from "./culture-icons";
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

function formatEventDateTime(event: CultureEvent) {
  const parsedDate = Date.parse(`${event.date}T00:00:00`);
  const parsedEndDate = event.endDate ? Date.parse(`${event.endDate}T00:00:00`) : Number.NaN;

  const formattedDate = Number.isNaN(parsedDate)
    ? event.date
    : eventDateFormatter.format(new Date(parsedDate));
  const formattedEndDate =
    !event.endDate || event.endDate === event.date
      ? null
      : Number.isNaN(parsedEndDate)
        ? event.endDate
        : eventDateFormatter.format(new Date(parsedEndDate));
  const formattedTime = event.isAllDay
    ? "All day"
    : (() => {
        const parsedTime = Date.parse(`1970-01-01T${event.time}`);
        return Number.isNaN(parsedTime)
          ? event.time
          : eventTimeFormatter.format(new Date(parsedTime));
      })();

  return formattedEndDate
    ? `${formattedDate} - ${formattedEndDate} at ${formattedTime}`
    : `${formattedDate} at ${formattedTime}`;
}

interface EventInfoModalProps {
  isOpen: boolean;
  event: CultureEvent | null;
  canManageEvents: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onEdit: (event: CultureEvent) => void;
  onDelete: (event: CultureEvent) => void;
}

export function EventInfoModal({
  isOpen,
  event,
  canManageEvents,
  isDeleting,
  onClose,
  onEdit,
  onDelete
}: EventInfoModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.eventInfoDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.eventInfoVisualPane}>
          <EventPosterCarousel
            posters={getEventPosters(event)}
            imageClassName={styles.eventInfoPosterMedia}
            videoClassName={styles.eventInfoPosterVideo}
          />
        </div>

        <div className={styles.eventInfoContent}>
          <div className={styles.eventInfoTop}>
            <button
              type="button"
              className={styles.eventInfoCloseButton}
              onClick={onClose}
              aria-label="Close event details"
            >
              <CultureCloseIcon className={styles.eventActionIcon} />
            </button>

            <div className={styles.eventInfoCopy}>
              <div className={styles.eventInfoHeadingBlock}>
                <div className={styles.eventInfoTitleRow}>
                  <h2 id={titleId} className={styles.eventInfoTitle}>
                    {event.title}
                  </h2>
                  <span className={styles.eventPill}>Company</span>
                </div>
                <p className={styles.eventInfoSubtitle}>Hosted by {event.owner}</p>
                <div className={styles.eventInfoMetaList}>
                  <div className={styles.eventInfoMetaRow}>
                    <CultureLocationIcon className={styles.eventInfoMetaIcon} />
                    <span>{event.location}</span>
                  </div>
                  <div className={styles.eventInfoMetaRow}>
                    <CultureCalendarIcon className={styles.eventInfoMetaIcon} />
                    <span>{formatEventDateTime(event)}</span>
                  </div>
                </div>
              </div>

              <p id={descriptionId} className={styles.eventInfoDescription}>
                {event.description}
              </p>
            </div>
          </div>

          {canManageEvents ? (
            <div className={styles.eventInfoActionRow}>
              <button
                type="button"
                className={styles.eventActionIconButton}
                onClick={() => onEdit(event)}
                aria-label={`Edit ${event.title}`}
              >
                <CulturePencilIcon className={styles.eventActionIcon} />
              </button>
              <button
                type="button"
                className={styles.eventActionIconButton}
                onClick={() => onDelete(event)}
                aria-label={`Delete ${event.title}`}
                disabled={isDeleting}
              >
                <CultureTrashIcon className={styles.eventActionIcon} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
