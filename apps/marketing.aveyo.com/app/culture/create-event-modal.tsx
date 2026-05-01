"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createCultureEvent,
  updateCultureEvent,
  type CultureEvent,
  type CulturePosterKind
} from "@/lib/culture";
import styles from "./culture-page.module.css";

interface CreateEventFormState {
  title: string;
  date: string;
  endDate: string;
  time: string;
  location: string;
  owner: string;
  description: string;
  posterKind: CulturePosterKind | "";
  posterUrl: string;
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
      time: event.time,
      location: event.location,
      owner: event.owner,
      description: event.description,
      posterKind: event.posterKind ?? "",
      posterUrl: event.posterUrl ?? ""
    };
  }

  return {
    title: "",
    date: "",
    endDate: "",
    time: "",
    location: "",
    owner: currentUserName?.trim() || "",
    description: "",
    posterKind: "",
    posterUrl: ""
  };
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState<CreateEventFormState>(() =>
    buildFormState(currentUserName, initialEvent)
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [useDateRange, setUseDateRange] = useState(() => Boolean(initialEvent?.endDate));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = mode === "edit";

  useEffect(() => {
    setFormState(buildFormState(currentUserName, isOpen ? initialEvent : null));
    setUseDateRange(Boolean(isOpen ? initialEvent?.endDate : null));
    setPosterFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsSaving(false);
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

  function clearPosterFile() {
    setPosterFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormState((state) => ({
      ...state,
      posterKind: state.posterUrl.trim() ? state.posterKind : ""
    }));
  }

  function handlePosterFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      clearPosterFile();
      return;
    }

    const inferredPosterKind = inferPosterKindFromFile(nextFile);
    if (!inferredPosterKind) {
      event.target.value = "";
      setPosterFile(null);
      setErrorMessage("Poster upload must be an image or video file.");
      return;
    }

    setPosterFile(nextFile);
    setErrorMessage("");
    setFormState((state) => ({
      ...state,
      posterKind: inferredPosterKind
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

    const trimmedPosterUrl = formState.posterUrl.trim();
    if (
      !posterFile &&
      ((formState.posterKind && !trimmedPosterUrl) || (!formState.posterKind && trimmedPosterUrl))
    ) {
      setErrorMessage("Choose a poster type and add a file or URL, or leave poster media empty.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const savedEvent = isEditing
        ? await updateCultureEvent(initialEvent!.id, {
            ...formState,
            endDate: useDateRange ? trimmedEndDate : "",
            posterUrl: trimmedPosterUrl,
            posterFile
          })
        : await createCultureEvent({
            ...formState,
            endDate: useDateRange ? trimmedEndDate : "",
            posterUrl: trimmedPosterUrl,
            posterFile
          });

      setFormState(buildFormState(currentUserName, null));
      setPosterFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
                ? "Update the event details, schedule, or poster media."
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

                <div className="field">
                  <label htmlFor="event-poster-kind">Poster media</label>
                  <select
                    id="event-poster-kind"
                    value={formState.posterKind}
                    disabled={Boolean(posterFile)}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        posterKind: event.target.value as CulturePosterKind | ""
                      }))
                    }
                  >
                    <option value="">No poster media</option>
                    <option value="image">Image</option>
                    <option value="video">Looping video</option>
                  </select>
                  <p className="helper-text">
                    {posterFile
                      ? "Media type was inferred from the uploaded file."
                      : "Pick a type if you want to use a media URL instead of uploading a file."}
                  </p>
                </div>

                <div className="field full">
                  <label htmlFor="event-poster-upload">Upload poster media</label>
                  <input
                    ref={fileInputRef}
                    id="event-poster-upload"
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handlePosterFileChange}
                    disabled={isSaving}
                  />
                  <p className="helper-text">
                    Optional. Upload an image or short looping video. Images can be up to 10MB
                    and videos up to 40MB.
                  </p>
                  {posterFile ? (
                    <div className={styles.uploadSummary}>
                      <span>
                        {posterFile.name} ({formatFileSize(posterFile.size)})
                      </span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={clearPosterFile}
                        disabled={isSaving}
                      >
                        Remove upload
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="field full">
                  <label htmlFor="event-poster-url">Poster media URL</label>
                  <input
                    id="event-poster-url"
                    type="url"
                    value={formState.posterUrl}
                    disabled={Boolean(posterFile)}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, posterUrl: event.target.value }))
                    }
                    placeholder={
                      formState.posterKind === "video"
                        ? "https://example.com/event-loop.mp4"
                        : "https://example.com/event-poster.jpg"
                    }
                  />
                  <p className="helper-text">
                    {posterFile
                      ? "The uploaded file will be used for the poster."
                      : isEditing
                        ? "Keep the current media URL, replace it with a new upload or URL, or clear both poster fields to remove it."
                        : "Optional. Paste an existing image or short muted looping video URL instead of uploading a file."}
                  </p>
                </div>
              </div>

              {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

              <div className={styles.modalActions}>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving
                    ? posterFile
                      ? "Uploading..."
                      : isEditing
                        ? "Saving..."
                        : "Creating..."
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
