/**
 * The database half of the Announced group's early lists (`early-tiles.ts` holds the pure half): every Commander
 * decklists post recent enough to belong to a set still in the group, its set resolved as the early page resolves it
 * (`resolvePostSet` over `commanderPrintingsQuery`), and each list's figures assembled as the early page assembles them
 * (`assembleEarlyList`), so a tile's "you own N of M" is the page's.
 *
 * A list whose release list is in is left out: the early one has given way (STATES 3.4). Whether it is in is the early
 * page's own rule (`pickReleasePrecon`, over the same candidates), so a tile is drawn exactly when its link lands on the
 * early page rather than redirecting to the release list.
 */
import { and, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../db";
import { catalogFirstSeen, cards, collectionItems, preconCards, precons, userPrefs, wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { fold } from "../precons/list";
import { RELEASED_GRACE_DAYS, utcDay, type UpcomingSet } from "../precons/upcoming";
import { earlyListHref, resolvePostSet, type EarlyCardFacts } from "./early-list";
import { assembleEarlyList, commanderPrintingsQuery, earlyListCommanderIds, pickReleasePrecon, SET_WINDOW_AFTER_DAYS, type ReleaseCandidate } from "./early-list-read";
import type { EarlySet, EarlyTile } from "./early-tiles";

type Reader = Pick<typeof db, "select" | "selectDistinct">;

const DAY_MS = 86_400_000;
/** A post older than this belongs to no set still in the group: a set is at most 180 days past its post, then 30 in grace. */
export const EARLY_POST_WINDOW_DAYS = SET_WINDOW_AFTER_DAYS + RELEASED_GRACE_DAYS;

/** Every recent Commander decklists post's lists that declare a commander, in post order; apart so a test can render its SQL. */
export function earlyListsQuery(since: Date, q: Reader = db) {
  return q
    .select({
      announcementId: wizardsAnnouncements.id,
      contentfulId: wizardsAnnouncements.contentfulId,
      postTitle: wizardsAnnouncements.title,
      url: wizardsAnnouncements.url,
      publishedAt: wizardsAnnouncements.publishedAt,
      promised: wizardsAnnouncements.promisedDecks,
      position: wizardsAnnouncementDecklists.position,
      title: wizardsAnnouncementDecklists.title,
      commanderCardId: wizardsAnnouncementDecklists.commanderCardId,
      commanderName: wizardsAnnouncementDecklists.commanderName,
      partnerCardId: wizardsAnnouncementDecklists.partnerCardId,
      partnerName: wizardsAnnouncementDecklists.partnerName,
      partnerRole: wizardsAnnouncementDecklists.partnerRole,
      cards: wizardsAnnouncementDecklists.cards,
    })
    .from(wizardsAnnouncementDecklists)
    .innerJoin(wizardsAnnouncements, eq(wizardsAnnouncements.id, wizardsAnnouncementDecklists.announcementId))
    .where(and(
      eq(wizardsAnnouncements.kind, "commander-decklists"),
      gte(wizardsAnnouncements.publishedAt, since),
      isNotNull(wizardsAnnouncementDecklists.commanderName),
    ))
    .orderBy(wizardsAnnouncements.publishedAt, wizardsAnnouncementDecklists.position);
}

/**
 * Every plain-edition precon that names any of these commanders, in any set, with its first-seen stamp: the candidates
 * `releaseCandidatesQuery` reads for the early page, for every commander at once; apart so a test can render its SQL.
 */
export function releasedCommandersQuery(commanderIds: string[], q: Reader = db) {
  return q
    .selectDistinct({
      oracleId: preconCards.oracleId,
      fileName: precons.fileName,
      setCode: precons.setCode,
      firstSeenAt: catalogFirstSeen.firstSeenAt,
      baseline: catalogFirstSeen.baseline,
    })
    .from(preconCards)
    .innerJoin(precons, eq(precons.fileName, preconCards.fileName))
    .leftJoin(catalogFirstSeen, and(eq(catalogFirstSeen.kind, "precon"), eq(catalogFirstSeen.key, precons.fileName)))
    .where(and(inArray(preconCards.oracleId, commanderIds), eq(preconCards.isCommander, true), isNull(precons.twinOf)));
}

/**
 * Whether an early list has given way to its release list: the early page's rule (`pickReleasePrecon`) over that
 * commander's candidates, the post's day and the set the post resolves to, so the tile and its link never disagree.
 * Pure, for a test.
 */
export function hasGivenWay(
  list: { commanderCardId: string | null; publishedAt: Date },
  setCode: string,
  candidatesByCommander: ReadonlyMap<string, readonly ReleaseCandidate[]>,
): boolean {
  if (!list.commanderCardId) return false;
  return pickReleasePrecon(candidatesByCommander.get(list.commanderCardId) ?? [], list.publishedAt, setCode) !== null;
}

/** The early seen keys the reader holds (`early:<code>:<count>`); the other forms in the array are not this read's. */
export async function loadEarlySeen(userId: string, q: Reader = db): Promise<string[]> {
  const [row] = await q.select({ codes: userPrefs.upcomingSeenCodes }).from(userPrefs).where(eq(userPrefs.userId, userId));
  return (row?.codes ?? []).filter((k) => k.startsWith("early:"));
}

/** Each set in `sets` that has posted early lists, by its (lowercase) code. Throws when a read fails. */
export async function loadEarlyListsBySet(userId: string, sets: readonly UpcomingSet[], now: Date): Promise<Record<string, EarlySet>> {
  if (sets.length === 0) return {};
  const rows = await earlyListsQuery(new Date(now.getTime() - EARLY_POST_WINDOW_DAYS * DAY_MS));
  if (rows.length === 0) return {};

  const posts = new Map<string, typeof rows>();
  for (const r of rows) posts.set(r.announcementId, [...(posts.get(r.announcementId) ?? []), r]);

  // Which set each post announces, as the early page decides it. Few posts fall in the window, so one read each.
  const wanted = new Map(sets.map((s) => [s.code.toLowerCase(), s]));
  const resolved: { code: string; lists: typeof rows }[] = [];
  for (const lists of posts.values()) {
    const ids = [...new Set(lists.flatMap((l) => (l.commanderCardId ? [l.commanderCardId] : [])))];
    if (ids.length === 0) continue;
    const candidates = (await commanderPrintingsQuery(ids, lists[0].publishedAt))
      .flatMap((p) => (p.releasedAt ? [{ oracleId: p.oracleId, setCode: p.setCode, releasedAt: p.releasedAt as string }] : []));
    const code = resolvePostSet(lists.map((l) => l.commanderCardId), candidates);
    if (code && wanted.has(code)) resolved.push({ code, lists });
  }
  if (resolved.length === 0) return {};

  // Two posts resolving to one set (a post re-published under a new id, repeating its lists and adding more) are read
  // as one: each list once, its latest posting, and the larger promise. Every count below is then over distinct lists.
  const byCode = new Map<string, { lists: typeof rows; promised: number | null }>();
  for (const { code, lists } of resolved) {
    const held = byCode.get(code);
    const promised = lists[0].promised;
    byCode.set(code, held
      ? { lists: [...held.lists, ...lists], promised: held.promised === null ? promised : promised === null ? held.promised : Math.max(held.promised, promised) }
      : { lists, promised });
  }
  for (const entry of byCode.values()) entry.lists = latestEachList(entry.lists);

  const kept = [...byCode.values()].flatMap((p) => p.lists);
  const commanderIds = [...new Set(kept.flatMap((l) => (l.commanderCardId ? [l.commanderCardId] : [])))];
  const cardIds = [...new Set(kept.flatMap((l) => l.cards.flatMap((c) => (c.cardId ? [c.cardId] : []))))];
  const [released, factRows, ownedRows] = await Promise.all([
    commanderIds.length === 0 ? [] : releasedCommandersQuery(commanderIds),
    cardIds.length === 0 ? [] : db
      .select({
        oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, manaCost: cards.manaCost, layout: cards.layout,
        colorIdentity: cards.colorIdentity, imageUri: cards.imageUri, legal: cards.commanderLegal,
      })
      .from(cards)
      .where(inArray(cards.oracleId, cardIds)),
    cardIds.length === 0 ? [] : db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, cardIds))),
  ]);
  const candidatesByCommander = new Map<string, ReleaseCandidate[]>();
  for (const { oracleId, ...c } of released) candidatesByCommander.set(oracleId, [...(candidatesByCommander.get(oracleId) ?? []), c]);
  const facts = new Map<string, EarlyCardFacts>(factRows.map((f) => [f.oracleId, f]));
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  const today = utcDay(now);

  const out: Record<string, EarlySet> = {};
  for (const [code, { lists, promised }] of byCode) {
    const set = wanted.get(code)!;
    const tiles: EarlyTile[] = [];
    // A list whose release list is in leaves the tiles but still stands for its commander (and partner), so a sibling
    // list still early never draws that revealed commander as "list to come".
    const gaveWay: string[] = [];
    let gaveWayLists = 0;
    for (const l of lists) {
      if (l.commanderCardId && hasGivenWay(l, code, candidatesByCommander)) {
        // The commanders its tile drew (`assembleEarlyList`): an alternate never was one, so it keeps its waiting row.
        gaveWay.push(...earlyListCommanderIds(l));
        gaveWayLists++;
        continue;
      }
      const page = assembleEarlyList({
        contentfulId: l.contentfulId,
        position: l.position,
        list: { ...l, publishedAt: l.publishedAt.toISOString() },
        facts,
        owned,
        hasCollection: true,
        set: { code, name: set.name, releaseDate: set.releasesOn },
        today,
      });
      tiles.push(earlyTileOf(earlyListHref(l.contentfulId, l.position), page));
    }
    // A set whose lists have all given way still carries its promise and its released lists; with no tiles at all it
    // reads as none (`lists` empty).
    out[code] = mergeEarlySet(undefined, { lists: tiles, promised, released: gaveWay, releasedLists: gaveWayLists });
  }
  return out;
}

