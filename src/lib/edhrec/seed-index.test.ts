import { beforeEach, expect, it, vi } from "vitest";

// How many times the run cleared persisted scores. Injected at every call
// site because it is a database write and these cases have no database.
let cleared = 0;
beforeEach(() => { cleared = 0; });

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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
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
    clearScores: async () => { cleared++; },
    delayMs: 250,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  expect(sleeps).toEqual([250, 250]);
});

// Ruling D made `commander_scores.fit_synergy` a function of this table, so a
// rebuild invalidates every persisted score. Asserted here because nothing
// downstream can see it: `loadScores` detects a stale SENTINEL and is blind to
// a set with rows deleted out of it, which is why the clear has to be
// all-or-nothing and why removing it would otherwise be invisible.
it("clears persisted scores once, after a run that wrote something", async () => {
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    fetch: async () => okResult(["Sol Ring"]),
    write: async () => {},
    clearScores: async () => { cleared++; },
    delayMs: 0,
  });
  expect(cleared).toBe(1);
});

// A run that wrote nothing changed no input, so throwing away every reader's
// scores for it would be a self-inflicted cold start.
it("leaves persisted scores alone when the run wrote nothing", async () => {
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a")],
    loadNameIndex: async () => [],
    // A `degraded` header is not written, so nothing reached the table.
    fetch: async () => ({ data: null, unreachable: true }),
    write: async () => { throw new Error("should not write"); },
    clearScores: async () => { cleared++; },
    delayMs: 0,
  });
  expect(cleared).toBe(0);
});

// THE RESUME PATH. `alreadyComputedSince` exists so an interrupted build can be
// dispatched again to finish, and `r.commanders` counts only THIS invocation's
// writes — so a resume whose remaining commanders were all written by the
// aborted attempt writes nothing, skips everything, and would leave every score
// computed against the previous index if the clear were gated on writes alone.
it("clears persisted scores on a resume that wrote nothing but skipped work", async () => {
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    loadAlreadyComputed: async () => new Set(["a", "b"]),
    fetch: async () => { throw new Error("should not fetch a computed commander"); },
    write: async () => { throw new Error("should not write"); },
    clearScores: async () => { cleared++; },
    delayMs: 0,
  });
  expect(cleared).toBe(1);
});

// And the boundary the condition must not cross: nothing written, nothing
// skipped, everything failed. The index did not move, so the scores stand.
it("leaves scores alone when every commander failed and none was skipped", async () => {
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a")],
    loadNameIndex: async () => [],
    fetch: async () => { throw new Error("boom"); },
    write: async () => {},
    clearScores: async () => { cleared++; },
    delayMs: 0,
  });
  expect(cleared).toBe(0);
});

// The exclusive half of `SCORE_INDEX_LOCK`. Every other case here injects
// `clearScores`, which is what makes the DEFAULT implementation untested — so
// this one exercises it against the db stub and reads the statements it ran.
// Without the lock the delete can land between a score writer's generation
// check and its inserts, and those pre-rebuild rows survive the clear.
it("clears scores under an exclusive index lock, in a transaction", async () => {
  // ONE ORDERED TRACE ACROSS BOTH CALLS. A separate `executed` list and a
  // `deleted` flag say a lock statement happened and a delete happened, in no
  // particular order — so moving `tx.delete` ahead of the lock passed, and the
  // lock covering the delete is the entire property.
  const trace: string[] = [];
  let exclusive = false;
  const tx = {
    execute: async (q: unknown) => {
      const text = JSON.stringify(q);
      if (text.includes("pg_advisory_xact_lock")) {
        trace.push("lock");
        exclusive = !text.includes("pg_advisory_xact_lock_shared");
      } else {
        trace.push("execute");
      }
    },
    delete: async () => { trace.push("delete"); },
  };
  stub.db.transaction = (cb: (t: typeof tx) => Promise<void>) => cb(tx);

  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a")],
    loadNameIndex: async () => [],
    fetch: async () => okResult(["Sol Ring"]),
    write: async () => {},
    delayMs: 0,
  });

  expect(trace).toEqual(["lock", "delete"]);
  // Exclusive, not shared: this one has to wait for every in-flight writer.
  // Read off the raw statement, since the trace deliberately collapses both
  // lock modes onto one label so the ORDER assertion above is about position
  // rather than mode.
  expect(exclusive).toBe(true);
});
