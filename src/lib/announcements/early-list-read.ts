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
import { and, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { catalogFirstSeen, cards, collectionItems, preconCards, precons, printings, sets, wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { isBasicType } from "../decks/basic-type";
import { summarisePrecons } from "../precons/list";
import { BASIC_TYPES } from "../swaps/land";
import type { OpenPrecon, OpenPreconCard } from "../precons/open-read";
import { drawnInAnnounced, utcDay } from "../precons/upcoming";
import { postListTargets, resolvePostSet, splitEarlyLines, type EarlyCardFacts, type PostListRow, type UnmatchedLine } from "./early-list";

/** Every card a precon lists, by oracle id: the overlap half of a release list's evidence. Aliased and qualified (AGENTS.md). */
export const preconCardIds = sql<string[]>`coalesce((select array_agg(pe.oracle_id::text) from ${preconCards} pe where pe.file_name = ${precons}.file_name), '{}')`;

type Reader = Pick<typeof db, "select" | "selectDistinct">;

const DAY_MS = 86_400_000;
/** A Commander set counts for a post released from this many days before the post's day... */
const SET_WINDOW_BEFORE_DAYS = 60;
/** ...to this many after it (a decklists post goes up two to four weeks before the street date). */
export const SET_WINDOW_AFTER_DAYS = 180;

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
  /**
   * The head's commanders the catalog cannot match yet, by their placeholder ids in `row.commanders`: named from the
   * stored `commander_name` / `partner_name`, with no art and no known color identity.
   */
  unknownCommanders: string[];
};

export type EarlyListRead = { kind: "release"; fileName: string } | ({ kind: "early" } & EarlyListPage);

/**
 * The stored list and its post; apart so a test can render its SQL. Only a Commander decklists post's lists that
 * declare a commander: the ingest stores every parsed list (Welcome Decks, Starter Kits), and a list that does not
 * total 100 stores no commander. Keyed on the stored name, not the card id, so a commander the catalog cannot match yet
 * still opens.
 */
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
      partnerName: wizardsAnnouncementDecklists.partnerName,
      partnerRole: wizardsAnnouncementDecklists.partnerRole,
      cardCount: wizardsAnnouncementDecklists.cardCount,
      cards: wizardsAnnouncementDecklists.cards,
    })
    .from(wizardsAnnouncementDecklists)
    .innerJoin(wizardsAnnouncements, eq(wizardsAnnouncements.id, wizardsAnnouncementDecklists.announcementId))
    .where(and(
      eq(wizardsAnnouncements.contentfulId, contentfulId),
      eq(wizardsAnnouncementDecklists.position, position),
      eq(wizardsAnnouncements.kind, "commander-decklists"),
      isNotNull(wizardsAnnouncementDecklists.commanderName),
    ));
}

/**
 * The sets the post's commanders are printed in, inside the window around the post's day: Commander sets (the Announced
 * group's source), and any set that holds precons, since a precon's set need not be a `commander` one (Commander
 * Masters' boxes are CMM, a `masters` set). `precons.set_code` is UPPERCASE; the subquery aliases and qualifies.
 */
export function commanderPrintingsQuery(commanderIds: string[], postDay: Date, q: Reader = db) {
  const from = utcDay(new Date(postDay.getTime() - SET_WINDOW_BEFORE_DAYS * DAY_MS));
  const to = utcDay(new Date(postDay.getTime() + SET_WINDOW_AFTER_DAYS * DAY_MS));
  return q
    .selectDistinct({ oracleId: printings.oracleId, setCode: printings.setCode, releasedAt: sets.releasedAt })
    .from(printings)
    .innerJoin(sets, eq(sets.code, printings.setCode))
    .where(and(
      inArray(printings.oracleId, commanderIds),
      or(eq(sets.setType, "commander"), sql`exists (select 1 from ${precons} p where lower(p.set_code) = ${sets}.code)`),
      eq(sets.digital, false),
      gte(sets.releasedAt, from),
      lte(sets.releasedAt, to),
    ));
}

/**
 * Every plain-edition precon (not a Collector's Edition twin) that names this commander, in any set, with when the
 * catalog first showed it (`catalog_first_seen`, kind `precon`, as the arrivals read takes it), and its name and cards for
 * the list evidence `pickReleasePrecon` weighs; apart so a test can render its SQL. The correlated subqueries alias their
 * table and qualify both sides (AGENTS.md).
 */
export function releaseCandidatesQuery(commanderId: string, q: Reader = db) {
  return q
    .select({
      fileName: precons.fileName,
      setCode: precons.setCode,
      firstSeenAt: catalogFirstSeen.firstSeenAt,
      baseline: catalogFirstSeen.baseline,
      name: precons.name,
      cardIds: preconCardIds,
    })
    .from(precons)
    .leftJoin(catalogFirstSeen, and(eq(catalogFirstSeen.kind, "precon"), eq(catalogFirstSeen.key, precons.fileName)))
    .where(and(
      isNull(precons.twinOf),
      sql`exists (select 1 from ${preconCards} pc where pc.file_name = ${precons}.file_name and pc.is_commander and pc.oracle_id = ${commanderId})`,
    ));
}

