import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { PROMPT_VERSION, PROMPT_VERSION_V2 } from "../tuning/prompt-version";
import { askOf, liveOf, okRunWhere, promptVersionFor, suggestedRunsOfDeck, swapped } from "./tuning-read";

describe("the panel's run reads", () => {
  it("scope a deck's runs to Suggested changes, so another tool's run on the deck is never its latest", () => {
    const q = new PgDialect().sqlToQuery(suggestedRunsOfDeck("deck-1")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."tool" = $2`);
    expect(q.params).toEqual(["deck-1", "suggested_changes"]);
  });
  it("read a run named by id only when it is the reader's own ok run of this tool on this deck", () => {
    const q = new PgDialect().sqlToQuery(okRunWhere("deck-1", "user-1", "run-9")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."deck_id" = $1`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."user_id" = $3`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."id" = $5`);
    expect(q.params).toEqual(["deck-1", "suggested_changes", "user-1", "ok", "run-9"]);
  });

  it("read the newest ok run when none is named", () => {
    const q = new PgDialect().sqlToQuery(okRunWhere("deck-1", "user-1", null)!);
    expect(q.sql).not.toContain(`"deck_suggestion_runs"."id" =`);
    expect(q.params).toEqual(["deck-1", "suggested_changes", "user-1", "ok"]);
  });
});

describe("swapped: the list a line would leave behind (the bracket flag reads it)", () => {
  const list = [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 2 }];
  const asMap = (l: { oracleId: string; quantity: number }[]) => Object.fromEntries(l.map((c) => [c.oracleId, c.quantity]));

  it("changes only the add for an addition, and only the cut for a cut", () => {
    expect(asMap(swapped(list, { addOracleId: "z", cutOracleId: null }))).toEqual({ a: 1, b: 2, z: 1 });
    expect(asMap(swapped(list, { addOracleId: null, cutOracleId: "a" }))).toEqual({ b: 2 });
    expect(asMap(swapped(list, { addOracleId: null, cutOracleId: "b" }))).toEqual({ a: 1, b: 1 });
  });

  it("still changes both for a pair stored before the two lists", () => {
    expect(asMap(swapped(list, { addOracleId: "z", cutOracleId: "a" }))).toEqual({ b: 2, z: 1 });
  });
});

describe("Suggested changes v2 on the panel's read (plan P1, P3)", () => {
  it("measures a run against its own path's prompt version", () => {
    expect(promptVersionFor(null)).toBe(PROMPT_VERSION);
    expect(promptVersionFor(7)).toBe(PROMPT_VERSION_V2);
  });

  it("draws a pending v2 run's progress from its report: additions first, then cuts once the additions are in", () => {
    const report = (inAdd: boolean, refillCut: boolean) => ({
      askedCount: 0, survivedCount: 0, keptCount: 0,
      v2: { requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: inAdd, cut: false }, refilling: { add: false, cut: refillCut } },
    });
    const none = { items: [], newestPriceAsOf: null };
    expect(liveOf("r", report(false, false), none)).toEqual({ runId: "r", phase: "additions", in: { add: false, cut: false }, refilling: { add: false, cut: false }, items: [], newestPriceAsOf: null });
    expect(liveOf("r", report(true, true), none)).toMatchObject({ phase: "cuts", in: { add: true, cut: false }, refilling: { cut: true } });
    expect(liveOf("r", null, none)).toMatchObject({ phase: "additions" });
    // The live lines carry their own read's price snapshot, not the last set's (null on a first run).
    const at = new Date("2026-10-28T09:00:00Z");
    expect(liveOf("r", null, { items: [], newestPriceAsOf: at }).newestPriceAsOf).toBe(at);
  });
});

// Small items 4 item 2: the run's stored restrictions reach the results whole, or a held add is tagged to buy and You
// asked drops "including your other decks" (found on the PR A walk).
describe("askOf", () => {
  const row = (restrictions: Record<string, unknown>) => ({
    id: "r1", requestedCount: 3, requestText: null, bracketChoice: null, bracketTarget: null, units: 1,
    validationReport: { v2: { restrictions } } as never,
  });

  it("carries Include my other decks from the stored report", () => {
    expect(askOf(row({ capCents: null, sets: [], ownedOnly: true, otherDecks: true }))?.restrictions)
      .toEqual({ capCents: null, sets: [], ownedOnly: true, otherDecks: true });
  });

  it("reads a report written before the choice existed as without it", () => {
    expect(askOf(row({ capCents: 500, sets: ["mh3"], ownedOnly: true }))?.restrictions)
      .toEqual({ capCents: 500, sets: ["mh3"], ownedOnly: true });
  });
});
