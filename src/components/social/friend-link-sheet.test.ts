import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/friends/friend-link-actions", () => ({}));

import { codeChars } from "./friend-link-sheet";

describe("codeChars (the friend code box)", () => {
  it("types in capitals and keeps at most six", () => {
    expect(codeChars("k7q4xmzz")).toBe("K7Q4XM");
  });

  it("drops what no code holds (0, O, 1, I, L, spaces, a hyphen) instead of guessing", () => {
    expect(codeChars("k7q-4 x0O1ILm")).toBe("K7Q4XM");
  });
});
