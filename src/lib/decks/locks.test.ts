// The lock's SQL, rendered: what a sweep's delete actually asks. The figure (a locked card staying)
// is `probe:locks`'s; this pins the question, which a component test can never see.
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { deckCards } from "../../db/schema";
import { notLiveLocked } from "./locks";

const sweep = () => db.delete(deckCards)
  .where(and(eq(deckCards.deckId, "d"), eq(deckCards.auto, true), notLiveLocked()))
  .toSQL().sql;

describe("notLiveLocked", () => {
  // Unqualified, the inner names resolve against `deck_locks` and the predicate compares each lock
  // row to itself: always true, every locked card swept, no error.
  it("names the outer deck_cards row on both sides, qualified", () => {
    const q = sweep();
    expect(q).toContain('l.deck_id = "deck_cards"."deck_id"');
    expect(q).toContain('l.oracle_id = "deck_cards"."oracle_id"');
  });

  it("excludes only a LIVE lock, so a dormant row never protects a card", () => {
    expect(sweep()).toContain("l.removed_at is null");
    expect(sweep()).toContain("not exists");
  });
});

// L3: the two auto-card sweeps never cut a locked card. Static, for the reason `prune-proxies.test.ts`
// is: the rule is about where a filter APPEARS, and both sweeps live in a "use server" module whose
// SQL no unit test here executes. `probe:locks` proves the predicate against a real Postgres.
function body(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

describe("the sweeps filter locked cards", () => {
  const actions = readFileSync("src/app/decks/actions.ts", "utf8");

  // The EXACT gated form, never a bare count: an inverted condition (`? undefined : notLiveLocked()`)
  // filters only while the switch is OFF, and a count of the call passes over it.
  const GATED = /neverCutEnabled\(env\) \? notLiveLocked\(\) : undefined,\n\s*\)\)/g;

  it("clearAutoCards puts the gated filter last in its delete's where", () => {
    const fn = body(actions, "clearAutoCards");
    expect(fn.match(/notLiveLocked\(\)/g)?.length).toBe(1);
    expect(fn.match(GATED)?.length).toBe(1);
    expect(fn.indexOf("tx.delete(deckCards)")).toBeLessThan(fn.search(GATED));
  });

  // Two writes remove a pass's copies: the delete, and the decrement of a stack the player grew,
  // which removes copies with no delete at all. Both must carry the filter.
  it("undoFillPass puts it in both the decrement and the delete", () => {
    const fn = body(actions, "undoFillPass");
    expect(fn.match(/notLiveLocked\(\)/g)?.length).toBe(2);
    expect(fn.match(GATED)?.length).toBe(2);
  });
});

// L2 and Q2, where the lock guards a destructive write in a "use server" module no unit test here
// executes. `probe:locks` proves the reads against a real Postgres; these pin that each write site
// actually asks them, in the right place and the right way.
describe("the lock's guards sit where the writes are", () => {
  const actions = readFileSync("src/app/decks/actions.ts", "utf8");
  const update = readFileSync("src/app/decks/update-actions.ts", "utf8");

  it("pullCardFromDeck refuses a locked source before it takes the copy", () => {
    const fn = body(actions, "pullCardFromDeck");
    const guard = fn.search(/if \(neverCutEnabled\(env\) && \(await isLiveLocked\(tx, sourceDeckId, oracleId\)\)\) \{\n\s*return \{ ok: false, message: PULL_REFUSED_LOCKED \};/);
    expect(guard).toBeGreaterThan(-1);
    const firstWrite = Math.min(fn.indexOf("tx.update(deckCards)"), fn.indexOf("tx.delete(deckCards)"));
    expect(guard).toBeLessThan(firstWrite);
  });

  // The review starts locked cards KEPT, so a failed read must fail the preview: the display read's
  // empty set would start a locked card unticked, and an untouched Apply would delete it.
  // A card locked in another tab after the preview must not leave through an untouched Apply: the
  // apply re-reads the locks under its deck row lock, before its delete, against what was shown.
  it("the update's apply re-checks the locks before it deletes", () => {
    const fn = body(update, "updateDeckFromList");
    const lock = fn.indexOf("for update");
    const check = fn.indexOf("await liveLockedIds(tx, input.deckId)");
    expect(lock).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(lock);
    expect(check).toBeLessThan(fn.indexOf("tx.delete(deckCards)"));
    expect(fn).toContain("!seen.has(id)");
    // A count drop is a cut of those copies, so it meets the same re-check.
    expect(fn).toContain("...lowering.map((r) => r.oracleId)");
  });

  it("the update preview reads the locks failing closed", () => {
    expect(body(update, "previewDeckUpdate")).toContain('lockedOracleIds(input.deckId, userId, "throw")');
  });
});
