import { type ManagerDateRangePreset } from "./dashboard-api";

export interface ManagerDateRangeState {
  preset: ManagerDateRangePreset;
  from: string;
  to: string;
  tz: string;
}

const VALID_PRESETS = new Set<ManagerDateRangePreset>(["today", "7d", "30d", "custom"]);

function isValidPreset(value: string | null | undefined): value is ManagerDateRangePreset {
  if (!value) {
    return false;
  }
  return VALID_PRESETS.has(value as ManagerDateRangePreset);
}

export function getDefaultManagerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function parseManagerDateRangeFromSearchParams(
  searchParams: URLSearchParams
): ManagerDateRangeState {
  const presetValue = searchParams.get("preset");
  const preset = isValidPreset(presetValue) ? presetValue : "7d";
  const from = searchParams.get("from")?.trim() || "";
  const to = searchParams.get("to")?.trim() || "";
  const tz = searchParams.get("tz")?.trim() || getDefaultManagerTimeZone();

  if (preset !== "custom") {
    return {
      preset,
      from: "",
      to: "",
      tz
    };
  }

  return {
    preset,
    from,
    to,
    tz
  };
}

export function buildManagerDateRangeSearchParams(range: ManagerDateRangeState) {
  const params = new URLSearchParams();
  params.set("preset", range.preset);
  params.set("tz", range.tz);
  if (range.preset === "custom") {
    if (range.from) {
      params.set("from", range.from);
    }
    if (range.to) {
      params.set("to", range.to);
    }
  }
  return params;
}

export function toDateTimeLocalValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const hour = `${parsed.getHours()}`.padStart(2, "0");
  const minute = `${parsed.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function fromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}
