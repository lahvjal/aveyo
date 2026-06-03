"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createCultureEvent,
  getEventPosters,
  updateCultureEvent,
  type CultureEvent,
  type CultureEventPosterInput,
  type CulturePosterKind
} from "@/lib/culture";
import {
  compressImageForCulturePosterUpload,
  formatFileSize
} from "@/lib/imageCompression";
import styles from "./culture-page.module.css";

const VIDEO_UPLOAD_LIMIT_BYTES = 40 * 1024 * 1024;
const MAX_POSTER_UPLOAD_BATCH_BYTES = 45 * 1024 * 1024;

interface CreateEventFormState {
  title: string;
  date: string;
  endDate: string;
  isAllDay: boolean;
  time: string;
  location: string;
  owner: string;
  description: string;
}

interface PosterDraft {
  id: string;
  kind: CulturePosterKind;
  existingUrl: string;
  file: File | null;
  sortOrder: number;
  label: string;
}

interface CultureEventModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  event: CultureEvent | null;
  canManageEvents: boolean;
  currentUserName?: string | null;
  onClose: () => void;
  onSaved: (event: CultureEvent, mode: "create" | "edit") => void;
}

function buildFormState(
  currentUserName?: string | null,
  event?: CultureEvent | null
): CreateEventFormState {
  if (event) {
    return {
      title: event.title,
      date: event.date,
      endDate: event.endDate ?? "",
      isAllDay: event.isAllDay,
      time: event.time,
      location: event.location,
      owner: event.owner,
      description: event.description
    };
  }

  return {
    title: "",
    date: "",
    endDate: "",
    isAllDay: false,
    time: "",
    location: "",
    owner: currentUserName?.trim() || "",
    description: ""
  };
}

function buildPosterLabel(kind: CulturePosterKind, source: string) {
  const fileName = source.split("/").pop()?.split("?")[0]?.trim();
  if (fileName) {
    return fileName;
  }
  return kind === "video" ? "Video poster" : "Image poster";
}

function buildPosterDraftsFromEvent(event: CultureEvent | null | undefined): PosterDraft[] {
  return getEventPosters(event).map((poster) => ({
    id: poster.id,
    kind: poster.kind,
    existingUrl: poster.url,
    file: null,
    sortOrder: poster.sortOrder,
    label: buildPosterLabel(poster.kind, poster.url)
  }));
}

function reindexPosterDrafts(drafts: PosterDraft[]) {
  return drafts.map((draft, index) => ({ ...draft, sortOrder: index }));
}

function inferPosterKindFromFile(file: File): CulturePosterKind | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return null;
}

function movePosterDraft(drafts: PosterDraft[], id: string, direction: -1 | 1) {
  const index = drafts.findIndex((draft) => draft.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= drafts.length) {
    return drafts;
  }

  const next = [...drafts];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return reindexPosterDrafts(next);
}

