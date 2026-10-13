/**
 * The deck notices read (plan PR 4): what the Notices sheet lists for one deck, and whether the tag
 * on the deck is unread.
 *
 * Two sources, deliberately kept apart:
 * - DATA entries: the change log's entries that touch the deck's stored reading (`touches`, plan
 *   D5 and D8). They qualify an analysis, so a deck with no reading has none.
 * - RULES VIOLATIONS: derived live from the deck's current cards (`rulesViolations`, plan D6). They
 *   need no analysis and clear when the card leaves. A `notLegal` log entry only dates a ban, so
 *   the read lists the ban from here and never from the log.
 */
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckCards, deckDataChanges, deckProfiles, decks } from "../../db/schema";
import { chainArt } from "../cards/chain-art";
import { dataGroup, inGroupOrder, type NoticeGroup } from "./group";
import type { ChangeDirection, ChangeKind } from "./log";
import { offendingIds, rulesViolations } from "./rules-violations";
import { touches, type LoggedEntry, type ReadingMarks } from "./touches";
import { sameList } from "../profile/stored";
import { readProfileHead } from "../profile/load";

/** `imageUri`: the printing card details open (the deck's pick, else the one the reader owns, else the catalog's), filled by `loadDeckNotices`; null until then. */
export type NoticeCard = { oracleId: string; name: string; imageUri: string | null };

export type DataNotice = {
  kind: "data";
  seq: number;
  group: NoticeGroup;
  direction: ChangeDirection;
  cards: NoticeCard[];
  /** A combo's result; a rules entry's rule name and what it now reads. */
  detail: { produces?: string[]; rule?: string; reads?: string };
  publishedAt: Date;
};

export type ViolationNotice = {
  kind: "violation";
  group: "notLegal" | "outsideColors";
  card: NoticeCard;
  /** The colors outside the identity; empty for a card not legal in Commander. */
  colors: string[];
};

