import { describe, expect, it } from "vitest";
import { FOLDER_NAME_MAX, validateFolderName } from "./folder-name";
import { DECK_NAME_MAX } from "./deck-name";

describe("validateFolderName", () => {
  it("trims the name it returns", () => {
    expect(validateFolderName("  Commander night  ")).toBe("Commander night");
  });

  it("rejects a name that is empty or only whitespace", () => {
    expect(() => validateFolderName("")).toThrow();
    expect(() => validateFolderName("   ")).toThrow();
  });

  it("rejects control characters, including DEL and the C1 range", () => {
    expect(() => validateFolderName("night\u0000")).toThrow();
    expect(() => validateFolderName("night\u007F")).toThrow();
    expect(() => validateFolderName("night\u0085")).toThrow();
  });

  it("accepts a name at the ceiling and rejects one past it", () => {
    expect(validateFolderName("x".repeat(FOLDER_NAME_MAX))).toHaveLength(FOLDER_NAME_MAX);
    expect(() => validateFolderName("x".repeat(FOLDER_NAME_MAX + 1))).toThrow();
  });

  it("measures the ceiling after trimming", () => {
    expect(validateFolderName(` ${"x".repeat(FOLDER_NAME_MAX)} `)).toHaveLength(FOLDER_NAME_MAX);
  });

  it("shares the deck name ceiling", () => {
    expect(FOLDER_NAME_MAX).toBe(DECK_NAME_MAX);
  });
});
