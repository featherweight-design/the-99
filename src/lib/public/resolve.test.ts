import { describe, expect, it, vi } from "vitest";

const queried = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { select: (...a: unknown[]) => { queried(...a); throw new Error("queried"); } } }));

import { resolvePublicSlug } from "./resolve";

describe("resolvePublicSlug", () => {
  it("answers not-found for a string that cannot be an address WITHOUT asking the database", async () => {
    for (const bad of ["sol-ring", "", "sol-ring-0b3f2c9e6a4", "SOL-0B3F2C9E6A41"]) {
      expect(await resolvePublicSlug(bad), bad).toEqual({ kind: "not-found" });
    }
    expect(queried).not.toHaveBeenCalled();
  });

  it("does ask once for an address", async () => {
    await expect(resolvePublicSlug("sol-ring-0b3f2c9e6a41")).rejects.toThrow("queried");
    expect(queried).toHaveBeenCalledTimes(1);
  });
});
