interface HandoffRequestModalProps {
  requestReason: string;
  onRequestReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function HandoffRequestModal({
  requestReason,
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
        onChange={(event) => onRequestReasonChange(event.target.value)}
        placeholder="What can we help you with?"
      />
      <div className="request-modal-actions">
        <button type="button" className="request-action cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="request-action send" onClick={onSubmit}>
          Send Request
        </button>
      </div>
    </div>
  );
}
