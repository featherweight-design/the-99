/**
 * A Rule 0 table's tracked result (life tracker PR1): the placements one device saves when its game ends, stored per
 * seat of the game's snapshot so every seated player's Log this game finds the winner filled in (Hugh, 2026-11-20).
 *
 * **Who may save** (ruling (b), 2026-11-20): a player in the roster the tracker started from who is STILL seated at the
 * table, on a table still inside its night (a host-closed table counts, as `tableLoggable` has it). The roster is the
 * Start seats by account, sealed (`rule-zero-roster.ts`), so a reseat, a deck change or a close mid-game does not void
 * the game: the result names the players who played it, at the seats they played, whoever sits there now.
 * **What is stored**: each Start seat's account, seat number, deck and place, and when the roster was issued, and
 * nothing the roster does not name. A roster issued before the stored result's refuses: a stale tab or a device left
 * from an earlier game on the same table cannot replace the newer game's result.
 * A game on the same table replaces the last one in one transaction under the table row's lock, the lock every seat
 * writer takes. Only the table's own purge and the account purge remove a result (`purgeRuleZeroIn`): nothing else
 * makes a played game unplayed.
 * **What leaves the server**: nothing with an account id. The log's prefill draws the stored seats (`resultSeatsQuery`,
 * in `rule-zero-log.ts`) under the viewer's grant.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, decks, ruleZeroResultSeats, ruleZeroSeats, ruleZeroTables } from "../../db/schema";
import { tableLoggable } from "./rule-zero-open";
import { openRoster, rosterSecret, sealRoster, type RosterSeat } from "./rule-zero-roster";
import { isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One seat's finish, as the tracker sends it: the seat number it holds and its place (1 wins; a tie at 1 is a draw). */
export type PlacementInput = { seat: number; place: number };

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
  tx.select({ seat: ruleZeroSeats.seat, userId: ruleZeroSeats.userId, deckId: ruleZeroSeats.deckId }).from(ruleZeroSeats).where(eq(ruleZeroSeats.tableId, tableId)).orderBy(asc(ruleZeroSeats.seat));

/**
 * The roster the tracker starts from, read per request and sealed (`sealRoster`): null unless the id is a uuid, the viewer
 * is seated at the table, the table is inside its night and the roster key is set. With it, the instant that night ends
 * (the 6 am logging stops).
 */
export async function tableRoster(viewerId: string, tableId: unknown, tx: Tx | typeof db = db, secret = rosterSecret()): Promise<{ roster: string; closesAt: Date } | null> {
  if (secret === null) console.error("tableRoster: INVITE_CODE_SECRET is unset or malformed, so no tracker roster seals and the tracker answers not found");
  if (!isUuid(tableId) || secret === null) return null;
  const rows = await seatsOf(tx, tableId);
  if (!rows.some((r) => r.userId === viewerId)) return null;
  const [live] = await tx.select({ closesAt: ruleZeroTables.expiresAt }).from(ruleZeroTables).where(and(eq(ruleZeroTables.id, tableId), tableLoggable));
  return live ? { roster: sealRoster(secret, tableId, rows), closesAt: live.closesAt } : null;
}

export type SaveResult = "saved" | "refused";

/**
 * Pure: whether this viewer may save a result for this Start roster, given who sits at the table now. The saver is in
 * the roster by account and still seated at the table (a reseat may have moved them; leaving the table ends their say).
 */
export function maySave(roster: readonly RosterSeat[], seatedNow: readonly { userId: string }[], viewerId: string): boolean {
  return roster.some((r) => r.userId === viewerId) && seatedNow.some((s) => s.userId === viewerId);
}

/** Pure: whether a roster issued at `startedAt` may replace the stored result, whose roster was issued at `last` (null: none, or saved before rosters). */
export function mayReplace(last: Date | null, startedAt: Date): boolean {
  return last === null || last.getTime() <= startedAt.getTime();
}

/** Pure: the Start deck stored for a seat, kept only while it still exists and is still that seat player's own. */
export function startDeckOf(start: readonly RosterSeat[], owned: readonly { id: string; userId: string }[], row: { userId: string; seat: number }): string | null {
  const id = start.find((s) => s.seat === row.seat)?.deckId ?? null;
  return id !== null && owned.some((d) => d.id === id && d.userId === row.userId) ? id : null;
}

/** Save the table's result. Every refusal answers the same, so the answer says nothing of which check failed. */
export async function saveTableResult(viewerId: string, tableId: unknown, roster: unknown, placements: unknown, secret = rosterSecret()): Promise<SaveResult> {
  if (!isUuid(tableId) || secret === null) return "refused";
  const opened = openRoster(secret, tableId, roster);
  if (opened === null) return "refused";
  const start = opened.seats;
  const startedAt = new Date(opened.startedAt);
  return db.transaction(async (tx) => {
    // The table row's lock, `tableLoggable`'s window: a reseat or a purge cannot commit between the seat read and the write.
    const [locked] = await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(and(eq(ruleZeroTables.id, tableId), tableLoggable)).for("update");
    if (!locked) return "refused";
    if (!maySave(start, await seatsOf(tx, tableId), viewerId)) return "refused";
    const [last] = await tx.select({ startedAt: sql<Date | null>`max(${ruleZeroResultSeats.startedAt})`.mapWith(ruleZeroResultSeats.startedAt) }).from(ruleZeroResultSeats).where(eq(ruleZeroResultSeats.tableId, tableId));
    if (!mayReplace(last?.startedAt ?? null, startedAt)) return "refused";
    // Every placement names a Start seat, so every account stored is one the roster names; anything else refuses.
    const rows = placementsFor(start, placements);
    if (rows === null) return "refused";
    // A Start deck is kept only while it still exists and is still its seat player's own (deleted or given away: no deck).
    const wanted = start.flatMap((s) => (s.deckId === null ? [] : [s.deckId]));
    // FOR SHARE: a deck delete cannot commit between this read and the insert, which would fail the deck's foreign key.
    const owned = wanted.length === 0 ? [] : await tx.select({ id: decks.id, userId: decks.userId }).from(decks).where(inArray(decks.id, wanted)).for("share");
    await tx.delete(ruleZeroResultSeats).where(eq(ruleZeroResultSeats.tableId, tableId));
    await tx.insert(ruleZeroResultSeats).values(rows.map((r) => ({ tableId, ...r, deckId: startDeckOf(start, owned, r), startedAt })));
    return "saved";
  });
}

/**
 * The filter every read of a stored result for the viewer's log carries: none once the viewer has logged a game from
 * this table since the result was saved, so a result never prefills a second log (the next game's save is newer again).
 */
export const notLoggedSince = (tableId: string, viewerId: string) => sql`not exists (
      select 1 from ${deckGames} dg
      where dg.user_id = ${viewerId} and dg.rule_zero_table_id = ${tableId}
        and (dg.created_at at time zone 'UTC') >= ${ruleZeroResultSeats}.saved_at
    )`;

/** The stored placements of one table for the viewer's prefill (which applies the table's grant): account and place only. */
export const resultPlacesQuery = (tableId: string, viewerId: string, q: Pick<typeof db, "select"> = db) =>
  q.select({ userId: ruleZeroResultSeats.userId, place: ruleZeroResultSeats.place }).from(ruleZeroResultSeats).where(and(
    eq(ruleZeroResultSeats.tableId, tableId),
    notLoggedSince(tableId, viewerId),
  ));
