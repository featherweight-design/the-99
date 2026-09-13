import { describe, expect, it } from "vitest";
import { isForeignKeyViolation, isUniqueViolation, sqlstate } from "./db-error";

const withCode = (code: string) => Object.assign(new Error("nope"), { code });

describe("sqlstate", () => {
  it("reads a code off the error itself", () => {
    expect(sqlstate(withCode("23505"))).toBe("23505");
  });

  it("reads it off the cause, which is where drizzle puts the driver's error", () => {
    // The case the folders probe caught: the wrapper carries no code, so a bare
    // `error.code` check reads a duplicate as an unexpected failure and rethrows.
    const wrapped = Object.assign(new Error("Failed query"), { cause: withCode("23505") });
    expect(sqlstate(wrapped)).toBe("23505");
  });

  it("walks more than one link", () => {
    const deep = Object.assign(new Error("outer"), {
      cause: Object.assign(new Error("middle"), { cause: withCode("23503") }),
    });
    expect(sqlstate(deep)).toBe("23503");
  });

  it("is null for an error with no code anywhere", () => {
    expect(sqlstate(new Error("plain"))).toBeNull();
    expect(sqlstate("a string")).toBeNull();
    expect(sqlstate(null)).toBeNull();
  });

  it("ignores a non-string code rather than returning it", () => {
    expect(sqlstate(Object.assign(new Error("x"), { code: 23505 }))).toBeNull();
  });

  it("terminates on a cause cycle", () => {
    const a: { cause?: unknown } = {};
    const b = { cause: a };
    a.cause = b;
    expect(sqlstate(a)).toBeNull();
  });
});

describe("the two named violations", () => {
  it("recognises 23505 and 23503, wrapped or bare", () => {
    expect(isUniqueViolation(withCode("23505"))).toBe(true);
    expect(isUniqueViolation({ cause: withCode("23505") })).toBe(true);
    expect(isForeignKeyViolation(withCode("23503"))).toBe(true);
  });

  it("does not confuse the two, or claim an unrelated failure", () => {
    expect(isUniqueViolation(withCode("23503"))).toBe(false);
    expect(isForeignKeyViolation(withCode("23505"))).toBe(false);
    // A connection drop is not a refusal, and reading it as one is what put a
    // database outage in front of the player as a name error.
    expect(isUniqueViolation(withCode("57P01"))).toBe(false);
  });
});
