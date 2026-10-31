// The launch date's write over a recording transaction: the switch lock first, the saved value read under it, the value and
// its launch_date_set event written together, and nothing written for a refusal or an unchanged save.
import { beforeEach, describe, expect, it, vi } from "vitest";

const log: string[] = [];
const events: Record<string, unknown>[] = [];
const upserts: Record<string, unknown>[] = [];
let stored: string | null = null;

const name = (t: object) => String((t as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);
const tx = {
  select: () => ({ from: () => ({ where: async () => (stored === null ? [] : [{ value: stored }]) }) }),
  delete: (table: object) => ({ where: async () => { log.push(`delete:${name(table)}`); } }),
  insert: (table: object) => ({
    values: (v: Record<string, unknown>) => {
      if (name(table) === "admin_events") {
        events.push(v);
        return Promise.resolve();
      }
      return { onConflictDoUpdate: async () => { log.push(`upsert:${name(table)}`); upserts.push(v); } };
    },
  }),
};
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => (stored === null ? [] : [{ value: stored }]) }) }),
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));
vi.mock("../switches/write-lock", () => ({ lockSwitchWrites: async () => { log.push("switch-lock"); } }));

const { readStoredLaunchDate, setLaunchDate } = await import("./launch-date");
const now = new Date("2026-10-31T12:00:00Z");

beforeEach(() => {
  log.length = 0;
  events.length = 0;
  upserts.length = 0;
  stored = null;
});

describe("setLaunchDate", () => {
  it("locks, writes the value and records launch_date_set in the same transaction", async () => {
    expect(await setLaunchDate("u_admin", "2026-11-20", { now })).toEqual({ ok: true, state: "saved", value: "2026-11-20", changed: true });
    expect(log).toEqual(["switch-lock", "upsert:flyer_settings"]);
    expect(upserts[0]).toMatchObject({ key: "launch_date", value: "2026-11-20" });
    expect(events).toEqual([expect.objectContaining({ actorId: "u_admin", kind: "launch_date_set", oldValue: null, newValue: "2026-11-20" })]);
  });

  it("records the date before and after when it moves", async () => {
    stored = "2026-11-20";
    await setLaunchDate("u_admin", "2026-12-01", { now });
    expect(events).toEqual([expect.objectContaining({ kind: "launch_date_set", oldValue: "2026-11-20", newValue: "2026-12-01" })]);
  });

  it("clears on a blank by keeping the row empty (the env fallback stays off) and recording the old date", async () => {
    stored = "2026-11-20";
    expect(await setLaunchDate("u_admin", "", { now })).toEqual({ ok: true, state: "cleared", value: null, changed: true });
    expect(log).toEqual(["switch-lock", "upsert:flyer_settings"]);
    expect(upserts[0]).toMatchObject({ key: "launch_date", value: "" });
    expect(events).toEqual([expect.objectContaining({ kind: "launch_date_set", oldValue: "2026-11-20", newValue: null })]);
  });

  it("is idempotent: an unchanged save, or a clear with nothing saved, writes no row and no event", async () => {
    stored = "2026-11-20";
    expect(await setLaunchDate("u_admin", "2026-11-20", { now })).toMatchObject({ ok: true, changed: false });
    stored = null;
    expect(await setLaunchDate("u_admin", "", { now })).toMatchObject({ ok: true, state: "cleared", changed: false });
    expect(log.filter((l) => l !== "switch-lock")).toEqual([]);
    expect(events).toEqual([]);
  });

  it("allows today and refuses a past or malformed date before opening a transaction", async () => {
    expect(await setLaunchDate("u_admin", "2026-10-31", { now })).toMatchObject({ ok: true, state: "saved" });
    log.length = 0;
    events.length = 0;
    expect(await setLaunchDate("u_admin", "2026-10-30", { now })).toEqual({ ok: false, error: "past" });
    expect(await setLaunchDate("u_admin", "soon", { now })).toEqual({ ok: false, error: "invalid" });
    expect(log).toEqual([]);
    expect(events).toEqual([]);
  });
});

describe("readStoredLaunchDate", () => {
  it("reads the saved day, or null", async () => {
    expect(await readStoredLaunchDate()).toBeNull();
    stored = "2026-11-20";
    expect(await readStoredLaunchDate()).toBe("2026-11-20");
  });
});
