import { describe, expect, it } from "vitest";

import { MAX_LIMIT_CENTS, validLimit } from "./take";

describe("validLimit", () => {
  it("takes the default and whole dollars from $1", () => {
    expect(validLimit(null)).toBe(true);
    expect(validLimit(100)).toBe(true);
    expect(validLimit(2500)).toBe(true);
    expect(validLimit(MAX_LIMIT_CENTS)).toBe(true);
  });

  it("refuses cents, zero, and anything past the ceiling the column can hold", () => {
    expect(validLimit(250)).toBe(false);
    expect(validLimit(0)).toBe(false);
    expect(validLimit(MAX_LIMIT_CENTS + 100)).toBe(false);
    expect(validLimit(2_147_483_700)).toBe(false);
  });
});
