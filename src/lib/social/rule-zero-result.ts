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
 * A game on the same table is stored beside the earlier ones, keyed by the roster's `started_at` (its id); a re-save
 * of the same game replaces its rows, in one transaction under the table row's lock, the lock every seat writer takes. Only the table's own purge and the account purge remove a result (`purgeRuleZeroIn`): nothing else
 * makes a played game unplayed, except Undo on the device that held the game (`undoTableResult`), and only until
 * anyone seated has logged it.
 * **What leaves the server**: nothing with an account id. The log's prefill draws the stored seats (`resultSeatsQuery`,
 * in `rule-zero-log.ts`) under the viewer's grant.
 */
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { deckGames, decks, podMembers, ruleZeroResultSeats, ruleZeroSeats, ruleZeroTables, socialProfiles } from "../../db/schema";
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import { tableKept, tableLoggable } from "./rule-zero-open";
import { openRoster, rosterSecret, sealRoster, type RosterSeat } from "./rule-zero-roster";
import { isUuid } from "./rules";
import { kickPush } from "../push/kick";
import { enqueueLogPushQuery } from "../push/log-reminder";

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
  const queued: string[] = [];
  const saved = await db.transaction(async (tx) => {
    queued.length = 0;
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
    // Only this game's rows: an earlier game at the table stays, loggable for its week (`tableKept`).
    await tx.delete(ruleZeroResultSeats).where(gameRows(tableId, startedAt));
    const stored = rows.map((r) => ({ tableId, ...r, deckId: startDeckOf(start, owned, r), startedAt }));
    await tx.insert(ruleZeroResultSeats).values(stored);
    // The log reminder's push (PR 3): every other player whose Start seat holds a deck, in this transaction (a rolled-back save sends nothing).
    // The statement queues nothing for a reader without a device, and a re-save of the same game queues nothing new.
    for (const r of stored) {
      if (r.userId === viewerId || r.deckId === null) continue;
      const { rows: made } = await tx.execute(enqueueLogPushQuery(r.userId, tableId, startedAt.getTime(), new Date()));
      if (made.length > 0) queued.push(r.userId);
    }
    return "saved";
  });
  if (saved === "saved") for (const userId of queued) kickPush(userId);
  return saved;
}

/**
 * The filter every read of a stored result for the viewer's log carries: none once the viewer has logged THIS game, so a
 * result never prefills a second log (the next game is another game, with its own id).
 */
export const notLoggedSince = (tableId: string, viewerId: string) => sql`not ${loggedSinceSave(viewerId, tableId)}`;

/**
 * A log of the stored row's game: `rule_zero_game_at` names it. Migration 0262 backfilled the column for every log made
 * from a table before it existed (one game per table then), so there is no other rule.
 */
const logsThisGame = (gameAt: SQL) => sql`${gameAt} = ${ruleZeroResultSeats}.started_at`;

/** A game from `table` by `user` that logged this row's game. Aliased and qualified, as a correlated subquery must be. */
const loggedSinceSave = (user: SQL | string, table: SQL | string) => sql`exists (
      select 1 from ${deckGames} dg
      where dg.user_id = ${user} and dg.rule_zero_table_id = ${table} and ${logsThisGame(sql`dg.rule_zero_game_at`)}
    )`;

/** A game's id in a URL and a payload: whole milliseconds since the epoch, the precision a JavaScript Date (and the tracker's roster) carries. Rounded, because `extract` is not exact in a double. */
export const gameMsOf = (col: SQL | typeof ruleZeroResultSeats.startedAt) => sql<number>`(round(extract(epoch from ${col}) * 1000))::float8`.mapWith(Number);

/** The viewer's own newest game at a table that they played and have not logged, or the one `gameMs` names. Null when none. Apart so a test can render its SQL. */
export const pickGameQuery = (viewerId: string, tableId: string, gameMs: number | null, q: Pick<typeof db, "select"> = db) =>
  q.select({ startedAt: ruleZeroResultSeats.startedAt, ms: gameMsOf(ruleZeroResultSeats.startedAt) }).from(ruleZeroResultSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroResultSeats.tableId))
    .where(and(
      eq(ruleZeroResultSeats.tableId, tableId),
      eq(ruleZeroResultSeats.userId, viewerId),
      tableKept,
      notLoggedSince(tableId, viewerId),
      gameMs === null ? undefined : eq(ruleZeroResultSeats.startedAt, new Date(gameMs)),
    ))
    .orderBy(desc(ruleZeroResultSeats.startedAt))
    .limit(1);

/** The stored placements of one game for the viewer's prefill (which applies the table's grant): account and place only. */
export const resultPlacesQuery = (tableId: string, viewerId: string, game: Date, q: Pick<typeof db, "select"> = db, includeLogged = false) =>
  q.select({ userId: ruleZeroResultSeats.userId, place: ruleZeroResultSeats.place }).from(ruleZeroResultSeats).where(and(
    gameRows(tableId, game),
    includeLogged ? undefined : notLoggedSince(tableId, viewerId),
  ));

/** Any seat player of the stored result has logged a game from this table since the save: the game this result is. */
const loggedSinceSaved = loggedSinceSave(sql`${ruleZeroResultSeats}.user_id`, sql`${ruleZeroResultSeats}.table_id`);

