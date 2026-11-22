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
 *
 * **A tracked game logs the seats it was played at** (ruling (b), 2026-11-20): while the viewer is in the table's stored
 * result and has not logged it, the prefill and the save both read the result's seats (`resultSeatsQuery`: the Start
 * roster's seats, accounts and decks), not the table's live ones, so a reseat mid-game does not move who the log names.
 */
import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { tableKept, tableLoggable } from "./rule-zero-open";
import { cards, decks, friendLinks, podMembers, pods, ruleZeroResultSeats, ruleZeroSeats, ruleZeroTables, socialProfiles, userPrefs } from "../../db/schema";
// `SEAT_LABEL_MAX` is `OPPONENT_LABEL_MAX`: that module is read only by the game log's own (game-opponents.test.ts).
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import { SEAT_LABEL_MAX } from "../decks/game-seats";
import { ruledSeatOwnersOf, seatDeckVisible } from "./rule-zero";
import { cleanName, isUuid } from "./rules";
import { ownedDeckArt } from "./rule-zero-art";
import { notLoggedSince, pickGameQuery, resultPlacesQuery } from "./rule-zero-result";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One other seat as the log form draws it. Nothing in it names a deck, a player's `publicId` or an account. */
export type TablePrefillSeat = {
  seat: number;
  /** The seat player's display name, another reader's. */
  name: ThirdPartyName;
  /** Null while the seat waits for its player's deck. */
  deckName: ThirdPartyName | null;
  commanderName: string | null;
  artCropUri: string | null;
  friend: boolean;
};

export type TablePrefill = {
  /** What the save hands back: the table, the seating the prefill was drawn from, and the tracked game it fills in (its id in epoch milliseconds, null with no tracked game). */
  table: { id: string; seating: string; game: number | null };
  podName: ThirdPartyName;
  /** Every seat the grant returns, the viewer's own included. */
  podSize: number;
  /** Every seat but the viewer's, in seat order. */
  seats: TablePrefillSeat[];
  /** The tracked game's result for the viewer, or null while the table has none (`resultFor`). */
  result: TablePrefillResult | null;
};

/** The viewer's own result and who beat them: `winnerSeat` is a CURRENT seat number, null for a win, a draw or a winner no longer seated. */
export type TablePrefillResult = { viewer: "win" | "loss" | "draw"; winnerSeat: number | null };

const viewerSeat = alias(ruleZeroSeats, "viewer_seat");
const viewerIn = alias(podMembers, "viewer_in");
const viewerPlayed = alias(ruleZeroResultSeats, "viewer_played");
const viewerFriend = alias(friendLinks, "viewer_friend");
const commanderOf = alias(cards, "seat_commander");

/**
 * The table's seats whose players are still in its pod, only through the viewer's grant, in ONE statement: the viewer's
 * seat at the table, the table open on the database's clock, the viewer still in its pod (`tableGrantQuery`'s joins).
 * One statement, as `seatTargetQuery` is, so a reseat cannot commit between the grant and the seats. Apart so a test
 * can render its SQL. Server-only: it carries the account ids the seating hashes and the deck ids a save resolves.
 */
export function tableSeatsQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select"> = db, ruledOwners: readonly string[] = []) {
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
    // The seat's deck only while it is the seat player's own and their deck rules let friends see it, as the table
    // read draws it (`seatDeckVisible`): a deck hidden since the pick prefills and logs as no deck.
    .leftJoin(userPrefs, eq(userPrefs.userId, ruleZeroSeats.userId))
    .leftJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId), seatDeckVisible(viewerId, ruledOwners)))
    .leftJoin(commanderOf, eq(commanderOf.oracleId, decks.commanderOracleId))
    .where(and(eq(ruleZeroSeats.tableId, tableId), tableLoggable))
    .orderBy(asc(ruleZeroSeats.seat));
}

