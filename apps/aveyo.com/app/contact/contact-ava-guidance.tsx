"use client";

import { SiteButtonLink } from "@/components/site/site-button-link";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import {
  AVEYO_CUSTOMER_CARE_PHONE,
  AVEYO_CUSTOMER_CARE_PHONE_HREF,
  AVEYO_SALES_PHONE_HREF
} from "@/lib/site-config";

const suggestedQuestions = [
  "Is solar worth it for my home?",
  "Should I choose subscription or ownership?",
  "How long do permitting and installation usually take?",
  "What incentives usually matter in my state?"
];

function openAvaWidget() {
  const launcher = document.querySelector<HTMLButtonElement>('button[aria-label="Open Ava widget"]');
  if (!launcher) {
    return;
  }

  launcher.click();
  launcher.focus();
}

export default function ContactAvaGuidance() {
  return (
    <div id="ask-ava" className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <article className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
        <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
        <div className="relative z-[2]">
          <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
            Talk To Ava
          </p>
          <h3
            className="mt-4 text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]"
            style={{ fontSize: "clamp(2rem, 4vw, var(--site-h3))" }}
          >
            Get answers faster than a contact form.
          </h3>
          <p className="mt-5 max-w-[58ch] text-[length:var(--site-body)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
            Ask Ava about solar basics, plan options, incentives, installation timing, or what to do next. For
            project-specific updates, sign in or reach customer care. If you need a live person, Ava can still
            help point you to the right next step instead of making you guess which team to contact.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAvaWidget}
              className="inline-flex items-center justify-center rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-white transition-opacity hover:opacity-90"
            >
              Ask Ava
            </button>
            <SiteButtonLink href={AVEYO_SALES_PHONE_HREF} variant="ghost">
              Talk To Sales
            </SiteButtonLink>
          </div>
        </div>
      </article>

      <article className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
        <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
        <div className="relative z-[2]">
          <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
            Good Questions To Ask
          </p>
          <ul className="mt-6 grid gap-3">
            {suggestedQuestions.map((question) => (
              <li
                key={question}
                className="rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-4 text-[length:var(--site-body)] font-semibold text-[#212120] text-[color:var(--site-black)]"
              >
                {question}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[length:var(--site-body)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
            Need help with an active project or account-specific update? Customer care is available at{" "}
            <a
              href={AVEYO_CUSTOMER_CARE_PHONE_HREF}
              className="font-semibold text-[#212120] text-[color:var(--site-black)]"
            >
              {AVEYO_CUSTOMER_CARE_PHONE}
            </a>
            .
          </p>
        </div>
      </article>
    </div>
  );
}
