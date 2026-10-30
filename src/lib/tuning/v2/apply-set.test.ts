import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplySnapshot } from "../../../db/schema";

// Suggested changes v2's set apply and Undo all with staged pulls (Small items 4, item 2). The pull's own guards are
// `pullInTx`'s (`actions.test.ts` describes them through `pullCardFromDeck`); what the set owns is when a pull runs,
// what refuses the set, what it records, which decks it locks, and how Undo all takes a pull back.

const RUN = "run-1";
const DECK = "m-run-deck";
const SOURCE = "c-source";
const CLAIMANT = "x-claimant";
const SET = "set-1";

type Line = {
  id: string; addOracleId: string | null; cutOracleId: string | null; verdict: string; applySet: string | null;
  undoSnapshot: ApplySnapshot | null;
};

const fx = vi.hoisted(() => ({
  events: [] as string[],
  lines: [] as unknown[],
  run: { status: "ok", requestedCount: 3, readVersion: 4 as number | null, spentSets: [] as string[] },
  sourceName: "HD - Gishath" as string | null,
  sourceCommander: "o-commander" as string,
  /** The reader's decks, as the pre-read's ownership check sees them. */
  owned: ["c-source"] as string[],
  transactions: 0,
  sourceRow: null as { quantity: number; auto: boolean } | null,
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  printings: [] as Record<string, unknown>[],
}));

vi.mock("../../../db", () => {
  /** Answers a select by the columns it asks for: each read here has its own projection. */
  const rowsFor = (keys: string[]): unknown[] => {
    const has = (k: string) => keys.includes(k);
    if (has("status")) return [{ deckId: DECK, ...fx.run }];
    if (has("verdict")) return fx.lines;
    if (has("n")) return [{ n: fx.run.readVersion }];
    if (has("runId")) return [{ runId: RUN }];
    if (keys.length === 1 && has("undoSnapshot")) return (fx.lines as Line[]).filter((l) => l.applySet === SET);
    if (has("addOracleId") && has("id")) return fx.lines;
    if (keys.length === 1 && has("id")) return fx.owned.map((id) => ({ id }));
    if (keys.length === 1 && has("spentSets")) return [{ spentSets: fx.run.spentSets }];
    if (keys.length === 1 && has("applySet")) return (fx.lines as Line[]).filter((l) => l.applySet === SET);
    if (has("name")) return fx.sourceName === null ? [] : [{ name: fx.sourceName, commander: fx.sourceCommander, partner: null }];
    if (has("quantity")) return fx.sourceRow ? [fx.sourceRow] : [];
    if (has("deckId")) return [{ deckId: DECK }];
    return [];
  };
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "where", "orderBy", "limit", "for"]) c[k] = () => c;
    c.then = (ok: (v: unknown[]) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(rows).then(ok, bad);
    return c;
  };
  const tx = {
    select: (projection: Record<string, unknown> = {}) => chain(rowsFor(Object.keys(projection))),
    execute: async () => {
      fx.events.push(`lock:${DECK}`);
      return { rows: [] };
    },
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { fx.updates.push(values); } }) }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async () => { fx.inserts.push(values); fx.events.push("restorePulledRow"); },
        onConflictDoNothing: async () => {
          if ((table as Record<symbol, string>)[Symbol.for("drizzle:Name")] === "deck_printings") fx.printings.push(values);
        },
      }),
    }),
  };
  return { db: { ...tx, transaction: (fn: (t: typeof tx) => unknown) => { fx.transactions += 1; return fn(tx); } } };
});

const pull = vi.hoisted(() => ({
  lockDecksInOrder: vi.fn(async (_tx: unknown, ids: readonly string[]) => [...new Set(ids)].sort()),
  pullClaimants: vi.fn(async () => ["x-claimant"]),
  pullInTx: vi.fn(),
}));
vi.mock("../../decks/pull", () => pull);

/** The release row under the pull's key: `at` is its `createdAt`, null when there is none. */
const RELEASED_AT = "2026-10-30T12:00:00.000Z";
const release = vi.hoisted(() => ({ at: "2026-10-30T12:00:00.000Z" as string | null, undone: 0 }));
vi.mock("../../decks/pull-release", () => ({
  readPullRelease: vi.fn(async () => (release.at === null ? null : { copies: 1, createdAt: new Date(release.at) })),
  undoPullRelease: vi.fn(async () => { release.undone += 1; fx.events.push("undoRelease"); return true; }),
}));

