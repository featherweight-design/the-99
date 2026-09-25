"use server";

import { sql } from "drizzle-orm";

import { db } from "../../../../db";
import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { answersOf, parseChooseParams } from "../../../../lib/intake/params";
import { loadResultsPage, type ResultsPage } from "../../../../lib/intake/rows";
import { trialFill, type TrialFigures } from "../../../../lib/intake/trial";
import { isUuid } from "../../../../lib/uuid";

/**
 * The results screen's two reads after the page (plan, PR 5b). Both take the page's own query
 * string rather than a parsed object: a Server Action's arguments are untrusted input, and the one
 * parser that already refuses a malformed answer is `parseChooseParams`.
 *
 * Every argument is checked before any read, and the reader is signed in before either.
 */

/** Past any list the search can return (about 3,300 commanders); a larger offset is refused. */
const MAX_OFFSET = 5000;
/** Longer than any URL the form can write: 800 characters of words, encoded, plus the controls. */
const MAX_QUERY = 8000;

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
  return loadResultsPage(userId, answersOf(parseChooseParams(new URLSearchParams(qs))), offset);
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
 */
export async function trialFillRows(commanderOracleIds: string[], queryString: string): Promise<Record<string, TrialFigures | null>> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  if (!Array.isArray(commanderOracleIds) || commanderOracleIds.length > MAX_ROWS || !commanderOracleIds.every((id) => typeof id === "string" && isUuid(id))) {
    throw new Error("bad commanders");
  }
  const ids = [...new Set(commanderOracleIds)];
  const p = parseChooseParams(new URLSearchParams(checkQuery(queryString)));
  const found = ids.length === 0 ? [] : (await db.execute(sql`
    select c.oracle_id, c.name, c.color_identity from cards c where c.oracle_id = any(${sql.param(ids)}::uuid[])
  `)).rows as { oracle_id: string; name: string; color_identity: string[] | null }[];
  const byId = new Map(found.map((c) => [c.oracle_id, c]));
  const answers = {
    budgetCents: p.budgetDollars === null ? null : p.budgetDollars * 100,
    bracket: p.bracket,
    cardOracleId: p.card,
  };
  const out: Record<string, TrialFigures | null> = {};
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const c = byId.get(id);
      out[id] = c
        ? await trialFill(userId, { oracleId: id, name: c.name, colorIdentity: c.color_identity ?? [] }, answers).catch(() => null)
        : null;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return out;
}
