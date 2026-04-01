interface WidgetTestModeOption {
  projectRef: string;
  label: string;
}

interface WidgetTestModeProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  options: WidgetTestModeOption[];
  selectedProjectRef: string;
  onSelectProjectRef: (projectRef: string) => void;
  activeImpersonationLabel?: string;
  onCancelImpersonation: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export function WidgetTestMode({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  options,
  selectedProjectRef,
  onSelectProjectRef,
  activeImpersonationLabel,
  onCancelImpersonation,
  disabled = false,
  busy = false
}: WidgetTestModeProps) {
  return (
    <section className="widget-testmode">
      <header className="widget-testmode-header">
        <div className="widget-testmode-heading">
          <span className="widget-testmode-dot" aria-hidden />
          <strong>Test Mode</strong>
        </div>
        <p>Impersonate customer chats</p>
      </header>

      <div className="widget-testmode-controls">
        <div className="widget-testmode-search-row">
          <input
            value={searchQuery}
            disabled={disabled || busy}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder="Search customer"
          />
          <button
            type="button"
            aria-label="Search customers"
            onClick={onSearch}
            disabled={disabled || busy}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="6.6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16.5 16.5L20.5 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="widget-testmode-select-row">
          <select
            value={selectedProjectRef}
            disabled={disabled || busy}
            onChange={(event) => onSelectProjectRef(event.target.value)}
          >
            <option value="">-</option>
            {options.map((option) => (
              <option key={option.projectRef} value={option.projectRef}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {activeImpersonationLabel ? (
          <div className="widget-testmode-active-row">
            <span className="widget-testmode-check" aria-hidden>
              ✓
            </span>
            <strong>{`Impersonating ${activeImpersonationLabel}`}</strong>
            <button
              type="button"
              className="widget-testmode-cancel"
              onClick={onCancelImpersonation}
              disabled={disabled || busy}
              aria-label="Cancel impersonation"
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