vi.mock("../../swaps/draft-swap", () => ({
  planSwap: vi.fn(async (_tx: unknown, _deck: string, cut: string | null, add: string | null) => ({
    ok: true, snapshot: { cut: cut ? { quantity: 1, auto: false, proxied: false } : null, add: add ? { quantity: 0, auto: false } : null },
  })),
  applySwap: vi.fn(async (_tx: unknown, _deck: string, cut: string | null, add: string | null) => { fx.events.push(`swap:${add ?? cut}`); }),
  restoreSwap: vi.fn(async (_tx: unknown, _deck: string, cut: string | null, add: string | null) => { fx.events.push(`restore:${add ?? cut}`); return true; }),
}));
// The source's newest version: the same id the pull saw means no commit since; a newer one means it committed.
const versions = vi.hoisted(() => ({ newest: "v1" }));
vi.mock("../../decks/versions", () => ({ newestVersion: vi.fn(async () => ({ id: versions.newest })) }));
vi.mock("../../decks/touch", () => ({ touchDeck: vi.fn(async (_tx: unknown, id: string) => { fx.events.push(`touch:${id}`); }) }));
vi.mock("../../profile/load", () => ({ readProfileHead: vi.fn(async () => ({})) }));
vi.mock("./run", () => ({ deckTotal: () => 99, V2_DECK_TOTAL: 99 }));

import { applyPicks, MAX_SET_PULLS, parseSetPulls, undoSet } from "./apply-set";

const ENV = {} as NodeJS.ProcessEnv;
const open = (id: string, side: "add" | "cut"): Line => ({
  id, addOracleId: side === "add" ? `o-${id}` : null, cutOracleId: side === "cut" ? `o-${id}` : null,
  verdict: "pending", applySet: null, undoSnapshot: null,
});
const apply = (pulls?: { itemId: string; sourceDeckId: string }[]) =>
  applyPicks({ runId: RUN, addIds: ["a1", "a2"], cutIds: ["c1", "c2"], actionId: SET, userId: "me", env: ENV, pulls });

beforeEach(() => {
  vi.clearAllMocks();
  fx.events = [];
  fx.updates = [];
  fx.inserts = [];
  fx.printings = [];
  fx.lines = [open("a1", "add"), open("a2", "add"), open("c1", "cut"), open("c2", "cut")];
  fx.run = { status: "ok", requestedCount: 3, readVersion: 4, spentSets: [] };
  fx.sourceName = "HD - Gishath";
  fx.sourceCommander = "o-commander";
  fx.owned = [SOURCE];
  fx.transactions = 0;
  fx.sourceRow = null;
  release.at = RELEASED_AT;
  release.undone = 0;
  versions.newest = "v1";
  pull.pullInTx.mockImplementation(async (_tx: unknown, a: { oracleId: string }) => {
    fx.events.push(`pull:${a.oracleId}`);
    return { ok: true, draft: { quantity: 1, auto: false }, versionId: "v1", release: RELEASED_AT, printing: null };
  });
});

describe("parseSetPulls", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  const D = "33333333-3333-4333-8333-333333333333";
  it("takes none as none, and lowers each id", () => {
    expect(parseSetPulls(undefined, [A])).toEqual([]);
    expect(parseSetPulls([{ itemId: A.toUpperCase(), sourceDeckId: D.toUpperCase() }], [A])).toEqual([{ itemId: A, sourceDeckId: D }]);
  });
  it("refuses a malformed list: not uuids, not objects, not a list", () => {
    expect(parseSetPulls("x", [A])).toBeNull();
    expect(parseSetPulls([A], [A])).toBeNull();
    expect(parseSetPulls([{ itemId: "a1", sourceDeckId: D }], [A])).toBeNull();
    expect(parseSetPulls([{ itemId: A, sourceDeckId: "deck" }], [A])).toBeNull();
  });
  it("refuses a second pull for one addition, and a pull for an item that is not a picked addition", () => {
    expect(parseSetPulls([{ itemId: A, sourceDeckId: D }, { itemId: A, sourceDeckId: B }], [A])).toBeNull();
    expect(parseSetPulls([{ itemId: B, sourceDeckId: D }], [A])).toBeNull();
  });
  it("refuses more than a side holds", () => {
    const many = Array.from({ length: MAX_SET_PULLS + 1 }, () => ({ itemId: A, sourceDeckId: D }));
    expect(parseSetPulls(many, [A])).toBeNull();
  });
});

