import { describe, expect, it } from "vitest";
import { waitPhrase } from "./wait-phrase";

describe("waitPhrase", () => {
  it("rounds up to whole minutes, at least one", () => {
    expect(waitPhrase(0)).toBe("1 minute");
    expect(waitPhrase(1)).toBe("1 minute");
    expect(waitPhrase(60_000)).toBe("1 minute");
    expect(waitPhrase(60_001)).toBe("2 minutes");
    expect(waitPhrase(33 * 60_000 - 1)).toBe("33 minutes");
  });
  it("turns to whole hours, rounded up, from an hour", () => {
    expect(waitPhrase(59 * 60_000 + 1)).toBe("1 hour");
    expect(waitPhrase(60 * 60_000)).toBe("1 hour");
    expect(waitPhrase(61 * 60_000)).toBe("2 hours");
    expect(waitPhrase(23.5 * 3_600_000)).toBe("24 hours");
  });
});
