export type HomeOwnership = "yes" | "no";
export type ElectricBill =
  | "$0 - $100"
  | "$100 - $150"
  | "$150 - $200"
  | "$200 - $300"
  | "$300+";

export interface AveyoPlanOption {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  benefits: string[];
  notable: string[];
}

export interface PlansLeadFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  address: string;
  city: string;
  homeOwnership: HomeOwnership | "";
  electricBill: ElectricBill | "";
  pageSlug: string;
  offerName: string;
  utmSource: string;
  utmCampaign: string;
  utmAdset: string;
  utmAd: string;
  fbclid: string;
  selectedPlanId: string;
  selectedPlanName: string;
  consentToContact: boolean;
}

export interface PlansLeadPayload
  extends Omit<PlansLeadFormState, "phone" | "consentToContact"> {
  phone: string;
  consentToContact: "yes" | "no";
  submittedAt: string;
}

export type SearchParamRecord = Record<string, string | string[] | undefined>;
type SearchParamSource = URLSearchParams | SearchParamRecord;

export const AVEYO_PLANS_FORM_PATH = "/plans/form";
export const AVEYO_PLANS_FORM_ID = "plans-lead-form";
export const DEFAULT_PLANS_PAGE_SLUG = "plans-form";
export const DEFAULT_PLANS_OFFER_NAME = "Aveyo Plans Form";
export const PLANS_LEAD_TOTAL_STEPS = 6;

export const CONSENT_TO_CONTACT_TEXT =
  "By checking this box, I agree to receive calls and text messages (including via automated technology and prerecorded messages) from Aveyo and its partners about my solar quote at the phone number provided. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to opt out.";

export const ELECTRIC_BILL_OPTIONS: ElectricBill[] = [
  "$0 - $100",
  "$100 - $150",
  "$150 - $200",
  "$200 - $300",
  "$300+"
];

export const AVEYO_PLAN_OPTIONS: AveyoPlanOption[] = [
  {
    id: "subscription",
    badge: "Most Popular",
    title: "Aveyo Subscription Plan",
    subtitle: "Leasing Solar Panels",
    benefits: [
      "Reduces Or Eliminates Most Of Your Utility Bill (Refer To Your Install Agreement)",
      "25 Years Of Warranties And Insurance Included *",
      "System Transfers With Sale Of Home To New Owner"
    ],
    notable: [
      "Batteries Available Upon Request",
      "Must Pass Initial Site Inspection By Aveyo"
    ]
  },
  {
    id: "ownership",
    title: "Solar Panels Ownership",
    subtitle: "Purchasing Solar Panels",
    benefits: [
      "Reduces Or Eliminates Most Of Your Utility Bill",
      "10-Yr Battery, Roof Warranty.",
      "No Transfer Process Needed At Home Sale"
    ],
    notable: [
      "Batteries Optional",
      "Highest Lifetime ROI Of Any Plan",
      "Full Ownership",
      "We Also Offer Financing Options",
      "Increases Home Value"
    ]
  }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const zipCodePattern = /^\d{5}$/;

function readSearchParam(params: SearchParamSource, key: string) {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? "";
  }

  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readRecordString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function buildSearchParamString(searchParams: SearchParamRecord) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => {
        params.append(key, entry);
      });
      return;
    }

    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

export function normalizeZipCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length >= 11 && digits.startsWith("1")) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

export function formatPhoneDisplay(digits: string) {
  const normalizedDigits = normalizePhoneDigits(digits);

  if (normalizedDigits.length <= 3) {
    return normalizedDigits;
  }

  if (normalizedDigits.length <= 6) {
    return `(${normalizedDigits.slice(0, 3)}) ${normalizedDigits.slice(3)}`;
  }

  return `(${normalizedDigits.slice(0, 3)}) ${normalizedDigits.slice(3, 6)}-${normalizedDigits.slice(6)}`;
}

export function isValidZipCode(value: string) {
  return zipCodePattern.test(normalizeZipCode(value));
}

export function isValidEmail(value: string) {
  return emailPattern.test(value.trim());
}

export function isValidPhone(value: string) {
  return normalizePhoneDigits(value).length >= 10;
}

export function normalizeHomeOwnership(value: string): HomeOwnership | "" {
  return value === "yes" || value === "no" ? value : "";
}

