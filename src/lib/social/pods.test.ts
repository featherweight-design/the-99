// The batch add (Social R1 PR A, E11): one transaction, all or none, under `addMember`'s lock order (the pod
// row FOR UPDATE, then the friendships FOR SHARE). A fake transaction records the statements in order, so the
// order and the refusal before any insert are pinned here; `probe:social` proves the answers on a database.
import { beforeEach, describe, expect, it, vi } from "vitest";

const log: string[] = [];
const results: unknown[][] = [];

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "orderBy", "values", "onConflictDoNothing"]) c[m] = () => c;
  c.for = (strength: string, opts?: { of?: unknown }) => {
    log.push(`for ${strength}${opts?.of ? " of" : ""}`);
    return Promise.resolve(results.shift() ?? []);
  };
  c.returning = () => {
    log.push("insert");
    return Promise.resolve(results.shift() ?? []);
  };
  return c;
}

vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => unknown) => {
      log.push("begin");
      return fn({ select: () => chain(), insert: () => chain() });
    },
  },
}));

const { addMembers, ADD_MEMBERS_MAX } = await import("./pods");

const VIEWER = "user_viewer";
const POD = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const F1 = "11111111-1111-4111-8111-111111111111";
const F2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  log.length = 0;
  results.length = 0;
});

describe("addMembers", () => {
  it("refuses a malformed batch before any transaction", async () => {
    for (const bad of [[], ["nope"], "F1", null, Array.from({ length: ADD_MEMBERS_MAX + 1 }, (_, i) => `${F1.slice(0, -2)}${String(i).padStart(2, "0")}`)]) {
      await expect(addMembers(VIEWER, POD, bad)).resolves.toEqual({ ok: false, reason: "invalid" });
    }
    await expect(addMembers(VIEWER, "nope", [F1])).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(log).toEqual([]);
  });

  it("locks the pod, then the friendships, then inserts every member in one statement", async () => {
    results.push([{ id: POD }], [{ friendUserId: "u1" }, { friendUserId: "u2" }], [{ userId: "u1" }, { userId: "u2" }]);
    await expect(addMembers(VIEWER, POD, [F1, F2])).resolves.toEqual({ ok: true, added: 2 });
    expect(log).toEqual(["begin", "for update", "for share of", "insert"]);
  });

  it("adds nobody when one named friend is not a friend", async () => {
    results.push([{ id: POD }], [{ friendUserId: "u1" }]);
    await expect(addMembers(VIEWER, POD, [F1, F2])).resolves.toEqual({ ok: false, reason: "notFriend" });
    expect(log).not.toContain("insert");
  });

  it("counts a repeated id once", async () => {
    results.push([{ id: POD }], [{ friendUserId: "u1" }], [{ userId: "u1" }]);
    await expect(addMembers(VIEWER, POD, [F1, F1])).resolves.toEqual({ ok: true, added: 1 });
  });

  it("refuses a viewer who does not own the pod, before reading any friendship", async () => {
    results.push([]);
    await expect(addMembers(VIEWER, POD, [F1])).resolves.toEqual({ ok: false, reason: "notOwner" });
    expect(log).toEqual(["begin", "for update"]);
  });
});