/**
 * Home's See the lists, for every Commander decklists post on the page at once (Announcements UI 6b; never one read per
 * row): each stored list of each post, whether it declares a commander, and the sets its commander is printed in by
 * `commanderPrintingsQuery`'s rule (a Commander set or one holding precons, not digital, inside the post's window), each
 * with whether `precons` holds it. `postListTargets` turns the rows into addresses. Raw SQL: every table is aliased and
 * every column qualified (AGENTS.md), and the window is the post's UTC day less 60 and plus 180 days.
 */
export function postListRowsQuery(contentfulIds: readonly string[]) {
  return sql`select pwa.contentful_id as contentful_id, pwd.commander_card_id as commander_id,
      (pwd.commander_name is not null) as named,
      coalesce((select jsonb_agg(distinct jsonb_build_object(
          'code', pss.code, 'setType', pss.set_type, 'releasedAt', pss.released_at,
          'hasPrecons', exists (select 1 from ${precons} psp where lower(psp.set_code) = pss.code)))
        from ${printings} psr
        join ${sets} pss on pss.code = psr.set_code
        where psr.oracle_id = pwd.commander_card_id
          and pss.digital = false
          and (pss.set_type = 'commander' or exists (select 1 from ${precons} psq where lower(psq.set_code) = pss.code))
          and pss.released_at >= (pwa.published_at at time zone 'UTC')::date - ${SET_WINDOW_BEFORE_DAYS}::int
          and pss.released_at <= (pwa.published_at at time zone 'UTC')::date + ${SET_WINDOW_AFTER_DAYS}::int), '[]'::jsonb) as sets
    from ${wizardsAnnouncements} pwa
    join ${wizardsAnnouncementDecklists} pwd on pwd.announcement_id = pwa.id
    where pwa.kind = 'commander-decklists' and pwa.contentful_id = any(${sql.param([...contentfulIds])}::text[])`;
}

type PostListSqlRow = { contentful_id: string; commander_id: string | null; named: boolean; sets: unknown };

/** The rows of `postListRowsQuery`, read defensively (`sets` is jsonb). Pure, for a test. */
export function toPostListRows(rows: readonly PostListSqlRow[]): PostListRow[] {
  return rows.map((r) => ({
    contentfulId: r.contentful_id,
    commanderId: r.commander_id,
    named: r.named === true,
    sets: (Array.isArray(r.sets) ? r.sets : []).flatMap((x: unknown) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return typeof o.code === "string" && typeof o.setType === "string" && typeof o.releasedAt === "string"
        ? [{ code: o.code, setType: o.setType, releasedAt: o.releasedAt, hasPrecons: o.hasPrecons === true }]
        : [];
    }),
  }));
}

/** Every listed post's See the lists address by Contentful id, in one read; none asked, no read. */
export async function loadPostListTargets(contentfulIds: readonly string[], now: Date, q: Pick<typeof db, "execute"> = db): Promise<Map<string, string>> {
  if (contentfulIds.length === 0) return new Map();
  const { rows } = await q.execute<PostListSqlRow>(postListRowsQuery(contentfulIds));
  return postListTargets(toPostListRows(rows as PostListSqlRow[]), utcDay(now), (set) => drawnInAnnounced(set, now));
}

/** How long before the post a precon may first show in the catalog and still be its release list (clock and ingest skew). */
export const RELEASE_SLACK_DAYS = 3;

export type ReleaseCandidate = {
  fileName: string; setCode: string; firstSeenAt: Date | null; baseline: boolean | null;
  /** The precon's name and every card it lists: the list evidence a candidate must carry. */
  name: string; cardIds: readonly string[];
};

/**
 * What an early list says of itself: its title, its commanders, and the cards the catalog matched (a line it cannot match
 * yet is null). The commanders matter only to be left out of the overlap: every candidate names the commander already.
 */
export type ListEvidence = {
  title: string | null; commanderCardId: string | null; partnerCardId: string | null;
  cards: readonly { name: string; cardId: string | null }[];
};

/** A release list shares at least this much of the early list's matched cards (production 2026-10-30: every true release 0.94 to 1). */
export const RELEASE_OVERLAP = 0.8;

