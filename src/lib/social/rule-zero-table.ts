/**
 * Rule 0's table read (plan `docs/superpowers/plans/2026-10-16-rule-zero.md` §PR 2b): what a seated player sees of
 * the table, and the one write another player's read may cause, `readOnTheSpot`.
 *
 * **The grant comes first, in one statement**: the viewer's seat at the table, the table open on the database's
 * clock, and the viewer still a member of its pod (decision 3). Only then are the seats read, each deck under its OWN
 * player's id, and all of it from one repeatable-read snapshot, so a swap landing mid-read cannot pair one seat's new
 * deck with another's old reading. A seat whose player has left the pod is omitted.
 *
 * What a seat carries is readiness gap 2's list and nothing else: the player's display name (and `publicId` only
 * when the two are friends), the deck's name and commanders, its reading reduced to what the table draws, its card
 * count and its state. No other player's deck id (decision 5): a seat is addressed by its number.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks, friendLinks, podMembers, pods, ruleZeroSeats, ruleZeroTables, socialProfiles } from "../../db/schema";
import { declarationAsk, type DeclarationAsk } from "../bracket/declaration-ask";
import { findings, type FindingId } from "../bracket/findings";
import { slotDeck } from "../bracket/slot";
import type { Bracket, RuleId } from "../bracket/types";
import { verdictSubLine, type VerdictSubLine } from "../bracket/verdict-head";
import { computeAndStoreProfile, deckLegality, readStoredReading, requestProfileDeps, seatReadingIn, type StoredProfileDeps } from "../profile/stored";
import {
  driversFor, inRead, seatState, seatValue, tableRead, tutorsReaching,
  type Drivers, type ReadSeat, type SeatState, type SeatValue, type TableRead,
} from "../rule-zero/rules";
import { resolveSwitchEnv } from "../switches/snapshot";
import { isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A deck's reading as the table draws it. Absent while the seat is not in the read (`state`). */
export type SeatReading = {
  permits: Bracket[];
  declared: Bracket | null;
  ask: DeclarationAsk;
  /** The five findings' counts, in `FINDING_ORDER`. */
  findings: { id: FindingId; count: number }[];
  subLine: VerdictSubLine;
  /** The combo that decided the boundary, by its cards' names, and how many distinct tutors reach it. */
  lean: { likely: 3 | 4; combo: string[] | null; tutors: number } | null;
  /** What ruled out the bracket below a RANGE's low end, for `driversFor`'s `[4,5]` case. */
  rangeReasons: { rule: RuleId; have: number; limit: number }[];
};

export type TableSeat = {
  seat: number;
  displayName: string;
  /** Only when the viewer and this player are friends. */
  publicId: string | null;
  you: boolean;
  /** This player owns the table's pod. */
  podOwner: boolean;
  changedAt: Date;
  /** Null while the seat waits for its player's deck. */
  deck: {
    /** The viewer's OWN deck id only (Change deck, the suggestion); null on every other seat. */
    deckId: string | null;
    name: string;
    commander: { name: string; artCropUri: string | null };
    partner: { name: string; artCropUri: string | null } | null;
    /** The whole deck, commanders in, so `87 of 100`. */
    cards: number;
    reading: SeatReading | null;
  } | null;
  state: SeatState;
  value: SeatValue | null;
  /** This seat's place in the read, when it is in it. */
  read: Omit<ReadSeat<string>, "id"> | null;
  /** What puts a flagged seat where it is. */
  drivers: Drivers | null;
};

export type TableView = {
  tableId: string;
  podName: string;
  closesAt: Date;
  setByYou: boolean;
  /** The setter's display name, or null when they no longer have a profile. */
  setBy: string | null;
  /** The viewer's own seated deck, or null while their seat waits. */
  viewerDeckId: string | null;
  /** The latest `changed_at` among the seats drawn: what `markSeen` is handed back. */
  revision: Date;
  /** The viewer's own `seen_at`, or null before their first draw: a seat changed after it carries a dot. */
  seenAt: Date | null;
  read: { kind: "notEnough"; read: number } | { kind: "read"; middle: number; band: boolean };
  seats: TableSeat[];
};

const viewerSeat = alias(ruleZeroSeats, "viewer_seat");
const viewerIn = alias(podMembers, "viewer_in");

/** The table, only through the viewer's grant: seated, open, still in the pod. Apart so a test can render its SQL. */
export function tableGrantQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select"> = db) {
  return q
    .select({ podName: pods.name, podOwner: pods.ownerUserId, closesAt: ruleZeroTables.expiresAt, setBy: ruleZeroTables.setBy, setByName: socialProfiles.displayName })
    .from(ruleZeroTables)
    .innerJoin(viewerSeat, and(eq(viewerSeat.tableId, ruleZeroTables.id), eq(viewerSeat.userId, viewerId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, ruleZeroTables.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroTables.setBy))
    .where(and(eq(ruleZeroTables.id, tableId), sql`${ruleZeroTables.expiresAt} > now()`));
}