export function CultureEventModal({
  isOpen,
  mode,
  event: initialEvent,
  canManageEvents,
  currentUserName,
  onClose,
  onSaved
}: CultureEventModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState<CreateEventFormState>(() =>
    buildFormState(currentUserName, initialEvent)
  );
  const [posterDrafts, setPosterDrafts] = useState<PosterDraft[]>([]);
  const [useDateRange, setUseDateRange] = useState(() => Boolean(initialEvent?.endDate));
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingPosters, setIsCompressingPosters] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = mode === "edit";

  useEffect(() => {
    setFormState(buildFormState(currentUserName, isOpen ? initialEvent : null));
    setUseDateRange(Boolean(isOpen ? initialEvent?.endDate : null));
    setPosterDrafts(isOpen && initialEvent ? buildPosterDraftsFromEvent(initialEvent) : []);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    setIsSaving(false);
    setIsCompressingPosters(false);
    setErrorMessage("");
  }, [currentUserName, initialEvent, isOpen]);

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

  if (!isOpen) {
    return null;
  }

  if (isEditing && !initialEvent) {
    return null;
  }

  async function handlePosterUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    if (selectedFiles.length === 0) {
      return;
    }

    setIsCompressingPosters(true);
    setErrorMessage("");

    try {
      const nextDrafts: PosterDraft[] = [];

      for (const file of selectedFiles) {
        const kind = inferPosterKindFromFile(file);
        if (!kind) {
          setErrorMessage(
            "Poster uploads must be images or videos (jpg, png, webp, gif, avif, mp4, webm, mov)."
          );
          return;
        }

        if (kind === "video" && file.size > VIDEO_UPLOAD_LIMIT_BYTES) {
          setErrorMessage(`${file.name} is too large. Each video must be 40MB or smaller.`);
          return;
        }

        const uploadFile = kind === "image" ? await compressImageForCulturePosterUpload(file) : file;

        nextDrafts.push({
          id: crypto.randomUUID(),
          kind,
          existingUrl: "",
          file: uploadFile,
          sortOrder: 0,
          label: uploadFile.name
        });
      }

      const combinedUploadBytes = [...posterDrafts, ...nextDrafts].reduce(
        (total, draft) => total + (draft.file?.size ?? 0),
        0
      );
      if (combinedUploadBytes > MAX_POSTER_UPLOAD_BATCH_BYTES) {
        setErrorMessage(
          "Total poster upload size is too large. Keep the combined upload under 45MB, or upload fewer posters at once."
        );
        return;
      }

      setPosterDrafts((current) => reindexPosterDrafts([...current, ...nextDrafts]));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to prepare poster files for upload."
      );
    } finally {
      setIsCompressingPosters(false);
    }
  }

  function removePosterDraft(id: string) {
    setPosterDrafts((current) => reindexPosterDrafts(current.filter((draft) => draft.id !== id)));
  }

  function buildPostersForSubmit(): CultureEventPosterInput[] {
    return posterDrafts.map((draft, index) => ({
      sortOrder: index,
      posterKind: draft.kind,
      posterUrl: draft.existingUrl,
      posterFile: draft.file
    }));
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!canManageEvents || isSaving) {
      return;
    }

    const trimmedEndDate = formState.endDate.trim();
    if (trimmedEndDate && trimmedEndDate < formState.date) {
      setErrorMessage("End date cannot be earlier than the start date.");
      return;
    }
    if (!formState.isAllDay && !formState.time.trim()) {
      setErrorMessage("Start time is required unless the event is marked all day.");
      return;
    }

    const totalUploadBytes = posterDrafts.reduce((total, draft) => total + (draft.file?.size ?? 0), 0);
    if (totalUploadBytes > MAX_POSTER_UPLOAD_BATCH_BYTES) {
      setErrorMessage(
        "Total poster upload size is too large. Keep the combined upload under 45MB, or upload fewer posters at once."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const requestInput = {
        ...formState,
        endDate: useDateRange ? trimmedEndDate : "",
        posters: buildPostersForSubmit()
      };

      const savedEvent = isEditing
        ? await updateCultureEvent(initialEvent!.id, requestInput)
        : await createCultureEvent(requestInput);

      setFormState(buildFormState(currentUserName, null));
      setPosterDrafts([]);
      onSaved(savedEvent, mode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Unable to update event. Please try again."
            : "Unable to create event. Please try again."
      );
      setIsSaving(false);
    }
  }

  const hasUploadingPoster = posterDrafts.some((draft) => Boolean(draft.file));
  const isPosterBusy = isCompressingPosters || isSaving;

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBlock}>
            <p className={styles.modalEyebrow}>CULTURE</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {isEditing ? "Edit Event" : "Create Event"}
            </h2>
            <p id={descriptionId} className={styles.modalDescription}>
              {isEditing
                ? "Update the event details, schedule, or poster carousel media."
                : "Publish a company culture event for everyone on the platform."}
            </p>
          </div>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label={isEditing ? "Close edit event form" : "Close create event form"}
          >
            Close
          </button>
        </div>

        <div className={styles.modalBody}>
          {canManageEvents ? (
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
                  <label htmlFor="event-date">Start date</label>
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
                  <label htmlFor="event-end-date">End date</label>
                  <input
                    id="event-end-date"
                    type="date"
                    value={formState.endDate}
                    required={useDateRange}
                    disabled={!useDateRange}
                    min={formState.date || undefined}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, endDate: event.target.value }))
                    }
                  />
                  <p className="helper-text">
                    Set an end date for multi-day events.
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={useDateRange}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setUseDateRange(enabled);
                          if (!enabled) {
                            setFormState((state) => ({ ...state, endDate: "" }));
                          } else if (!formState.endDate && formState.date) {
                            setFormState((state) => ({ ...state, endDate: state.date }));
                          }
                        }}
                      />
                      Multi-day event
                    </label>
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="event-time">Time</label>
                  <input
                    id="event-time"
                    type="time"
                    required={!formState.isAllDay}
                    disabled={formState.isAllDay}
                    value={formState.time}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, time: event.target.value }))
                    }
                  />
                  <p className="helper-text">
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={formState.isAllDay}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setFormState((state) => ({
                            ...state,
                            isAllDay: enabled,
                            time: enabled
                              ? "00:00"
                              : !state.time || state.time === "00:00"
                                ? "09:00"
                                : state.time
                          }));
                        }}
                      />
                      All-day event
                    </label>
                  </p>
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

                <div className={`field full ${styles.posterSection}`}>
                  <div className={styles.posterSectionHeader}>
                    <label htmlFor="event-poster-upload">Event posters</label>
                    <p className="helper-text">
                      Upload multiple images or looping videos. Drag order with the move buttons;
                      the carousel follows this order.
                    </p>
                  </div>

                  <input
                    ref={uploadInputRef}
                    id="event-poster-upload"
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={(event) => {
                      void handlePosterUploadChange(event);
                    }}
                    disabled={isPosterBusy}
                  />
                  <p className="helper-text">
                    Images are compressed to about 1MB before upload. Videos are uploaded as-is,
                    up to 40MB each. Combined uploads should stay under 45MB per save.
                  </p>
                  {isCompressingPosters ? (
                    <p className="helper-text">Compressing images...</p>
                  ) : null}

                  {posterDrafts.length > 0 ? (
                    <ol className={styles.posterOrderList}>
                      {posterDrafts.map((draft, index) => (
                        <li key={draft.id} className={styles.posterOrderItem}>
                          <div className={styles.posterOrderMeta}>
                            <span className={styles.posterOrderIndex}>{index + 1}</span>
                            <div className={styles.posterOrderCopy}>
                              <strong>{draft.label}</strong>
                              <span>
                                {draft.kind === "video" ? "Looping video" : "Image"}
                                {draft.file ? ` · ${formatFileSize(draft.file.size)}` : " · Saved"}
                              </span>
                            </div>
                          </div>
                          <div className={styles.posterOrderActions}>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                setPosterDrafts((current) => movePosterDraft(current, draft.id, -1))
                              }
                              disabled={isPosterBusy || index === 0}
                              aria-label={`Move ${draft.label} earlier`}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                setPosterDrafts((current) => movePosterDraft(current, draft.id, 1))
                              }
                              disabled={isPosterBusy || index === posterDrafts.length - 1}
                              aria-label={`Move ${draft.label} later`}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => removePosterDraft(draft.id)}
                              disabled={isPosterBusy}
                              aria-label={`Remove ${draft.label}`}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="helper-text">No posters added yet.</p>
                  )}
                </div>
              </div>

              {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

              <div className={styles.modalActions}>
                <button type="submit" className="primary-button" disabled={isSaving || isCompressingPosters}>
                  {isSaving
                    ? hasUploadingPoster
                      ? "Uploading..."
                      : isEditing
                        ? "Saving..."
                        : "Creating..."
                    : isCompressingPosters
                      ? "Compressing..."
                      : isEditing
                        ? "Save changes"
                        : "Create event"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="access-denied">You do not have permission to manage events.</div>
          )}
        </div>
      </div>
    </div>
  );
}
