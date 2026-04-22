"use client";

import { useMemo, useState, type FormEvent } from "react";
import { SiteButtonLink } from "@/components/site/site-button-link";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import {
  AVEYO_PLAN_OPTIONS,
  AVEYO_PLANS_FORM_ID,
  PLANS_LEAD_TOTAL_STEPS,
  ELECTRIC_BILL_OPTIONS,
  createPlansLeadPayload,
  formatPhoneDisplay,
  getPlansLeadSubmissionValidationError,
  getStepValidationError,
  isLeadStepValid,
  isValidEmail,
  isValidPhone,
  isValidZipCode,
  normalizePhoneDigits,
  normalizeZipCode,
  resolveSelectedPlan,
  type PlansLeadFormState,
  type PlansLeadPayload
} from "@/lib/plans-lead";

const formSteps = [
  {
    shortLabel: "ZIP",
    title: "What's your ZIP code?",
    description: "We use this to confirm service availability in your area."
  },
  {
    shortLabel: "Home",
    title: "Do you own your home?",
    description: "Homeownership helps us match you with the right Aveyo plan."
  },
  {
    shortLabel: "Bill",
    title: "What's your average monthly electric bill?",
    description: "Choose the closest range so we can tailor your quote."
  },
  {
    shortLabel: "Email",
    title: "What's your email address?",
    description: "We'll use this to send updates and follow-up details."
  },
  {
    shortLabel: "Name",
    title: "What's your name?",
    description: "Tell us who should receive the quote."
  },
  {
    shortLabel: "Phone",
    title: "What's your phone number?",
    description: "A solar educator may call or text with your next steps."
  }
] as const;

const inputClassName =
  "w-full rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-[length:var(--site-body-large)] text-[#212120] text-[color:var(--site-black)] outline-none transition-colors placeholder:text-[#7d8792] focus:border-[#212120] focus:border-[color:var(--site-black)]";

