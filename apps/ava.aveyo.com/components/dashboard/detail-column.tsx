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

interface DetailColumnProps {
  activeTicket: Ticket | null;
  customerDetails: CustomerPanelDetails | null;
  customerDetailsLoading?: boolean;
  historyNotes: HistoryNote[];
}

export function DetailColumn({
  activeTicket,
  customerDetails,
  customerDetailsLoading = false,
  historyNotes
}: DetailColumnProps) {
  const hasSelectedConversation = Boolean(activeTicket);
  const fieldValue = (value: string | null | undefined) =>
    customerDetailsLoading ? "Loading..." : value || "N/A";

  return (
    <aside className="detail-column">
      <header className="detail-topbar">
        <strong>Details</strong>
        {customerDetails?.podioLink ? (
          <a
            className="detail-top-link"
            href={customerDetails.podioLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Podio Link
          </a>
        ) : (
          <span className="detail-top-link detail-top-link-disabled">Podio Link</span>
        )}
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

      <div className="detail-note-block">
        <p>Notes</p>
      </div>

      <div className="detail-history">
        {!hasSelectedConversation ? (
          <p className="empty-state">Select a conversation to load notes history.</p>
        ) : historyNotes.length === 0 ? (
          <p className="empty-state">No notes yet. Use Note mode to add one.</p>
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