/** A list or precon name, folded for comparison: the Secret Lair and "Commander Deck" wrapping, case and punctuation dropped. */
export function foldDeckName(name: string): string {
  return name.toLowerCase()
    .replace(/^secret lair commander deck:/, "")
    .replace(/commander deck$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** How a candidate's list evidence reads: whether the names agree, and the share of the list's own matched cards it lists. */
function evidenceOf(c: ReleaseCandidate, list: ListEvidence): { named: boolean; overlap: number } {
  // Overlap is over the list's OWN cards: not its commanders, which every candidate lists by construction, and not the
  // basics, which every deck holds. Otherwise a list the catalog has matched little of clears the bar on those alone.
  const own = new Set([list.commanderCardId, list.partnerCardId].filter((x): x is string => x !== null));
  const ids = new Set(list.cards.flatMap((l) => (l.cardId && !own.has(l.cardId) && !isBasicName(l.name) ? [l.cardId] : [])));
  const listed = new Set(c.cardIds);
  let hits = 0;
  for (const id of ids) if (listed.has(id)) hits++;
  const title = list.title ? foldDeckName(list.title) : "";
  return { named: title !== "" && title === foldDeckName(c.name), overlap: ids.size === 0 ? 0 : hits / ids.size };
}

/**
 * The release list that replaces an early one, among the precons naming its commander (STATES 3.4) that carry the list's
 * evidence: the same deck name, or at least `RELEASE_OVERLAP` of the list's own matched cards (commanders and basics out). A commander and a stamp alone
 * are not enough, so another product sharing the commander (a staple-heavy deck elsewhere) never takes the address, and a
 * name alone carries a list the catalog cannot card-match yet. Among those, in this order:
 *
 * 1. a precon in the set the post's lists resolve to (`resolvePostSet`), unless the catalog stamped it before the post's
 *    day (less `RELEASE_SLACK_DAYS`): the resolved set is the strongest evidence, so a later product elsewhere sharing the
 *    commander cannot take over the address;
 * 2. failing that, a precon in ANY set the catalog first showed on or after that day, so a new deck in a long-running set
 *    (Secret Lair) whose release date falls outside the post's window still matches.
 *
 * Within either, a name match first, then the larger overlap, then the earliest stamp (an unstamped or `baseline` one
 * after), then by file name.
 *
 * A precon stamped before the post is never the release list. Pure, for a test.
 */
export function pickReleasePrecon(
  candidates: readonly ReleaseCandidate[], postedAt: Date, setCode: string | null, list: ListEvidence,
): string | null {
  const floor = postedAt.getTime() - RELEASE_SLACK_DAYS * DAY_MS;
  const evidence = new Map(candidates.map((c) => [c, evidenceOf(c, list)]));
  const evidenced = (c: ReleaseCandidate) => evidence.get(c)!.named || evidence.get(c)!.overlap >= RELEASE_OVERLAP;
  const byName = (a: ReleaseCandidate, b: ReleaseCandidate) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0);
  const usable = (c: ReleaseCandidate) => c.firstSeenAt !== null && c.baseline === false;
  const stampOf = (c: ReleaseCandidate) => (usable(c) ? c.firstSeenAt!.getTime() : Number.POSITIVE_INFINITY);
  const notBefore = candidates.filter((c) => evidenced(c) && (!usable(c) || c.firstSeenAt!.getTime() >= floor));
  const order = (a: ReleaseCandidate, b: ReleaseCandidate) => {
    const ea = evidence.get(a)!, eb = evidence.get(b)!;
    return Number(eb.named) - Number(ea.named) || eb.overlap - ea.overlap || stampOf(a) - stampOf(b) || byName(a, b);
  };
  if (setCode) {
    const inSet = notBefore.filter((c) => c.setCode.toLowerCase() === setCode.toLowerCase()).sort(order);
    if (inSet[0]) return inSet[0].fileName;
  }
  const elsewhere = notBefore.filter(usable).sort(order);
  return elsewhere[0]?.fileName ?? null;
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

  if (list.commanderCardId) {
    const release = pickReleasePrecon(await releaseCandidatesQuery(list.commanderCardId), list.publishedAt, setCode, list);
    if (release) return { kind: "release", fileName: release };
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

/** A list's partner is a commander of it only as a co-commander; an alternate commander stays one of its cards. */
export function isCoCommanderPartner(list: { partnerRole: string | null }): boolean {
  return list.partnerRole === "co-commander";
}

/** An early list's commanders by card id: its commander and its co-commander, never an alternate (`isCoCommanderPartner`). */
export function earlyListCommanderIds(list: { commanderCardId: string | null; partnerCardId: string | null; partnerRole: string | null }): string[] {
  return [list.commanderCardId, isCoCommanderPartner(list) ? list.partnerCardId : null].filter((x): x is string => x !== null);
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
    partnerName: string | null;
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
  const commanderIds = new Set(earlyListCommanderIds(list));

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
  // The head names every commander the post names: one the catalog cannot match yet keeps its stored name, with no art
  // and an unknown identity (`unknownCommanders`), so the head never loses it or calls it colorless.
  const stated = [
    { id: list.commanderCardId, name: list.commanderName },
    ...(isCoCommanderPartner(list) ? [{ id: list.partnerCardId, name: list.partnerName }] : []),
  ];
  const unknownCommanders: string[] = [];
  const named = stated.flatMap((s) => {
    const found = s.id ? summary.commanders.find((c) => c.oracleId === s.id) : undefined;
    if (found) return [found];
    if (!s.name) return [];
    const oracleId = `unmatched:${s.name}`;
    unknownCommanders.push(oracleId);
    return [{ oracleId, name: s.name, imageUri: null, colorIdentity: [] as string[] }];
  });
  const commanders = [...named, ...summary.commanders.filter((c) => !named.includes(c))];
  const row = { ...summary, commanders, of: summary.of + new Set(unmatched.filter((u) => !isBasicName(u.name)).map((u) => u.name)).size };

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
    unknownCommanders,
  };
}
