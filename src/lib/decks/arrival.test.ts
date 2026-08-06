import { describe, expect, it } from "vitest";
import { arrivalDismissKey, arrivedFromImport, IMPORTED_PARAM } from "./arrival";

describe("arrivedFromImport", () => {
  it("is true for the value the import push writes", () => {
    expect(arrivedFromImport("1")).toBe(true);
  });

  it("is false when the param is absent", () => {
    expect(arrivedFromImport(undefined)).toBe(false);
  });

  // A hand-typed or half-remembered param should not claim an import happened —
  // it suppresses the 99/99 reveal, which is a moment there is no giving back.
  it("is false for any other value, including a repeated param", () => {
    expect(arrivedFromImport("true")).toBe(false);
    expect(arrivedFromImport("")).toBe(false);
    expect(arrivedFromImport(["1", "1"])).toBe(false);
  });

  it("names the param the entry surface appends", () => {
    expect(IMPORTED_PARAM).toBe("imported");
  });
});

describe("arrivalDismissKey", () => {
  // Deck ids are defaultRandom() uuids, so re-importing the same list after a
  // delete produces a different key and the strip shows again.
  it("is per deck, and distinct from the celebration key", () => {
    expect(arrivalDismissKey("a")).not.toBe(arrivalDismissKey("b"));
    expect(arrivalDismissKey("a")).toContain("a");
    expect(arrivalDismissKey("a")).not.toContain("celebrated");
  });
});
