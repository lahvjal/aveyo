interface HandoffRequestModalProps {
  requestReason: string;
  submitting?: boolean;
  onRequestReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function HandoffRequestModal({
  requestReason,
  submitting = false,
  onRequestReasonChange,
  onCancel,
  onSubmit
}: HandoffRequestModalProps) {
  return (
    <div className="request-modal-card">
      <h3>Requesting Human Assistance</h3>
      <p>
        You&apos;ll be connected with a customer service representative shortly.
        Optionally, let us know how we can help:
      </p>
      <textarea
        value={requestReason}
        disabled={submitting}
        onChange={(event) => onRequestReasonChange(event.target.value)}
        placeholder="What can we help you with?"
      />
      {submitting ? (
        <p className="request-modal-status" role="status" aria-live="polite">
          <span className="request-action-spinner" aria-hidden="true" /> Sending request...
        </p>
      ) : null}
      <div className="request-modal-actions">
        <button type="button" className="request-action cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className="request-action send" onClick={onSubmit} disabled={submitting}>
          <span className="request-action-label">
            {submitting ? (
              <>
                <span className="request-action-spinner" aria-hidden="true" />
                Sending...
              </>
            ) : (
              "Send Request"
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
