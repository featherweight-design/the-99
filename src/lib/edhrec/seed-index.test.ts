import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// How many times the run cleared persisted scores. Injected at every call
// site because it is a database write and these cases have no database.
let cleared = 0;
beforeEach(() => { cleared = 0; });

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { buildCommanderIndex,
  pairNameFilter, pairRunProblem, replaceCompositionIn, type BuildIndexResult,
} from "./seed-index";
import { commanderScores, identityComposition } from "../../db/schema";

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

  // The pair twin of the commander resume set: without it a resumed run refetches every legal
  // pair — about 1,700 requests — on every retry.
  it("skips a pair a resumed run already recomputed, and fetches one it did not", async () => {
    const other = { ...pair, a: `${pair.a}-other`, nameA: "Other" };
    const fetched: string[] = [];
    const r = await buildCommanderIndex({
      ...noCommanders,
      loadPairs: async () => [pair, other],
      loadAlreadyComputedPairs: async () => new Set([`${pair.a}|${pair.b}`]),
      fetchPair: async (nameA) => { fetched.push(nameA); return okResult; },
      writePair: async () => {},
    });
    expect(r.pairsSkipped).toBe(1);
    expect(fetched).toEqual(["Other"]);
    expect(r.pairs).toBe(1);
  });

  // A short enumeration is reported, and the built pairs it still returns are still fetched:
  // the refusal costs the widening, never the pairs the index already carried.
  it("reports a refused legal sweep and still indexes the built pairs", async () => {
    const r = await buildCommanderIndex({
      ...noCommanders,
      loadPairs: async () => ({ pairs: [pair], legal: 12, refusal: "only 12 legal partner pairs" }),
      fetchPair: async () => okResult,
      writePair: async () => {},
    });
    expect(r.pairRefusal).toBe("only 12 legal partner pairs");
    expect(r.legalPairs).toBe(12);
    expect(r.pairs).toBe(1);
  });

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
    // Once before the pair pass, and once more on the error path, because the failed run
    // cleared the roles of the commander it had written.
    expect(cleared).toBe(2);
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

// THE RUN'S OWNERSHIP RECORD. A refusal in the role pass clears the roles on exactly the rows
// this run replaced, so the pass has to be handed those ids — and only those. The earlier
// version passed a timestamp and scoped the clear to `computed_at >= runStartedAt`, which
// LOOKS like ownership and is a time range: a second build running concurrently has its rows
// fall inside it, so a refusal here would clear that build's freshly derived roles and leave
// its support lists without targets.
it("hands the role pass exactly the commanders it wrote, and no others", async () => {
  let handed: { commanders: readonly string[] } | null = null;
  await buildCommanderIndex({
    loadPairs: async () => [],
    deriveRoleTargets: async (written) => {
      handed = written;
      return { written: 0, pairsWritten: 0, zeroWipes: 0 };
    },
    loadCommanders: async () => [
      commander("Ghoulcaller Gisa", "g"),
      commander("Sidisi, Undead Vizier", "v"),
    ],
    loadNameIndex: async () => [
      { oracleId: "g", name: "Ghoulcaller Gisa" },
      { oracleId: "v", name: "Sidisi, Undead Vizier" },
      { oracleId: "s", name: "Sol Ring" },
    ],
    // The second commander FAILS its fetch, so the run writes one of the two. A pass handed
    // both would clear a row this run never touched.
    fetch: async (name: string) =>
      name === "Ghoulcaller Gisa"
        ? okResult(["Sol Ring", "Ghoulcaller Gisa"])
        : Promise.reject(new Error("unreachable")),
    write: async () => {},
    clearScores: async () => {},
    delayMs: 0,
  });
  expect(handed).not.toBeNull();
  expect([...handed!.commanders]).toEqual(["g"]);
});

