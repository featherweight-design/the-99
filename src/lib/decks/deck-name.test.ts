import { describe, expect, it } from "vitest";
import { validateDeckName } from "./deck-name";

describe("validateDeckName", () => {
  it("trims and returns a valid name", () => {
    expect(validateDeckName("  Atraxa Superfriends  ")).toBe("Atraxa Superfriends");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(() => validateDeckName("   ")).toThrow(/1–120 characters/);
  });

  it("rejects a name over 120 characters", () => {
    expect(() => validateDeckName("a".repeat(121))).toThrow(/1–120 characters/);
  });

  it("rejects control characters, which corrupt export headers and filenames", () => {
    expect(() => validateDeckName("Deck\u0007name")).toThrow(/control characters/);
    expect(() => validateDeckName("Deck\u000Aname")).toThrow(/control characters/);
  });
});
