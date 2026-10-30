/**
 * The database half of an early decklist (`early-list.ts` holds the pure half): one stored list by its post's Contentful
 * id and its position, drawn as the open precon page draws a precon, or the release list's file name once MTGJSON lists
 * the box (STATES 3.4: the address sends the reader to the release list's page).
 *
 * Which set a post announces is read at request time (`resolvePostSet`): the Commander sets (`sets`, type `commander`,
 * not digital, the Announced group's own source) that its lists' commanders are printed in, released within a window
 * around the post's day. The window, not "releasing after today", keeps the answer the same after the release, so the
 * redirect still finds the release list a year on.
 */
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, preconCards, precons, printings, sets, wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { isBasicType } from "../decks/basic-type";
import { summarisePrecons } from "../precons/list";
import { BASIC_TYPES } from "../swaps/land";
import type { OpenPrecon, OpenPreconCard } from "../precons/open-read";
import { utcDay } from "../precons/upcoming";
import { resolvePostSet, splitEarlyLines, type EarlyCardFacts, type UnmatchedLine } from "./early-list";

type Reader = Pick<typeof db, "select" | "selectDistinct">;

const DAY_MS = 86_400_000;
/** A Commander set counts for a post released from this many days before the post's day... */
const SET_WINDOW_BEFORE_DAYS = 60;
/** ...to this many after it (a decklists post goes up two to four weeks before the street date). */
const SET_WINDOW_AFTER_DAYS = 180;

export type EarlyListPage = {
  /** The list as the open precon view draws it; every card's printing is null (the post names cards, not printings). */
  precon: Extract<OpenPrecon, { kind: "precon" }>;
  /** Wizards' post, when its url is one to link to (`isWizardsPostUrl` is the view's check). */
  postUrl: string;
  /** When Wizards posted it, ISO. */
  postedAt: string;
  /** The set's release day (`YYYY-MM-DD`) once it has passed and the release list is still not in (STATES 3.5); null before it. */
  releasedOn: string | null;
  /** Lines the catalog cannot match yet, by the post's words, in post order (G3). */
  unmatched: UnmatchedLine[];
};

export type EarlyListRead = { kind: "release"; fileName: string } | ({ kind: "early" } & EarlyListPage);

/** The stored list and its post; apart so a test can render its SQL. */
export function earlyListRowQuery(contentfulId: string, position: number, q: Reader = db) {
  return q
    .select({
      announcementId: wizardsAnnouncements.id,
      postTitle: wizardsAnnouncements.title,
      url: wizardsAnnouncements.url,
      publishedAt: wizardsAnnouncements.publishedAt,
      title: wizardsAnnouncementDecklists.title,
      commanderCardId: wizardsAnnouncementDecklists.commanderCardId,
      commanderName: wizardsAnnouncementDecklists.commanderName,
      partnerCardId: wizardsAnnouncementDecklists.partnerCardId,
      partnerRole: wizardsAnnouncementDecklists.partnerRole,
      cardCount: wizardsAnnouncementDecklists.cardCount,
      cards: wizardsAnnouncementDecklists.cards,
    })
    .from(wizardsAnnouncementDecklists)
    .innerJoin(wizardsAnnouncements, eq(wizardsAnnouncements.id, wizardsAnnouncementDecklists.announcementId))
    .where(and(eq(wizardsAnnouncements.contentfulId, contentfulId), eq(wizardsAnnouncementDecklists.position, position)));
}

/** The Commander sets the post's commanders are printed in, inside the window around the post's day. */
export function commanderPrintingsQuery(commanderIds: string[], postDay: Date, q: Reader = db) {
  const from = utcDay(new Date(postDay.getTime() - SET_WINDOW_BEFORE_DAYS * DAY_MS));
  const to = utcDay(new Date(postDay.getTime() + SET_WINDOW_AFTER_DAYS * DAY_MS));
  return q
    .selectDistinct({ oracleId: printings.oracleId, setCode: printings.setCode, releasedAt: sets.releasedAt })
    .from(printings)
    .innerJoin(sets, eq(sets.code, printings.setCode))
    .where(and(
      inArray(printings.oracleId, commanderIds),
      eq(sets.setType, "commander"),
      eq(sets.digital, false),
      gte(sets.releasedAt, from),
      lte(sets.releasedAt, to),
    ));
}

/**
 * The release list that replaces an early one: a plain edition (not a Collector's Edition twin) in the resolved set that
 * names the same commander. `precons.set_code` is MTGJSON's, UPPERCASE; `sets.code` is lowercase. The correlated
 * subquery aliases its table and qualifies both sides (AGENTS.md).
 */
export function releasePreconQuery(setCode: string, commanderId: string, q: Reader = db) {
  return q
    .select({ fileName: precons.fileName })
    .from(precons)
    .where(and(
      sql`lower(${precons.setCode}) = ${setCode.toLowerCase()}`,
      isNull(precons.twinOf),
      sql`exists (select 1 from ${preconCards} pc where pc.file_name = ${precons}.file_name and pc.is_commander and pc.oracle_id = ${commanderId})`,
    ))
    .orderBy(precons.fileName)
    .limit(1);
}

