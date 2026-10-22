/**
 * The combo writer (menu and Home G1, "Combos you can make: a collection write completes a pair"). The two collection
 * writes every change converges on (`replaceCollection`, `applyCollectionChange`) call it in three steps:
 *
 * 1. `comboWatchIn(tx, user)`, under the per-user lock and BEFORE the rows move: null unless the combo kind is
 *    AVAILABLE to the reader (their resolved switches: the feed on, no kill switch or override against it) and on in
 *    their choices (one indexed read of `user_prefs`), else the cards held before the write.
 * 2. `comboDeltaIn(tx, user, watch)`, after the rows moved, in the same transaction: the cards the write ADDED (held
 *    now, not held before) and everything held now. Null when nothing was added, or when the collection was empty
 *    before: a first import completes every pair it holds at once, and that is the collection, not news.
 * 3. After the commit, `noticeCombos(user, delta)` (through `afterCommit`): the two-card variants the write completed,
 *    each one `recordFeedItem` (dedupe: the variant id, so a pair sold and bought back is told once).
 *
 * The variant rules are the collection read's (`ownBothQuery`): two pieces by row count, no template, and what it
 * PRODUCES decides (`isInfiniteOrGameEnding`), never the card count.
 */
import { sql } from "drizzle-orm";
import type { db } from "../../db";
import { cards, collectionItems, spellbookVariantCards, spellbookVariants, userPrefs } from "../../db/schema";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";
import { recordFeedItem } from "../social/feed-write";
import { resolveSwitchEnv } from "../switches/snapshot";
import { availableFeedKinds } from "./flag";

type Executor = Pick<typeof db, "execute">;

/** At most this many combos are told for one write, the most popular first: one upload is one batch of news. */
export const COMBOS_PER_WRITE = 3;

export type ComboPair = {
  variantId: string;
  /** The two pieces, by oracle id, in id order, with their catalog names. */
  cards: readonly { oracleId: string; name: string }[];
  produces: readonly string[];
  popularity: number | null;
};

export type ComboDelta = { added: string[]; held: ReadonlySet<string> };

/**
 * The pairs this write COMPLETED: both pieces held now, at least one of them added by the write (so not both held
 * before), and a variant the bracket system counts. Most popular first (nulls last), `variantId` breaking ties, one
 * row per variant, at most `limit`. Pure.
 */
export function newlyCompleted(args: {
  added: ReadonlySet<string>;
  held: ReadonlySet<string>;
  pairs: readonly ComboPair[];
  limit?: number;
}): ComboPair[] {
  const seen = new Set<string>();
  const out: ComboPair[] = [];
  for (const p of args.pairs) {
    if (seen.has(p.variantId) || p.cards.length !== 2) continue;
    const [a, b] = p.cards;
    if (a.oracleId === b.oracleId) continue;
    if (!args.held.has(a.oracleId) || !args.held.has(b.oracleId)) continue;
    if (!args.added.has(a.oracleId) && !args.added.has(b.oracleId)) continue;
    if (!isInfiniteOrGameEnding(p.produces)) continue;
    seen.add(p.variantId);
    out.push(p);
  }
  out.sort((x, y) => {
    const xp = x.popularity ?? -1;
    const yp = y.popularity ?? -1;
    if (xp !== yp) return yp - xp;
    return x.variantId < y.variantId ? -1 : x.variantId > y.variantId ? 1 : 0;
  });
  return out.slice(0, args.limit ?? COMBOS_PER_WRITE);
}

/** The cards the write added: held now and not before. Pure. */
export function addedCards(before: ReadonlySet<string>, after: ReadonlySet<string>): string[] {
  return [...after].filter((id) => !before.has(id)).sort();
}

/** Whether the reader's combo kind is on. Apart so a test can render it. */
export function comboOnQuery(userId: string) {
  return sql`select 1 as yes from ${userPrefs} cup where cup.user_id = ${userId} and (cup.feed_kinds ->> 'combo') is not null`;
}

/** Every card the reader holds, by oracle id (the collection read's own `owned`). */
export function heldCardsQuery(userId: string) {
  return sql`select distinct hci.oracle_id as oracle_id from ${collectionItems} hci where hci.user_id = ${userId}`;
}

/** Every two-card, template-free variant with a piece among `added`, with both pieces and their names. */
export function pairsTouchingQuery(added: readonly string[]) {
  return sql`select v.variant_id as variant_id, v.produces as produces, v.popularity as popularity,
      array_agg(vc.oracle_id::text order by vc.oracle_id) as ids,
      array_agg(c.name order by vc.oracle_id) as names
    from ${spellbookVariants} v
    join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
    join ${cards} c on c.oracle_id = vc.oracle_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and exists (select 1 from ${spellbookVariantCards} vc2
                  where vc2.variant_id = v.variant_id and vc2.oracle_id = any(${sql.param([...added])}::uuid[]))
    group by v.variant_id
    having count(*) = 2`;
}

const idSet = (rows: { oracle_id: string }[]) => new Set(rows.map((r) => r.oracle_id));

/** Step 1, under the lock and before the rows move. Null (and nothing more read) while the reader's combo kind is unavailable or off. */
export async function comboWatchIn(tx: Executor, userId: string): Promise<ReadonlySet<string> | null> {
  if (!availableFeedKinds(await resolveSwitchEnv(userId)).includes("combo")) return null;
  const on = await tx.execute(comboOnQuery(userId));
  if (on.rows.length === 0) return null;
  return idSet((await tx.execute<{ oracle_id: string }>(heldCardsQuery(userId))).rows);
}

/** Step 2, after the rows moved, in the same transaction. */
export async function comboDeltaIn(tx: Executor, userId: string, before: ReadonlySet<string> | null): Promise<ComboDelta | null> {
  if (before === null || before.size === 0) return null;
  const held = idSet((await tx.execute<{ oracle_id: string }>(heldCardsQuery(userId))).rows);
  const added = addedCards(before, held);
  return added.length > 0 ? { added, held } : null;
}

/** Step 3, after the commit: records each pair the write completed. Returns how many items were written. */
export async function noticeCombos(q: Executor, userId: string, delta: ComboDelta): Promise<number> {
  const rows = (await q.execute<{ variant_id: string; produces: string[]; popularity: number | null; ids: string[]; names: string[] }>(
    pairsTouchingQuery(delta.added),
  )).rows;
  const pairs: ComboPair[] = rows.map((r) => ({
    variantId: r.variant_id,
    cards: r.ids.map((oracleId, i) => ({ oracleId, name: r.names[i] })),
    produces: r.produces,
    popularity: r.popularity,
  }));
  const added = new Set(delta.added);
  let written = 0;
  // Every candidate, most popular first, until THREE are written: a variant already told (the dedupe key) is not
  // news and must not use up one of the three places.
  for (const p of newlyCompleted({ added, held: delta.held, pairs, limit: pairs.length })) {
    if (written >= COMBOS_PER_WRITE) break;
    const arrived = p.cards.filter((c) => added.has(c.oracleId)).map((c) => c.oracleId);
    const ok = await recordFeedItem(q, {
      userId,
      kind: "combo",
      dedupeKey: p.variantId,
      variantId: p.variantId,
      // The piece this write added ("Your last upload added Demonic Consultation"); the first when it added both.
      oracleId: arrived[0],
      data: { cards: p.cards, added: arrived },
    });
    if (ok) written += 1;
  }
  return written;
}