export type DeckNotices = {
  /** The stored reading's analysis date, or null for a deck never analyzed. */
  analyzedAt: Date | null;
  /**
   * The player has edited the deck since that reading (it is `dirty`, or its list has moved). The
   * Notices foot then sends them to the Analysis tab's banner rather than offering its own
   * Re-analyze (HANDOFF §2, plan D12). False for a deck never analyzed.
   */
  readingStale: boolean;
  groups: { group: NoticeGroup; items: (DataNotice | ViolationNotice)[] }[];
  /** Data entries, and how many are past the player's last opening. */
  dataCount: number;
  dataUnread: number;
  /** Rules violations, and whether the set differs from the one the player last saw (F11). */
  violationCount: number;
  violationsUnread: boolean;
  /** The two marks opening the sheet moves to (PR 6). */
  readMarks: { seq: number; violations: string[] };
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The offending ids of the deck's cards AS THEY STAND, read through `tx`: the set a legality mark
 * is compared against before it is written (`openNotices`). The same rule the read applies.
 */
export async function liveOffendingIds(tx: Tx, deckId: string, commanderIds: readonly string[]): Promise<string[]> {
  const rows = await tx
    .select({ oracleId: cards.oracleId, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(sql`${cards.oracleId} in (
      select ${deckCards.oracleId} from ${deckCards} where ${deckCards.deckId} = ${deckId}::uuid
      union select unnest(${`{${commanderIds.join(",")}}`}::uuid[])
    )`);
  const byId = new Map(rows.map((r) => [r.oracleId, r]));
  const commanders = commanderIds.map((id) => byId.get(id)).filter((c) => c !== undefined);
  return offendingIds(rulesViolations(rows.filter((r) => !commanderIds.includes(r.oracleId)), commanders));
}

/** The deck notices for `deckId`, or null when it is not the reader's deck. */
export async function loadDeckNotices(
  deckId: string,
  userId: string,
  /** The reader's resolved switches (`requestSwitchEnv`), for the rows' deck printing picks. */
  env: NodeJS.ProcessEnv,
): Promise<DeckNotices | null> {
  // The deck, its reading and its cards from ONE snapshot: read apart, an edit or an analysis
  // committing between them pairs a reading's marks with a list it never described.
  const snapshot = await db.transaction(async (tx) => {
    const [deck] = await tx
      .select({
        commander: decks.commanderOracleId,
        partner: decks.partnerOracleId,
        legalSeen: decks.noticesLegalSeen,
      })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    if (!deck) return null;
    const [reading] = await tx
      .select({
        seenSeq: deckProfiles.seenSeq,
        rulesVersion: deckProfiles.rulesVersion,
        analyzed: deckProfiles.analyzedOracleIds,
        readSeq: deckProfiles.noticesReadSeq,
        computedAt: deckProfiles.computedAt,
        dirty: deckProfiles.dirty,
        fingerprint: deckProfiles.fingerprint,
        profileVersion: deckProfiles.profileVersion,
      })
      .from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    const cardRows = await tx
      .select({ oracleId: deckCards.oracleId })
      .from(deckCards)
      .where(eq(deckCards.deckId, deckId));
    // The foot's freshness is the reading's own rule (fresh while the fingerprint matches and
    // `dirty` is clear), read from the same snapshot as the marks.
    const head = reading && !reading.dirty ? await readProfileHead(tx, deckId, userId) : null;
    return { deck, reading, cardRows, head };
  }, { isolationLevel: "repeatable read" });
  if (!snapshot) return null;
  const { deck, reading, cardRows, head } = snapshot;
  const commanderIds = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const currentIds = [...new Set([...commanderIds, ...cardRows.map((r) => r.oracleId)])];

  // DATA: only for a deck with a reading. An EMPTY analyzed list is a legacy row (schema note on
  // `deck_profiles`), read as the deck's current list rather than as holding nothing.
  let data: DataNotice[] = [];
  if (reading) {
    const marks: ReadingMarks = {
      seenSeq: reading.seenSeq,
      rulesVersion: reading.rulesVersion,
      analyzedOracleIds: reading.analyzed.length > 0 ? reading.analyzed : currentIds,
      commanderOracleIds: commanderIds,
    };
    data = await pendingEntries(marks);
  }

  // VIOLATIONS: live, from the current cards and the commanders' identity.
  const facts = await db
    .select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.oracleId, [...new Set([...currentIds, ...data.flatMap((d) => d.cards.map((c) => c.oracleId))])]));
  const byId = new Map(facts.map((f) => [f.oracleId, f]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const present = (ids: readonly string[]) => ids.map((id) => byId.get(id)).filter((f) => f !== undefined);
  const violations = rulesViolations(present(currentIds.filter((id) => !commanderIds.includes(id))), present(commanderIds));
  // The art each row previews: the printing card details open for it, down the same chain (the deck's pick, the
  // reader's own copy), under the catalog's art. Only for the cards a notice NAMES: the chain is the expensive
  // read, and most decks have no notice at all. Fail-soft inside `chainArt`: a failed read keeps the catalog's.
  const art = await chainArt(userId, deckId, [
    ...data.flatMap((d) => d.cards.map((c) => c.oracleId)),
    ...violations.notLegal,
    ...violations.outsideColors.map((v) => v.oracleId),
  ], env);
  const artOf = (id: string) => art.get(id) ?? byId.get(id)?.imageUri ?? null;
  // The catalog's name first; the name the entry was written with when the catalog no longer has
  // the card (a removed combo keeps `detail.names` for exactly this).
  for (const d of data) d.cards = d.cards.map((c) => ({ oracleId: c.oracleId, name: byId.get(c.oracleId)?.name ?? c.name, imageUri: artOf(c.oracleId) }));
  const violationItems: ViolationNotice[] = [
    ...violations.notLegal.map((id) => ({ kind: "violation" as const, group: "notLegal" as const, card: { oracleId: id, name: nameOf(id), imageUri: artOf(id) }, colors: [] })),
    ...violations.outsideColors.map((v) => ({ kind: "violation" as const, group: "outsideColors" as const, card: { oracleId: v.oracleId, name: nameOf(v.oracleId), imageUri: artOf(v.oracleId) }, colors: v.colors })),
  ];
  const seenViolations = offendingIds(violations);

  const readSeq = reading?.readSeq ?? 0;
  return {
    analyzedAt: reading?.computedAt ?? null,
    // `sameList`, the stored reading's own comparison: a pre-0054 row stores a different fingerprint,
    // and the Analysis tab reads it fresh over an unchanged list, so Notices must too.
    readingStale: Boolean(reading && (reading.dirty || !head || !sameList(reading, head))),
    groups: inGroupOrder<DataNotice | ViolationNotice>([...violationItems, ...data], (i) => i.group),
    dataCount: data.length,
    dataUnread: data.filter((d) => d.seq > readSeq).length,
    violationCount: violationItems.length,
    violationsUnread: seenViolations.length > 0 && !sameSet(seenViolations, deck.legalSeen ?? []),
    readMarks: { seq: Math.max(readSeq, ...data.map((d) => d.seq)), violations: seenViolations },
  };
}

/**
 * Whether the deck holds a card a legality notice stands for: not legal in Commander, or outside the
 * commanders' colors (HANDOFF §6, plan D10). Live, from the deck's current cards, by the rule the
 * sheet lists them with (`rulesViolations`). The overview's write refuses on it before any
 * reservation, and the Overview withholds a new one or warns over a saved one. Null when the deck
 * is not the reader's.
 */
export async function holdsIllegalCard(deckId: string, userId: string): Promise<boolean | null> {
  return db.transaction(async (tx) => {
    const [deck] = await tx
      .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    if (!deck) return null;
    return (await liveOffendingIds(tx, deckId, [deck.commander, ...(deck.partner ? [deck.partner] : [])])).length > 0;
  }, { isolationLevel: "repeatable read" });
}

/**
 * The log entries that touch a reading, oldest first. The SQL narrows by the reading's marks (the
 * GIN index serves `<@`); `touches` then applies the whole rule, including the commander-piece
 * clause SQL cannot see, so the read and H1's recompute share one definition.
 */
export async function pendingEntries(marks: ReadingMarks): Promise<DataNotice[]> {
  const rows = await touchingEntries(marks, { withBans: false });
  return rows.flatMap((r) => {
      const group = dataGroup(r.kind as ChangeKind);
      if (!group) return [];
      const detail = r.detail as Record<string, unknown>;
      return [{
        kind: "data" as const,
        seq: r.seq,
        group,
        direction: r.direction as ChangeDirection,
        cards: entryCards(r.oracleIds, detail),
        detail: {
          produces: Array.isArray(detail.produces) ? (detail.produces as string[]) : undefined,
          rule: typeof detail.rule === "string" ? detail.rule : undefined,
          reads: typeof detail.reads === "string" ? detail.reads : undefined,
        },
        publishedAt: r.publishedAt,
      }];
    });
}

/**
 * Whether anything the reading was built from has moved since (H1): every entry `pendingEntries`
 * lists, AND a ban. A `notLegal` entry is never LISTED (the live legality read names the card),
 * but the stored reading carries `legality.banned`, so a ban of a card it analyzed makes that
 * reading stale all the same and a press must compute it again.
 */
export async function readingMoved(marks: ReadingMarks): Promise<boolean> {
  return (await touchingEntries(marks, { withBans: true })).length > 0;
}

/**
 * Whether an entry touching these marks landed in `(after, upTo]` of the log (plan D11): the
 * overview's check, by `readingMoved`'s rule, so a ban that made the reading recompute moves the
 * overview built from the reading before it. The window bounds every branch in SQL, the rules
 * branch included.
 */
export async function movedWithin(marks: ReadingMarks, window: { after: number; upTo: number }): Promise<boolean> {
  if (window.after >= window.upTo) return false;
  return (await touchingEntries(marks, { withBans: true, window })).length > 0;
}

/** The log entries that touch a reading, by `touches`; bans only when asked. Oldest first. */
async function touchingEntries(
  marks: ReadingMarks,
  { withBans, window }: { withBans: boolean; window?: { after: number; upTo: number } },
) {
  const excluded = withBans ? sql`('rules')` : sql`('rules', 'notLegal')`;
  const bounded = window
    ? sql` and ${deckDataChanges.seq} > ${window.after} and ${deckDataChanges.seq} <= ${window.upTo}`
    : sql``;
  const rows = await db
    .select({
      seq: deckDataChanges.seq,
      kind: deckDataChanges.kind,
      direction: deckDataChanges.direction,
      oracleIds: deckDataChanges.oracleIds,
      detail: deckDataChanges.detail,
      publishedAt: deckDataChanges.publishedAt,
    })
    .from(deckDataChanges)
    .where(sql`(
      (${deckDataChanges.kind} = 'rules' and (${deckDataChanges.detail}->>'rulesVersion')::int > ${marks.rulesVersion})
      or (${deckDataChanges.kind} not in ${excluded}
          and ${deckDataChanges.seq} > ${marks.seenSeq}
          and ${deckDataChanges.oracleIds} <@ ${`{${marks.analyzedOracleIds.join(",")}}`}::uuid[])
    )${bounded}`)
    .orderBy(deckDataChanges.seq);
  return rows.filter((r) => touches(r as LoggedEntry, marks));
}

/**
 * An entry's cards with the names it was WRITTEN with: a combo entry keeps `detail.names` in piece
 * order, so a removed variant still reads by name after its rows are gone. Anything else, or a
 * name that is missing or not a string, falls back to the id until the catalog resolves it.
 */
export function entryCards(oracleIds: readonly string[], detail: Record<string, unknown>): NoticeCard[] {
  const names = Array.isArray(detail.names) ? detail.names : [];
  return oracleIds.map((id, i) => ({ oracleId: id, name: typeof names[i] === "string" ? (names[i] as string) : id, imageUri: null }));
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(b);
  return a.every((x) => s.has(x));
}