const viewerFriend = alias(friendLinks, "viewer_friend");
const commanderOf = alias(cards, "seat_commander");
const partnerOf = alias(cards, "seat_partner");

/** The table's seats whose players are still in its pod, in seat order. Read only after the grant. */
function seatsQuery(viewerId: string, tableId: string, q: Pick<typeof db, "select">) {
  return q
    .select({
      seat: ruleZeroSeats.seat,
      userId: ruleZeroSeats.userId,
      changedAt: ruleZeroSeats.changedAt,
      displayName: socialProfiles.displayName,
      publicId: socialProfiles.publicId,
      friend: viewerFriend.friendUserId,
      deckId: decks.id,
      deckName: decks.name,
      commanderName: commanderOf.name,
      commanderArt: commanderOf.artCropUri,
      partnerName: partnerOf.name,
      partnerArt: partnerOf.artCropUri,
    })
    .from(ruleZeroSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
    .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, ruleZeroSeats.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, ruleZeroSeats.userId)))
    // The seat's deck only while it is the seat player's own: `setSeatDeck` and setup write nothing else.
    .leftJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId)))
    .leftJoin(commanderOf, eq(commanderOf.oracleId, decks.commanderOracleId))
    .leftJoin(partnerOf, eq(partnerOf.oracleId, decks.partnerOracleId))
    .where(eq(ruleZeroSeats.tableId, tableId))
    .orderBy(asc(ruleZeroSeats.seat));
}

type Verdict = ReturnType<typeof slotDeck>;

function readingOf(verdict: Verdict, profile: Parameters<typeof findings>[0], declared: Bracket | null): SeatReading {
  const combo = verdict.lean?.decidedBy ?? null;
  const below = verdict.permits[0] - 1;
  return {
    permits: [...verdict.permits],
    declared,
    ask: declarationAsk(verdict.permits, declared),
    findings: findings(profile).map((f) => ({ id: f.id, count: f.count })),
    subLine: verdictSubLine(verdict),
    lean: verdict.lean ? { likely: verdict.lean.likely, combo: combo ? combo.cards.map((c) => c.name) : null, tutors: tutorsReaching(verdict.lean, combo) } : null,
    rangeReasons: verdict.permits.length > 1
      ? verdict.violations.filter((v) => v.bracket === below).map((v) => ({ rule: v.rule, have: v.have, limit: v.limit }))
      : [],
  };
}

const asBracket = (n: number | null): Bracket | null => (n !== null && n >= 1 && n <= 5 ? (n as Bracket) : null);

/**
 * The table as the viewer sees it, or null: not found, expired, not seated, or no longer in the pod. The grant is
 * one statement; the seats and every reading follow in the same repeatable-read snapshot.
 */
