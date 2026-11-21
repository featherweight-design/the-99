import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { readFileSync } from "node:fs";

const assignCopyIn = vi.fn();
vi.mock("./assign", async (orig) => ({ ...(await orig<typeof import("./assign")>()), assignCopyIn: (...a: unknown[]) => assignCopyIn(...a) }));

import { applyPendingPicks, assignPendingIn, clearPendingPicks, type PendingReport } from "./pending-picks";
import { pruneExcessPicks, pruneOrphanAssignments } from "./prune-assignments";
import { loadAvailability, loadDeckBuyRows } from "./availability-query";

const U = "user_1";
const D = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";
const V = "33333333-3333-4333-8333-333333333333";

/** A transaction whose every awaited statement returns the next queued result, recording what ran. */
function fakeTx(results: unknown[]) {
  const log: { op: string; sql?: SQL }[] = [];
  const queue = [...results];
  const chain = (op: string): unknown => {
    const c: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "limit", "for", "values", "onConflictDoUpdate", "returning"]) c[m] = () => c;
    c.then = (res: (v: unknown) => unknown) => { log.push({ op }); return res(queue.shift()); };
    return c;
  };
  const tx = {
    select: () => chain("select"),
    delete: () => chain("delete"),
    insert: () => chain("insert"),
    execute: async (q: SQL) => { log.push({ op: "execute", sql: q }); return queue.shift(); },
  };
  return { tx: tx as never, log, left: () => queue.length };
}

describe("assignPendingIn", () => {
  const deck = [{ id: D }];
  const newest = [{ id: V, commanderOracleId: "x", partnerOracleId: null }];
  const inDraft = [{ quantity: 1 }];

  it("refuses a deck that is not the player's, a brew, a deck that lists the card, a commander, and a card the draft lacks", async () => {
    expect(await assignPendingIn(fakeTx([[]]).tx, U, D, C)).toBe("not-your-deck");
    expect(await assignPendingIn(fakeTx([deck, []]).tx, U, D, C)).toBe("deck-not-committed");
    expect(await assignPendingIn(fakeTx([deck, newest, [{ quantity: 1 }]]).tx, U, D, C)).toBe("deck-already-lists-it");
    expect(await assignPendingIn(fakeTx([deck, [{ ...newest[0], commanderOracleId: C }]]).tx, U, D, C)).toBe("target-is-commander");
    const t = fakeTx([deck, newest, [], []]);
    expect(await assignPendingIn(t.tx, U, D, C)).toBe("not-in-draft");
    expect(t.log.some((l) => l.op === "insert" || l.op === "delete")).toBe(false);
  });

  it("refuses when no copy is left to give, writing nothing", async () => {
    const t = fakeTx([deck, newest, [], inDraft, { rows: [{ giveable: 0 }] }]);
    expect(await assignPendingIn(t.tx, U, D, C)).toBe("no-supply-left");
    expect(t.log.some((l) => l.op === "insert" || l.op === "delete")).toBe(false);
  });

  it("writes the pick and touches no reservation: the old one keeps holding the copy until the commit", async () => {
    // One copy: the only delete is of another deck's PENDING pick, never a reservation.
    const t = fakeTx([deck, newest, [], inDraft, { rows: [{ giveable: 1, taken: 1 }] }, [], undefined]);
    expect(await assignPendingIn(t.tx, U, D, C)).toBeNull();
    expect(t.log.map((l) => l.op)).toEqual(["select", "select", "select", "select", "execute", "delete", "insert"]);
    expect(t.left()).toBe(0);
  });

  it("on one copy, replaces another deck's pending pick and names the deck it replaced", async () => {
    const t = fakeTx([deck, newest, [], inDraft, { rows: [{ giveable: 1, taken: 1 }] }, [{ deckId: "older-deck" }], undefined]);
    const report: PendingReport = {};
    expect(await assignPendingIn(t.tx, U, D, C, report)).toBeNull();
    expect(report.replacedDeckId).toBe("older-deck");
  });

  // SEVERAL PICKS (addendum, 2026-11-21): with two or more copies a pick ADDS below the cap and
  // refuses at it; it never deletes another deck's pick.
  it("on two or more copies, adds a pick beside the others while picks are under the cap", async () => {
    const t = fakeTx([deck, newest, [], inDraft, { rows: [{ giveable: 3, taken: 2 }] }, undefined]);
    const report: PendingReport = {};
    expect(await assignPendingIn(t.tx, U, D, C, report)).toBeNull();
    expect(t.log.map((l) => l.op)).toEqual(["select", "select", "select", "select", "execute", "insert"]);
    expect(report.replacedDeckId).toBeUndefined();
    expect(t.left()).toBe(0);
  });

  it("refuses all-picked at the cap, writing nothing", async () => {
    const t = fakeTx([deck, newest, [], inDraft, { rows: [{ giveable: 2, taken: 2 }] }]);
    expect(await assignPendingIn(t.tx, U, D, C)).toBe("all-picked");
    expect(t.log.some((l) => l.op === "insert" || l.op === "delete")).toBe(false);
  });

  it("counts other decks' pending picks toward the cap, never this deck's own", () => {
    const src = readFileSync(new URL("./pending-picks.ts", import.meta.url), "utf8");
    expect(src).toMatch(/p\.deck_id <> \$\{deckId\}/);
    expect(src).toMatch(/target: \[pendingAssignments\.userId, pendingAssignments\.oracleId, pendingAssignments\.deckId\]/);
  });
});

