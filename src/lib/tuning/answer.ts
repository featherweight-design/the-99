import { inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { priceOf, priceState } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { readOwnedOracleIds } from "../decks/tuning-read";
import { printedIn } from "../sets/printed-in-sql";
import type { EvidencePack } from "./evidence";
import { ownedCopyOffered } from "./limits";
import { nameResolver } from "./resolve-names";
import type { TuningResponse } from "./response-schema";
import { validateSuggestions, type ResolvedCard } from "./validate";

/**
 * The half of a run that follows the model: one catalog read of every name it returned, the
 * ownership, availability and price facts the hard filters need, and the accept contract. Here
 * rather than inline in `runTuning` so the paid probe (`scripts/probe-tuning-owned.mts`) runs the
 * SAME code over a real reply, read-only, instead of a copy that could drift from it.
 *
 * "Kept for this deck" (H35, PR 4a): the SAME two reads the buy tag and a fill's
 * `pool: "sleeveable"` already use, scoped to the model's own named cards — the pack-time `owned`
 * set only covers cards already in the deck or in the skeleton's staples, never a genuinely new
 * suggestion.
 *
 * The cap read happens only while a cap is active: that figure is NEVER displayed (the buy tag
 * re-reads its own prices independently), so an inactive cap has no consumer to protect. A
 * price-read failure must still never go silent while a cap IS active: swallowing it turns every
 * candidate's price into null, and the validator deliberately exempts a null price from the cap,
 * so a transient failure would silently disable the cap rather than refuse the run.
 *
 * Ownership is read only while the owned-only filter is active, and SLEEVEABLE MEANS SLEEVEABLE
 * (review round 6, same rule as `fill.ts`'s `pool: "sleeveable"`): a collection row is owned
 * whether or not a copy is FREE, so a card whose every copy is claimed by another deck would pass
 * "owned" and the reader's own client would strip the applied swap on arrival. Both fail closed
 * (no `.catch`) while the filter is active.
 */
export async function resolveAnswer(args: {
  userId: string;
  deckId: string;
  pack: EvidencePack;
  response: TuningResponse;
  /** The reader's resolved switches (`requestSwitchEnv`), for the claim read; a probe,
   *  with no signed-in reader, passes `process.env`. */
  env: NodeJS.ProcessEnv;
}) {
  const { userId, deckId, pack, response } = args;
  const { additions, cuts } = response;
  const names = [...new Set([...additions, ...cuts].map((l) => l.card))];
  const rows = await readResolvedRows({ userId, deckId, limits: pack.limits, names, env: args.env });
  const resolveName = nameResolver(rows, new Set(pack.cards.map((c) => c.oracleId)));
  return { ...validateSuggestions({ response, pack, resolveName }), askedCount: additions.length + cuts.length };
}

/**
 * The catalog rows behind a set of names the model wrote, with what the hard filters read: legality and identity, the
 * Set limit's printing, the price under a cap and, owned-only, whether a copy is free. One read per call of v10's reply
 * (`resolveAnswer`), and one per streamed line of v2's (`v2/run.ts`), so the two judge a card the same way.
 */
export async function readResolvedRows(args: {
  userId: string;
  deckId: string;
  limits: EvidencePack["limits"];
  names: readonly string[];
  env: NodeJS.ProcessEnv;
}): Promise<(ResolvedCard & { name: string })[]> {
  const { userId, deckId, limits, names, env } = args;
  const nameRows = names.length === 0 ? [] : await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      commanderLegal: cards.commanderLegal,
      // Decision 9's rule (`printedIn`, src/lib/sets/printed-in.ts): any printing in the
      // selection, folding to `true` when the player set no Set limit at all.
      printedInSelectedSets: sql<boolean>`${printedIn(cards.oracleId, limits.sets)}`,
    })
    .from(cards)
    .where(inArray(cards.name, names));
  const suggestedIds = nameRows.map((r) => r.oracleId);
  const [{ prices, newestAsOf }, suggestedOwned, availability] = await Promise.all([
    limits.capCents === null ? { prices: new Map(), newestAsOf: null } : loadPrices(suggestedIds),
    nameRows.length === 0 || !limits.ownedOnly ? new Set<string>() : readOwnedOracleIds(userId, suggestedIds),
    nameRows.length === 0 || !limits.ownedOnly ? new Map() : loadAvailability(userId, { oracleIds: suggestedIds, excludeDeckId: deckId, env }),
  ]);
  const rows = nameRows.map((r) => {
    const fact = prices.get(r.oracleId) ?? null;
    const state = priceState(fact, newestAsOf);
    const avail = availability.get(r.oracleId);
    return {
      ...r,
      priceCents: fact ? priceOf(fact, state) : null,
      owned: suggestedOwned.has(r.oracleId) && ownedCopyOffered(avail?.free, limits),
    };
  });
  return rows;
}
