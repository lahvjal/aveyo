import {
  type CustomerPanelDetails,
  type HistoryNote,
  type Ticket
} from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface DetailColumnProps {
  activeTicket: Ticket | null;
  customerDetails: CustomerPanelDetails | null;
  customerDetailsLoading?: boolean;
  sidebarNote: string;
  historyNotes: HistoryNote[];
  notesDisabled?: boolean;
  notesDisabledReason?: string;
  savePending?: boolean;
  onSidebarNoteChange: (value: string) => void;
  onAddSidebarNote: () => void;
}

export function DetailColumn({
  activeTicket,
  customerDetails,
  customerDetailsLoading = false,
  sidebarNote,
  historyNotes,
  notesDisabled = false,
  notesDisabledReason,
  savePending = false,
  onSidebarNoteChange,
  onAddSidebarNote
}: DetailColumnProps) {
  const hasSelectedConversation = Boolean(activeTicket);
  const noteDisabled = !hasSelectedConversation || notesDisabled;
  const saveDisabled = noteDisabled || savePending || sidebarNote.trim().length === 0;
  const fieldValue = (value: string | null | undefined) =>
    customerDetailsLoading ? "Loading..." : value || "N/A";

  return (
    <aside className="detail-column">
      <header className="detail-topbar">
        <div className="chat-top-identity">
          <InitialChip initials={activeTicket?.initials ?? "NA"} tone="sand" size={40} />
          <strong>{activeTicket?.fullName ?? "No customer selected"}</strong>
        </div>
        <button type="button" aria-label="Close panel">
          ×
        </button>
      </header>

      {hasSelectedConversation ? (
        <div className="detail-info">
          <div>
            <span>ID:</span>
            <p>{fieldValue(customerDetails?.customerId)}</p>
          </div>
          <div>
            <span>Email:</span>
            <p>{fieldValue(customerDetails?.email ?? activeTicket?.email)}</p>
          </div>
          <div>
            <span>Phone Number:</span>
            <p>{fieldValue(customerDetails?.phone)}</p>
          </div>
          <div>
            <span>Address:</span>
            <p>{fieldValue(customerDetails?.address)}</p>
          </div>
          <div>
            <span>Fin:</span>
            <p>{fieldValue(customerDetails?.fin)}</p>
          </div>
          <div>
            <span>Project Ref:</span>
            <p>{fieldValue(customerDetails?.projectRef)}</p>
          </div>
          <div>
            <span>Project Status:</span>
            <p>{fieldValue(customerDetails?.projectStatus)}</p>
          </div>
        </div>
      ) : (
        <div className="detail-empty-state">
          <strong>Customer details appear here</strong>
          <p>Claim a chat from the queue to view contact details and project context.</p>
        </div>
      )}

      <div className={`detail-note-block${noteDisabled ? " is-disabled" : ""}`}>
        <p>Notes</p>
        <div className="detail-note-input">
          <textarea
            value={sidebarNote}
            disabled={noteDisabled}
            onChange={(event) => onSidebarNoteChange(event.target.value)}
            placeholder={
              noteDisabled
                ? notesDisabledReason ?? "Select a chat to add internal notes."
                : "Write a note..."
            }
          />
          <button
            type="button"
            onClick={onAddSidebarNote}
            className={savePending ? "is-loading" : ""}
            aria-label={savePending ? "Saving side note" : "Save side note"}
            disabled={saveDisabled}
          >
            {savePending ? <span className="inline-button-spinner" aria-hidden="true" /> : "↑"}
          </button>
        </div>
      </div>

      <div className="detail-history">
        {!hasSelectedConversation ? (
          <p className="empty-state">Select a conversation to load notes history.</p>
        ) : noteDisabled && notesDisabledReason ? (
          <p className="empty-state">{notesDisabledReason}</p>
        ) : historyNotes.length === 0 ? (
          <p className="empty-state">No notes yet. Add one above.</p>
        ) : (
          historyNotes.map((note) => (
            <article key={note.id} className="history-item">
              <div className="history-head">
                <div className="history-author">
                  <InitialChip initials="JC" tone="sand" size={40} />
                  <div>
                    <strong>{note.author}</strong>
                    <small>{note.timestamp}</small>
                  </div>
                </div>
                <span aria-hidden>•••</span>
              </div>
              <p>{note.body}</p>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
