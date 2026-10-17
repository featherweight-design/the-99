import { describe, expect, it, vi } from "vitest";
import { revokeAfterPurge } from "./purge";

const none = { ids: [], unstored: [] };

describe("revokeAfterPurge (R10: the Clerk half, after the purge commits)", () => {
  it("revokes every id once and counts what Clerk ended", async () => {
    const revoke = vi.fn(async (id: string) => id !== "inv_2");
    expect(await revokeAfterPurge({ ids: ["inv_1", "inv_2", "inv_3"], unstored: [] }, { revoke })).toEqual({ found: 3, revoked: 2 });
    expect(revoke.mock.calls.map((c) => c[0])).toEqual(["inv_1", "inv_2", "inv_3"]);
  });
  it("finds a send whose id was never stored by its address and reservation, since nothing else can after the purge", async () => {
    const revokeFor = vi.fn(async () => true);
    const r = await revokeAfterPurge({ ids: [], unstored: [{ email: "a@x.dev", reservationId: "r1" }] }, { revokeFor });
    expect(r).toEqual({ found: 1, revoked: 1 });
    expect(revokeFor).toHaveBeenCalledWith("a@x.dev", "r1");
  });
  it("never throws: a revoke that fails is left to Clerk's own expiry, and the rest still go", async () => {
    const revoke = vi.fn(async (id: string) => {
      if (id === "inv_1") throw new Error("down");
      return true;
    });
    const revokeFor = vi.fn(async () => { throw new Error("down"); });
    const r = await revokeAfterPurge({ ids: ["inv_1", "inv_2"], unstored: [{ email: "a@x.dev", reservationId: "r1" }] }, { revoke, revokeFor });
    expect(r).toEqual({ found: 3, revoked: 1 });
  });
  it("does nothing for an account that held none", async () => {
    const revoke = vi.fn();
    expect(await revokeAfterPurge(none, { revoke })).toEqual({ found: 0, revoked: 0 });
    expect(revoke).not.toHaveBeenCalled();
  });
});
