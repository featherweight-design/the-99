/**
 * The database half of the Announced group's early lists (`early-tiles.ts` holds the pure half): every Commander
 * decklists post recent enough to belong to a set still in the group, its set resolved as the early page resolves it
 * (`resolvePostSet` over `commanderPrintingsQuery`), and each list's figures assembled as the early page assembles them
 * (`assembleEarlyList`), so a tile's "you own N of M" is the page's.
 *
 * A list whose commander already heads a plain-edition precon in the same set is left out: its release list is in, so
 * the early one has given way (STATES 3.4).
 */
import { and, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, preconCards, precons, userPrefs, wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { RELEASED_GRACE_DAYS, utcDay, type UpcomingSet } from "../precons/upcoming";
import { earlyListHref, resolvePostSet, type EarlyCardFacts } from "./early-list";
import { assembleEarlyList, commanderPrintingsQuery, SET_WINDOW_AFTER_DAYS } from "./early-list-read";
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

/** The sets in which each of these commanders heads a plain-edition precon (lowercase codes); apart so a test can render its SQL. */
export function releasedCommandersQuery(commanderIds: string[], q: Reader = db) {
  return q
    .selectDistinct({ oracleId: preconCards.oracleId, setCode: precons.setCode })
    .from(preconCards)
    .innerJoin(precons, eq(precons.fileName, preconCards.fileName))
    .where(and(inArray(preconCards.oracleId, commanderIds), eq(preconCards.isCommander, true), isNull(precons.twinOf)));
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

  const kept = resolved.flatMap((p) => p.lists);
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
  const releasedIn = new Set(released.map((r) => `${r.setCode.toLowerCase()}:${r.oracleId}`));
  const facts = new Map<string, EarlyCardFacts>(factRows.map((f) => [f.oracleId, f]));
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  const today = utcDay(now);

  const out: Record<string, EarlySet> = {};
  for (const { code, lists } of resolved) {
    const set = wanted.get(code)!;
    const tiles: EarlyTile[] = [];
    for (const l of lists) {
      if (l.commanderCardId && releasedIn.has(`${code}:${l.commanderCardId}`)) continue;
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
      const row = page.precon.row;
      tiles.push({ href: earlyListHref(l.contentfulId, l.position), name: row.name, commanders: row.commanders, identity: row.identity, owned: row.owned, of: row.of });
    }
    if (tiles.length === 0) continue;
    // Two posts resolving to one set (rare: a post re-published under a new id) are read as one: their lists in post
    // order, and the larger promise.
    const held = out[code];
    const promised = lists[0].promised;
    out[code] = held
      ? { lists: [...held.lists, ...tiles], promised: held.promised === null ? promised : promised === null ? held.promised : Math.max(held.promised, promised) }
      : { lists: tiles, promised };
  }
  return out;
}
