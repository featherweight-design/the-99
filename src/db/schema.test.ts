import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { deckGames, decks, deckSuggestionItems, deckSuggestionRuns, modelCalls } from "./schema";

describe("deck tuning schema", () => {
  it("keeps the game note singular and separate from decks.notes", () => {
    const game = getTableConfig(deckGames).columns.map((c) => c.name);
    const deck = getTableConfig(decks).columns.map((c) => c.name);
    expect(game).toContain("note");
    expect(game).not.toContain("notes");
    expect(deck).toEqual(expect.arrayContaining(["notes", "intent", "intent_seeded"]));
  });

  it("has exactly one partial unique index, on pending runs", () => {
    const unique = getTableConfig(deckSuggestionRuns).indexes.filter((i) => i.config.unique);
    expect(unique).toHaveLength(1);
    expect(unique[0].config.name).toBe("deck_suggestion_runs_one_pending_idx");
    expect(unique[0].config.where).toBeDefined();
  });

  it("ties both of an item's card columns to the catalog, and a run to its allowance unit", () => {
    // Counting foreign keys proves nothing about which columns carry them, so name the pairs.
    const pairs = (t: Parameters<typeof getTableConfig>[0]) =>
      getTableConfig(t).foreignKeys.map((fk) => {
        const ref = fk.reference();
        return `${ref.columns[0].name}->${getTableName(ref.foreignTable)}.${ref.foreignColumns[0].name}`;
      });
    expect(pairs(deckSuggestionItems)).toEqual(expect.arrayContaining([
      "add_oracle_id->cards.oracle_id",
      "cut_oracle_id->cards.oracle_id",
      "run_id->deck_suggestion_runs.id",
    ]));
    expect(pairs(deckSuggestionRuns)).toContain("model_call_id->model_calls.id");
  });

  it("stores both versions on a run rather than hashing them", () => {
    const cols = getTableConfig(deckSuggestionRuns).columns.map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["prompt_version", "profile_version", "input_fingerprint"]));
  });

  it("indexes the allowance ledger on the one query it answers", () => {
    const idx = getTableConfig(modelCalls).indexes.map((i) => i.config.name);
    expect(idx).toContain("model_calls_user_created_idx");
  });
});
