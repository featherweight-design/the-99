import { describe, expect, it } from "vitest";
import { feedAge } from "./age";

const NOW = "2026-10-22T12:00:00.000Z";
const ago = (ms: number) => new Date(new Date(NOW).getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 3_600_000;

describe("feedAge", () => {
  it("reads 'just now' for anything under an hour, never 0h ago", () => {
    expect(feedAge(NOW, NOW)).toBe("just now");
    expect(feedAge(ago(59 * MIN), NOW)).toBe("just now");
    // A future stamp (a clock a little ahead) clamps to the same, not a negative figure.
    expect(feedAge(new Date(new Date(NOW).getTime() + 5 * MIN).toISOString(), NOW)).toBe("just now");
  });

  it("goes on in hours, days and weeks from the hour", () => {
    expect(feedAge(ago(HOUR), NOW)).toBe("1h ago");
    expect(feedAge(ago(5 * HOUR), NOW)).toBe("5h ago");
    expect(feedAge(ago(30 * HOUR), NOW)).toBe("yesterday");
    expect(feedAge(ago(4 * 24 * HOUR), NOW)).toBe("4d ago");
    expect(feedAge(ago(15 * 24 * HOUR), NOW)).toBe("2w ago");
  });
});