describe("applyPendingPicks", () => {
  it("converts a locked pick whose card the version lists, then deletes the row", async () => {
    assignCopyIn.mockClear();
    const t = fakeTx([[{ userId: U, oracleId: C }], [{ oracleId: C }], undefined]);
    await applyPendingPicks(t.tx, D, V, new Set([C]));
    // `set` mode is the one whose taken-branch moves the player's old reservation, at conversion time.
    expect(assignCopyIn).toHaveBeenCalledWith(t.tx, U, C, D, "set");
    expect(t.log.map((l) => l.op)).toEqual(["select", "select", "delete"]);
  });

  it("lets a pick lapse, without a reservation, when the version does not list the card", async () => {
    assignCopyIn.mockClear();
    const t = fakeTx([[{ userId: U, oracleId: C }], [], undefined]);
    await applyPendingPicks(t.tx, D, V, new Set([C]));
    expect(assignCopyIn).not.toHaveBeenCalled();
    expect(t.log.map((l) => l.op)).toEqual(["select", "select", "delete"]);
  });

  it("deletes an unlocked pick only when the version does not list its card", async () => {
    assignCopyIn.mockClear();
    const t = fakeTx([[{ userId: U, oracleId: C }], [], undefined]);
    await applyPendingPicks(t.tx, D, V, new Set());
    expect(assignCopyIn).not.toHaveBeenCalled();
    expect(t.log.map((l) => l.op)).toEqual(["select", "select", "delete"]);
  });

  it("leaves a listed pick pending when the caller did not lock its card, taking no card lock under the deck lock", async () => {
    assignCopyIn.mockClear();
    const t = fakeTx([[{ userId: U, oracleId: C }], [{ oracleId: C }]]);
    await applyPendingPicks(t.tx, D, V, new Set());
    expect(assignCopyIn).not.toHaveBeenCalled();
    expect(t.log.map((l) => l.op)).toEqual(["select", "select"]);
  });

  it("asks for the version's cards once, and not at all when the deck has no pending picks", async () => {
    const none = fakeTx([[]]);
    await applyPendingPicks(none.tx, D, V, new Set());
    expect(none.log.map((l) => l.op)).toEqual(["select"]);
    const two = fakeTx([[{ userId: U, oracleId: C }, { userId: U, oracleId: "z" }], [{ oracleId: C }, { oracleId: "z" }], undefined, undefined]);
    await applyPendingPicks(two.tx, D, V, new Set([C, "z"]));
    expect(two.log.filter((l) => l.op === "select")).toHaveLength(2);
  });

  it("deletes every pick of the deck on a discard", async () => {
    const t = fakeTx([undefined]);
    await clearPendingPicks(t.tx, D);
    expect(t.log.map((l) => l.op)).toEqual(["delete"]);
  });
});

