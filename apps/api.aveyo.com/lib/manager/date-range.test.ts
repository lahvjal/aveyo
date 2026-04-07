import { describe, expect, it } from "vitest";
import { ServiceError } from "@/lib/service-error";
import { resolveManagerDateRange, resolveManagerDateRangeFromRequest } from "./date-range";

describe("resolveManagerDateRange", () => {
  it("defaults to last 7 days in UTC when no params are provided", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const result = resolveManagerDateRange({ now });

    expect(result.preset).toBe("7d");
    expect(result.tz).toBe("UTC");
    expect(result.fromIso).toBe("2026-03-30T12:00:00.000Z");
    expect(result.toIso).toBe("2026-04-06T12:00:00.000Z");
  });

  it("computes today range boundaries in the selected timezone", () => {
    const now = new Date("2026-04-06T15:15:00.000Z");
    const result = resolveManagerDateRange({
      preset: "today",
      tz: "UTC",
      now
    });

    expect(result.fromIso).toBe("2026-04-06T00:00:00.000Z");
    expect(result.toIso).toBe("2026-04-07T00:00:00.000Z");
  });

  it("requires from/to values for custom ranges", () => {
    expect(() =>
      resolveManagerDateRange({
        preset: "custom",
        from: "2026-04-01T00:00:00.000Z"
      })
    ).toThrowError(ServiceError);

    try {
      resolveManagerDateRange({
        preset: "custom",
        from: "2026-04-01T00:00:00.000Z"
      });
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        message: "`from` and `to` are required for custom date ranges."
      } as Partial<ServiceError>);
    }
  });

  it("validates range order and maximum span", () => {
    expect(() =>
      resolveManagerDateRange({
        preset: "custom",
        from: "2026-04-06T00:00:00.000Z",
        to: "2026-04-01T00:00:00.000Z"
      })
    ).toThrowError(ServiceError);

    expect(() =>
      resolveManagerDateRange({
        preset: "custom",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-05-10T00:00:00.000Z"
      })
    ).toThrowError(ServiceError);
  });

  it("rejects invalid timezone values", () => {
    expect(() =>
      resolveManagerDateRange({
        tz: "Mars/Olympus"
      })
    ).toThrowError(ServiceError);
  });
});

describe("resolveManagerDateRangeFromRequest", () => {
  it("parses query string values from request URL", () => {
    const request = new Request(
      "https://api.aveyo.com/api/manager/overview?preset=custom&from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-05T00%3A00%3A00.000Z&tz=UTC"
    );

    const result = resolveManagerDateRangeFromRequest(request);
    expect(result.preset).toBe("custom");
    expect(result.fromIso).toBe("2026-04-01T00:00:00.000Z");
    expect(result.toIso).toBe("2026-04-05T00:00:00.000Z");
    expect(result.tz).toBe("UTC");
  });
});