export async function loadEarlyList(userId: string, contentfulId: string, position: number, now = new Date()): Promise<EarlyListRead | null> {
  const [list] = await earlyListRowQuery(contentfulId, position);
  if (!list) return null;

  // Every list in the post votes on its set, so one list whose commander is a reprint cannot move it.
  const siblings = await db
    .select({ commanderCardId: wizardsAnnouncementDecklists.commanderCardId })
    .from(wizardsAnnouncementDecklists)
    .where(eq(wizardsAnnouncementDecklists.announcementId, list.announcementId));
  const commanderIds = [...new Set(siblings.flatMap((s) => (s.commanderCardId ? [s.commanderCardId] : [])))];
  const candidates = commanderIds.length === 0 ? [] : (await commanderPrintingsQuery(commanderIds, list.publishedAt))
    .flatMap((r) => (r.releasedAt ? [{ oracleId: r.oracleId, setCode: r.setCode, releasedAt: r.releasedAt as string }] : []));
  const setCode = resolvePostSet(siblings.map((s) => s.commanderCardId), candidates);

  if (setCode && list.commanderCardId) {
    const [release] = await releasePreconQuery(setCode, list.commanderCardId);
    if (release) return { kind: "release", fileName: release.fileName };
  }

  const lines = list.cards;
  const ids = [...new Set(lines.flatMap((l) => (l.cardId ? [l.cardId] : [])))];
  const [factRows, ownedRows, any, setRows] = await Promise.all([
    ids.length === 0 ? [] : db
      .select({
        oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, manaCost: cards.manaCost, layout: cards.layout,
        colorIdentity: cards.colorIdentity, imageUri: cards.imageUri, legal: cards.commanderLegal,
      })
      .from(cards)
      .where(inArray(cards.oracleId, ids)),
    ids.length === 0 ? [] : db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, ids))),
    db.select({ oracleId: collectionItems.oracleId }).from(collectionItems).where(eq(collectionItems.userId, userId)).limit(1),
    setCode ? db.select({ name: sets.name, releasedAt: sets.releasedAt }).from(sets).where(eq(sets.code, setCode)) : [],
  ]);
  const facts = new Map<string, EarlyCardFacts>(factRows.map((f) => [f.oracleId, f]));
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  const set = setRows[0] ?? null;
  const releaseDate = (set?.releasedAt as string | null | undefined) ?? null;

  return {
    kind: "early",
    ...assembleEarlyList({
      contentfulId,
      position,
      list: { ...list, publishedAt: list.publishedAt.toISOString() },
      facts,
      owned,
      hasCollection: any.length > 0,
      set: setCode ? { code: setCode, name: set?.name ?? null, releaseDate } : null,
      today: utcDay(now),
    }),
  };
}

/** A basic land by its name alone (an unmatched line has no type line): the five, their Snow-Covered printings, Wastes and Snow-Covered Wastes. */
export function isBasicName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "wastes" || n === "snow-covered wastes" || BASIC_TYPES.some((t) => n === t || n === `snow-covered ${t}`);
}

/** The page's payload from what the reads returned. Pure, for a test. */
export function assembleEarlyList(input: {
  contentfulId: string;
  position: number;
  list: {
    postTitle: string;
    url: string;
    publishedAt: string;
    title: string | null;
    commanderCardId: string | null;
    commanderName: string | null;
    partnerCardId: string | null;
    partnerRole: string | null;
    cards: { name: string; count: number; cardId: string | null }[];
  };
  facts: ReadonlyMap<string, EarlyCardFacts>;
  owned: ReadonlySet<string>;
  hasCollection: boolean;
  set: { code: string; name: string | null; releaseDate: string | null } | null;
  today: string;
}): EarlyListPage {
  const { list, owned, set } = input;
  const { matched, unmatched } = splitEarlyLines(list.cards, input.facts);
  const commanderIds = new Set([list.commanderCardId, list.partnerRole === "co-commander" ? list.partnerCardId : null].filter((x): x is string => x !== null));

  const cardsOut: OpenPreconCard[] = matched.map(({ facts: f, count }) => ({
    oracleId: f.oracleId,
    name: f.name,
    typeLine: f.typeLine,
    manaCost: f.manaCost,
    layout: f.layout,
    imageUri: f.imageUri,
    quantity: count,
    foil: 0,
    isCommander: commanderIds.has(f.oracleId),
    basic: isBasicType(f.typeLine),
    owned: owned.has(f.oracleId),
    legal: f.legal,
    printing: null,
  }));
  const unmatchedCopies = unmatched.reduce((n, u) => n + u.count, 0);

  const [summary] = summarisePrecons(
    [{
      fileName: `early:${input.contentfulId}:${input.position}`,
      name: list.title ?? list.commanderName ?? list.postTitle,
      setCode: set ? set.code.toUpperCase() : "",
      releaseDate: set?.releaseDate ?? "",
      twinOf: null,
      unmappedCount: unmatchedCopies,
      cards: matched.map(({ facts: f }) => ({
        oracleId: f.oracleId, name: f.name, isCommander: commanderIds.has(f.oracleId), basic: isBasicType(f.typeLine),
        colorIdentity: f.colorIdentity, imageUri: f.imageUri,
      })),
    }],
    owned,
    [],
  );
  // An unmatched line counts toward M and never toward what the reader owns (G3), in the precon page's units: M is
  // distinct cards with the basics left out (`summarisePrecons`), so one per distinct non-basic name; `unmapped` is
  // copies, every line's count (`planPrecons`' `unmappedCount`), basics included. An unmatched basic is still listed in
  // the unmatched group, by the post's words, as every unmatched line is.
  const row = { ...summary, of: summary.of + new Set(unmatched.filter((u) => !isBasicName(u.name)).map((u) => u.name)).size };

  const releasedOn = set?.releaseDate && set.releaseDate <= input.today ? set.releaseDate : null;
  return {
    precon: {
      kind: "precon",
      row,
      setName: set?.name ?? null,
      cards: cardsOut,
      hasCollection: input.hasCollection,
      decks: [],
      addedOn: null,
      collector: null,
    },
    postUrl: list.url,
    postedAt: list.publishedAt,
    releasedOn,
    unmatched,
  };
}