describe("applyPicks with staged pulls", () => {
  it("applies a set with no pulls exactly as before: the run deck alone, locked by its own statement", async () => {
    const r = await apply();
    expect(r).toMatchObject({ ok: true, itemIds: ["c1", "c2", "a1", "a2"], sourceDeckIds: [] });
    expect(pull.lockDecksInOrder).not.toHaveBeenCalled();
    expect(pull.pullClaimants).not.toHaveBeenCalled();
    expect(pull.pullInTx).not.toHaveBeenCalled();
    expect(fx.events[0]).toBe(`lock:${DECK}`);
  });

  it("runs each pull after every swap, against the run's deck, and locks the run deck, sources and claimants as one sorted set", async () => {
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toMatchObject({ ok: true, sourceDeckIds: [SOURCE] });
    expect(pull.pullClaimants).toHaveBeenCalledWith("me", ENV, "o-a1", DECK);
    // ONE call, before anything else in the transaction, with every party: the run's deck is not locked on its own first.
    expect(pull.lockDecksInOrder).toHaveBeenCalledTimes(1);
    expect(pull.lockDecksInOrder.mock.calls[0][1]).toEqual(expect.arrayContaining([DECK, SOURCE, CLAIMANT]));
    expect(fx.events).not.toContain(`lock:${DECK}`);
    const lockIds = [CLAIMANT, SOURCE, DECK].sort();
    expect(pull.pullInTx).toHaveBeenCalledWith(expect.anything(), {
      userId: "me", env: ENV, sourceDeckId: SOURCE, oracleId: "o-a1", askingDeckId: DECK, lockIds,
    });
    const swaps = fx.events.filter((e) => e.startsWith("swap:"));
    expect(swaps).toHaveLength(4);
    expect(fx.events.indexOf("pull:o-a1")).toBeGreaterThan(fx.events.lastIndexOf(swaps[3]));
  });

  it("records the pull on its addition's snapshot, over the swap's own", async () => {
    await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    const recorded = fx.updates.find((u) => (u.undoSnapshot as ApplySnapshot | undefined)?.pull);
    expect(recorded).toEqual({
      undoSnapshot: { cut: null, add: { quantity: 0, auto: false }, pull: {
        sourceDeckId: SOURCE, draft: { quantity: 1, auto: false }, versionId: "v1", release: RELEASED_AT, printing: null,
      } },
    });
  });

  it("refuses the whole set when the pull is refused, naming the line", async () => {
    pull.pullInTx.mockResolvedValueOnce({ ok: false, message: "That card is that deck’s commander." });
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toEqual({ ok: false, refusal: { kind: "pull", itemId: "a1", message: "That card is that deck’s commander." } });
  });

  it("treats a copy that came free since as done: no pull recorded, the set applies", async () => {
    pull.pullInTx.mockResolvedValueOnce({ ok: false, message: "That deck already has the copies it needs.", skip: "covered" });
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toMatchObject({ ok: true, sourceDeckIds: [] });
    expect(fx.updates.some((u) => (u.undoSnapshot as ApplySnapshot | undefined)?.pull)).toBe(false);
  });

  // The addition restored a card cut from this deck's draft but still in its version: the deck holds its copy through
  // the version, so the pull has nothing to take. Skipped by the pull's reason code, never by its words.
  it("treats an addition the deck's version already holds as done: no pull recorded, the set applies", async () => {
    pull.pullInTx.mockResolvedValueOnce({ ok: false, message: "any words at all", skip: "notWaiting" });
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toMatchObject({ ok: true, sourceDeckIds: [] });
    expect(fx.updates.some((u) => (u.undoSnapshot as ApplySnapshot | undefined)?.pull)).toBe(false);
  });

  it("refuses the set on a refusal with the same words but no reason code", async () => {
    pull.pullInTx.mockResolvedValueOnce({ ok: false, message: "That deck isn’t waiting on that card." });
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toMatchObject({ ok: false, refusal: { kind: "pull", itemId: "a1" } });
  });

  // SECURITY (#2425 round 6): a source id is the client's word. One that is not the reader's deck refuses the set before
  // any lock, so no caller can take a `for update` lock on another player's deck.
  it("refuses a source deck that is not the reader's before taking any lock", async () => {
    const r = await apply([{ itemId: "a1", sourceDeckId: "someone-elses-deck" }]);
    expect(r).toEqual({ ok: false, refusal: { kind: "pull", itemId: "a1", message: expect.any(String) } });
    expect(fx.transactions).toBe(0);
    expect(pull.lockDecksInOrder).not.toHaveBeenCalled();
    expect(fx.events).toEqual([]);
    expect(pull.pullClaimants).not.toHaveBeenCalled();
  });

  // #2425 round 9: a replay of a set already applied answers with that set, even when its pull's source deck has since
  // gone (or is not the reader's): the preflight is for a set still to apply.
  it("answers a replayed applied set with what it applied, before any source check", async () => {
    fx.lines = [{ ...open("a1", "add"), verdict: "accepted", applySet: SET }, { ...open("c1", "cut"), verdict: "accepted", applySet: SET }];
    fx.owned = [];
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toEqual({ ok: true, deckId: DECK, applySet: SET, itemIds: ["a1", "c1"] });
    expect(pull.pullInTx).not.toHaveBeenCalled();
    expect(pull.pullClaimants).not.toHaveBeenCalled();
  });

  it("answers a replayed applied-then-undone set as spent, before any source check", async () => {
    fx.run = { ...fx.run, spentSets: [SET] };
    fx.owned = [];
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }]);
    expect(r).toEqual({ ok: true, deckId: DECK, applySet: SET, itemIds: [] });
    expect(pull.pullInTx).not.toHaveBeenCalled();
  });

  it("refuses a set whose second pull names a foreign deck, naming that pull", async () => {
    const r = await apply([{ itemId: "a1", sourceDeckId: SOURCE }, { itemId: "a2", sourceDeckId: "someone-elses-deck" }]);
    expect(r).toMatchObject({ ok: false, refusal: { kind: "pull", itemId: "a2" } });
    expect(fx.transactions).toBe(0);
  });

  it("refuses a pull naming a line that is not one of the set's additions", async () => {
    const r = await apply([{ itemId: "c1", sourceDeckId: SOURCE }]);
    expect(r).toMatchObject({ ok: false, refusal: { kind: "pull", itemId: "c1" } });
    expect(pull.pullInTx).not.toHaveBeenCalled();
  });
});