/** The stored rows of one game: the table's result saved from the roster issued at `startedAt`. */
const gameRows = (tableId: string, startedAt: Date) =>
  and(eq(ruleZeroResultSeats.tableId, tableId), eq(ruleZeroResultSeats.startedAt, startedAt));

/** Server-only: whether anyone seated has logged this game. Apart so a test can render its SQL. */
export const gameLoggedQuery = (tableId: string, startedAt: Date, q: Pick<typeof db, "select"> = db) =>
  q.select({ seat: ruleZeroResultSeats.seat }).from(ruleZeroResultSeats).where(and(gameRows(tableId, startedAt), loggedSinceSaved)).limit(1);

export type UndoResult = "undone" | "logged" | "refused";

/**
 * Take back the game's saved result (Undo a mistaken ending, addendum 2026-11-21). The same checks as a save: the
 * sealed roster, the table inside its night under its row lock, the viewer in the roster and still seated. It removes
 * only this game's rows (a newer game saved from another device keeps its own), and refuses as `logged` once anyone
 * seated has logged this game: someone else's log cannot be taken back. `logGame` reads a table seat under this row's
 * share lock (`resolveTableSeatsIn`), so a log and an Undo cannot both commit: the log waits for the delete, or the
 * delete sees the log. No saved rows (the save had not landed) is `undone`: there is nothing to take back.
 */
export async function undoTableResult(viewerId: string, tableId: unknown, roster: unknown, secret = rosterSecret()): Promise<UndoResult> {
  if (!isUuid(tableId) || secret === null) return "refused";
  const opened = openRoster(secret, tableId, roster);
  if (opened === null) return "refused";
  const startedAt = new Date(opened.startedAt);
  return db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: ruleZeroTables.id }).from(ruleZeroTables).where(and(eq(ruleZeroTables.id, tableId), tableLoggable)).for("update");
    if (!locked) return "refused";
    if (!maySave(opened.seats, await seatsOf(tx, tableId), viewerId)) return "refused";
    if ((await gameLoggedQuery(tableId, startedAt, tx)).length > 0) return "logged";
    await tx.delete(ruleZeroResultSeats).where(gameRows(tableId, startedAt));
    return "undone";
  });
}

/** Who logged the game first: "You" for the viewer, else that seat's player by name. Null when nobody has. */
export type GameLogged = { seat: number; at: Date } & (
  | { you: true }
  // `publicId` and `name` are null once the logger has left the pod: the game is still logged, by a player no longer named.
  | { you: false; publicId: string | null; name: ThirdPartyName | null }
);

const viewerSeat = alias(ruleZeroSeats, "viewer_seat");
const viewerIn = alias(podMembers, "viewer_in");
const loggerIn = alias(podMembers, "logger_in");

/**
 * Server-only: the first log of the game, under the viewer's grant in ONE statement: the viewer seated at the table
 * now, the table inside its night, the viewer in its pod; the logger's name only while they are in it too. Carries
 * the logger's account so the caller can say "You"; `gameLogged` drops it. Apart so a test can render its SQL.
 */
export const gameLoggerQuery = (viewerId: string, tableId: string, startedAt: Date, q: Pick<typeof db, "select"> = db) =>
  q
    .select({
      seat: ruleZeroResultSeats.seat,
      userId: ruleZeroResultSeats.userId,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      // `created_at` is a UTC wall time without a zone: read as UTC, and as epoch milliseconds, so no driver's text form
      // of a timestamp is parsed here.
      at: sql<number>`(extract(epoch from min(${deckGames.createdAt} at time zone 'UTC')) * 1000)::float8`.mapWith(Number),
    })
    .from(ruleZeroResultSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroResultSeats.tableId))
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .leftJoin(loggerIn, and(eq(loggerIn.podId, ruleZeroTables.podId), eq(loggerIn.userId, ruleZeroResultSeats.userId)))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, loggerIn.userId))
    .innerJoin(deckGames, and(
      eq(deckGames.userId, ruleZeroResultSeats.userId),
      eq(deckGames.ruleZeroTableId, ruleZeroResultSeats.tableId),
      logsThisGame(sql`${deckGames.ruleZeroGameAt}`),
    ))
    .where(and(gameRows(tableId, startedAt), tableLoggable))
    .groupBy(ruleZeroResultSeats.seat, ruleZeroResultSeats.userId, socialProfiles.publicId, socialProfiles.displayName)
    .orderBy(sql`min(${deckGames.createdAt})`, asc(ruleZeroResultSeats.seat))
    .limit(1);

/**
 * The U3 note's read: who logged this game first and when, by the server's clock, for the Result and the Last game
 * card on the device that holds the game. The roster names the game; a roster that does not open reads as nobody.
 */
export async function gameLogged(viewerId: string, tableId: unknown, roster: unknown, secret = rosterSecret()): Promise<GameLogged | null> {
  if (!isUuid(tableId) || secret === null) return null;
  const opened = openRoster(secret, tableId, roster);
  if (opened === null) return null;
  const [row] = await gameLoggerQuery(viewerId, tableId, new Date(opened.startedAt));
  if (!row) return null;
  return row.userId === viewerId
    ? { seat: row.seat, at: new Date(row.at), you: true }
    : { seat: row.seat, at: new Date(row.at), you: false, publicId: row.publicId, name: row.displayName === null ? null : named(row.displayName) };
}
