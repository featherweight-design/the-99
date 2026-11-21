/**
 * A Rule 0 table's tracked result (life tracker PR1): the placements one device saves when its game ends, stored per
 * seat of the game's snapshot so every seated player's Log this game finds the winner filled in (Hugh, 2026-11-20).
 *
 * **Who may save**: a player seated at the table, on a table still inside its night (a host-closed table counts, as
 * `tableLoggable` has it), with the roster the tracker started from. The roster is a hash of who sat where, not of
 * what they play, so a deck swap does not void a game but a reseat does: seat numbers would then name other players.
 * **What is stored**: the account and seat of each snapshot seat and its place. A game on the same table replaces
 * the last one in one transaction under the table row's lock, the lock every seat writer takes.
 * **What leaves the server**: nothing with an account id. The prefill maps a result onto the viewer's win, loss or draw
 * and the winner's CURRENT seat number (`resultFor`, in `rule-zero-log.ts`).
 */
import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, ruleZeroResultSeats, ruleZeroSeats, ruleZeroTables } from "../../db/schema";
import { tableLoggable } from "./rule-zero-open";
import { isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One seat's finish, as the tracker sends it: the seat number it holds and its place (1 wins; a tie at 1 is a draw). */
export type PlacementInput = { seat: number; place: number };

/** Who sat where: the table, then each seat's number and account, in seat order. Hashed, so no id leaves the server. */
export function rosterHash(tableId: string, rows: readonly { seat: number; userId: string }[]): string {
  const seats = [...rows].sort((a, b) => a.seat - b.seat).map((r) => JSON.stringify([r.seat, r.userId])).join(",");
  return createHash("sha256").update(`${tableId}|${seats}`).digest("hex");
}

/**
 * Pure: the placements as stored rows, or null when they are not a result of exactly these seats: every seat once,
 * a whole-number place from 1 to the seat count, and somebody in first.
 */
export function placementsFor(
  seats: readonly { seat: number; userId: string }[],
  placements: unknown,
): { userId: string; seat: number; place: number }[] | null {
  if (!Array.isArray(placements) || placements.length !== seats.length) return null;
  const out: { userId: string; seat: number; place: number }[] = [];
  for (const raw of placements) {
    if (typeof raw !== "object" || raw === null) return null;
    const { seat, place } = raw as Record<string, unknown>;
    const at = seats.find((s) => s.seat === seat);
    if (!at || out.some((o) => o.seat === at.seat)) return null;
    if (typeof place !== "number" || !Number.isInteger(place) || place < 1 || place > seats.length) return null;
    out.push({ userId: at.userId, seat: at.seat, place });
  }
  return out.some((o) => o.place === 1) ? out : null;
}

const seatsOf = (tx: Pick<typeof db, "select">, tableId: string) =>
  tx.select({ seat: ruleZeroSeats.seat, userId: ruleZeroSeats.userId }).from(ruleZeroSeats).where(eq(ruleZeroSeats.tableId, tableId)).orderBy(asc(ruleZeroSeats.seat));

/**
 * The roster the tracker starts from, read per request: null unless the id is a uuid, the viewer is seated at the
 * table and the table is inside its night. With it, the instant that night ends (the 6 am logging stops).
 */
export async function tableRoster(viewerId: string, tableId: unknown, tx: Tx | typeof db = db): Promise<{ roster: string; closesAt: Date } | null> {
  if (!isUuid(tableId)) return null;
  const rows = await seatsOf(tx, tableId);
  if (!rows.some((r) => r.userId === viewerId)) return null;
  const [live] = await tx.select({ closesAt: ruleZeroTables.expiresAt }).from(ruleZeroTables).where(and(eq(ruleZeroTables.id, tableId), tableLoggable));
  return live ? { roster: rosterHash(tableId, rows), closesAt: live.closesAt } : null;
}

export type SaveResult = "saved" | "refused";

/** Save the table's result. Every refusal answers the same, so the answer says nothing of which check failed. */
export async function saveTableResult(viewerId: string, tableId: unknown, roster: unknown, placements: unknown): Promise<SaveResult> {
  if (!isUuid(tableId) || typeof roster !== "string") return "refused";
  return db.transaction(async (tx) => {
    // The table row's lock, `tableLoggable`'s window: a reseat or a purge cannot commit between the roster and the write.
    const [locked] = await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(and(eq(ruleZeroTables.id, tableId), tableLoggable)).for("update");
    if (!locked) return "refused";
    const seats = await seatsOf(tx, tableId);
    if (!seats.some((s) => s.userId === viewerId) || rosterHash(tableId, seats) !== roster) return "refused";
    const rows = placementsFor(seats, placements);
    if (rows === null) return "refused";
    await tx.delete(ruleZeroResultSeats).where(eq(ruleZeroResultSeats.tableId, tableId));
    await tx.insert(ruleZeroResultSeats).values(rows.map((r) => ({ tableId, ...r })));
    return "saved";
  });
}

/**
 * The stored placements of one table for the viewer's prefill (which applies the table's grant): account and place only,
 * and none once the viewer has logged a game from this table since the result was saved, so a result never prefills
 * a second log (the next game's save replaces it and is newer again).
 */
export const resultPlacesQuery = (tableId: string, viewerId: string, q: Pick<typeof db, "select"> = db) =>
  q.select({ userId: ruleZeroResultSeats.userId, place: ruleZeroResultSeats.place }).from(ruleZeroResultSeats).where(and(
    eq(ruleZeroResultSeats.tableId, tableId),
    sql`not exists (
      select 1 from ${deckGames} dg
      where dg.user_id = ${viewerId} and dg.rule_zero_table_id = ${tableId}
        and (dg.created_at at time zone 'UTC') >= ${ruleZeroResultSeats}.saved_at
    )`,
  ));

/**
 * After a reseat: the stored result stays only when the same players still sit at the same numbers. A different roster
 * (someone added, removed or moved) would have the result name other players, so it goes.
 */
export async function dropResultIfRosterChanged(tx: Tx, tableId: string): Promise<void> {
  await tx.delete(ruleZeroResultSeats).where(and(
    eq(ruleZeroResultSeats.tableId, tableId),
    sql`(select count(*) from ${ruleZeroResultSeats} r where r.table_id = ${tableId})
        <> (select count(*) from ${ruleZeroSeats} s where s.table_id = ${tableId})
      or exists (select 1 from ${ruleZeroResultSeats} r where r.table_id = ${tableId}
        and not exists (select 1 from ${ruleZeroSeats} s where s.table_id = ${tableId} and s.user_id = r.user_id and s.seat = r.seat))`,
  ));
}
