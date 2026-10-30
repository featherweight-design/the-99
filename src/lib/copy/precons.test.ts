import { describe, expect, it } from "vitest";
import { preconsCopy } from "./precons";

const listsSoFar = preconsCopy.upcoming.listsSoFar;

describe("an announced set's lists count (announcements UI 5)", () => {
  it("counts toward a promise, and says the whole of it once posted", () => {
    expect(listsSoFar(3, 5)).toBe("3 of 5 lists so far");
    expect(listsSoFar(5, 5)).toBe("All 5 lists");
  });

  it("counts every posted list once more are posted than promised", () => {
    expect(listsSoFar(4, 3)).toBe("All 4 lists");
    expect(listsSoFar(2, 1)).toBe("All 2 lists");
  });

  it("never says 'All 1 lists' or '0 of 1 lists'", () => {
    expect(listsSoFar(1, 1)).toBe("1 list");
    expect(listsSoFar(0, 1)).toBe("0 of 1 list so far");
  });

  it("counts alone when no number was promised", () => {
    expect(listsSoFar(1, null)).toBe("1 list so far");
    expect(listsSoFar(3, null)).toBe("3 lists so far");
  });
});