export function normalizeElectricBill(value: string): ElectricBill | "" {
  return ELECTRIC_BILL_OPTIONS.includes(value as ElectricBill) ? (value as ElectricBill) : "";
}

export function getPlanById(planId: string | null | undefined) {
  if (!planId) {
    return null;
  }

  return AVEYO_PLAN_OPTIONS.find((plan) => plan.id === planId) ?? null;
}

export function getPlanByName(planName: string | null | undefined) {
  const normalizedPlanName = planName?.trim().toLowerCase();
  if (!normalizedPlanName) {
    return null;
  }

  return (
    AVEYO_PLAN_OPTIONS.find((plan) => plan.title.toLowerCase() === normalizedPlanName) ?? null
  );
}

export function resolveSelectedPlan({
  selectedPlanId,
  selectedPlanName
}: {
  selectedPlanId?: string | null;
  selectedPlanName?: string | null;
}) {
  return getPlanById(selectedPlanId) ?? getPlanByName(selectedPlanName);
}

export function buildPlansFormHref({
  currentQueryString = "",
  selectedPlanId = "",
  selectedPlanName = "",
  pageSlug = "",
  offerName = "",
  returnTo = "",
  hash = AVEYO_PLANS_FORM_ID
}: {
  currentQueryString?: string;
  selectedPlanId?: string;
  selectedPlanName?: string;
  pageSlug?: string;
  offerName?: string;
  returnTo?: string;
  hash?: string;
}) {
  const searchParams = new URLSearchParams(currentQueryString);

  if (selectedPlanId) {
    searchParams.set("selectedPlanId", selectedPlanId);
  } else {
    searchParams.delete("selectedPlanId");
  }

  if (selectedPlanName) {
    searchParams.set("selectedPlanName", selectedPlanName);
  } else {
    searchParams.delete("selectedPlanName");
  }

  if (pageSlug) {
    searchParams.set("pageSlug", pageSlug);
  } else {
    searchParams.delete("pageSlug");
  }

  if (offerName) {
    searchParams.set("offerName", offerName);
  } else {
    searchParams.delete("offerName");
  }

  if (returnTo) {
    searchParams.set("returnTo", returnTo);
  } else {
    searchParams.delete("returnTo");
  }

  const normalizedHash = hash ? `#${hash.replace(/^#/, "")}` : "";
  const queryString = searchParams.toString();

  return queryString
    ? `${AVEYO_PLANS_FORM_PATH}?${queryString}${normalizedHash}`
    : `${AVEYO_PLANS_FORM_PATH}${normalizedHash}`;
}

export function createInitialPlansLeadFormState(searchParams: SearchParamSource): PlansLeadFormState {
  const initialZip = normalizeZipCode(
    readSearchParam(searchParams, "zipCode") || readSearchParam(searchParams, "zip")
  );
  const resolvedPlan = resolveSelectedPlan({
    selectedPlanId: readSearchParam(searchParams, "selectedPlanId"),
    selectedPlanName: readSearchParam(searchParams, "selectedPlanName")
  });

  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: initialZip,
    address: "",
    city: "",
    homeOwnership: "",
    electricBill: "",
    pageSlug: readSearchParam(searchParams, "pageSlug") || DEFAULT_PLANS_PAGE_SLUG,
    offerName: readSearchParam(searchParams, "offerName") || DEFAULT_PLANS_OFFER_NAME,
    utmSource: readSearchParam(searchParams, "utm_source"),
    utmCampaign: readSearchParam(searchParams, "utm_campaign"),
    utmAdset: readSearchParam(searchParams, "utm_adset"),
    utmAd: readSearchParam(searchParams, "utm_ad"),
    fbclid: readSearchParam(searchParams, "fbclid"),
    selectedPlanId: resolvedPlan?.id ?? "",
    selectedPlanName: resolvedPlan?.title ?? "",
    consentToContact: false
  };
}

