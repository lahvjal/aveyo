import {
  getManagerConfigSnapshot,
  type ManagerConfig
} from "@/lib/manager/service";

export const CUSTOMER_CARE_OUTSIDE_WORKING_HOURS_REPLY =
  "Aveyo Customer Care is currently outside working hours, so I can't connect you with an agent right now. I can still help with project questions, status updates, scheduling, and next steps. Ask me anything about your project.";

export interface CustomerCareAvailability {
  available: boolean;
  reason: "inside" | "disabled" | "outside_weekday" | "outside_hours";
  timezone: string;
  localWeekday: number;
  localHour24: number;
  workingHours: ManagerConfig["workingHours"];
}

const WEEKDAY_BY_LABEL: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function getLocalTimeParts(at: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(at);
  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value;
  const hourLabel = parts.find((part) => part.type === "hour")?.value;
  const localWeekday =
    typeof weekdayLabel === "string" ? WEEKDAY_BY_LABEL[weekdayLabel] : undefined;
  const localHour24 = typeof hourLabel === "string" ? Number.parseInt(hourLabel, 10) : Number.NaN;

  if (localWeekday === undefined || Number.isNaN(localHour24)) {
    throw new Error(`Unable to resolve local time parts for timezone "${timeZone}".`);
  }

  return {
    localWeekday,
    localHour24
  };
}

export function getCustomerCareAvailability(at: Date = new Date()): CustomerCareAvailability {
  const config = getManagerConfigSnapshot();
  const { timezone, workingHours } = config;
  const { enabled, weekdays, startHour24, endHour24 } = workingHours;
  const { localWeekday, localHour24 } = getLocalTimeParts(at, timezone);

  if (!enabled) {
    return {
      available: true,
      reason: "disabled",
      timezone,
      localWeekday,
      localHour24,
      workingHours
    };
  }

  if (startHour24 < endHour24) {
    const activeWeekday = weekdays.includes(localWeekday);
    const activeHour = localHour24 >= startHour24 && localHour24 < endHour24;
    return {
      available: activeWeekday && activeHour,
      reason: activeWeekday ? (activeHour ? "inside" : "outside_hours") : "outside_weekday",
      timezone,
      localWeekday,
      localHour24,
      workingHours
    };
  }

  const previousWeekday = (localWeekday + 6) % 7;
  const activeFromCurrentDay = weekdays.includes(localWeekday) && localHour24 >= startHour24;
  const activeFromPreviousDay = weekdays.includes(previousWeekday) && localHour24 < endHour24;
  const available = activeFromCurrentDay || activeFromPreviousDay;

  return {
    available,
    reason:
      available
        ? "inside"
        : weekdays.includes(localWeekday) || weekdays.includes(previousWeekday)
          ? "outside_hours"
          : "outside_weekday",
    timezone,
    localWeekday,
    localHour24,
    workingHours
  };
}

export function isCustomerCareAvailable(at: Date = new Date()) {
  return getCustomerCareAvailability(at).available;
}