describe("the SQL around pending picks", () => {
  it("the remove-from-draft reconcile deletes the deck's pending rows with no draft row, qualified", async () => {
    const t = fakeTx([undefined, undefined]);
    await pruneOrphanAssignments(t.tx as never, D);
    const text = new PgDialect().sqlToQuery(t.log[0].sql!).sql;
    expect(text).toContain("delete from pending_assignments p");
    expect(text).toContain("dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id");
  });

  it("neither claim reader reads pending_assignments: a pending pick is never a live claim", async () => {
    for (const run of [
      (tx: never) => loadAvailability(U, { oracleIds: ["o1"] }, tx),
      (tx: never) => loadDeckBuyRows(U, tx),
    ]) {
      let captured: SQL | null = null;
      await run({ execute: async (q: SQL) => { captured = q; return { rows: [] }; } } as never).catch(() => {});
      if (captured) expect(new PgDialect().sqlToQuery(captured).sql).not.toContain("pending_assignments");
    }
    expect(readFileSync("src/lib/decks/availability-query.ts", "utf8")).not.toContain("pending_assignments");
  });
});

describe("pruneExcessPicks", () => {
  // G4: a removal can leave a card more picks than copies. The NEWEST go, from whichever table holds them.
  const render = (q: SQL | undefined) => (q ? new PgDialect().sqlToQuery(q).sql : "");

  it("locks each card once, in a stable order, and deletes each excess pick from its own table", async () => {
    const t = fakeTx([
      undefined, { rows: [{ kind: "pending", deck_id: "newest" }, { kind: "reserved", deck_id: "newer" }] }, undefined, undefined,
      undefined, { rows: [] },
    ]);
    await pruneExcessPicks(t.tx, U, ["b-card", "a-card", "b-card"]);
    expect(t.log.map((l) => l.op)).toEqual(["execute", "execute", "delete", "delete", "execute", "execute"]);
    const locks = t.log.filter((l) => l.op === "execute" && render(l.sql).includes("pg_advisory_xact_lock"));
    expect(locks).toHaveLength(2);
    expect(t.left()).toBe(0);
  });

  it("ranks the newest last, the kept pick first, and counts both tables against the copies", async () => {
    const t = fakeTx([undefined, { rows: [] }]);
    await pruneExcessPicks(t.tx, U, [C], { oracleId: C, deckId: D });
    const q = render(t.log[1].sql);
    expect(q).toContain("from card_assignments a");
    expect(q).toContain("from pending_assignments p");
    expect(q).toMatch(/order by \(deck_id::text = \$\d+::text\) is true desc, created_at, deck_id/);
    expect(q).toContain("where running > (select n from giveable)");
  });
});

describe("the lifecycle's call sites", () => {
  const read = (p: string) => readFileSync(p, "utf8");
  it("the commit converts before it prunes, and a discard and a reservation both clear the row", () => {
    const v = read("src/lib/decks/versions.ts");
    expect(v.indexOf("applyPendingPicks(tx")).toBeGreaterThan(0);
    expect(v.indexOf("applyPendingPicks(tx")).toBeLessThan(v.indexOf("await pruneOrphanAssignments(tx"));
    expect(v).toContain("clearPendingPicks(tx, deckId)");
    expect(read("src/lib/decks/assign.ts")).toContain("tx.delete(pendingAssignments)");
  });
  it("the commit action takes the card locks before the deck row lock", () => {
    const a = read("src/app/decks/actions.ts");
    expect(a.indexOf("lockPendingClaims(tx")).toBeGreaterThan(0);
    expect(a.indexOf("lockPendingClaims(tx")).toBeLessThan(a.indexOf("const [deck] = await tx.select().from(decks).where(eq(decks.id, deckId)).for(\"update\");\n    // Deleted between"));
  });
});
