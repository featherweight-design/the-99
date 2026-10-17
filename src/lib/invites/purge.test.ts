import { describe, expect, it, vi } from "vitest";
import { revokeAfterPurge } from "./purge";

describe("revokeAfterPurge (R10: the Clerk half, after the purge commits)", () => {
  it("revokes every id once and counts what Clerk ended", async () => {
    const revoke = vi.fn(async (id: string) => id !== "inv_2");
    expect(await revokeAfterPurge(["inv_1", "inv_2", "inv_3"], revoke)).toEqual({ found: 3, revoked: 2 });
    expect(revoke.mock.calls.map((c) => c[0])).toEqual(["inv_1", "inv_2", "inv_3"]);
  });
  it("never throws: a revoke that fails is left to Clerk's own expiry, and the rest still go", async () => {
    const revoke = vi.fn(async (id: string) => {
      if (id === "inv_1") throw new Error("down");
      return true;
    });
    expect(await revokeAfterPurge(["inv_1", "inv_2"], revoke)).toEqual({ found: 2, revoked: 1 });
  });
  it("does nothing for an account that held none", async () => {
    const revoke = vi.fn();
    expect(await revokeAfterPurge([], revoke)).toEqual({ found: 0, revoked: 0 });
    expect(revoke).not.toHaveBeenCalled();
  });
});
