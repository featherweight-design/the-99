import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadGuidedTiles } from "./tile";

const h = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], selects: 0 }));

vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => {
      h.selects += 1;
      const b: Record<string, unknown> = {};
      b.from = () => b;
      b.where = () => b;
      b.orderBy = () => Promise.resolve(h.rows);
      return b;
    },
  },
}));

const NOW = Date.parse("2026-11-21T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const run = (deckId: string, over: Record<string, unknown>) => ({ deckId, strategyLabel: "Artifacts", status: "done", refunded: false, createdAt: ago(HOUR), ...over });

beforeEach(() => { h.rows = []; h.selects = 0; });

describe("loadGuidedTiles", () => {
  it("asks nothing for no decks", async () => {
    expect((await loadGuidedTiles([], NOW)).size).toBe(0);
    expect(h.selects).toBe(0);
  });

  it("draws a pending run as running, with its start and strategy", async () => {
    const at = ago(2 * MIN);
    h.rows = [run("a", { status: "pending", createdAt: at })];
    expect((await loadGuidedTiles(["a"], NOW)).get("a")).toEqual({ startedAt: at, status: "running", strategyLabel: "Artifacts" });
  });

  it("draws nothing for a pending run past the reaper's limit: it is dead, not running", async () => {
    h.rows = [run("a", { status: "pending", createdAt: ago(2 * HOUR) })];
    expect((await loadGuidedTiles(["a"], NOW)).size).toBe(0);
  });

  it("draws a refunded finished run as short and a failed run as failed, for a day", async () => {
    h.rows = [run("s", { refunded: true, createdAt: ago(23 * HOUR) }), run("f", { status: "failed", refunded: true, createdAt: ago(23 * HOUR) })];
    const tiles = await loadGuidedTiles(["s", "f"], NOW);
    expect(tiles.get("s")?.status).toBe("short");
    expect(tiles.get("f")?.status).toBe("failed");
  });

  it("retires a short or failed run after 24 hours", async () => {
    h.rows = [run("s", { refunded: true, createdAt: ago(25 * HOUR) }), run("f", { status: "failed", createdAt: ago(25 * HOUR) })];
    expect((await loadGuidedTiles(["s", "f"], NOW)).size).toBe(0);
  });

  it("draws nothing for a finished run that kept its charge", async () => {
    h.rows = [run("a", {})];
    expect((await loadGuidedTiles(["a"], NOW)).size).toBe(0);
  });
});
