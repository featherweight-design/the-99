"use server";

import { sql } from "drizzle-orm";

import { db } from "../../../../db";
import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { answersOf, parseLiveParams } from "../../../../lib/intake/params";
import { loadResultsPage, type ResultsPage } from "../../../../lib/intake/rows";
import { loadTheRead } from "../../../../lib/intake/run-store";
import { isCandidate } from "../../../../lib/intake/search";
import { trialFill, type TrialFigures } from "../../../../lib/intake/trial";
import { isUuid } from "../../../../lib/uuid";

/**
 * The results screen's two reads after the page (plan, PR 5b). Both take the page's own query
 * string rather than a parsed object: a Server Action's arguments are untrusted input, and the one
 * parser that already refuses a malformed answer is `parseLiveParams`.
 *
 * Every argument is checked before any read, and the reader is signed in before either.
 */

/** Past any list the search can return (about 3,300 commanders); a larger offset is refused. */
const MAX_OFFSET = 5000;
/**
 * Longer than any URL the form writes. The words are 800 characters, and one in another script
 * encodes to up to 12 (4 UTF-8 bytes, each `%XX`); `n` can repeat most of them; the controls add a
 * few hundred more. 32,000 clears that with room, and still refuses a payload no page produced.
 */
const MAX_QUERY = 32_000;

function checkQuery(queryString: unknown): string {
  if (typeof queryString !== "string" || queryString.length > MAX_QUERY) throw new Error("bad query");
  return queryString.startsWith("?") ? queryString.slice(1) : queryString;
}

/** The next slice of rows, for *Show 12 more*. */
export async function moreRows(queryString: string, offset: number): Promise<ResultsPage> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  const qs = checkQuery(queryString);
  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new Error("bad offset");
  }
  const p = parseLiveParams(new URLSearchParams(qs));
  // The read `r` names orders the list the same way on every slice, so a pick is never repeated.
  const read = p.readId ? await loadTheRead(p.readId, userId) : null;
  return loadResultsPage(userId, answersOf(p), offset, read?.kind === "done" ? read.result : null);
}

/** At most one slice of rows is counted per call. */
const MAX_ROWS = 12;
/** Fills run this many at a time: each is a whole `buildFillPlan`, and a slice of twelve at once
 *  would hold that many database connections for its length. */
const CONCURRENCY = 4;

/**
 * The ownership figures for the rows on screen, one slice per call: the deck each commander would
 * be built into, filled. ONE action for the slice, since Next runs a page's Server Actions one at a
 * time, so twelve calls would fill the rows one after another and hold *Show 12 more* behind
 * them. A row whose fill fails comes back null, and the others still arrive.
 *
 * What the server bounds is the CALL, not the screen: at most twelve ids, each one a commander the
 * search could list for some answers (`isCandidate`), so a call costs what a real slice costs. It
 * does not re-run the search to confirm these ids are this page's rows. That read is the page's
 * dearest, and repeating it per slice would double the page's cost to refuse a caller who could
 * send twelve of the page's own ids for the same price.
 */
export async function trialFillRows(commanderOracleIds: string[], queryString: string): Promise<Record<string, TrialFigures | null>> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  if (!Array.isArray(commanderOracleIds) || commanderOracleIds.length > MAX_ROWS || !commanderOracleIds.every((id) => typeof id === "string" && isUuid(id))) {
    throw new Error("bad commanders");
  }
  const ids = [...new Set(commanderOracleIds)];
  const p = parseLiveParams(new URLSearchParams(checkQuery(queryString)));
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
        ).catch(() => null)
        : null;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return out;
}
