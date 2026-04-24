"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  createCultureAnnouncement,
  type CultureAnnouncement
} from "@/lib/culture";
import styles from "./culture-page.module.css";

interface CreateAnnouncementFormState {
  title: string;
  message: string;
  authorName: string;
}

interface CreateCultureAnnouncementModalProps {
  isOpen: boolean;
  canCreateAnnouncements: boolean;
  currentUserName?: string | null;
  onClose: () => void;
  onCreated: (announcement: CultureAnnouncement) => void;
}

function buildFormState(currentUserName?: string | null): CreateAnnouncementFormState {
  return {
    title: "",
    message: "",
    authorName: currentUserName?.trim() || ""
  };
}

export function CreateCultureAnnouncementModal({
  isOpen,
  canCreateAnnouncements,
  currentUserName,
  onClose,
  onCreated
}: CreateCultureAnnouncementModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [formState, setFormState] = useState<CreateAnnouncementFormState>(() =>
    buildFormState(currentUserName)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormState(buildFormState(currentUserName));
      setIsSaving(false);
      setErrorMessage("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setFormState(buildFormState(currentUserName));
    setIsSaving(false);
    setErrorMessage("");

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
  }, [currentUserName, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateAnnouncements || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const announcement = await createCultureAnnouncement(formState);
      setFormState(buildFormState(currentUserName));
      onCreated(announcement);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create announcement. Please try again."
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
              Add Announcement
            </h2>
            <p id={descriptionId} className={styles.modalDescription}>
              Share an internal update in the announcements panel.
            </p>
          </div>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close add announcement form"
          >
            Close
          </button>
        </div>

        <div className={styles.modalBody}>
          {canCreateAnnouncements ? (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="announcement-title">Announcement title</label>
                  <input
                    id="announcement-title"
                    required
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, title: event.target.value }))
                    }
                    placeholder="Office access update"
                  />
                </div>

                <div className="field full">
                  <label htmlFor="announcement-author">Author</label>
                  <input
                    id="announcement-author"
                    required
                    value={formState.authorName}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, authorName: event.target.value }))
                    }
                    placeholder="People Team"
                  />
                </div>

                <div className="field full">
                  <label htmlFor="announcement-message">Message</label>
                  <textarea
                    id="announcement-message"
                    required
                    value={formState.message}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, message: event.target.value }))
                    }
                    placeholder="Add the key update, any deadlines, and what employees need to know."
                  />
                </div>
              </div>

              {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

              <div className={styles.modalActions}>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? "Publishing..." : "Publish announcement"}
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
            <div className="access-denied">
              You do not have permission to create announcements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
