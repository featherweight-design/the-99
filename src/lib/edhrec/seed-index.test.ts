import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// How many times the run cleared persisted scores. Injected at every call
// site because it is a database write and these cases have no database.
let cleared = 0;
beforeEach(() => { cleared = 0; });

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { buildCommanderIndex,
  pairNameFilter,
} from "./seed-index";

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
    similarNames: [], deckCount: 1000, rank: 5, saltScore: 1.2, composition: null, manaCurve: null,
  },
  unreachable: false,
});

it("writes one header per commander and one child row per resolved card", async () => {
  const writes: { header: { synergyState: string; edhrecTotal: number | null }; cards: unknown[] }[] = [];
  const r = await buildCommanderIndex({
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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
    // The pair pass is injected empty: these cases cover the single-commander walk, and the
    // pair projection has its own suite. A default that reached the database would make every
    // one of these tests need a real Postgres.
    loadPairs: async () => [],
    // Same reasoning for the role-target pass, which is the run's other database-reaching
    // default.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
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

describe("buildCommanderIndex — the pair pass", () => {
  const noCommanders = {
    loadCommanders: async () => [],
    loadNameIndex: async () => [{ oracleId: "aaaaaaaa-0000-4000-8000-000000000001", name: "Sol Ring" }],
    clearScores: async () => {},
    // Injected for the same reason as `clearScores`: the default reaches a real database, and
    // this suite proves the BUILD without one.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
    sleep: async () => {},
    delayMs: 0,
  };
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  const pair = { a: A, b: B, nameA: "Kratos", nameB: "Atreus" };
  const okResult = {
    unreachable: false,
    rawPayload: {},
    data: {
      topCards: ["Sol Ring"], inclusionByName: { "sol ring": 70 }, synergyByName: {},
      tags: [], bracketCounts: { "3": 1 }, budgetCounts: {}, similarNames: [],
      deckCount: 13332, rank: 159, saltScore: null,
      composition: null, manaCurve: null,
    },
  };

  it("fetches and writes a pair present in decks", async () => {
    const written: unknown[] = [];
    const r = await buildCommanderIndex({
      ...noCommanders,
      loadPairs: async () => [pair],
      fetchPair: async () => okResult,
      writePair: async (h, c) => { written.push({ h, c }); },
    });
    expect(r.pairs).toBe(1);
    expect(r.pairCardRows).toBe(1);
    expect(written).toHaveLength(1);
  });

  // The same rule the single-commander write follows: degraded is "we could not reach
  // EDHREC", not a fact about the pair, and writing it would cascade-delete a good pair's
  // support list over one transient failure.
  it("does not write a degraded pair", async () => {
    const written: unknown[] = [];
    const r = await buildCommanderIndex({
      ...noCommanders,
      loadPairs: async () => [pair],
      fetchPair: async () => ({ data: null, unreachable: true, rawPayload: null }),
      writePair: async (h, c) => { written.push({ h, c }); },
    });
    expect(r.pairs).toBe(0);
    // pairsDegraded, NOT degraded: the commander counter feeds two exit guards that read it
    // as "commanders degraded", so one unreachable pair used to fail a resume run in which
    // every commander was skipped.
    expect(r.pairsDegraded).toBe(1);
    expect(r.degraded).toBe(0);
    expect(written).toEqual([]);
  });

  it("counts a failed pair without abandoning the rest of the pass", async () => {
    let calls = 0;
    const r = await buildCommanderIndex({
      ...noCommanders,
      loadPairs: async () => [pair, { ...pair, a: A, b: "33333333-3333-4333-8333-333333333333" }],
      fetchPair: async () => { if (++calls === 1) throw new Error("boom"); return okResult; },
      writePair: async () => {},
    });
    expect(r.pairsFailed).toBe(1);
    expect(r.pairs).toBe(1);
  });
});

describe("pairNameFilter", () => {
  // The name map behind the pair pass. It used to read the WHOLE cards table for a bounded
  // question — the commander index next door genuinely does need every row, which is what
  // made the wrong read look like the house pattern.
  it("keys on the ids it was given rather than scanning the table", () => {
    const { sql: text } = new PgDialect().sqlToQuery(pairNameFilter(["a", "b"]));
    expect(text).toContain('"oracle_id" = any(');
  });

  // The cast is the part that fails at RUNTIME, on a monthly job. A bare JS array against a
  // uuid column raises rather than returning nothing, so nothing short of running the job
  // would have said so.
  it("casts the parameter to uuid[]", () => {
    expect(new PgDialect().sqlToQuery(pairNameFilter(["a"])).sql).toContain("::uuid[]");
  });
});

// Round 4 of #754. `clearScores` used to run AFTER the pair pass, and `loadPairs` sits
// outside the per-pair catch — so one throw there skipped the clear entirely and left every
// stored score computed against an index that had already moved, marked
// `writer_version`-current and indistinguishable from a fresh set. That is the failure
// `probe:score-lock` exists for, reached from the one direction the lock cannot help with.
describe("the score clear runs before the pair pass", () => {
  it("clears even when loading the pairs throws", async () => {
    let cleared = 0;
    await expect(
      buildCommanderIndex({
        loadPairs: async () => {
          throw new Error("pair query failed");
        },
        loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
        loadNameIndex: async () => [{ oracleId: "g", name: "Ghoulcaller Gisa" }],
        fetch: async () => okResult(["Sol Ring"]),
        write: async () => {},
        clearScores: async () => {
          cleared++;
        },
        delayMs: 0,
      }),
    ).rejects.toThrow("pair query failed");
    expect(cleared).toBe(1);
  });

  // The counterpart, unchanged: a run that moved nothing must not throw away every reader's
  // scores for it. That would be a self-inflicted cold start.
  it("does not clear when no commander was written or skipped", async () => {
    let cleared = 0;
    await buildCommanderIndex({
      loadPairs: async () => [],
      loadCommanders: async () => [],
      loadNameIndex: async () => [],
      fetch: async () => okResult([]),
      write: async () => {},
      clearScores: async () => {
        cleared++;
      },
      // Same reasoning as `clearScores`: the default reaches a real database.
      deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0 }),
      delayMs: 0,
    });
    expect(cleared).toBe(0);
  });
});

describe("buildCommanderIndex — the role-target pass", () => {
  // Nothing read `r.roleTargets`, so deleting the call and the field left the whole suite
  // green: the pass's WIRING into the build was untested while its derivation was not.
  it("runs the pass and reports what it wrote", async () => {
    let ran = 0;
    const r = await buildCommanderIndex({
      loadCommanders: async () => [],
      loadNameIndex: async () => [],
      loadPairs: async () => [],
      clearScores: async () => {},
      deriveRoleTargets: async () => {
        ran += 1;
        return { written: 3279, pairsWritten: 1, zeroWipes: 364 };
      },
      sleep: async () => {},
      delayMs: 0,
    });

    expect(ran).toBe(1);
    // The FIGURES, not just the call: reporting zero for a pass that wrote 3,279 rows is the
    // shape a dropped assignment takes, and it is invisible to a call counter.
    expect(r.roleTargets).toBe(3279);
    expect(r.pairRoleTargets).toBe(1);
  });

  // The pass is the run's last write and reaches a database. A build that let a throw here
  // escape would report a failure for a run whose index work had already succeeded — but
  // swallowing it would publish a partial set silently, which is the worse half.
  it("lets a refusal fail the run rather than swallowing it", async () => {
    await expect(buildCommanderIndex({
      loadCommanders: async () => [],
      loadNameIndex: async () => [],
      loadPairs: async () => [],
      clearScores: async () => {},
      deriveRoleTargets: async () => { throw new Error("role targets REFUSED"); },
      sleep: async () => {},
      delayMs: 0,
    })).rejects.toThrow(/REFUSED/);
  });
});

// THE RUN'S START STAMP. The role pass refuses rather than publishing a partial set, and its
// refusal clears the roles on exactly the rows this run rewrote — `computed_at >= runStartedAt`.
// That set is only correct if the stamp is taken BEFORE the first write: taken at the pass
// instead, it matches every commander the run touched AND nothing, depending on clock skew, and
// taken after the loop it matches nothing at all, which would leave every self-contradicting row
// standing while the error claimed otherwise.
it("stamps the run's start before any write and hands it to the role pass", async () => {
  let handed: Date | null = null;
  let firstWriteAt: number | null = null;
  await buildCommanderIndex({
    loadPairs: async () => [],
    deriveRoleTargets: async (runStartedAt) => {
      handed = runStartedAt;
      return { written: 0, pairsWritten: 0, zeroWipes: 0 };
    },
    // Waits either side of the first write, so the three readings are strictly ordered rather
    // than landing in one millisecond together.
    loadCommanders: async () => {
      await new Promise((r) => setTimeout(r, 12));
      return [commander("Ghoulcaller Gisa", "g")];
    },
    loadNameIndex: async () => [
      { oracleId: "g", name: "Ghoulcaller Gisa" },
      { oracleId: "s", name: "Sol Ring" },
    ],
    fetch: async () => okResult(["Sol Ring", "Ghoulcaller Gisa"]),
    // The whole run finishes inside ONE MILLISECOND, and the first version of this test was
    // vacuous for exactly that reason: a stamp taken at the pass still read equal to the write's
    // clock, so `<=` passed the mutation it exists to catch. The wait moves the clock far enough
    // for the two readings to differ, and the assertion below is STRICT.
    write: async () => {
      firstWriteAt ??= Date.now();
      await new Promise((r) => setTimeout(r, 12));
    },
    clearScores: async () => {},
    delayMs: 0,
  });
  expect(handed).toBeInstanceOf(Date);
  expect(firstWriteAt).not.toBeNull();
  expect(handed!.getTime()).toBeLessThan(firstWriteAt!);
});
