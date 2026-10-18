/**
 * Logging a game from a Rule 0 table (plan `docs/superpowers/plans/2026-10-16-rule-zero.md` §PR 8): the prefill the
 * deck page's Games tab opens with, and the resolution `logGame` turns a table seat into an opponent through.
 *
 * **Decision 5 holds on both halves.** The prefill carries each seat's number, display name, deck name and commander
 * art, and whether the player is the viewer's friend: no deck id, no `publicId`, no account id. What a seat stores is
 * read again at save, on the server, under the same grant, so the client only ever names a seat by its number.
 *
 * **A seat number is not an identity**: `reseatTable` renumbers every seat. The prefill therefore carries the table's
 * `seating`, a hash of who sat where, and the save refuses when the seating it reads no longer hashes to it, so a
 * reseat between the press and the save cannot repoint seat 3 at somebody else.
 */
import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks, friendLinks, podMembers, pods, ruleZeroSeats, ruleZeroTables, socialProfiles } from "../../db/schema";
// `SEAT_LABEL_MAX` is `OPPONENT_LABEL_MAX`: that module is read only by the game log's own (game-opponents.test.ts).
import { SEAT_LABEL_MAX } from "../decks/game-seats";
import { cleanName, isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One other seat as the log form draws it. Nothing in it names a deck, a player's `publicId` or an account. */
export type TablePrefillSeat = {
  seat: number;
  name: string;
  /** Null while the seat waits for its player's deck. */
  deckName: string | null;
  commanderName: string | null;
  artCropUri: string | null;
  friend: boolean;
};

export type TablePrefill = {
  /** What the save hands back: the table, and the seating the prefill was drawn from. */
  table: { id: string; seating: string };
  podName: string;
  /** Every seat the grant returns, the viewer's own included. */
  podSize: number;
  /** Every seat but the viewer's, in seat order. */
  seats: TablePrefillSeat[];
};

const viewerSeat = alias(ruleZeroSeats, "viewer_seat");
const viewerIn = alias(podMembers, "viewer_in");
const viewerFriend = alias(friendLinks, "viewer_friend");
const commanderOf = alias(cards, "seat_commander");

/**
 * The table's seats whose players are still in its pod, only through the viewer's grant, in ONE statement: the viewer's
 * seat at the table, the table open on the database's clock, the viewer still in its pod (`tableGrantQuery`'s joins).
 * One statement, as `seatTargetQuery` is, so a reseat cannot commit between the grant and the seats. Apart so a test
 * can render its SQL. Server-only: it carries the account ids the seating hashes and the deck ids a save resolves.
 */
export function tableSeatsQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select"> = db) {
  return q
    .select({
      seat: ruleZeroSeats.seat,
      userId: ruleZeroSeats.userId,
      displayName: socialProfiles.displayName,
      publicId: socialProfiles.publicId,
      friend: viewerFriend.friendUserId,
      deckId: decks.id,
      deckName: decks.name,
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
      commanderName: commanderOf.name,
      commanderArt: commanderOf.artCropUri,
      podName: pods.name,
    })
    .from(ruleZeroSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroSeats.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, ruleZeroSeats.userId)))
    // The seat's deck only while it is the seat player's own, as the table read draws it.
    .leftJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId)))
    .leftJoin(commanderOf, eq(commanderOf.oracleId, decks.commanderOracleId))
    .where(and(eq(ruleZeroSeats.tableId, tableId), sql`${ruleZeroTables.expiresAt} > now()`))
    .orderBy(asc(ruleZeroSeats.seat));
}

export type TableSeatRow = Awaited<ReturnType<typeof tableSeatsQuery>>[number];

/**
 * Who sat where, with what: the table, and each seat as everything a save stores from it (the account, the deck, the
 * deck's commander and partner, and the name a non-friend's label takes), in seat order. Hashed, so no id leaves the
 * server. A save refuses when any of it moved since the prefill (a reseat, another deck, a commander changed in place,
 * a renamed player), because the form would otherwise log a matchup it never showed.
 */