export function createPlansLeadPayload(
  state: PlansLeadFormState,
  submittedAt = new Date().toISOString()
): PlansLeadPayload {
  const resolvedPlan = resolveSelectedPlan({
    selectedPlanId: state.selectedPlanId,
    selectedPlanName: state.selectedPlanName
  });
  const normalizedPhone = normalizePhoneDigits(state.phone);
  const normalizedZipCode = normalizeZipCode(state.zipCode);
  const selectedPlanId = resolvedPlan?.id ?? "";
  const selectedPlanName = resolvedPlan?.title ?? state.selectedPlanName.trim();

  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim(),
    phone: normalizedPhone ? `+1${normalizedPhone}` : "",
    zipCode: normalizedZipCode,
    address: state.address.trim(),
    city: state.city.trim(),
    homeOwnership: normalizeHomeOwnership(state.homeOwnership),
    electricBill: normalizeElectricBill(state.electricBill),
    pageSlug: state.pageSlug.trim() || DEFAULT_PLANS_PAGE_SLUG,
    offerName: state.offerName.trim() || DEFAULT_PLANS_OFFER_NAME,
    utmSource: state.utmSource.trim(),
    utmCampaign: state.utmCampaign.trim(),
    utmAdset: state.utmAdset.trim(),
    utmAd: state.utmAd.trim(),
    fbclid: state.fbclid.trim(),
    selectedPlanId,
    selectedPlanName,
    consentToContact: state.consentToContact ? "yes" : "no",
    submittedAt
  };
}

export function getStepValidationError(
  step: number,
  state: PlansLeadFormState
) {
  switch (step) {
    case 1:
      return isValidZipCode(state.zipCode) ? null : "Enter a valid 5-digit ZIP code.";
    case 2:
      return state.homeOwnership ? null : "Choose whether you own your home.";
    case 3:
      return state.electricBill ? null : "Choose your average monthly electric bill.";
    case 4:
      return isValidEmail(state.email) ? null : "Enter a valid email address.";
    case 5:
      return state.firstName.trim() && state.lastName.trim()
        ? null
        : "Enter both your first and last name.";
    case 6:
      if (!isValidPhone(state.phone)) {
        return "Enter a valid 10-digit phone number.";
      }
      return state.consentToContact
        ? null
        : "Please check the consent box so we can contact you about your quote.";
    default:
      return null;
  }
}

export function isLeadStepValid(step: number, state: PlansLeadFormState) {
  return !getStepValidationError(step, state);
}

export function getPlansLeadSubmissionValidationError(state: PlansLeadFormState) {
  for (let step = 1; step <= PLANS_LEAD_TOTAL_STEPS; step += 1) {
    const error = getStepValidationError(step, state);
    if (error) {
      return error;
    }
  }

  return null;
}

export function sanitizePlansLeadPayload(input: unknown): PlansLeadPayload {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request body.");
  }

  const record = input as Record<string, unknown>;
  const resolvedPlan = resolveSelectedPlan({
    selectedPlanId: readRecordString(record, "selectedPlanId"),
    selectedPlanName: readRecordString(record, "selectedPlanName")
  });

  const formState: PlansLeadFormState = {
    firstName: readRecordString(record, "firstName"),
    lastName: readRecordString(record, "lastName"),
    email: readRecordString(record, "email"),
    phone: readRecordString(record, "phone"),
    zipCode: readRecordString(record, "zipCode"),
    address: readRecordString(record, "address"),
    city: readRecordString(record, "city"),
    homeOwnership: normalizeHomeOwnership(readRecordString(record, "homeOwnership")),
    electricBill: normalizeElectricBill(readRecordString(record, "electricBill")),
    pageSlug: readRecordString(record, "pageSlug") || DEFAULT_PLANS_PAGE_SLUG,
    offerName: readRecordString(record, "offerName") || DEFAULT_PLANS_OFFER_NAME,
    utmSource: readRecordString(record, "utmSource"),
    utmCampaign: readRecordString(record, "utmCampaign"),
    utmAdset: readRecordString(record, "utmAdset"),
    utmAd: readRecordString(record, "utmAd"),
    fbclid: readRecordString(record, "fbclid"),
    selectedPlanId: resolvedPlan?.id ?? "",
    selectedPlanName: resolvedPlan?.title ?? readRecordString(record, "selectedPlanName"),
    consentToContact: readRecordString(record, "consentToContact") === "yes"
  };

  const validationError = getPlansLeadSubmissionValidationError(formState);
  if (validationError) {
    throw new Error(validationError);
  }

  return createPlansLeadPayload(formState);
}
