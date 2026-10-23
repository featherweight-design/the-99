/**
 * The cards a deck could ADD that count toward its strategy focus, for a Suggested changes run with a focus set (plan
 * 4c, Hugh-approved 2026-10-22). Eval v3 showed the focus line steers the cuts and barely the additions (10 of 31 on
 * the focus): the model was told to build toward the focus and shown nothing that does. This is the list it draws
 * from, built by rule: no model call, so the run stays one credit.
 *
 * WHERE THEY COME FROM. The commander's (or both partners') EDHREC list, `commander_support_cards`, and the staples of
 * the deck's color identity, `format_staples`: the two sources the shelved lean-in pool read, less the collection,
 * because the collection is a fact about who owns a card. Each is kept to commander-legal nonbasic cards inside the
 * identity, not in the deck, with a name no other card shares (the model answers by name, as the owned shortlist's twin
 * rule says), printed in a selected set, and ON THE FOCUS (`onStrategy`, the ring's own test). A land is no strategy card.
 *
 * OWNERSHIP NEVER ORDERS THEM (`suggestionRules.ownershipNotRanking`, kept by Hugh's ruling 2026-10-22). The run's
 * limits FILTER: owned-only keeps only owned cards with a copy free of every other deck (the owned shortlist's rule, or
 * the validator would drop the pick as `notOwned`), the cap drops a card over it (no usable price passes, as in the
 * validator). The ORDER is facts about the card: its inclusion on the commander's list (the larger of a pair's two),
 * then its share of the identity's commanders, then its name.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { cardLabels, cards, collectionItems, commanderSupportCards, formatStaples } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { priceOf, priceState } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { castFaceText } from "../cards/facet";
import { labelRoleSet } from "../labels/role-sets";
import { classifyRoles, rolesByLabelElseText } from "../recs/roles";
import { printedIn } from "../sets/printed-in-sql";
import { cardColumns, freshJobs, toStrategyCard, type CardRow } from "./load";
import { onStrategy, type StrategyKey } from "./score";

type Reader = Pick<typeof db, "select">;

/** One candidate as the prompt names it: a catalog name and type line, and the roles it fills. */
export type FocusCandidate = { oracleId: string; name: string; typeLine: string; roles: string[] };

/**
 * Most names sent. At about 15 tokens a line the list is under 400 tokens; it is a shortlist the model compares, and
 * the prompt asks that at least half of a run's additions count toward the focus, drawn from it first.
 */
export const FOCUS_CANDIDATES_MAX = 20;

/** The role basis the deck's profile counted by (`ProfileSkeleton.roleBasis`): a candidate's roles must be the ones its
 *  addition would move in those counts. */
export type RoleBasis = "labels" | "classifier";

export type CandidateArgs = {
  userId: string;
  commanderOracleIds: readonly string[];
  colorIdentity: readonly string[];
  /** The staples bucket the profile resolved (`ProfileSkeleton.condition`): the exact identity, or the colour-count
   *  fallback when the exact one has none, so a deck served by `count:3` keeps its staples. */
  stapleCondition: string;
  inDeck: ReadonlySet<string>;
  limits: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
};

/**
 * Every card on either source that passes the catalog filters, with its ranking facts; apart so a test can render its
 * SQL. The focus test is the ring's and runs after, on the rows.
 */
export function candidateQuery(q: Reader, args: CandidateArgs) {
  const commanders = sql.param([...args.commanderOracleIds]);
  const condition = args.stapleCondition;
  return q
    .select({
      ...cardColumns,
      quantity: sql<number>`1`,
      inclusion: sql<number | null>`(select max(csc.inclusion) from ${commanderSupportCards} csc where csc.oracle_id = ${cards}.oracle_id and csc.commander_oracle_id = any(${commanders}::uuid[]))`,
      stapleShare: sql<number | null>`(select fs.commanders::real / nullif(fs.commander_total, 0) from ${formatStaples} fs where fs.oracle_id = ${cards}.oracle_id and fs.condition = ${condition})`,
    })
    .from(cards)
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(and(
      eq(cards.commanderLegal, true),
      // `isBasicLand`'s own word test (grouping.ts): "Basic Snow Land" is a basic too.
      sql`${cards.typeLine} !~ '\\yBasic\\y'`,
      sql`${cards.colorIdentity} <@ ${sql.param([...args.colorIdentity])}::text[]`,
      ...(args.inDeck.size > 0 ? [sql`${cards.oracleId} <> all(${sql.param([...args.inDeck])}::uuid[])`] : []),
      sql`${printedIn(cards.oracleId, args.limits.sets)}`,
      sql`not exists (select 1 from ${cards} twin where twin.name = ${cards.name} and twin.oracle_id <> ${cards.oracleId})`,
      sql`(
        exists (select 1 from ${commanderSupportCards} csc where csc.oracle_id = ${cards.oracleId} and csc.commander_oracle_id = any(${commanders}::uuid[]))
        or exists (select 1 from ${formatStaples} fs where fs.oracle_id = ${cards.oracleId} and fs.condition = ${condition})
      )`,
      ...(args.limits.ownedOnly
        ? [sql`exists (select 1 from ${collectionItems} ci where ci.user_id = ${args.userId} and ci.oracle_id = ${cards.oracleId})`]
        : []),
    ));
}