function SelectionCard({
  isActive,
  children,
  onClick
}: {
  isActive: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[var(--site-radius-field)] border px-4 py-4 text-left transition-colors ${
        isActive
          ? "border-[#212120] border-[color:var(--site-black)] bg-[#212120] text-white"
          : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white text-[#212120] text-[color:var(--site-black)] hover:bg-[#f5f7f9]"
      }`}
    >
      {children}
    </button>
  );
}

export default function PlansLeadForm({
  initialState
}: {
  initialState: PlansLeadFormState;
}) {
  const [formState, setFormState] = useState(initialState);
  const [currentStep, setCurrentStep] = useState(() =>
    isValidZipCode(initialState.zipCode) ? 2 : 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedPayload, setSubmittedPayload] = useState<PlansLeadPayload | null>(null);

  const selectedPlan = useMemo(
    () =>
      resolveSelectedPlan({
        selectedPlanId: formState.selectedPlanId,
        selectedPlanName: formState.selectedPlanName
      }),
    [formState.selectedPlanId, formState.selectedPlanName]
  );
  const currentStepMeta = formSteps[currentStep - 1];
  const currentStepError = getStepValidationError(currentStep, formState);
  const canAdvance = isLeadStepValid(currentStep, formState) && !isSubmitting;
  const progressPercent = (currentStep / PLANS_LEAD_TOTAL_STEPS) * 100;
  const shouldHighlightCurrentStepError =
    (currentStep === 1 && formState.zipCode.length > 0) ||
    (currentStep === 4 && formState.email.length > 0) ||
    (currentStep === 5 &&
      (formState.firstName.trim().length > 0 || formState.lastName.trim().length > 0)) ||
    (currentStep === 6 && formState.phone.length > 0);
  const successName = [submittedPayload?.firstName, submittedPayload?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  function updateField<Key extends keyof PlansLeadFormState>(
    key: Key,
    value: PlansLeadFormState[Key]
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handlePlanSelection(planId: string) {
    const plan = AVEYO_PLAN_OPTIONS.find((option) => option.id === planId);
    if (!plan) {
      return;
    }

    setFormState((current) => ({
      ...current,
      selectedPlanId: plan.id,
      selectedPlanName: plan.title
    }));
  }

  function clearPlanSelection() {
    setFormState((current) => ({
      ...current,
      selectedPlanId: "",
      selectedPlanName: ""
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (currentStep < PLANS_LEAD_TOTAL_STEPS) {
      if (!canAdvance) {
        return;
      }

      setCurrentStep((step) => Math.min(step + 1, PLANS_LEAD_TOTAL_STEPS));
      return;
    }

    const validationError = getPlansLeadSubmissionValidationError(formState);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const payload = createPlansLeadPayload(formState);

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/plans-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; payload?: PlansLeadPayload }
        | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "We couldn't submit your request. Please try again.");
      }

      setSubmittedPayload(result.payload ?? payload);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't submit your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid gap-3">
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              ZIP code
              <input
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={5}
                placeholder="84003"
                value={formState.zipCode}
                onChange={(event) => updateField("zipCode", normalizeZipCode(event.target.value))}
                className={inputClassName}
              />
            </label>
            <p
              className={`text-sm ${
                formState.zipCode.length > 0 && !isValidZipCode(formState.zipCode)
                  ? "text-[#b42318]"
                  : "text-[#5f646b] text-[color:var(--site-text-muted)]"
              }`}
            >
              {formState.zipCode.length > 0 && !isValidZipCode(formState.zipCode)
                ? "ZIP codes must be exactly 5 digits."
                : "Use the property ZIP where you'd like to go solar."}
            </p>
          </div>
        );
      case 2:
        return (
          <fieldset className="grid gap-3">
            <legend className="sr-only">Home ownership</legend>
            <SelectionCard
              isActive={formState.homeOwnership === "yes"}
              onClick={() => updateField("homeOwnership", "yes")}
            >
              <span className="block text-[length:var(--site-body-large)] font-semibold">Yes</span>
              <span className="mt-1 block text-sm opacity-80">
                I own the home where I want to install solar.
              </span>
            </SelectionCard>
            <SelectionCard
              isActive={formState.homeOwnership === "no"}
              onClick={() => updateField("homeOwnership", "no")}
            >
              <span className="block text-[length:var(--site-body-large)] font-semibold">No</span>
              <span className="mt-1 block text-sm opacity-80">
                I&apos;m exploring options for a property I do not own.
              </span>
            </SelectionCard>
          </fieldset>
        );
      case 3:
        return (
          <fieldset className="grid gap-3">
            <legend className="sr-only">Average electric bill</legend>
            {ELECTRIC_BILL_OPTIONS.map((option) => (
              <SelectionCard
                key={option}
                isActive={formState.electricBill === option}
                onClick={() => updateField("electricBill", option)}
              >
                <span className="block text-[length:var(--site-body-large)] font-semibold">
                  {option}
                </span>
              </SelectionCard>
            ))}
          </fieldset>
        );
      case 4:
        return (
          <div className="grid gap-3">
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Email address
              <input
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                type="email"
                value={formState.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={inputClassName}
              />
            </label>
            <p
              className={`text-sm ${
                formState.email.length > 0 && !isValidEmail(formState.email)
                  ? "text-[#b42318]"
                  : "text-[#5f646b] text-[color:var(--site-text-muted)]"
              }`}
            >
              {formState.email.length > 0 && !isValidEmail(formState.email)
                ? "Enter a valid email address."
                : "We'll use this to send quote details and follow-up information."}
            </p>
          </div>
        );
      case 5:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              First name
              <input
                autoComplete="given-name"
                placeholder="Jordan"
                value={formState.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Last name
              <input
                autoComplete="family-name"
                placeholder="Smith"
                value={formState.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                className={inputClassName}
              />
            </label>
          </div>
        );
      case 6:
        return (
          <div className="grid gap-3">
            <label className="grid gap-2 text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Phone number
              <input
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="(555) 123-4567"
                type="tel"
                value={formatPhoneDisplay(formState.phone)}
                onChange={(event) => updateField("phone", normalizePhoneDigits(event.target.value))}
                className={inputClassName}
              />
            </label>
            <p
              className={`text-sm ${
                formState.phone.length > 0 && !isValidPhone(formState.phone)
                  ? "text-[#b42318]"
                  : "text-[#5f646b] text-[color:var(--site-text-muted)]"
              }`}
            >
              {formState.phone.length > 0 && !isValidPhone(formState.phone)
                ? "Enter a 10-digit phone number."
                : "We'll format your number as +1 in the lead payload."}
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div id={AVEYO_PLANS_FORM_ID} className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="order-2 grid gap-6 xl:order-1">
        <section className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <div className="relative z-[2]">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
              Selected Plan
            </p>
            <h3 className="mt-3 text-[length:var(--site-h6)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              {selectedPlan ? selectedPlan.title : "Choose a plan or continue without one"}
            </h3>
            <p className="mt-2 text-[length:var(--site-body)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
              {selectedPlan
                ? `${selectedPlan.subtitle}. You can switch plans here before submitting your request.`
                : "If you're still comparing options, submit the form anyway and our team will help you choose the best fit."}
            </p>

            <div className="mt-5 grid gap-3">
              {AVEYO_PLAN_OPTIONS.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;

                return (
                  <SelectionCard
                    key={plan.id}
                    isActive={isSelected}
                    onClick={() => handlePlanSelection(plan.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {plan.badge ? (
                          <span
                            className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-[#eef4f8] text-[#212120]"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        ) : null}
                        <span className="block text-[length:var(--site-body-large)] font-semibold">
                          {plan.title}
                        </span>
                        <span className="mt-1 block text-sm opacity-80">{plan.subtitle}</span>
                      </div>
                    </div>
                  </SelectionCard>
                );
              })}
            </div>

            {selectedPlan ? (
              <button
                type="button"
                onClick={clearPlanSelection}
                className="mt-4 text-sm font-semibold text-[#212120] text-[color:var(--site-black)] underline underline-offset-4"
              >
                Continue without a selected plan
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className="order-1 relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding)] shadow-[0_24px_80px_rgba(10,22,40,0.10)] xl:order-2">
        <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
        <div className="relative z-[2]">
          {submittedPayload ? (
            <div className="grid gap-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#212120] text-2xl text-white">
                ✓
              </div>
              <div className="grid gap-3">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
                  Request Received
                </p>
                <h2 className="text-[clamp(2rem,4vw,3.25rem)] leading-[0.98] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]">
                  Thanks{successName ? `, ${successName}` : ""}.
                  <br />
                  We&apos;ll follow up soon.
                </h2>
                <p className="max-w-[52ch] text-[length:var(--site-body-large)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
                  Your Aveyo plans request has been sent to our team. Expect a follow-up within
                  1-2 business days with the right next step for your home.
                </p>
              </div>

              <div className="grid gap-3 rounded-[var(--site-radius-field)] bg-[#f5f7f9] p-5">
                <div className="text-sm font-semibold text-[#212120] text-[color:var(--site-black)]">
                  Lead summary
                </div>
                <div className="text-sm text-[#5f646b] text-[color:var(--site-text-muted)]">
                  {submittedPayload.selectedPlanName || "No plan selected"} • {submittedPayload.email}
                </div>
                <div className="text-sm text-[#5f646b] text-[color:var(--site-text-muted)]">
                  ZIP {submittedPayload.zipCode} • {submittedPayload.phone || "No phone provided"}
                </div>
              </div>

              <div>
                <SiteButtonLink href="/" variant="dark">
                  Back To Homepage
                </SiteButtonLink>
              </div>
            </div>
          ) : (
            <form className="grid gap-8" onSubmit={handleSubmit}>
              <div className="grid gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
                      6-Step Flow
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#5f646b] text-[color:var(--site-text-muted)]">
                      Step {currentStep} of {PLANS_LEAD_TOTAL_STEPS}
                    </p>
                  </div>
                  {selectedPlan ? (
                    <span className="rounded-full bg-[#eef4f8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#212120] text-[color:var(--site-black)]">
                      {selectedPlan.title}
                    </span>
                  ) : null}
                </div>

                <ol className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {formSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isComplete = stepNumber < currentStep;

                    return (
                      <li
                        key={step.shortLabel}
                        className={`min-w-[112px] flex-1 rounded-[var(--site-radius-field)] border px-3 py-3 transition-colors ${
                          isActive
                            ? "border-[#212120] border-[color:var(--site-black)] bg-[#f5f7f9]"
                            : "border-[#e5eaef] border-[color:var(--site-border-soft)] bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isComplete || isActive
                                ? "bg-[#212120] bg-[color:var(--site-black)] text-white"
                                : "bg-[#eef4f8] text-[#212120]"
                            }`}
                          >
                            {stepNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
                              {step.shortLabel}
                            </div>
                            <div className="truncate text-xs text-[#5f646b] text-[color:var(--site-text-muted)]">
                              {step.title}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="h-2 overflow-hidden rounded-full bg-[#e8edf1]">
                  <div
                    className="h-full rounded-full bg-[#212120] bg-[color:var(--site-black)] transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <h2 className="text-[clamp(2rem,4vw,3.25rem)] leading-[0.98] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]">
                  {currentStepMeta.title}
                </h2>
                <p className="max-w-[52ch] text-[length:var(--site-body-large)] leading-[1.7] text-[#5f646b] text-[color:var(--site-text-muted)]">
                  {currentStepMeta.description}
                </p>
              </div>

              <div>{renderStep()}</div>

              <div className="grid gap-4 border-t border-[#e5eaef] border-[color:var(--site-border-soft)] pt-6">
                {currentStepError ? (
                  <p
                    aria-live="polite"
                    className={`text-sm font-medium ${
                      shouldHighlightCurrentStepError
                        ? "text-[#b42318]"
                        : "text-[#5f646b] text-[color:var(--site-text-muted)]"
                    }`}
                  >
                    {currentStepError}
                  </p>
                ) : (
                  <p className="text-sm text-[#5f646b] text-[color:var(--site-text-muted)]">
                    {selectedPlan
                      ? `You're requesting more information about ${selectedPlan.title}.`
                      : "You can complete this form without pre-selecting a plan."}
                  </p>
                )}

                {submitError ? (
                  <p aria-live="polite" className="text-sm font-medium text-[#b42318]">
                    {submitError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    disabled={currentStep === 1 || isSubmitting}
                    onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
                    className="inline-flex items-center justify-center rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={!canAdvance}
                    className="inline-flex items-center justify-center rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {currentStep === PLANS_LEAD_TOTAL_STEPS
                      ? isSubmitting
                        ? "Submitting..."
                        : "Get My Quote"
                      : "Next Step"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
