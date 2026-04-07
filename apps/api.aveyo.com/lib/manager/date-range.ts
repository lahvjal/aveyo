import { ServiceError } from "@/lib/service-error";

export type ManagerDateRangePreset = "today" | "7d" | "30d" | "custom";

export interface ManagerDateRange {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  tz: string;
  preset: ManagerDateRangePreset;
}

const DEFAULT_TZ = "UTC";
const MAX_RANGE_MS = 93 * 24 * 60 * 60 * 1000;
const SUPPORTED_PRESETS = new Set<ManagerDateRangePreset>(["today", "7d", "30d", "custom"]);

function parsePreset(value: string | null): ManagerDateRangePreset {
  if (!value) {
    return "7d";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "today" || normalized === "7d" || normalized === "30d" || normalized === "custom") {
    return normalized;
  }
  throw new ServiceError(400, "Invalid date-range preset.");
}

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: value
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseTimeZone(value: string | null) {
  if (!value) {
    return DEFAULT_TZ;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_TZ;
  }
  if (!isValidTimeZone(trimmed)) {
    throw new ServiceError(400, "Invalid timezone.");
  }
  return trimmed;
}

function parseIsoDate(value: string | null, field: "from" | "to") {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ServiceError(400, `Invalid ${field} timestamp.`);
  }
  return parsed;
}

function getTimeZoneParts(value: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(value);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    const entry = parts.find((part) => part.type === type)?.value;
    if (!entry) {
      throw new ServiceError(500, "Unable to parse timezone date parts.");
    }
    return Number(entry);
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second")
  };
}

function getTimeZoneOffsetMs(value: Date, timeZone: string) {
  const parts = getTimeZoneParts(value, timeZone);
  const normalizedUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    value.getUTCMilliseconds()
  );
  return normalizedUtcMs - value.getTime();
}

function zonedDateTimeToUtc(
  input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string
) {
  const utcGuessMs = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
    0
  );
  const offsetMs = getTimeZoneOffsetMs(new Date(utcGuessMs), timeZone);
  return new Date(utcGuessMs - offsetMs);
}

function getPresetRange(
  preset: Exclude<ManagerDateRangePreset, "custom">,
  timeZone: string,
  now: Date
) {
  if (preset === "today") {
    const nowParts = getTimeZoneParts(now, timeZone);
    const start = zonedDateTimeToUtc(
      {
        year: nowParts.year,
        month: nowParts.month,
        day: nowParts.day,
        hour: 0,
        minute: 0,
        second: 0
      },
      timeZone
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { from: start, to: end };
  }

  const durationByPreset: Record<Exclude<ManagerDateRangePreset, "today" | "custom">, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };
  const durationMs = durationByPreset[preset];
  return {
    from: new Date(now.getTime() - durationMs),
    to: now
  };
}

function assertRange(from: Date, to: Date) {
  if (to.getTime() <= from.getTime()) {
    throw new ServiceError(400, "Invalid date range: `to` must be after `from`.");
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new ServiceError(400, "Date range exceeds maximum 93-day span.");
  }
}

export function resolveManagerDateRange(input: {
  from?: string | null;
  to?: string | null;
  tz?: string | null;
  preset?: string | null;
  now?: Date;
}): ManagerDateRange {
  const now = input.now ?? new Date();
  const preset = parsePreset(input.preset ?? null);
  if (!SUPPORTED_PRESETS.has(preset)) {
    throw new ServiceError(400, "Unsupported date-range preset.");
  }

  const tz = parseTimeZone(input.tz ?? null);
  const parsedFrom = parseIsoDate(input.from ?? null, "from");
  const parsedTo = parseIsoDate(input.to ?? null, "to");

  const { from, to } =
    parsedFrom && parsedTo
      ? { from: parsedFrom, to: parsedTo }
      : preset === "custom"
        ? (() => {
            throw new ServiceError(400, "`from` and `to` are required for custom date ranges.");
          })()
        : getPresetRange(preset, tz, now);

  assertRange(from, to);

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    tz,
    preset
  };
}

export function resolveManagerDateRangeFromRequest(request: Request) {
  const requestUrl = new URL(request.url);
  return resolveManagerDateRange({
    from: requestUrl.searchParams.get("from"),
    to: requestUrl.searchParams.get("to"),
    tz: requestUrl.searchParams.get("tz"),
    preset: requestUrl.searchParams.get("preset")
  });
}
