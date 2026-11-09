// The ownership figures for a slice of the results screen's rows: the deck each commander would be built into, filled
// (`trialFill`). The server action `trialFillRows` signs the reader in and checks its arguments, then calls this; the
// landing demo's exporter (`scripts/demo-export.mts`) calls it with the fixture owner, so both count a row the same way.
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { handOffSets } from "./hand-off";
import type { ChooseParams } from "./params";
import { isCandidate, loadIntakeCatalog } from "./search";
import { trialFill, type TrialFigures } from "./trial";

/** Fills run this many at a time: each is a whole `buildFillPlan`, and a slice of twelve at once
 *  would hold that many database connections for its length. */
const CONCURRENCY = 4;

/**
 * `ids` are unique commander oracle ids (the caller has bounded and validated them). A row whose fill fails, an id the
 * search could not list, or a commander this player has already built comes back null, and the others still arrive.
 */
export async function trialFigureRows(
  userId: string,
  env: NodeJS.ProcessEnv,
  p: ChooseParams,
  ids: string[],
): Promise<Record<string, TrialFigures | null>> {
  // Only a commander the search could list is filled: an id naming any other card, or a commander
  // this player has already built, comes back null without a fill being run for it.
  const found = ids.length === 0 ? [] : (await db.execute(sql`
    -- mana_cost feeds the basics pip census through trialFill; without it a trial deck has its
    -- mana base weighted as though its commander were colourless. No backticks in a sql template.
    select c.oracle_id, c.name, c.color_identity, c.mana_cost
    from commander_support cs join cards c on c.oracle_id = cs.commander_oracle_id
    where cs.commander_oracle_id = any(${sql.param(ids)}::uuid[]) and ${isCandidate(userId)}
  `)).rows as {
    oracle_id: string; name: string; color_identity: string[] | null; mana_cost: string | null;
  }[];
  const byId = new Map(found.map((c) => [c.oracle_id, c]));
  const answers = {
    budgetCents: p.budgetDollars === null ? null : p.budgetDollars * 100,
    bracket: p.bracket,
    // No card: the results rank by none any more (F1), so the figures count none.
    cardOracleId: null,
    // The sets the create fills toward (picked plus those the words name, `handOffSets`), so each
    // row's figures predict the deck its press builds (review round 1). A failed catalog read is the
    // picked sets alone, as at the create.
    sets: handOffSets(
      p.sets,
      p.words,
      p.words.trim() === "" ? null : await loadIntakeCatalog().then((c) => c.index).catch(() => null),
    ),
  };
  const out: Record<string, TrialFigures | null> = {};
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const c = byId.get(id);
      out[id] = c
        ? await trialFill(
          userId,
          { oracleId: id, name: c.name, colorIdentity: c.color_identity ?? [], manaCost: c.mana_cost },
          answers,
          env,
          p.pool === "own",
        ).catch(() => null)
        : null;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return out;
}
