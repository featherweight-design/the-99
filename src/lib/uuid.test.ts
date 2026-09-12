import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("isUuid", () => {
  it("accepts a uuid in either case", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid(UUID.toUpperCase())).toBe(true);
  });

  it("refuses a string that is not one", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("deck_1")).toBe(false);
    expect(isUuid(`${UUID} `)).toBe(false);
  });

  // Every caller is a Server Action argument, so the declared `string` is a
  // compile-time claim only. A bare `RegExp.test` coerces its argument, and a
  // posted one-element array of a real uuid would pass it and reach the query.
  it("refuses a value that is not a string, however it would coerce", () => {
    expect(isUuid([UUID])).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid({ toString: () => UUID })).toBe(false);
  });
});
