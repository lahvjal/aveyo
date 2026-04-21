import {
  type CustomerPanelDetails,
  type HistoryNote,
  type Ticket
} from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

function getNameInitials(name: string | null | undefined, fallback = "NA") {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return fallback;
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return fallback;
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

interface WorkspaceDetailsOverlayProps {
  activeTicket: Ticket | null;
  customerDetails: CustomerPanelDetails | null;
  customerDetailsLoading?: boolean;
  historyNotes: HistoryNote[];
  historyNotesLoading?: boolean;
  onClose: () => void;
}

export function WorkspaceDetailsOverlay({
  activeTicket,
  customerDetails,
  customerDetailsLoading = false,
  historyNotes,
  historyNotesLoading = false,
  onClose
}: WorkspaceDetailsOverlayProps) {
  const hasSelectedConversation = Boolean(activeTicket);
  const fieldValue = (value: string | null | undefined) =>
    customerDetailsLoading ? "Loading..." : value || "N/A";

  return (
    <div className="workspace-details-overlay">
      <button
        type="button"
        className="workspace-details-overlay-backdrop"
        aria-label="Close details panel"
        onClick={onClose}
      />

      <aside
        id="workspace-details-panel"
        className="workspace-details-panel"
        role="dialog"
        aria-label="Details and notes panel"
      >
        <header className="workspace-details-panel-header">
          <strong>Details</strong>
          <button
            type="button"
            className="workspace-details-panel-close"
            aria-label="Close details panel"
            onClick={onClose}
          >
            <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {hasSelectedConversation ? (
          <div className="workspace-details-panel-info">
            <span className="workspace-details-panel-link">Podio Link</span>

            <div className="workspace-details-panel-field">
              <span>ID:</span>
              <p>{fieldValue(customerDetails?.customerId)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Email:</span>
              <p>{fieldValue(customerDetails?.email ?? activeTicket?.email)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Phone Number:</span>
              <p>{fieldValue(customerDetails?.phone)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Address:</span>
              <p>{fieldValue(customerDetails?.address)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Fin:</span>
              <p>{fieldValue(customerDetails?.fin)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Project Ref:</span>
              <p>{fieldValue(customerDetails?.projectRef)}</p>
            </div>

            <div className="workspace-details-panel-field">
              <span>Project Status:</span>
              <p>{fieldValue(customerDetails?.projectStatus)}</p>
            </div>
          </div>
        ) : (
          <div className="workspace-details-panel-empty">
            <strong>Customer details appear here</strong>
            <p>Select a conversation to view contact details and note history.</p>
          </div>
        )}

        <section className="workspace-details-panel-notes">
          <header className="workspace-details-panel-notes-header">
            <strong>Notes</strong>
          </header>

          <div className="workspace-details-panel-history">
            {!hasSelectedConversation ? (
              <p className="empty-state">Select a conversation to load notes history.</p>
            ) : historyNotesLoading ? (
              <p className="empty-state">Loading notes...</p>
            ) : historyNotes.length === 0 ? (
              <p className="empty-state">No notes yet. Add an internal note from the transcript composer.</p>
            ) : (
              historyNotes.map((note) => (
                <article key={note.id} className="history-item">
                  <div className="history-head">
                    <div className="history-author">
                      <InitialChip initials={getNameInitials(note.author)} tone="sand" size={40} />
                      <div>
                        <strong>{note.author}</strong>
                        <small>{note.timestamp}</small>
                      </div>
                    </div>
                    <span aria-hidden="true">•••</span>
                  </div>
                  <p>{note.body}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
