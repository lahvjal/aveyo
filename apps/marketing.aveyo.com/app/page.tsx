"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { authApiRequest } from "@/lib/auth/session";
import { MARKETING_SECTION_TABS } from "@/lib/marketing-sections";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import designSystem from "../../aveyo.com/design-system.json";
import styles from "./marketing-request-page.module.css";

const ASANA_REQUEST_FORM_URL =
  process.env.NEXT_PUBLIC_MARKETING_ASANA_FORM_URL?.trim() || "https://app.asana.com/";

const designTokens = designSystem.tokens;

const marketingRequestStyleVars = {
  "--marketing-color-canvas": designTokens.colors.pageShellBg,
  "--marketing-color-surface": designTokens.colors.customerSurface,
  "--marketing-color-surface-top": designTokens.colors.surfaceLightTop,
  "--marketing-color-surface-bottom": designTokens.colors.surfaceLightBottom,
  "--marketing-color-text-primary": designTokens.colors.black,
  "--marketing-color-text-secondary": designTokens.colors.grayDark4,
  "--marketing-color-text-subtle": designTokens.colors.grayDark2,
  "--marketing-color-border": designTokens.colors.borderSoft,
  "--marketing-color-border-muted": designTokens.colors.customerBorder,
  "--marketing-color-border-soft": designTokens.colors.customerBorderMuted,
  "--marketing-color-accent": designTokens.colors.customerActionBlue,
  "--marketing-color-accent-hover": designTokens.colors.customerActionBlueHover,
  "--marketing-color-success-bg": designTokens.colors.blueTint,
  "--marketing-color-success-border": designTokens.colors.customerActionBlue,
  "--marketing-color-success-text": designTokens.colors.navy,
  "--marketing-color-warning-bg": designTokens.colors.cream,
  "--marketing-color-warning-border": designTokens.colors.borderSoftAlt,
  "--marketing-color-warning-text": designTokens.colors.navySoft,
  "--marketing-font-h2": `${designTokens.fontSize.h2}px`,
  "--marketing-font-h4": `${designTokens.fontSize.h4}px`,
  "--marketing-font-h5": `${designTokens.fontSize.h5}px`,
  "--marketing-font-h6": `${designTokens.fontSize.h6}px`,
  "--marketing-font-h7": `${designTokens.fontSize.h7}px`,
  "--marketing-font-paragraph": `${designTokens.fontSize.paragraph}px`,
  "--marketing-space-button-x": `${designTokens.spacing.buttonHorizontal}px`,
  "--marketing-space-button-y": `${designTokens.spacing.buttonVertical}px`,
  "--marketing-space-card-padding": `${designTokens.spacing.cardPadding}px`,
  "--marketing-space-card-padding-compact": `${designTokens.spacing.customerSidebarPadding}px`,
  "--marketing-space-panel-padding": `${designTokens.spacing.customerPanelPadding}px`,
  "--marketing-space-grid-gap": `${designTokens.layout.customerGridGap}px`,
  "--marketing-radius-button": `${designTokens.radius.button}px`,
  "--marketing-radius-card": `${designTokens.radius.card}px`,
  "--marketing-radius-field": `${designTokens.radius.field}px`,
  "--marketing-shadow-panel": designTokens.effects.customerPanelShadow,
  "--line-soft": "var(--marketing-color-border-soft)",
  "--panel-start": "var(--marketing-color-surface-top)",
  "--panel-end": "var(--marketing-color-surface-bottom)"
} as CSSProperties;

const marketingFieldStyle = {
  borderRadius: "var(--marketing-radius-field)"
} as CSSProperties;

interface DepartmentOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface MarketingRequestFormState {
  title: string;
  departmentId: string;
  dueDate: string;
  channel: string;
  details: string;
  requesterName: string;
  requesterEmail: string;
}

const defaultFormState: MarketingRequestFormState = {
  title: "",
  departmentId: "",
  dueDate: "",
  channel: "email",
  details: "",
  requesterName: "",
  requesterEmail: ""
};

function buildMarketingRequestSummary(form: MarketingRequestFormState, departmentLabel: string): string {
  return [
    `Title: ${form.title}`,
    `Department: ${departmentLabel}`,
    `Due date: ${form.dueDate || "Not specified"}`,
    `Delivery channel: ${form.channel}`,
    `Requester: ${form.requesterName} (${form.requesterEmail})`,
    "",
    "Request details:",
    form.details
  ].join("\n");
}

