import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

/** Rendered rather than stringified — a `sql` template has no useful `toString`. */
const dialect = new PgDialect();

/**
 * The SQL, rendered — the half a unit test can reach.
 *
 * This loader's cost is its whole justification: one statement for a 480-candidate pool
 * against ~195ms each candidate-by-candidate (`pnpm measure:facts-cost`). What can be pinned
 * without a database is that it issues ONE statement for the completions rather than one per
 * candidate, and that the statement asks the set question — a variant with exactly one piece
 * held — rather than re-running the deck's whole combo match.
 *
 * The returned FIGURES need a real Postgres and belong to a probe.
 */
const executed: string[] = [];
/** The `cards` rows the select returns — empty unless a case states them. */
let cardRows: { oracleId: string; name: string; gameChanger: boolean; oracleText: string | null }[] = [];
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => cardRows }) }),
    execute: async (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      executed.push(dialect.sqlToQuery(q).sql);
      return { rows: [] };
    },
  },
}));
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: async () => new Map() }));

const { loadCandidateFacts } = await import("./candidate-facts");

describe("the candidate facts read", () => {
  it("issues ONE completions statement for a whole pool", async () => {
    executed.length = 0;
    const pool = Array.from({ length: 200 }, (_, i) => `c${i}`);
    await loadCandidateFacts(pool, ["d1", "d2"]);
    // 200 candidates, one statement. The naive shape is 200, measured at ~39 seconds.
    expect(executed).toHaveLength(1);
  });

  it("asks for variants the deck holds exactly ONE piece of", async () => {
    executed.length = 0;
    await loadCandidateFacts(["c1"], ["d1"]);
    // The set question. Exactly one piece held is what makes it "one card away" rather than
    // "assembled" or "untouched", and it is the whole difference from `assembledCombosQuery`.
    expect(executed[0]).toContain("having count(*) = 1");
    expect(executed[0]).toMatch(/card_count\s*=\s*2/);
    // Template-gated variants name a CATEGORY of card, so a decklist cannot assemble one.
    expect(executed[0]).toContain("requires_template_ids");
  });

  it("does not count a card the deck already holds as completing anything", async () => {
    executed.length = 0;
    await loadCandidateFacts(["d1"], ["d1"]);
    // Otherwise a card already in the deck reads as closing the combo it is already half of.
    expect(executed[0]).toMatch(/t\.oracle_id\s*<>\s*all/);
  });

  it("makes no round trip for an empty pool", async () => {
    executed.length = 0;
    const out = await loadCandidateFacts([], ["d1"]);
    expect(out.size).toBe(0);
    expect(executed).toHaveLength(0);
  });

  it("makes no completions query for a deck with no cards", async () => {
    executed.length = 0;
    // Nothing can be one card away from a combo when nothing is held.
    await loadCandidateFacts(["c1"], []);
    expect(executed).toHaveLength(0);
  });
});

// ── The extracted statement ──────────────────────────────────────────────────────────────────
//
// `completionsQuery` was inlined in `completionsFor` until the modal's four columns landed, so
// the projection guard `load.test.ts` carries for `assembledCombosQuery` had no counterpart on
// this read — one of two reads into one surface, guarded. Rendering the loader's own query
// rather than a copy, for the reason the block above gives.

import { completionsQuery } from "./candidate-facts";

const rendered = () =>
  dialect.sqlToQuery(completionsQuery(["a"], ["b", "c"])).sql.replace(/\s+/g, " ");

describe("the completions statement", () => {
  // THE MODAL'S FOUR FIELDS. A near-miss is drawn in the same modal as an assembled combo, so
  // dropping one here has the consequence it has on the other read: the mapping's `?? null`
  // reads it as null on every row, silently, with no error anywhere.
  it.each(["mana_needed", "mana_value_needed", "steps", "notable_prerequisites"])(
    "projects %s, which the reasoning modal draws",
    (column) => {
      expect(rendered()).toContain(`v.${column}`);
    },
  );

  // IT STARTS FROM THE DECK. The first CTE walks the membership index by the deck's own cards,
  // before any grouping; the version that materialised every two-card membership row first took
  // ~280ms against ~22ms for the same answer. Asserting the CTE's shape is the only way to see
  // that from the emitted string.
  it("reads the membership index from the deck's side first, before any join or group", () => {
    const sql = rendered();
    const held = sql.slice(sql.indexOf("with held as ("), sql.indexOf("), matched as ("));
    expect(held).toMatch(/where vc\.oracle_id = any\(\$\d+::uuid\[\]\)/);
    expect(held).toContain("v.card_count = 2");
    expect(held).toContain("having count(*) = 1");
    expect(sql).not.toContain("two_card");
  });

  // THE WIDE COLUMNS STAY OUT OF BOTH CTEs AND OUT OF THE GROUP KEY: `steps` averages 395
  // characters, and only the matched completions need it.
  it("keeps the CTEs narrow: no wide column before the final join", () => {
    const sql = rendered();
    const ctes = sql.slice(sql.indexOf("with held as ("), sql.indexOf("select m.candidate"));
    for (const wide of ["steps", "mana_needed", "notable_prerequisites", "produces"]) {
      expect(ctes).not.toContain(wide);
    }
  });

  it("groups on two columns, never on a 395-character string", () => {
    const sql = rendered();
    const group = sql.slice(sql.indexOf("group by t.oracle_id"));
    expect(group).toContain("group by t.oracle_id, t.variant_id");
    for (const wide of ["t.steps", "t.mana_needed", "t.notable_prerequisites"]) {
      expect(group).not.toContain(wide);
    }
  });

  // RULE 1, shared with the assembled read: a template-gated variant names a CATEGORY of card,
  // so a decklist cannot be said to complete it either.
  it("excludes template-gated variants", () => {
    expect(rendered()).toContain("cardinality(v.requires_template_ids) = 0");
  });
});

// Ruled 2026-09-22: a search that can find only a land is ramp. This read feeds the note on
// the two pool-fed add surfaces, so a land search here would draw "A tutor, and your Nth" on
// Evolving Wilds in the Consider shelf and the top-off list. Texts read off staging's catalog.
describe("the candidate's tutor reading", () => {
  it("is true for a search that can find a non-land and false for a land-only one", async () => {
    cardRows = [
      {
        oracleId: "demonic",
        name: "Demonic Tutor",
        gameChanger: true,
        oracleText: "Search your library for a card, put that card into your hand, then shuffle.",
      },
      {
        oracleId: "wilds",
        name: "Evolving Wilds",
        gameChanger: false,
        oracleText:
          "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
      },
    ];
    try {
      const facts = await loadCandidateFacts(["demonic", "wilds"], []);
      expect(facts.get("demonic")?.tutor).toBe(true);
      expect(facts.get("wilds")?.tutor).toBe(false);
    } finally {
      cardRows = [];
    }
  });
});