export type RankedRow = { oracleId: string; name: string; inclusion: number | null; stapleShare: number | null };

const desc = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1);

/** The order the list is sent in: inclusion, then the identity's share, then the name. Pure, and nothing about owning. */
export function rankCandidates<T extends RankedRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => desc(a.inclusion, b.inclusion) || desc(a.stapleShare, b.stapleShare) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * The roles a candidate fills, by the profile's own rules (`profile/build.ts`'s `rolesFor`): the FRONT face's text
 * (`castFaceText`), and on the labels basis its fresh label role set, else the classifier. So a card listed as ramp is
 * one whose addition moves the profile's ramp count.
 */
function rolesOf(r: CardRow, basis: RoleBasis): string[] {
  const card = { oracleId: r.oracleId, typeLine: r.typeLine, oracleText: castFaceText(r.oracleText, r.layout), keywords: r.keywords };
  if (basis !== "labels") return classifyRoles(card);
  const jobs = freshJobs(r);
  return rolesByLabelElseText(card, jobs ? new Map([[r.oracleId, labelRoleSet(jobs, r.typeLine, card.oracleText)]]) : new Map());
}

/** The roles each of these catalog cards fills, by the candidates' own rule; for the eval's role-coverage count. */
export async function loadCardRoles(oracleIds: readonly string[], basis: RoleBasis, read: Reader = db): Promise<Map<string, string[]>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await read
    .select({ ...cardColumns, quantity: sql<number>`1` })
    .from(cards)
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(sql`${cards.oracleId} = any(${sql.param([...oracleIds])}::uuid[])`);
  return new Map(rows.map((r) => [r.oracleId, rolesOf(r, basis)]));
}

/**
 * An owned-only run's shortlist with the focus candidates joined on (review round 1): `limitsRules` says every addition
 * comes from the shortlist, and an owned-only candidate passed the same owned and free-copy test, but the shortlist
 * stops at its own cap and reads only the commander's list, so a staple-only or lower-ranked focus card would be offered
 * by one rule and forbidden by the other. The shortlist's order is kept; candidates it lacks follow in their own order.
 */
export function withFocusCandidates<T extends { oracleId: string; name: string; typeLine: string }>(
  shortlist: readonly T[],
  candidates: readonly FocusCandidate[],
): (T | Pick<FocusCandidate, "oracleId" | "name" | "typeLine">)[] {
  const held = new Set(shortlist.map((c) => c.oracleId));
  return [...shortlist, ...candidates.filter((c) => !held.has(c.oracleId)).map(({ oracleId, name, typeLine }) => ({ oracleId, name, typeLine }))];
}

/**
 * The focus candidates for one run, at most `max`, or none for a deck with no commander. `env` is the reader's resolved
 * switches, for the claim model's free-copy read on an owned-only run.
 */
export async function loadFocusCandidates(
  args: CandidateArgs & { deckId: string; focus: StrategyKey; roleBasis: RoleBasis; env: NodeJS.ProcessEnv; max?: number },
  read: Reader = db,
): Promise<FocusCandidate[]> {
  const max = args.max ?? FOCUS_CANDIDATES_MAX;
  if (args.commanderOracleIds.length === 0) return [];
  const rows = await candidateQuery(read, args);
  const onFocus = rankCandidates(rows.filter((r) => {
    const card = toStrategyCard(r);
    return card !== null && onStrategy(card, args.focus);
  }));

  const capCents = args.limits.capCents;
  const out: FocusCandidate[] = [];
  // The free-copy and price tests need other tables' reads, so they run over the ranked list a slice at a time until
  // the list is full: a fixed read-ahead could come back short when the top cards are claimed elsewhere or over the cap.
  const SLICE = max * 3;
  for (let at = 0; at < onFocus.length && out.length < max; at += SLICE) {
    const slice = onFocus.slice(at, at + SLICE);
    const ids = slice.map((r) => r.oracleId);
    const [availability, priced] = await Promise.all([
      args.limits.ownedOnly ? loadAvailability(args.userId, { oracleIds: ids, excludeDeckId: args.deckId, env: args.env }) : null,
      capCents === null ? null : loadPrices(ids),
    ]);
    for (const r of slice) {
      if (availability) {
        const free = availability.get(r.oracleId);
        if (free !== undefined && free.free <= 0) continue;
      }
      if (priced !== null && capCents !== null) {
        const fact = priced.prices.get(r.oracleId) ?? null;
        const cents = fact ? priceOf(fact, priceState(fact, priced.newestAsOf)) : null;
        if (cents !== null && cents > capCents) continue;
      }
      out.push({ oracleId: r.oracleId, name: r.name, typeLine: r.typeLine, roles: rolesOf(r, args.roleBasis) });
      if (out.length >= max) break;
    }
  }
  return out;
}