export type TableSeatRow = Awaited<ReturnType<typeof tableSeatsQuery>>[number];

/**
 * The seats of the table's stored result, under the same grant as `tableSeatsQuery` (the viewer seated at the table
 * now, the table inside its night, the viewer and each player still in its pod), and only while the viewer played in
 * it and has not logged it since it was saved (`notLoggedSince`). Each seat draws the deck it held at Start, under the
 * same visibility rule. Same row shape as `tableSeatsQuery`, so the prefill and the save treat both alike. Server-only.
 */
export function resultSeatsQuery(viewerId: string, tableId: string, game: Date, q: Pick<typeof db, "select"> = db, ruledOwners: readonly string[] = [], includeLogged = false) {
  return q
    .select({
      seat: ruleZeroResultSeats.seat,
      userId: ruleZeroResultSeats.userId,
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
    .from(ruleZeroResultSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroResultSeats.tableId))
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerPlayed, and(eq(viewerPlayed.tableId, ruleZeroTables.id), eq(viewerPlayed.startedAt, ruleZeroResultSeats.startedAt), eq(viewerPlayed.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroResultSeats.userId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroResultSeats.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, ruleZeroResultSeats.userId)))
    .leftJoin(userPrefs, eq(userPrefs.userId, ruleZeroResultSeats.userId))
    .leftJoin(decks, and(eq(decks.id, ruleZeroResultSeats.deckId), eq(decks.userId, ruleZeroResultSeats.userId), seatDeckVisible(viewerId, ruledOwners)))
    .leftJoin(commanderOf, eq(commanderOf.oracleId, decks.commanderOracleId))
    .where(and(eq(ruleZeroResultSeats.tableId, tableId), eq(ruleZeroResultSeats.startedAt, game), tableKept, includeLogged ? undefined : notLoggedSince(tableId, viewerId)))
    .orderBy(asc(ruleZeroResultSeats.seat));
}

/**
 * The seats a log from this table names, and the result it carries, in the caller's transaction: the stored result's
 * seats while the viewer played in it and has not logged it, else the live seats with no result. The prefill and the
 * save both read through here, so the seating the prefill hashes is the seating the save checks.
 */
export async function logSeatsIn(viewerId: string, tableId: string, q: Pick<typeof db, "select">, gameMs: number | null = null): Promise<{ rows: TableSeatRow[]; placed: { userId: string; place: number }[]; gameAt: Date | null; gameMs: number | null }> {
  const ruled = await ruledSeatOwnersOf(viewerId, tableId, q);
  const [picked] = await pickGameQuery(viewerId, tableId, gameMs, q);
  const placed = picked ? await resultPlacesQuery(tableId, viewerId, picked.startedAt, q) : [];
  const played = picked && placed.some((p) => p.userId === viewerId) ? await resultSeatsQuery(viewerId, tableId, picked.startedAt, q, ruled) : [];
  if (picked && logsFromResult(viewerId, placed, played)) return { rows: played, placed, gameAt: picked.startedAt, gameMs: picked.ms };
  return { rows: await tableSeatsQuery(viewerId, tableId, q, ruled), placed: [], gameAt: null, gameMs: null };
}

/** Pure: whether the log draws the stored result's seats: the viewer is in the result and drawn in its granted rows. */
export function logsFromResult(viewerId: string, placed: readonly { userId: string }[], played: readonly { userId: string }[]): boolean {
  return placed.some((p) => p.userId === viewerId) && played.some((r) => r.userId === viewerId);
}

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

/**
 * Pure: the tracked result as the viewer logs it. First place alone wins; a tie for first is a draw for a player in
 * it. Beaten by one winner, the winner's seat is the one they played at (the rows are the result's seats), else none.
 * Null when the viewer is not in the stored result.
 */