export async function loadTable(viewerId: string, tableId: unknown): Promise<TableView | null> {
  if (!isUuid(tableId)) return null;
  return db.transaction(async (tx) => {
    const [table] = await tableGrantQuery(viewerId, tableId, tx);
    if (!table) return null;
    const rows = await seatsQuery(viewerId, tableId, tx);
    const [seen] = await tx.execute<{ seen_at: Date }>(sql`
      select seen_at from rule_zero_seen where table_id = ${tableId} and user_id = ${viewerId}`).then((r) => r.rows);
    const built: (TableSeat & { verdict: Verdict | null })[] = [];
    for (const r of rows) {
      const base = {
        seat: r.seat,
        displayName: r.displayName,
        publicId: r.friend !== null ? r.publicId : null,
        you: r.userId === viewerId,
        podOwner: r.userId === table.podOwner,
        changedAt: r.changedAt,
        read: null,
        drivers: null,
      };
      const stored = r.deckId === null ? null : await seatReadingIn(tx, r.deckId, r.userId);
      if (r.deckId === null || r.deckName === null || r.commanderName === null || !stored) {
        built.push({ ...base, deck: null, state: seatState(null), value: null, verdict: null });
        continue;
      }
      const { head, reading } = stored;
      const legality = deckLegality(head);
      const declared = asBracket(head.declaredBracket);
      const state = seatState({
        built: legality.built,
        size: legality.size,
        // An older reading over the same list is the rebuild `readOnTheSpot` makes, so it reads as unread here.
        reading: reading === "none" || reading === "rebuildable" ? "none" : reading === "unreadable" ? "unreadable" : { fresh: reading.fresh },
      });
      const verdict = typeof reading === "object" && inRead(state) ? slotDeck(reading.profile, declared) : null;
      built.push({
        ...base,
        deck: {
          deckId: r.userId === viewerId ? r.deckId : null,
          name: r.deckName,
          commander: { name: r.commanderName, artCropUri: r.commanderArt },
          partner: r.partnerName !== null ? { name: r.partnerName, artCropUri: r.partnerArt } : null,
          cards: legality.built + (100 - legality.size),
          reading: verdict && typeof reading === "object" ? readingOf(verdict, reading.profile, declared) : null,
        },
        state,
        value: verdict ? seatValue(verdict.permits, declared) : null,
        verdict,
      });
    }
    const read: TableRead<string> = tableRead(built.map((s) => ({ id: String(s.seat), value: s.value })));
    const placed = new Map(read.kind === "read" ? read.seats.map((s) => [s.id, s]) : []);
    const seats: TableSeat[] = built.map(({ verdict, ...s }) => {
      const at = placed.get(String(s.seat));
      if (!at) return s;
      return {
        ...s,
        read: { face: at.face, distance: at.distance, flag: at.flag },
        drivers: at.flag && verdict ? driversFor(verdict, at.flag, at.face) : null,
      };
    });
    const revision = new Date(Math.max(0, ...seats.map((s) => s.changedAt.getTime())));
    return {
      tableId,
      podName: table.podName,
      closesAt: table.closesAt,
      setByYou: table.setBy === viewerId,
      setBy: table.setByName,
      viewerDeckId: seats.find((x) => x.you)?.deck?.deckId ?? null,
      revision,
      seenAt: seen ? new Date(seen.seen_at) : null,
      read: read.kind === "read" ? { kind: "read", middle: read.middle, band: read.band } : read,
      seats,
    };
  // Repeatable read, never read-only: a read-only transaction poisons the pooled connection (cuts-read.ts).
  }, { isolationLevel: "repeatable read" });
}

export type ReadOnTheSpot = "read" | "busy" | "skipped" | "refused";

/** The poll route's deps for the owner's resolved switches; a probe passes uncached readers. */
export type OwnerDeps = (env: NodeJS.ProcessEnv) => StoredProfileDeps;

/**
 * Read a seat's deck on the spot (readiness gap 8), for a viewer seated at the same open table: only a legal deck
 * with no usable reading (no row, or the older-version row a quiet rebuild replaces), computed under its OWNER's id
 * and the owner's resolved switches and stored as theirs. Model-free: the deterministic profile build the Analysis
 * tab's free press runs. It cannot be driven to repeat: a stale or unreadable row is never recomputed, and it runs
 * under a transaction-scoped `pg_try_advisory_xact_lock` on the deck id, so a second viewer polling at the same
 * moment gets `busy` rather than computing again.
 */
export async function readOnTheSpot(
  viewerId: string,
  tableId: unknown,
  seat: unknown,
  ownerDeps: OwnerDeps = requestProfileDeps,
): Promise<ReadOnTheSpot> {
  if (!isUuid(tableId) || typeof seat !== "number" || !Number.isInteger(seat)) return "refused";
  return db.transaction(async (tx: Tx) => {
    const [table] = await tableGrantQuery(viewerId, tableId, tx);
    if (!table) return "refused";
    const [target] = await tx
      .select({ userId: ruleZeroSeats.userId, deckId: decks.id })
      .from(ruleZeroSeats)
      .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroSeats.tableId))
      .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, ruleZeroSeats.userId)))
      .innerJoin(decks, and(eq(decks.id, ruleZeroSeats.deckId), eq(decks.userId, ruleZeroSeats.userId)))
      .where(and(eq(ruleZeroSeats.tableId, tableId), eq(ruleZeroSeats.seat, seat)));
    if (!target) return "refused";
    const { rows } = await tx.execute<{ got: boolean }>(sql`
      select pg_try_advisory_xact_lock(hashtextextended(${`rule-zero-read:${target.deckId}`}, 0)) as got`);
    if (rows[0]?.got !== true) return "busy";
    // Re-read under the lock: a reading that landed while this call waited to start means there is nothing to do.
    const stored = await seatReadingIn(tx, target.deckId, target.userId);
    if (!stored || !deckLegality(stored.head).legal) return "skipped";
    if (stored.reading !== "none" && stored.reading !== "rebuildable") return "skipped";
    const deps = ownerDeps(await resolveSwitchEnv(target.userId));
    // The lock is held by this transaction while the build runs on its own connections.
    if (stored.reading === "none") {
      const result = await computeAndStoreProfile(target.deckId, target.userId, deps);
      return result?.kind === "ok" ? "read" : "skipped";
    }
    return (await readStoredReading(target.deckId, target.userId, deps)) ? "read" : "skipped";
  });
}
