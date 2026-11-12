import { describe, expect, it } from "vitest";
import { FRIEND_CODE_ALPHABET, normalizeFriendCode } from "./friend-code";

describe("friend code shape", () => {
  it("has 31 symbols and no lookalikes", () => {
    expect(FRIEND_CODE_ALPHABET).toHaveLength(31);
    expect(new Set(FRIEND_CODE_ALPHABET).size).toBe(31);
    for (const c of "0O1IL") expect(FRIEND_CODE_ALPHABET).not.toContain(c);
  });

  it("reads a code without case, spaces or a hyphen", () => {
    expect(normalizeFriendCode("k7q4xm")).toBe("K7Q4XM");
    expect(normalizeFriendCode("K7Q 4XM")).toBe("K7Q4XM");
    expect(normalizeFriendCode("k7q-4xm")).toBe("K7Q4XM");
  });

  it("refuses anything that cannot be a code", () => {
    for (const bad of ["K7Q4X", "K7Q4XMM", "K7Q4X0", "K7Q4XO", "K7Q4X1", "K7Q4XI", "K7Q4XL", "", 123456, null, "K".repeat(40)]) {
      expect(normalizeFriendCode(bad)).toBeNull();
    }
  });
});