describe("undoSet with a pull", () => {
  const applied = (
    draft: { quantity: number; auto: boolean } | null, printing: { setCode: string; collectorNumber: string } | null = null,
  ): Line[] => [
    {
      ...open("a1", "add"), verdict: "accepted", applySet: SET,
      undoSnapshot: { cut: null, add: { quantity: 0, auto: false }, pull: { sourceDeckId: SOURCE, draft, versionId: "v1", release: RELEASED_AT, printing } },
    },
    { ...open("c1", "cut"), verdict: "accepted", applySet: SET, undoSnapshot: { cut: { quantity: 1, auto: false, proxied: false }, add: null } },
  ];
  const undo = () => undoSet({ applySet: SET, userId: "me", env: ENV });

  it("puts the source's row back and gives up the release BEFORE restoring the swaps, under one sorted lock", async () => {
    fx.lines = applied({ quantity: 1, auto: true });
    const r = await undo();
    expect(r).toMatchObject({ ok: true, itemIds: ["a1", "c1"], sourceDeckIds: [SOURCE] });
    expect(pull.lockDecksInOrder).toHaveBeenCalledTimes(1);
    expect(pull.lockDecksInOrder.mock.calls[0][1]).toEqual(expect.arrayContaining([DECK, SOURCE]));
    expect(fx.inserts).toEqual([{ deckId: SOURCE, oracleId: "o-a1", quantity: 1, auto: true }]);
    expect(release.undone).toBe(1);
    expect(fx.events.indexOf("undoRelease")).toBeLessThan(fx.events.indexOf("restore:o-a1"));
    expect(fx.events).toContain(`touch:${SOURCE}`);
  });

  it("refuses the whole undo, naming the deck, when the source committed since (its release is gone, the card with it)", async () => {
    fx.lines = applied({ quantity: 1, auto: false });
    release.at = null;
    versions.newest = "v2";
    const r = await undo();
    expect(r).toEqual({ ok: false, refusal: { kind: "pullMoved", itemId: "a1", deckName: "HD - Gishath" } });
    expect(fx.events.some((e) => e.startsWith("restore:"))).toBe(false);
    expect(fx.inserts).toEqual([]);
  });

  // The pull took the source's row from 2 to 1 and the source then COMMITTED: its release is gone and the row survives
  // at 1. A surviving row is not a discard; the newer version says the removal is that deck's list now.
  it("refuses, naming the deck, when the source committed with the pulled row still in it", async () => {
    fx.lines = applied({ quantity: 2, auto: false });
    release.at = null;
    fx.sourceRow = { quantity: 1, auto: false };
    versions.newest = "v2";
    const r = await undo();
    expect(r).toEqual({ ok: false, refusal: { kind: "pullMoved", itemId: "a1", deckName: "HD - Gishath" } });
    expect(fx.inserts).toEqual([]);
    expect(release.undone).toBe(0);
    expect(fx.events.some((e) => e.startsWith("restore:"))).toBe(false);
  });

  // A commit or discard cleared this pull's release, and a LATER pull of the same card for the same deck wrote a new
  // one under the same key: giving that back would undo the later pull. It is told by the release's createdAt.
  it("refuses when the release under the pull's key is a later pull's, not this one's", async () => {
    fx.lines = applied({ quantity: 1, auto: false });
    release.at = "2026-10-30T13:00:00.000Z";
    const r = await undo();
    expect(r).toMatchObject({ ok: false, refusal: { kind: "pullMoved", deckName: "HD - Gishath" } });
    expect(release.undone).toBe(0);
    expect(fx.inserts).toEqual([]);
  });

  it("puts back the printing pick the last copy's prune dropped, with the card", async () => {
    fx.lines = applied({ quantity: 1, auto: false }, { setCode: "2xm", collectorNumber: "25" });
    const r = await undo();
    expect(r).toMatchObject({ ok: true });
    expect(fx.inserts).toEqual([{ deckId: SOURCE, oracleId: "o-a1", quantity: 1, auto: false }]);
    expect(fx.printings).toEqual([{ deckId: SOURCE, oracleId: "o-a1", setCode: "2xm", collectorNumber: "25" }]);
  });

  // The pull took a legendary creature's last copy, and the source then made it its commander without committing:
  // put back in the list it would be in the deck twice.
  it("refuses, naming the deck, when the pulled card has since become the source's commander", async () => {
    fx.lines = applied({ quantity: 1, auto: false });
    fx.sourceCommander = "o-a1";
    const r = await undo();
    expect(r).toEqual({ ok: false, refusal: { kind: "pullMoved", itemId: "a1", deckName: "HD - Gishath" } });
    expect(fx.inserts).toEqual([]);
    expect(release.undone).toBe(0);
    expect(fx.events.some((e) => e.startsWith("restore:"))).toBe(false);
  });

  it("refuses when the source's row was edited since the pull", async () => {
    fx.lines = applied({ quantity: 1, auto: false });
    // The pull left the row gone; the player put a copy back by hand.
    fx.sourceRow = { quantity: 1, auto: false };
    const r = await undo();
    expect(r).toMatchObject({ ok: false, refusal: { kind: "pullMoved", deckName: "HD - Gishath" } });
    expect(release.undone).toBe(0);
  });

  it("takes a discarded source as already undone: no commit since, the card is back in its draft, nothing more written", async () => {
    fx.lines = applied({ quantity: 2, auto: false });
    release.at = null;
    fx.sourceRow = { quantity: 2, auto: false };
    const r = await undo();
    expect(r).toMatchObject({ ok: true });
    expect(fx.inserts).toEqual([]);
    expect(release.undone).toBe(0);
    expect(fx.events).toContain("restore:o-a1");
  });

  it("gives up only the release when the pull's source had already cut the card", async () => {
    fx.lines = applied(null);
    const r = await undo();
    expect(r).toMatchObject({ ok: true });
    expect(fx.inserts).toEqual([]);
    expect(release.undone).toBe(1);
    expect(fx.events).not.toContain(`touch:${SOURCE}`);
  });
});
