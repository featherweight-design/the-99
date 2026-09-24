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
import { dataGroup, inGroupOrder, type NoticeGroup } from "./group";
import type { ChangeDirection, ChangeKind } from "./log";
import { offendingIds, rulesViolations } from "./rules-violations";
import { touches, type LoggedEntry, type ReadingMarks } from "./touches";

export type NoticeCard = { oracleId: string; name: string };

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

/** The deck notices for `deckId`, or null when it is not the reader's deck. */
export async function loadDeckNotices(deckId: string, userId: string): Promise<DeckNotices | null> {
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
      })
      .from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    const cardRows = await tx
      .select({ oracleId: deckCards.oracleId })
      .from(deckCards)
      .where(eq(deckCards.deckId, deckId));
    return { deck, reading, cardRows };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (!snapshot) return null;
  const { deck, reading, cardRows } = snapshot;
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
    .select({ oracleId: cards.oracleId, name: cards.name, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.oracleId, [...new Set([...currentIds, ...data.flatMap((d) => d.cards.map((c) => c.oracleId))])]));
  const byId = new Map(facts.map((f) => [f.oracleId, f]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  // The catalog's name first; the name the entry was written with when the catalog no longer has
  // the card (a removed combo keeps `detail.names` for exactly this).
  for (const d of data) d.cards = d.cards.map((c) => ({ oracleId: c.oracleId, name: byId.get(c.oracleId)?.name ?? c.name }));

  const present = (ids: readonly string[]) => ids.map((id) => byId.get(id)).filter((f) => f !== undefined);
  const violations = rulesViolations(present(currentIds.filter((id) => !commanderIds.includes(id))), present(commanderIds));
  const violationItems: ViolationNotice[] = [
    ...violations.notLegal.map((id) => ({ kind: "violation" as const, group: "notLegal" as const, card: { oracleId: id, name: nameOf(id) }, colors: [] })),
    ...violations.outsideColors.map((v) => ({ kind: "violation" as const, group: "outsideColors" as const, card: { oracleId: v.oracleId, name: nameOf(v.oracleId) }, colors: v.colors })),
  ];
  const seenViolations = offendingIds(violations);

  const readSeq = reading?.readSeq ?? 0;
  return {
    analyzedAt: reading?.computedAt ?? null,
    groups: inGroupOrder<DataNotice | ViolationNotice>([...violationItems, ...data], (i) => i.group),
    dataCount: data.length,
    dataUnread: data.filter((d) => d.seq > readSeq).length,
    violationCount: violationItems.length,
    violationsUnread: seenViolations.length > 0 && !sameSet(seenViolations, deck.legalSeen ?? []),
    readMarks: { seq: Math.max(readSeq, ...data.map((d) => d.seq)), violations: seenViolations },
  };
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

/** The log entries that touch a reading, by `touches`; bans only when asked. Oldest first. */
async function touchingEntries(marks: ReadingMarks, { withBans }: { withBans: boolean }) {
  const excluded = withBans ? sql`('rules')` : sql`('rules', 'notLegal')`;
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
    )`)
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
  return oracleIds.map((id, i) => ({ oracleId: id, name: typeof names[i] === "string" ? (names[i] as string) : id }));
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(b);
  return a.every((x) => s.has(x));
}
