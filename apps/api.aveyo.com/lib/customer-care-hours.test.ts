import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getCustomerCareAvailability,
  isCustomerCareAvailable
} from "@/lib/customer-care-hours";
import {
  FIXED_MANAGER_TIMEZONE,
  getManagerConfigSnapshot,
  updateManagerConfigResult
} from "@/lib/manager/service";

const DEFAULT_CONFIG = getManagerConfigSnapshot();

async function resetManagerConfig() {
  await updateManagerConfigResult(
    {
      timezone: FIXED_MANAGER_TIMEZONE,
      workingHours: {
        enabled: DEFAULT_CONFIG.workingHours.enabled,
        weekdays: DEFAULT_CONFIG.workingHours.weekdays,
        startHour24: DEFAULT_CONFIG.workingHours.startHour24,
        endHour24: DEFAULT_CONFIG.workingHours.endHour24
      },
      thresholds: {
        slowFirstReplyMinutes: DEFAULT_CONFIG.thresholds.slowFirstReplyMinutes,
        stalledConversationMinutes: DEFAULT_CONFIG.thresholds.stalledConversationMinutes
      }
    },
    "super-admin-1",
    "super_admin"
  );
}

describe("customer care working hours", () => {
  beforeEach(async () => {
    await resetManagerConfig();
  });

  afterAll(async () => {
    await resetManagerConfig();
  });

  it("allows handoffs during configured weekday hours", async () => {
    await updateManagerConfigResult(
      {
        workingHours: {
          enabled: true,
          weekdays: [1, 2, 3, 4, 5],
          startHour24: 8,
          endHour24: 18
        }
      },
      "super-admin-1",
      "super_admin"
    );

    // 2026-01-05T16:00:00Z = 09:00 MST
    const result = getCustomerCareAvailability(new Date("2026-01-05T16:00:00.000Z"));

    expect(result.available).toBe(true);
    expect(result.reason).toBe("inside");
    expect(result.timezone).toBe(FIXED_MANAGER_TIMEZONE);
    expect(result.localWeekday).toBe(1);
    expect(result.localHour24).toBe(9);
  });

  it("blocks handoffs before the start hour on an active weekday", async () => {
    await updateManagerConfigResult(
      {
        workingHours: {
          enabled: true,
          weekdays: [1, 2, 3, 4, 5],
          startHour24: 8,
          endHour24: 18
        }
      },
      "super-admin-1",
      "super_admin"
    );

    // 2026-01-05T13:00:00Z = 06:00 MST
    const result = getCustomerCareAvailability(new Date("2026-01-05T13:00:00.000Z"));

    expect(result.available).toBe(false);
    expect(result.reason).toBe("outside_hours");
    expect(isCustomerCareAvailable(new Date("2026-01-05T13:00:00.000Z"))).toBe(false);
  });

  it("blocks handoffs on inactive weekdays", async () => {
    await updateManagerConfigResult(
      {
        workingHours: {
          enabled: true,
          weekdays: [1, 2, 3, 4, 5],
          startHour24: 8,
          endHour24: 18
        }
      },
      "super-admin-1",
      "super_admin"
    );

    const result = getCustomerCareAvailability(new Date("2026-01-04T16:00:00.000Z"));

    expect(result.available).toBe(false);
    expect(result.reason).toBe("outside_weekday");
    expect(result.localWeekday).toBe(0);
  });

  it("treats disabled working hours as always available", async () => {
    await updateManagerConfigResult(
      {
        workingHours: {
          enabled: false,
          weekdays: [1, 2, 3, 4, 5],
          startHour24: 8,
          endHour24: 18
        }
      },
      "super-admin-1",
      "super_admin"
    );

    const result = getCustomerCareAvailability(new Date("2026-01-04T10:00:00.000Z"));

    expect(result.available).toBe(true);
    expect(result.reason).toBe("disabled");
  });

  it("supports overnight working-hour windows", async () => {
    await updateManagerConfigResult(
      {
        workingHours: {
          enabled: true,
          weekdays: [1],
          startHour24: 22,
          endHour24: 6
        }
      },
      "super-admin-1",
      "super_admin"
    );

    // Mon 22:00 MST, Tue 05:00 MST, Tue 07:00 MST
    expect(getCustomerCareAvailability(new Date("2026-01-06T05:00:00.000Z")).available).toBe(true);
    expect(getCustomerCareAvailability(new Date("2026-01-06T12:00:00.000Z")).available).toBe(true);
    expect(getCustomerCareAvailability(new Date("2026-01-06T14:00:00.000Z")).available).toBe(false);
  });

  it("keeps timezone locked to Mountain Time even when a different value is sent", async () => {
    const result = await updateManagerConfigResult(
      {
        timezone: "UTC",
        workingHours: {
          enabled: true,
          weekdays: [1, 2, 3, 4, 5],
          startHour24: 8,
          endHour24: 18
        }
      },
      "super-admin-1",
      "super_admin"
    );

    expect(result.config.timezone).toBe(FIXED_MANAGER_TIMEZONE);
    expect(getManagerConfigSnapshot().timezone).toBe(FIXED_MANAGER_TIMEZONE);
  });
});
