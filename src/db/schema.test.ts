import { getTableName } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  deckCutItems, deckGames, decks, deckSuggestionItems, deckSuggestionRuns, deckSynopses, deckVersionSynopses, fitsReads, modelCalls,
} from "./schema";

describe("deck tuning schema", () => {
  it("keeps the game note singular and separate from decks.notes", () => {
    const game = getTableConfig(deckGames).columns.map((c) => c.name);
    const deck = getTableConfig(decks).columns.map((c) => c.name);
    expect(game).toContain("note");
    expect(game).not.toContain("notes");
    expect(deck).toEqual(expect.arrayContaining(["notes", "intent", "intent_seeded"]));
  });

  it("has exactly one partial unique index, on pending runs, per deck and tool", () => {
    const unique = getTableConfig(deckSuggestionRuns).indexes.filter((i) => i.config.unique);
    expect(unique).toHaveLength(1);
    expect(unique[0].config.name).toBe("deck_suggestion_runs_one_pending_tool_idx");
    expect(unique[0].config.columns.map((c) => (c as { name: string }).name)).toEqual(["deck_id", "tool"]);
    // Rendered, not merely present: an index filtered on any other status would let two
    // pending runs coexist and still pass a presence check.
    const where = unique[0].config.where;
    expect(where).toBeDefined();
    expect(new PgDialect().sqlToQuery(where!).sql).toBe(`"deck_suggestion_runs"."status" = 'pending'`);
  });

  it("names its tool, and lets model_calls record a Proposed cuts call", () => {
    const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q).sql.replace(/\s+/g, " ");
    const runChecks = Object.fromEntries(getTableConfig(deckSuggestionRuns).checks.map((c) => [c.name, render(c.value)]));
    expect(runChecks.deck_suggestion_runs_tool_check).toContain(`in ('suggested_changes', 'proposed_cuts')`);
    const tool = getTableConfig(deckSuggestionRuns).columns.find((c) => c.name === "tool");
    expect(tool?.notNull).toBe(true);
    expect(tool?.default).toBe("suggested_changes");
    const callChecks = Object.fromEntries(getTableConfig(modelCalls).checks.map((c) => [c.name, render(c.value)]));
    expect(callChecks.model_calls_feature_check).toContain(`'proposed_cuts'`);
    expect(callChecks.model_calls_feature_check).toContain(`'fits_read'`);
  });

  it("holds one pending Find a deck read per reader and card, and ties a read to its unit and card", () => {
    const config = getTableConfig(fitsReads);
    const pending = config.indexes.find((i) => i.config.name === "fits_reads_one_pending_idx");
    expect(pending?.config.unique).toBe(true);
    expect(pending?.config.columns.map((c) => ("name" in c ? c.name : ""))).toEqual(["user_id", "oracle_id"]);
    expect(new PgDialect().sqlToQuery(pending!.config.where!).sql).toBe(`"fits_reads"."status" = 'pending'`);
    const fks = config.foreignKeys.map((f) => { const r = f.reference(); return [r.columns[0].name, getTableName(r.foreignTable)]; });
    expect(fks).toEqual(expect.arrayContaining([["model_call_id", "model_calls"], ["oracle_id", "cards"]]));
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

  it("ties a proposed cut to its run (cascading) and to the catalog, and bounds its verdict", () => {
    const cfg = getTableConfig(deckCutItems);
    const fks = Object.fromEntries(cfg.foreignKeys.map((fk) => {
      const ref = fk.reference();
      return [`${ref.columns[0].name}->${getTableName(ref.foreignTable)}.${ref.foreignColumns[0].name}`, fk.onDelete];
    }));
    expect(fks).toEqual({
      "run_id->deck_suggestion_runs.id": "cascade",
      "cut_oracle_id->cards.oracle_id": "no action",
    });
    const checks = Object.fromEntries(cfg.checks.map((c) => [c.name, new PgDialect().sqlToQuery(c.value).sql]));
    expect(checks.deck_cut_items_verdict_check).toContain(`in ('pending', 'accepted', 'dismissed')`);
    expect(cfg.indexes.map((i) => i.config.name)).toContain("deck_cut_items_run_position_idx");
  });

  it("stores both versions on a run rather than hashing them", () => {
    const cols = getTableConfig(deckSuggestionRuns).columns.map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["prompt_version", "profile_version", "input_fingerprint"]));
  });

  it("indexes the allowance ledger on the one query it answers", () => {
    const idx = getTableConfig(modelCalls).indexes.map((i) => i.config.name);
    expect(idx).toContain("model_calls_user_created_idx");
  });

  it("records who started each call, and admits the two batch features", () => {
    const cfg = getTableConfig(modelCalls);
    expect(cfg.columns.find((c) => c.name === "origin")?.notNull).toBe(true);
    const checks = cfg.checks.map((c) => new PgDialect().sqlToQuery(c.value).sql);
    expect(checks.some((c) => c.includes("'player'") && c.includes("'system'"))).toBe(true);
    expect(checks.some((c) => c.includes("'labels'") && c.includes("'prose'"))).toBe(true);
  });
});

describe("deck synopsis schema", () => {
  const pairs = (t: Parameters<typeof getTableConfig>[0]) =>
    getTableConfig(t).foreignKeys.map((fk) => {
      const ref = fk.reference();
      return `${ref.columns[0].name}->${getTableName(ref.foreignTable)}.${ref.foreignColumns[0].name}:${fk.onDelete}`;
    });
  const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q).sql.replace(/\s+/g, " ");

  it("allows one pending run per deck", () => {
    const unique = getTableConfig(deckSynopses).indexes.filter((i) => i.config.unique);
    expect(unique).toHaveLength(1);
    expect(unique[0].config.name).toBe("deck_synopses_one_pending_idx");
    expect(render(unique[0].config.where!)).toBe(`"deck_synopses"."status" = 'pending'`);
  });

  it("ties an outcome to a finished run, and only to a known outcome", () => {
    const checks = Object.fromEntries(getTableConfig(deckSynopses).checks.map((c) => [c.name, render(c.value)]));
    expect(checks.deck_synopses_status_check).toContain(`in ('pending', 'done')`);
    const outcome = checks.deck_synopses_outcome_check;
    expect(outcome).toContain(`("deck_synopses"."status" = 'pending') = ("deck_synopses"."outcome" is null)`);
    for (const o of ["survived", "refused", "malformed", "upstream_busy", "timeout", "interrupted"]) {
      expect(outcome).toContain(`'${o}'`);
    }
  });

  it("cascades a run with its deck, holds its allowance unit, and lets a retry outlive its base", () => {
    expect(pairs(deckSynopses)).toEqual(expect.arrayContaining([
      "deck_id->decks.id:cascade",
      "model_call_id->model_calls.id:no action",
      "retry_of->deck_synopses.id:set null",
    ]));
  });

  it("keys a version's copy on the version, and drops it with the version or the run", () => {
    expect(getTableConfig(deckVersionSynopses).columns.find((c) => c.primary)?.name).toBe("version_id");
    expect(pairs(deckVersionSynopses)).toEqual(expect.arrayContaining([
      "version_id->deck_versions.id:cascade",
      "synopsis_id->deck_synopses.id:cascade",
    ]));
  });
});
