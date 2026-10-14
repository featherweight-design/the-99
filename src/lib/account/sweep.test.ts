import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

// The two statements the sweep makes: the held tombstones, and the retirement update. The update's
// WHERE is captured so a test can read which ids it names.
const held = vi.hoisted(() => ({ rows: [] as { clerkId: string; deletedAt: Date }[], retired: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: async () => held.rows }) }) }),
    update: () => ({ set: () => ({ where: async (w: unknown) => { held.retired.push(w); return { rowCount: 1 }; } }) }),
  },
}));
const { retiring, sweepTombstones, SWEEP_WINDOW_MS } = await import("./sweep");
const { tombstoneHash } = await import("./purge");

const now = new Date("2026-10-14T12:00:00Z");
const at = (msAgo: number) => new Date(now.getTime() - msAgo);

describe("the account sweep", () => {
  it("retires a raw id only once its day is up, the boundary included", () => {
    const held = [
      { clerkId: "young", deletedAt: at(60_000) },
      { clerkId: "edge", deletedAt: at(SWEEP_WINDOW_MS) },
      { clerkId: "old", deletedAt: at(SWEEP_WINDOW_MS + 1) },
      { clerkId: "almost", deletedAt: at(SWEEP_WINDOW_MS - 1) },
    ];
    expect(retiring(held, now)).toEqual(["edge", "old"]);
  });

  it("re-purges every held id, and retires only an old one whose purge went through", async () => {
    held.rows = [
      { clerkId: "old-ok", deletedAt: at(SWEEP_WINDOW_MS + 1) },
      { clerkId: "old-fails", deletedAt: at(SWEEP_WINDOW_MS + 1) },
      { clerkId: "young", deletedAt: at(60_000) },
    ];
    held.retired = [];
    const purged: string[] = [];
    const purge = vi.fn(async (id: string) => {
      purged.push(id);
      if (id === "old-fails") throw new Error("40P01");
    });
    expect(await sweepTombstones(now, purge)).toEqual({ swept: 2, failed: 1, retired: 1 });
    expect(purged).toEqual(["old-ok", "old-fails", "young"]);
    // The retirement names the old id that purged, and not the one that failed: it keeps its raw id.
    const params = JSON.stringify(held.retired.map((w) => new PgDialect().sqlToQuery(w as SQL).params));
    expect(params).toContain("old-ok");
    expect(params).not.toContain("old-fails");
    expect(params).not.toContain("young");
  });

  it("makes no retirement when nothing is past its day", async () => {
    held.rows = [{ clerkId: "young", deletedAt: at(60_000) }];
    held.retired = [];
    expect(await sweepTombstones(now, vi.fn(async () => {}))).toEqual({ swept: 1, failed: 0, retired: 0 });
    expect(held.retired).toEqual([]);
  });

  it("keys a tombstone on the SHA-256 of the id, never the id", () => {
    const h = tombstoneHash("user_2abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("user_2abc");
    expect(tombstoneHash("user_2abc")).toBe(h);
    expect(tombstoneHash("user_2abd")).not.toBe(h);
  });
});