export function resultFor(
  rows: readonly Pick<TableSeatRow, "seat" | "userId">[],
  placed: readonly { userId: string; place: number }[],
  viewerId: string,
): TablePrefillResult | null {
  const mine = placed.find((p) => p.userId === viewerId);
  if (!mine) return null;
  const first = placed.filter((p) => p.place === 1);
  if (mine.place === 1) return { viewer: first.length > 1 ? "draw" : "win", winnerSeat: null };
  const winner = first.length === 1 ? rows.find((r) => r.userId === first[0].userId) : undefined;
  return { viewer: "loss", winnerSeat: winner?.seat ?? null };
}

/** Pure: the prefill from the granted rows, or null when the viewer is not seated at the table with `deckId`. */
export function prefillFrom(
  rows: readonly TableSeatRow[],
  viewerId: string,
  tableId: string,
  deckId: string,
  placed: readonly { userId: string; place: number }[] = [],
  gameMs: number | null = null,
): TablePrefill | null {
  const mine = rows.find((r) => r.userId === viewerId);
  if (!mine || mine.deckId !== deckId) return null;
  return {
    table: { id: tableId, seating: seatingHash(tableId, rows), game: gameMs },
    podName: named(mine.podName),
    // The game's size: a result counts every player who played, a drawn seat or not (one who left the pod is not drawn).
    podSize: placed.length > 0 ? placed.length : rows.length,
    result: resultFor(rows, placed, viewerId),
    seats: rows.filter((r) => r.userId !== viewerId).map((r) => ({
      seat: r.seat,
      name: named(r.displayName),
      deckName: r.deckId === null || r.deckName === null ? null : named(r.deckName),
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
export async function tablePrefill(viewerId: string, tableId: unknown, deckId: string, gameMs: number | null = null): Promise<TablePrefill | null> {
  if (!isUuid(tableId) || !isUuid(deckId)) return null;
  // One snapshot for the owners and the seats, so a reseat between the two reads cannot draw a deck its owner's rules hide.
  const { rows, placed, gameMs: game } = await db.transaction((tx) => logSeatsIn(viewerId, tableId, tx, gameMs), { isolationLevel: "repeatable read" });
  // A named game that is not there to log (already logged, not played, past its week): no prefill, never the live seats.
  if (gameMs !== null && game === null) return null;
  const prefill = prefillFrom(rows, viewerId, tableId, deckId, placed, game);
  if (!prefill) return null;
  // Each seat's art from the copy its deck's owner holds, as the table draws it (`ownedDeckArt`), else the oracle art.
  const deckOf = new Map(rows.flatMap((r) => (r.deckId !== null ? [[r.seat, r.deckId] as const] : [])));
  const art = await ownedDeckArt(viewerId, [...deckOf.values()]);
  return {
    ...prefill,
    seats: prefill.seats.map((s) => ({ ...s, artCropUri: art.get(deckOf.get(s.seat) ?? "")?.commander ?? s.artCropUri })),
  };
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
  table: { id: string; seating: string; game?: number | null },
  seats: readonly number[],
): Promise<{ seats: TableSeatResolution[]; gameAt: Date | null } | null> {
  if (!isUuid(table.id)) return null;
  // The table row's share lock, before the seats: Undo takes it for update (`undoTableResult`), so a log from the table
  // and an Undo of its result cannot both commit. The log waits for the delete, or the delete sees the log.
  await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(eq(ruleZeroTables.id, table.id)).for("share");
  // The owners and the seats are two reads in the game's transaction: a reseat between them changes the seating, so
  // `resolveSeatsFrom` refuses the save against the prefill's hash rather than logging a deck the owner hides.
  const { rows, gameAt } = await logSeatsIn(viewerId, table.id, tx, table.game ?? null);
  const resolved = resolveSeatsFrom(rows, viewerId, table, seats);
  // A named game that is not there to log refuses the save, never a live-seat log under another game's name.
  if (resolved === null || (table.game != null && gameAt === null)) return null;
  return { seats: resolved, gameAt };
}
