import { describe, expect, it } from "vitest";
import {
  arrivalDismissKey,
  arrivedFromImport,
  IMPORTED_PARAM,
  readUpdateArrival,
  UPDATED_PARAM,
} from "./arrival";

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

describe("readUpdateArrival", () => {
  it("reads the three counts the apply push writes", () => {
    expect(readUpdateArrival("19-6-1")).toEqual({ in: 19, out: 6, kept: 1 });
  });

  // The apply always writes all three, but a kept of zero is the common case and
  // a two-part value is the shape a person would type. Both mean kept nothing.
  it("defaults kept to zero when the third part is absent", () => {
    expect(readUpdateArrival("19-6")).toEqual({ in: 19, out: 6, kept: 0 });
  });

  it("reads zeroes rather than treating them as absent", () => {
    expect(readUpdateArrival("0-0-0")).toEqual({ in: 0, out: 0, kept: 0 });
  });

  // State 20. The param is still the trace of an update, so the strip shows and
  // says so without figures — never a sentence with NaN in it.
  it("is countless for a value that is not two or three numbers", () => {
    expect(readUpdateArrival("19")).toBe("countless");
    expect(readUpdateArrival("19-6-1-4")).toBe("countless");
    expect(readUpdateArrival("a-b")).toBe("countless");
    expect(readUpdateArrival("-1-6")).toBe("countless");
    expect(readUpdateArrival(["19-6", "19-6"])).toBe("countless");
  });

  // No param at all is an ordinary visit, which is a different thing from an
  // update whose figures did not survive the trip.
  it("is null when there is no param", () => {
    expect(readUpdateArrival(undefined)).toBeNull();
    expect(readUpdateArrival("")).toBeNull();
  });

  it("names the param the apply appends", () => {
    expect(UPDATED_PARAM).toBe("updated");
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
