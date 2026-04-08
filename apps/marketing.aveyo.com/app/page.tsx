"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { authApiRequest } from "@/lib/auth/session";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

const ASANA_REQUEST_FORM_URL =
  process.env.NEXT_PUBLIC_MARKETING_ASANA_FORM_URL?.trim() || "https://app.asana.com/";

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
      title="Marketing Request Form"
      description="Capture campaign requests and send them to the Asana workflow."
    >
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="request-title">Request title</label>
              <input
                id="request-title"
                name="request-title"
                required
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
                value={formState.departmentId}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, departmentId: event.target.value }))
                }
                disabled={departmentsLoading || departmentOptions.length === 0}
              >
                <option value="">
                  {departmentsLoading
                    ? "Loading departments..."
                    : departmentOptions.length > 0
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
                value={formState.details}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, details: event.target.value }))
                }
                placeholder="What are you requesting, why is it needed, and who is the target audience?"
              />
            </div>
          </div>

          <p className="helper-text">
            Department options are loaded from Supabase.
          </p>
          <p className="helper-text">
            Configure a specific Asana form URL with
            <code> NEXT_PUBLIC_MARKETING_ASANA_FORM_URL</code> to direct requests into the right
            project.
          </p>

          {departmentsError ? <div className="notice warning">{departmentsError}</div> : null}

          <div className="button-row">
            <button
              type="submit"
              className="primary-button"
              disabled={departmentsLoading || departmentOptions.length === 0}
            >
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

        {generatedSummary ? (
          <div className="card">
            <h2>Generated request brief</h2>
            <pre className="request-summary">{generatedSummary}</pre>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={handleCopySummary}>
                Copy brief
              </button>
              {copyStatus === "copied" ? <span>Copied to clipboard.</span> : null}
              {copyStatus === "error" ? <span>Unable to copy. Copy manually from the box.</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </MarketingShell>
  );
}
