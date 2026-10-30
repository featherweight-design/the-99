// The flyer-code writes over a recording transaction: make takes the locks in order, retries a taken code without a
// unique violation, refuses a missing group; revoke locks the creator, stamps once, is idempotent, and leaves claims alone.
import { beforeEach, describe, expect, it, vi } from "vitest";

const log: string[] = [];
const events: Record<string, unknown>[] = [];
let groupRows: { id: string }[] = [];
let takenCodes = new Set<string>();
let codeRow: { createdBy: string } | null = null;
let revokeRow: { code: string; groupId: string | null } | null = null;
let inserted: Record<string, unknown>[] = [];
let updatedTables: string[] = [];

const name = (t: object) => String((t as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);
const tx = {
  select: () => ({ from: () => ({ where: async () => groupRows }) }),
  insert: (table: object) => ({
    values: (v: Record<string, unknown>) => {
      if (name(table) === "admin_events") {
        events.push(v);
        return Promise.resolve();
      }
      return {
        onConflictDoNothing: () => ({
          returning: async () => {
            log.push(`code:${v.code}`);
            inserted.push(v);
            if (takenCodes.has(v.code as string)) return [];
            return [{ id: "flyer-1" }];
          },
        }),
      };
    },
  }),
  update: (table: object) => {
    updatedTables.push(name(table));
    return { set: (v: Record<string, unknown>) => ({ where: () => ({ returning: async () => { log.push(`stamp:${String(v.revokedAt)}`); return revokeRow ? [revokeRow] : []; } }) }) };
  },
};
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => (codeRow ? [codeRow] : []) }) }),
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));
vi.mock("../invites/send", () => ({ lockSenderIn: async (_t: unknown, id: string, given?: Date) => { log.push(`sender:${id}`); return given ?? new Date("2026-10-30T12:00:00Z"); } }));
vi.mock("../switches/write-lock", () => ({ lockSwitchWrites: async () => { log.push("switch-lock"); } }));

const { makeFlyerCode, revokeFlyerCode } = await import("./admin");

beforeEach(() => {
  log.length = 0;
  events.length = 0;
  inserted = [];
  updatedTables = [];
  groupRows = [{ id: "g1" }];
  takenCodes = new Set();
  codeRow = { createdBy: "u_hugh" };
  revokeRow = { code: "MOX4QK", groupId: "g1" };
});

describe("makeFlyerCode", () => {
  it("locks the switch writes, then the sender, makes the code and records flyer_code_made", async () => {
    const out = await makeFlyerCode("u_hugh", { store: " Mox Boston ", groupId: "g1" }, { pick: () => 0 });
    expect(out).toEqual({ ok: true, id: "flyer-1", code: "AAAAAA" });
    expect(log.slice(0, 2)).toEqual(["switch-lock", "sender:u_hugh"]);
    expect(inserted[0]).toMatchObject({ label: "Mox Boston", groupId: "g1", createdBy: "u_hugh", code: "AAAAAA" });
    expect(events).toEqual([expect.objectContaining({ actorId: "u_hugh", kind: "flyer_code_made", userId: "u_hugh", groupId: "g1", newValue: "AAAAAA", note: "Mox Boston" })]);
  });

  it("draws again when a code is taken, and gives up after the attempts", async () => {
    let n = 0;
    takenCodes = new Set(["AAAAAA"]);
    const out = await makeFlyerCode("u_hugh", { store: "Mox", groupId: "g1" }, { pick: () => (n++ < 6 ? 0 : 1) });
    expect(out).toMatchObject({ ok: true, code: "BBBBBB" });
    takenCodes = new Set(["AAAAAA"]);
    events.length = 0;
    expect(await makeFlyerCode("u_hugh", { store: "Mox", groupId: "g1" }, { pick: () => 0 })).toEqual({ ok: false, reason: "failed" });
    expect(events).toEqual([]);
  });

  it("refuses an empty store or a group that is gone, writing nothing", async () => {
    expect(await makeFlyerCode("u_hugh", { store: "  ", groupId: "g1" })).toEqual({ ok: false, reason: "invalid" });
    groupRows = [];
    expect(await makeFlyerCode("u_hugh", { store: "Mox", groupId: "g1" })).toEqual({ ok: false, reason: "group" });
    expect(inserted).toEqual([]);
    expect(events).toEqual([]);
  });
});

describe("revokeFlyerCode", () => {
  it("locks the creator, stamps revoked_at on the code alone and records flyer_code_revoked", async () => {
    const out = await revokeFlyerCode("u_admin", "c1", { now: new Date("2026-11-02T09:00:00Z") });
    expect(out).toEqual({ ok: true, changed: true });
    expect(log).toEqual(["sender:u_hugh", `stamp:${new Date("2026-11-02T09:00:00Z")}`]);
    // Open claims are left alone: the only table written is the code's.
    expect(updatedTables).toEqual(["flyer_codes"]);
    expect(events).toEqual([expect.objectContaining({ actorId: "u_admin", kind: "flyer_code_revoked", userId: "u_hugh", groupId: "g1", oldValue: "MOX4QK" })]);
  });

  it("reads an already-revoked or unknown code as done and writes no event", async () => {
    revokeRow = null;
    expect(await revokeFlyerCode("u_admin", "c1")).toEqual({ ok: true, changed: false });
    codeRow = null;
    expect(await revokeFlyerCode("u_admin", "c2")).toEqual({ ok: true, changed: false });
    expect(events).toEqual([]);
  });
});