export function seatingHash(
  tableId: string,
  rows: readonly Pick<TableSeatRow, "seat" | "userId" | "deckId" | "commanderOracleId" | "partnerOracleId" | "displayName">[],
): string {
  const seats = [...rows]
    .sort((a, b) => a.seat - b.seat)
    .map((r) => JSON.stringify([r.seat, r.userId, r.deckId, r.commanderOracleId, r.partnerOracleId, r.displayName]))
    .join(",");
  return createHash("sha256").update(`${tableId}|${seats}`).digest("hex");
}

/** Pure: the prefill from the granted rows, or null when the viewer is not seated at the table with `deckId`. */
export function prefillFrom(rows: readonly TableSeatRow[], viewerId: string, tableId: string, deckId: string): TablePrefill | null {
  const mine = rows.find((r) => r.userId === viewerId);
  if (!mine || mine.deckId !== deckId) return null;
  return {
    table: { id: tableId, seating: seatingHash(tableId, rows) },
    podName: mine.podName,
    podSize: rows.length,
    seats: rows.filter((r) => r.userId !== viewerId).map((r) => ({
      seat: r.seat,
      name: r.displayName,
      deckName: r.deckId === null ? null : r.deckName,
      commanderName: r.deckId === null ? null : r.commanderName,
      artCropUri: r.deckId === null ? null : r.commanderArt,
      friend: r.friend !== null,
    })),
  };
}

/**
 * The log form's prefill for one table, read per request and never cached: null unless the id is a uuid, the grant
 * holds, and the viewer's own seat holds `deckId` (the page's deck). One light read, no grading.
 */
export async function tablePrefill(viewerId: string, tableId: unknown, deckId: string): Promise<TablePrefill | null> {
  if (!isUuid(tableId) || !isUuid(deckId)) return null;
  return prefillFrom(await tableSeatsQuery(viewerId, tableId), viewerId, tableId, deckId);
}

/** What a table seat becomes: a friend ask `resolveFriendSeatsIn` resolves, or anyone by the deck's commanders. */
export type TableSeatResolution =
  | { kind: "friend"; friend: string; deck: string | null }
  | { kind: "other"; commander: string | null; partner: string | null; label: string | null };

const cut = (s: string, max: number) => [...s].slice(0, max).join("");

/** The display name as a seat's label: the label's own cleaning, cut to its cap. */
function seatLabel(displayName: string): string | null {
  const whole = cleanName(displayName, Number.MAX_SAFE_INTEGER);
  return whole === null ? null : cleanName(cut(whole, SEAT_LABEL_MAX), SEAT_LABEL_MAX);
}

/**
 * Pure: each asked seat resolved from the granted rows, in the order asked, or null to refuse them all: the grant
 * lapsed (no rows), the seating moved since the prefill, a seat not at the table, the viewer's own, or one asked twice.
 */
export function resolveSeatsFrom(
  rows: readonly TableSeatRow[],
  viewerId: string,
  table: { id: string; seating: string },
  seats: readonly number[],
): TableSeatResolution[] | null {
  if (rows.length === 0 || seatingHash(table.id, rows) !== table.seating) return null;
  if (new Set(seats).size !== seats.length) return null;
  const out: TableSeatResolution[] = [];
  for (const seat of seats) {
    const r = rows.find((x) => x.seat === seat);
    if (!r || r.userId === viewerId) return null;
    if (r.friend !== null) {
      out.push({ kind: "friend", friend: r.publicId, deck: r.deckId });
      continue;
    }
    const label = seatLabel(r.displayName);
    const commander = r.deckId === null ? null : r.commanderOracleId;
    if (label === null && commander === null) return null;
    out.push({ kind: "other", commander, partner: r.deckId === null ? null : r.partnerOracleId, label });
  }
  return out;
}

/**
 * The table seats of one game, read inside the game's own transaction BEFORE the game row: a friend seat comes back as
 * an ask that `resolveOpponentsIn` then resolves and holds, in the lock order it documents. Null refuses the log.
 */
export async function resolveTableSeatsIn(
  tx: Tx,
  viewerId: string,
  table: { id: string; seating: string },
  seats: readonly number[],
): Promise<TableSeatResolution[] | null> {
  if (!isUuid(table.id)) return null;
  return resolveSeatsFrom(await tableSeatsQuery(viewerId, table.id, tx), viewerId, table, seats);
}