/**
 * A posted list's identity across posts: its commander and partner, by card id where the catalog matched them, else by
 * name. A post re-published under a new id repeats its lists at new hrefs; this is what stays the same.
 */
export function earlyListKey(l: { commanderCardId: string | null; commanderName: string | null; partnerCardId: string | null; partnerName: string | null }): string {
  const one = (id: string | null, name: string | null) => id ?? (name ? `name:${fold(name)}` : "");
  return `${one(l.commanderCardId, l.commanderName)}|${one(l.partnerCardId, l.partnerName)}`;
}

/**
 * Each list once (`earlyListKey`), at its latest posting: rows arrive in post order, so a later post's copy of a list
 * replaces an earlier one's, and the lists keep the order the latest post gave them. Pure, for a test.
 */
export function latestEachList<T extends Parameters<typeof earlyListKey>[0]>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const key = earlyListKey(rows[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rows[i]);
  }
  return out.reverse();
}

/**
 * An early list's tile, read off its early page: the page's figures, and whether its identity is known. A list can name
 * a commander the catalog cannot match yet even when a sibling list resolved the post's set; its page carries that as
 * `unknownCommanders`, and the tile keeps it, so it never draws a partial or empty identity as the whole one.
 */
export function earlyTileOf(
  href: string,
  page: { precon: { row: Pick<EarlyTile, "name" | "commanders" | "identity" | "owned" | "of"> }; unknownCommanders: readonly string[] },
): EarlyTile {
  const row = page.precon.row;
  return {
    href, name: row.name, commanders: row.commanders,
    identity: row.identity, identityKnown: page.unknownCommanders.length === 0,
    owned: row.owned, of: row.of,
  };
}

/**
 * One post's reading of a set folded into what the set's earlier posts gave: lists in post order, the larger promise,
 * every released commander and every released list. A post with no tiles still merges, so its promise and its released
 * lists are never lost to a sibling post that has tiles.
 */
export function mergeEarlySet(held: EarlySet | undefined, next: EarlySet): EarlySet {
  if (!held) return { ...next, released: [...new Set(next.released ?? [])], releasedLists: next.releasedLists ?? 0 };
  return {
    lists: [...held.lists, ...next.lists],
    promised: held.promised === null ? next.promised : next.promised === null ? held.promised : Math.max(held.promised, next.promised),
    released: [...new Set([...(held.released ?? []), ...(next.released ?? [])])],
    releasedLists: (held.releasedLists ?? 0) + (next.releasedLists ?? 0),
  };
}