describe("pairRunProblem", () => {
  const run = (over: Partial<BuildIndexResult>): BuildIndexResult => ({
    commanders: 0, roleTargets: 0, pairRoleTargets: 0, cardRows: 0, degraded: 0, absent: 0,
    unresolved: 0, skipped: 0, failed: 0, pairs: 0, pairCardRows: 0, pairsFailed: 0,
    pairsDegraded: 0, pairsUnresolved: 0, pairsSkipped: 0, legalPairs: 1717, pairRefusal: null,
    ...over,
  });

  it("fails a run whose legal sweep was refused", () => {
    expect(pairRunProblem(run({ pairs: 40, pairRefusal: "only 12 legal partner pairs" })))
      .toBe("only 12 legal partner pairs");
  });

  it("fails at more than 5% of attempted pairs degraded or failed, and not at 5% or under", () => {
    // 6 of 100 is over; 5 of 100 is exactly the bar and passes; 4 is under.
    expect(pairRunProblem(run({ pairs: 94, pairsDegraded: 4, pairsFailed: 2 }))).toMatch(/6 of 100/);
    expect(pairRunProblem(run({ pairs: 95, pairsDegraded: 5 }))).toBeNull();
    expect(pairRunProblem(run({ pairs: 96, pairsDegraded: 4 }))).toBeNull();
  });

  // Skipped pairs were never attempted: a resumed run that fetched 3 and skipped 1,700 must
  // not trip the floor on its first failure through a denominator of 1,703.
  it("counts only attempted pairs, never skipped ones", () => {
    expect(pairRunProblem(run({ pairs: 2, pairsFailed: 1, pairsSkipped: 1700 }))).toMatch(/1 of 3/);
  });

  it("fails a run in which every attempted pair degraded or failed", () => {
    expect(pairRunProblem(run({ pairsDegraded: 3 }))).toMatch(/all 3 pair/);
  });

  it("passes a run with nothing to attempt", () => {
    expect(pairRunProblem(run({ pairsSkipped: 1717 }))).toBeNull();
  });
});

// Brief 2026-09-28 §5.4: the fit score reads the role targets, and the first clear runs
// BEFORE the role pass writes them. A load between the two persists scores against the old
// figures, and the role write moves no timestamp that would retire them. So a pass that wrote
// roles clears again, AFTER writing: the order is the whole point, and is what this asserts.
it("clears again after the role pass writes targets", async () => {
  const order: string[] = [];
  await buildCommanderIndex({
    loadPairs: async () => [],
    deriveRoleTargets: async () => { order.push("roles"); return { written: 1, pairsWritten: 0, zeroWipes: 0 }; },
    loadCommanders: async () => [commander("A", "a")],
    loadNameIndex: async () => [],
    fetch: async () => okResult(["Sol Ring"]),
    write: async () => {},
    clearScores: async () => { order.push("clear"); },
    delayMs: 0,
  });
  expect(order).toEqual(["clear", "roles", "clear"]);
});

// A refused or failed role pass nulls the roles it rewrote, which moves the figures the
// scores were graded against just as a successful one does.
it("clears again when the role pass refuses", async () => {
  const order: string[] = [];
  await expect(buildCommanderIndex({
    loadPairs: async () => [],
    deriveRoleTargets: async () => { order.push("roles"); throw new Error("role targets REFUSED"); },
    loadCommanders: async () => [commander("A", "a")],
    loadNameIndex: async () => [],
    fetch: async () => okResult(["Sol Ring"]),
    write: async () => {},
    clearScores: async () => { order.push("clear"); },
    delayMs: 0,
  })).rejects.toThrow(/REFUSED/);
  expect(order).toEqual(["clear", "roles", "clear"]);
});

// A resume run that skipped every commander writes no support rows, but its role pass still
// publishes targets. If the clear after it throws, the error path must try once more rather
// than reading "wrote nothing" and leaving scores graded against the previous figures.
it("retries the clear on the error path when only the role pass published", async () => {
  const order: string[] = [];
  let clears = 0;
  await expect(buildCommanderIndex({
    loadPairs: async () => [],
    deriveRoleTargets: async () => { order.push("roles"); return { written: 3279, pairsWritten: 0, zeroWipes: 0 }; },
    loadCommanders: async () => [],
    loadNameIndex: async () => [],
    clearScores: async () => {
      clears++;
      order.push("clear");
      if (clears === 1) throw new Error("clear failed");
    },
    delayMs: 0,
  })).rejects.toThrow("clear failed");
  expect(order).toEqual(["roles", "clear", "clear"]);
});

// And the staples step's half: `db:build:staples` rewrites the identity buckets after the
// index build's clears, so replacing them retires the scores in the same transaction.
describe("replaceCompositionIn", () => {
  it("replaces the buckets and then clears the scores under the exclusive lock, in one transaction", async () => {
    const steps: string[] = [];
    const tx = {
      delete: (t: unknown) => { steps.push(t === identityComposition ? "delete:composition" : t === commanderScores ? "delete:scores" : "delete:?"); return Promise.resolve(); },
      insert: (t: unknown) => ({ values: async () => { steps.push(t === identityComposition ? "insert:composition" : "insert:?"); } }),
      execute: async (q: unknown) => {
        const text = new PgDialect().sqlToQuery(q as Parameters<PgDialect["sqlToQuery"]>[0]).sql;
        steps.push(text.includes("pg_advisory_xact_lock(") ? "lock:exclusive" : "execute");
      },
    };
    await replaceCompositionIn(tx as never, []);
    expect(steps).toEqual(["delete:composition", "insert:composition", "lock:exclusive", "delete:scores"]);
  });
});
