"use client";

import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { useState, type FormEvent } from "react";
import { AVEYO_INFO_EMAIL_HREF } from "@/lib/site-config";

type FormKey = "sales" | "team";

interface InquiryFormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const initialFormState: InquiryFormState = {
  name: "",
  email: "",
  phone: "",
  message: ""
};

function buildMailtoLink(subject: string, state: InquiryFormState) {
  const body = [
    `Name: ${state.name}`,
    `Email: ${state.email}`,
    `Phone: ${state.phone || "Not provided"}`,
    "",
    state.message
  ].join("\n");

  const params = new URLSearchParams({
    subject,
    body
  });

  return `${AVEYO_INFO_EMAIL_HREF}?${params.toString()}`;
}

function InquiryCard({
  id,
  title,
  description,
  submitLabel,
  subjectPrefix
}: {
  id: FormKey;
  title: string;
  description: string;
  submitLabel: string;
  subjectPrefix: string;
}) {
  const [formState, setFormState] = useState<InquiryFormState>(initialFormState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = buildMailtoLink(subjectPrefix, formState);
  }

  return (
    <article
      id={`${id}-form`}
      className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] shadow-[0_20px_60px_rgba(10,22,40,0.08)]"
    >
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      <div className="relative z-[2]">
        <div className="max-w-[46ch]">
          <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
            {title}
          </p>
          <p className="mt-4 text-[length:var(--site-body)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
            {description}
          </p>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Name
              <input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                className="rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#212120] focus:border-[color:var(--site-black)]"
              />
            </label>
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Email
              <input
                type="email"
                required
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                className="rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#212120] focus:border-[color:var(--site-black)]"
              />
            </label>
          </div>

          <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
            Phone
            <input
              value={formState.phone}
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#212120] focus:border-[color:var(--site-black)]"
            />
          </label>

          <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
            Message
            <textarea
              required
              value={formState.message}
              onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
              className="min-h-[180px] rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#212120] focus:border-[color:var(--site-black)]"
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[length:var(--site-paragraph)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
              Submitting opens your default email client with the message pre-filled.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-white transition-opacity hover:opacity-90"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

export default function ContactInquiryForms() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <InquiryCard
        id="sales"
        title="Talk To Sales"
        description="Send a message to our sales team and we will follow up with the right next step for your home."
        submitLabel="Send To Sales"
        subjectPrefix="Aveyo Sales Inquiry"
      />
      <InquiryCard
        id="team"
        title="Message The Team"
        description="Use this option for general questions, follow-up needs, or anything that does not fit the sales flow."
        submitLabel="Message Our Team"
        subjectPrefix="Aveyo General Inquiry"
      />
    </div>
  );
}
