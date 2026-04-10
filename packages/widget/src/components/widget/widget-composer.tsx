interface WidgetComposerProps {
  draft: string;
  disabled?: boolean;
  actionDisabled?: boolean;
  sending?: boolean;
  requestPending?: boolean;
  showTalkToRep?: boolean;
  showTestModeToggle?: boolean;
  testModeEnabled?: boolean;
  testModeToggleDisabled?: boolean;
  onDraftChange: (value: string) => void;
  onSendDraft: () => void;
  onOpenRequestModal: () => void;
  onTestModeChange?: (enabled: boolean) => void;
}

export function WidgetComposer({
  draft,
  disabled = false,
  actionDisabled = false,
  sending = false,
  requestPending = false,
  showTalkToRep = false,
  showTestModeToggle = false,
  testModeEnabled = false,
  testModeToggleDisabled = false,
  onDraftChange,
  onSendDraft,
  onOpenRequestModal,
  onTestModeChange
}: WidgetComposerProps) {
  const showTopRow = showTalkToRep || showTestModeToggle;
  const hasDraft = draft.trim().length > 0;
  const sendDisabled = disabled || actionDisabled || sending || !hasDraft;
  const repActionDisabled = actionDisabled || requestPending;
  const sendButtonClassName = `composer-send-button${
    hasDraft && !disabled && !actionDisabled && !sending ? " is-active" : ""
  }${sending ? " is-loading" : ""}`;

  return (
    <div className="widget-bottom">
      {showTopRow ? (
        <div className="widget-bottom-top">
          {showTalkToRep ? (
            <button
              type="button"
              className="rep-trigger-pill"
              onClick={onOpenRequestModal}
              disabled={repActionDisabled}
              aria-label={requestPending ? "Requesting representative support" : "Talk to a representative"}
            >
              <span className="rep-trigger-icon" aria-hidden>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="15.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M4 17.5C4 15.25 6.05 13.5 8.5 13.5C10.95 13.5 13 15.25 13 17.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13 16.8C13.45 15.45 14.75 14.5 16.25 14.5C17.6 14.5 18.75 15.2 19.5 16.35"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="rep-trigger-label">
                {requestPending ? (
                  <>
                    <span className="request-action-spinner" aria-hidden="true" />
                    Requesting...
                  </>
                ) : (
                  "Talk to a rep"
                )}
              </span>
            </button>
          ) : (
            <div className="widget-bottom-spacer" />
          )}

          {showTestModeToggle ? (
            <div className="testmode-toggle-wrap">
              <span className="testmode-toggle-label">Test Mode</span>
              <div className={`testmode-toggle ${testModeEnabled ? "on" : "off"}`}>
                <button
                  type="button"
                  className={!testModeEnabled ? "active" : ""}
                  onClick={() => onTestModeChange?.(false)}
                  disabled={testModeToggleDisabled}
                >
                  Off
                </button>
                <button
                  type="button"
                  className={testModeEnabled ? "active" : ""}
                  onClick={() => onTestModeChange?.(true)}
                  disabled={testModeToggleDisabled}
                >
                  On
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="composer-row">
        <input
          value={draft}
          disabled={disabled}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!sendDisabled) {
                onSendDraft();
              }
            }
          }}
          placeholder="Message"
        />
        <button
          onClick={onSendDraft}
          type="button"
          aria-label={sending ? "Sending message" : "Send message"}
          disabled={sendDisabled}
          className={sendButtonClassName}
        >
          {sending ? <span className="composer-send-spinner" aria-hidden="true" /> : "↑"}
        </button>
      </div>
    </div>
  );
}
