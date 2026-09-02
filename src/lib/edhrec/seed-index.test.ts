import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { buildCommanderIndex } from "./seed-index";

const commander = (name: string, oracleId: string) => ({
  oracleId, name,
  typeLine: "Legendary Creature — Human Wizard",
  oracleText: "{T}: Draw a card.",
});

const okResult = (topCards: string[]) => ({
  data: {
    topCards,
    inclusionByName: {}, synergyByName: {},
    tags: [], bracketCounts: {}, budgetCounts: {},
    similarNames: [], deckCount: 1000, rank: 5, saltScore: 1.2,
  },
  unreachable: false,
});

it("writes one header per commander and one child row per resolved card", async () => {
  const writes: { header: { synergyState: string; edhrecTotal: number | null }; cards: unknown[] }[] = [];
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [
      { oracleId: "g", name: "Ghoulcaller Gisa" },
      { oracleId: "s", name: "Sol Ring" },
    ],
    fetch: async () => okResult(["Sol Ring", "Ghoulcaller Gisa"]),
    write: async (header, cards) => { writes.push({ header, cards }); },
    delayMs: 0,
  });
  expect(r.commanders).toBe(1);
  expect(r.cardRows).toBe(1);           // Gisa herself is never her own support card
  expect(r.unresolved).toBe(0);
  expect(r.degraded).toBe(0);
  // The written header should reflect the fixture: two topCards → edhrecTotal 2,
  // and the synergy state should be "ok" (data present, not absent or degraded).
  expect(writes).toHaveLength(1);
  expect(writes[0].header.synergyState).toBe("ok");
  expect(writes[0].header.edhrecTotal).toBe(2);
});

it("counts an unresolvable name without dropping it from edhrecTotal", async () => {
  let seen: { edhrecTotal: number | null } | undefined;
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [{ oracleId: "s", name: "Sol Ring" }],
    fetch: async () => okResult(["Sol Ring", "A Card We Do Not Have"]),
    write: async (header) => { seen = header; },
    delayMs: 0,
  });
  expect(r.unresolved).toBe(1);
  expect(r.cardRows).toBe(1);
  expect(seen?.edhrecTotal).toBe(2);
});

it("does not write at all when EDHREC is unreachable", async () => {
  // "degraded" means we failed to reach EDHREC, not that EDHREC has nothing.
  // Writing it would replace a good row — and cascade-delete its support cards —
  // on the strength of one transient network failure. Spec §8 requires the
  // existing row survive untouched, so the only correct write is no write.
  const writes: unknown[] = [];
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [],
    fetch: async () => ({ data: null, unreachable: true }),
    write: async (header) => { writes.push(header); },
    delayMs: 0,
  });
  expect(r.degraded).toBe(1);
  expect(r.commanders).toBe(0);
  expect(writes).toEqual([]);
});

it("writes an absent header when EDHREC genuinely has no page", async () => {
  // A 4xx is upstream telling us this commander has no page — real information,
  // and distinct from a failure to ask. It is written.
  let seen: { synergyState: string; edhrecTotal: number | null } | undefined;
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Obscure Legend", "o")],
    loadNameIndex: async () => [],
    fetch: async () => ({ data: null, unreachable: false }),
    write: async (header) => { seen = header; },
    delayMs: 0,
  });
  expect(r.absent).toBe(1);
  expect(r.commanders).toBe(1);
  expect(seen?.synergyState).toBe("absent");
  expect(seen?.edhrecTotal).toBeNull();
});

it("does not abort the run when one commander throws", async () => {
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    fetch: async (name) => {
      if (name === "A") throw new Error("boom");
      return okResult([]);
    },
    write: async () => {},
    delayMs: 0,
  });
  expect(r.failed).toBe(1);
  expect(r.commanders).toBe(1);
});

it("skips commanders already computed after the run start when resuming", async () => {
  const fetch = vi.fn(async () => okResult([]));
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    loadAlreadyComputed: async () => new Set(["a"]),
    fetch,
    write: async () => {},
    delayMs: 0,
  });
  expect(r.skipped).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("waits delayMs between fetches so EDHREC is not hammered", async () => {
  const sleeps: number[] = [];
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    fetch: async () => okResult([]),
    write: async () => {},
    delayMs: 250,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  expect(sleeps).toEqual([250, 250]);
});
