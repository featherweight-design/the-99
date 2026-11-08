import { describe, expect, it } from "vitest";
import { isEmailShape as viaInvites } from "./invites/rules";
import { isEmailShape } from "./email-shape";

describe("isEmailShape", () => {
  it("holds the shape, and the invites module re-exports the one rule", () => {
    for (const ok of ["name@example.com", " name@example.com ", "a@b.c"]) expect(isEmailShape(ok), ok).toBe(true);
    for (const bad of ["a@b", "@b.com", "a@.com", "a b@c.com", "", "a@@b.com", "x".repeat(250) + "@a.bc"]) expect(isEmailShape(bad), bad).toBe(false);
    expect(viaInvites).toBe(isEmailShape);
  });
});