export default function MarketingRequestPage() {
  const session = useRequireAuth();
  const [formState, setFormState] = useState<MarketingRequestFormState>(defaultFormState);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState("");

  useEffect(() => {
    if (!session.authenticated) {
      return;
    }

    setFormState((currentState) => {
      const fallbackName = session.user?.name?.trim() || "";
      const fallbackEmail = session.user?.email?.trim() || "";
      const nextRequesterName = currentState.requesterName || fallbackName;
      const nextRequesterEmail = currentState.requesterEmail || fallbackEmail;

      if (
        nextRequesterName === currentState.requesterName &&
        nextRequesterEmail === currentState.requesterEmail
      ) {
        return currentState;
      }

      return {
        ...currentState,
        requesterName: nextRequesterName,
        requesterEmail: nextRequesterEmail
      };
    });
  }, [session.authenticated, session.user?.name, session.user?.email]);

  useEffect(() => {
    if (!session.authenticated) {
      return;
    }

    let cancelled = false;
    async function loadDepartments() {
      setDepartmentsLoading(true);
      setDepartmentsError("");
      try {
        const payload = await authApiRequest<{ departments?: DepartmentOption[] }>(
          "/api/marketing/departments",
          {
            method: "GET"
          }
        );
        if (cancelled) {
          return;
        }

        const options = Array.isArray(payload.departments)
          ? payload.departments
              .filter(
                (option): option is DepartmentOption =>
                  Boolean(option && typeof option.id === "string" && typeof option.name === "string")
              )
              .sort((left, right) => left.name.localeCompare(right.name))
          : [];
        setDepartmentOptions(options);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setDepartmentOptions([]);
        setDepartmentsError(
          error instanceof Error
            ? error.message
            : "Unable to load departments from Supabase right now."
        );
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false);
        }
      }
    }

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  const departmentCount = departmentOptions.length;
  const submissionDisabled = departmentsLoading || departmentCount === 0;

  async function handleCopySummary() {
    if (!generatedSummary) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedSummary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedDepartmentName =
      departmentOptions.find((option) => option.id === formState.departmentId)?.name ||
      "Unknown department";
    const summary = buildMarketingRequestSummary(formState, selectedDepartmentName);
    setGeneratedSummary(summary);
    setCopyStatus("idle");

    if (typeof window !== "undefined") {
      const openedWindow = window.open(ASANA_REQUEST_FORM_URL, "_blank", "noopener,noreferrer");
      if (openedWindow) {
        setSubmissionMessage(
          "Request brief generated and Asana opened in a new tab. Paste the brief into your task."
        );
      } else {
        setSubmissionMessage(
          "Request brief generated. Pop-up was blocked, so open Asana manually with the button below."
        );
      }
    }
  }

  return (
    <MarketingShell
      session={session}
      currentPath="/"
      title="Marketing Request Center"
      description="Plan campaign work, route requests into Asana, and keep marketing handoffs consistent."
      sectionTabs={MARKETING_SECTION_TABS}
    >
      <div className={styles.pageStack} style={marketingRequestStyleVars}>
        <section className={styles.heroGrid} aria-label="Marketing workspace overview">
          <div className={styles.heroPanel}>
            <p className={styles.heroEyebrow}>Aveyo Marketing Workspace</p>
            <h2 className={styles.heroTitle}>Build a cleaner handoff before work hits the queue.</h2>
            <p className={styles.heroDescription}>
              Capture campaign context once, create a reusable brief, and send the request straight
              into the marketing Asana workflow without losing the details your team needs to start.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Departments</span>
                <span className={styles.statValue}>
                  {departmentsLoading ? "Loading..." : `${departmentCount} available`}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Destination</span>
                <span className={styles.statValue}>Asana intake</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Requester</span>
                <span className={styles.statValue}>
                  {formState.requesterName || session.user?.name || "Auto-filled"}
                </span>
              </div>
            </div>
            <div className={styles.heroActions}>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const formElement = document.getElementById("marketing-request-form");
                  formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Start request
              </button>
              <Link href="/news" className="secondary-button">
                Open News CMS
              </Link>
            </div>
          </div>

          <aside className={styles.supportPanel} aria-label="Quick guidance">
            <div>
              <h2 className={styles.supportTitle}>Quick guidance</h2>
              <p className={styles.supportCopy}>
                Use this workspace for scoped asks that need campaign context, timing, ownership,
                and a clear delivery channel.
              </p>
            </div>
            <ul className={styles.supportList}>
              <li>Keep the title outcome-focused so the request is easy to triage in the queue.</li>
              <li>Pick the department first so routing and follow-up ownership are clear.</li>
              <li>Include audience, business goal, assets needed, and any immovable deadlines.</li>
            </ul>
            <a
              href={ASANA_REQUEST_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              Open Asana directly
            </a>
          </aside>
        </section>

        <section className={styles.contentGrid} aria-label="Marketing request form">
          <div className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Request brief</h2>
                <p className={styles.panelDescription}>
                  Fill in the core request details below. When you submit, the page generates a
                  clean brief for copy-paste into Asana.
                </p>
              </div>
              <span className={styles.panelBadge}>Internal intake</span>
            </div>

            <form id="marketing-request-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="request-title">Request title</label>
                  <input
                    id="request-title"
                    name="request-title"
                    required
                    style={marketingFieldStyle}
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, title: event.target.value }))
                    }
                    placeholder="Q2 referral campaign launch support"
                  />
                </div>

                <div className="field">
                  <label htmlFor="request-department">Department</label>
                  <select
                    id="request-department"
                    name="request-department"
                    required
                    style={marketingFieldStyle}
                    value={formState.departmentId}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, departmentId: event.target.value }))
                    }
                    disabled={submissionDisabled}
                  >
                    <option value="">
                      {departmentsLoading
                        ? "Loading departments..."
                        : departmentCount > 0
                          ? "Select a department"
                          : "No departments available"}
                    </option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="request-due-date">Needed by</label>
                  <input
                    id="request-due-date"
                    name="request-due-date"
                    type="date"
                    style={marketingFieldStyle}
                    value={formState.dueDate}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, dueDate: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="request-channel">Primary channel</label>
                  <select
                    id="request-channel"
                    name="request-channel"
                    style={marketingFieldStyle}
                    value={formState.channel}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, channel: event.target.value }))
                    }
                  >
                    <option value="email">Email</option>
                    <option value="paid-social">Paid Social</option>
                    <option value="organic-social">Organic Social</option>
                    <option value="web">Web</option>
                    <option value="print">Print</option>
                    <option value="events">Events</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="requester-name">Requester name</label>
                  <input
                    id="requester-name"
                    name="requester-name"
                    required
                    style={marketingFieldStyle}
                    value={formState.requesterName}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, requesterName: event.target.value }))
                    }
                    placeholder="Jane Employee"
                  />
                </div>

                <div className="field">
                  <label htmlFor="requester-email">Requester email</label>
                  <input
                    id="requester-email"
                    name="requester-email"
                    type="email"
                    required
                    style={marketingFieldStyle}
                    value={formState.requesterEmail}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, requesterEmail: event.target.value }))
                    }
                    placeholder="jane@aveyo.com"
                  />
                </div>

                <div className="field full">
                  <label htmlFor="request-details">Request details</label>
                  <textarea
                    id="request-details"
                    name="request-details"
                    required
                    style={marketingFieldStyle}
                    value={formState.details}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, details: event.target.value }))
                    }
                    placeholder="What are you requesting, why is it needed, who is the target audience, and what should success look like?"
                  />
                </div>
              </div>

              <div className={styles.formFootnotes}>
                <p className="helper-text">Department options are loaded from Supabase.</p>
                <p className="helper-text">
                  Configure <code>NEXT_PUBLIC_MARKETING_ASANA_FORM_URL</code> to direct requests
                  into the right Asana project.
                </p>
              </div>

              {departmentsError ? <div className="notice warning">{departmentsError}</div> : null}

              <div className="button-row">
                <button type="submit" className="primary-button" disabled={submissionDisabled}>
                  Generate brief and open Asana
                </button>
                <a
                  href={ASANA_REQUEST_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  Open Asana
                </a>
              </div>
            </form>

            {submissionMessage ? <div className="notice success">{submissionMessage}</div> : null}
          </div>

          <div className={styles.sidebarStack}>
            <aside className={styles.sidebarPanel} aria-label="Request checklist">
              <h2 className={styles.sidebarTitle}>Before you submit</h2>
              <p className={styles.sidebarCopy}>
                The best briefs make it obvious what needs to be delivered, when it is needed, and
                why it matters.
              </p>
              <ul className={styles.checklist}>
                <li>State the business objective or campaign outcome you are driving toward.</li>
                <li>Call out required assets, approvals, or dependencies the team should expect.</li>
                <li>Document fixed launch dates, live events, or stakeholder review milestones.</li>
              </ul>
            </aside>

            {generatedSummary ? (
              <section className={styles.summaryPanel} aria-label="Generated request brief">
                <h2 className={styles.summaryTitle}>Generated request brief</h2>
                <p className={styles.summaryDescription}>
                  Paste this directly into the Asana task so the project starts with the same brief
                  your team reviewed here.
                </p>
                <pre className="request-summary">{generatedSummary}</pre>
                <div className={styles.summaryActionRow}>
                  <button type="button" className="secondary-button" onClick={handleCopySummary}>
                    Copy brief
                  </button>
                  {copyStatus === "copied" ? (
                    <span className={styles.summaryStatus}>Copied to clipboard.</span>
                  ) : null}
                  {copyStatus === "error" ? (
                    <span className={styles.summaryStatus}>
                      Unable to copy. Copy manually from the box.
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
