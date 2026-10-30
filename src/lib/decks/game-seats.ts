/**
 * The seats of the game log's "Across the table" row (Social R3 plan, PR 2), as the form holds them before
 * anything is saved. Pure, so every rule the row draws is one function a test can break:
 *
 * - seats are the pod minus the player (`parseOpponents` refuses more), and a smaller pod is HELD while the
 *   seats it would drop are filled (clear a seat first), so lowering the pod never silently discards one;
 * - `won` is for a loss, on one seat at most, and leaving Lost clears it BEFORE the action is called, because
 *   the server refuses a winner on anything else;
 * - a seat is ONE of three kinds, which `parseOpponents` takes as they are: anyone by a commander (and a label), a
 *   friend with a deck of theirs (name and commander are the deck's), or a friend alone or with a commander of
 *   their own (no label: the friend's name is the name), and a friend sits once;
 * - what is sent is `OpponentInput`, the shape `parseOpponents` checks again;
 * - a seat that arrived from a Rule 0 table (plan §PR 8) is sent as its NUMBER alone, and the server reads who sat
 *   there (decision 5); any edit but a winner mark turns it into an ordinary seat, which leaves the table path.
 */
import type { ThirdPartyName } from "../person-name/brand";
import type { TablePrefill } from "../social/rule-zero-log";
import type { OpponentInput } from "./game-opponents";
import type { OpponentCommanderHit } from "./opponent-commanders";

/** What a seat draws of its commander. The hit's partner reading stays on the search, never in a seat. */
export type SeatCommander = Pick<OpponentCommanderHit, "oracleId" | "name" | "imageUri">;

/** A friend at a seat: their `publicId` is what is sent, and their name is what the seat is called. */
export type SeatFriend = { publicId: string; name: string | ThirdPartyName };

export type Seat = {
  /** A client key, stable while the seat lives and meaningless after: never sent. */
  key: string;
  /** Null for a friend seated alone, who has no commander to draw. */
  commander: SeatCommander | null;
  friend: SeatFriend | null;
  /** The friend's deck, when one was picked: today's name, drawn on the seat. Its commander is `commander`. */
  deck: { id: string; name: string | ThirdPartyName } | null;
  /** Who sat there, in the player's words. Empty is none. */
  label: string;
  won: boolean;
  /** A seat as a Rule 0 table filled it, drawn from the prefill and sent by number. `mark`: not the player's friend. */
  table: SeatFromTable | null;
};

export type SeatFromTable = { seat: number; name: ThirdPartyName; deckName: ThirdPartyName | null; artCropUri: string | null; mark: boolean };

/** Matches `OPPONENT_LABEL_MAX`; restated here because that module imports the database. */
export const SEAT_LABEL_MAX = 30;

/** Seats at a table of `podSize`: everyone but the player. */
export const seatCount = (podSize: number) => podSize - 1;

/** A pod size the form must refuse to lower to, because filled seats would not fit in it. */
export const podSizeHeld = (podSize: number, filled: number) => seatCount(podSize) < filled;

/** Whether the table has room for another seat. */
export const hasRoom = (podSize: number, filled: number) => filled < seatCount(podSize);

/** What a picker press names: anyone by commander, or a friend (with a deck, or a commander of their own, or neither). */
export type SeatPick = { friend: SeatFriend | null; deck: { id: string; name: string | ThirdPartyName } | null; commander: SeatCommander | null };

/**
 * The seat a picker press fills: a new one at the end, or the named one changed in place (`won` kept). A friend
 * carries no label, and anyone keeps the one already typed on that seat.
 */
export function seatWith(seats: readonly Seat[], at: string | null, pick: SeatPick, key: string): Seat[] {
  // A picker press makes any seat an ordinary one: a seat from the table leaves the table path, label and all.
  const filled = (s: Seat): Seat => ({ ...s, ...pick, label: pick.friend ? "" : s.label, table: null });
  if (at === null) return [...seats, filled({ key, commander: null, friend: null, deck: null, label: "", won: false, table: null })];
  return seats.map((s) => (s.key === at ? filled(s) : s));
}

/** The friends already at the table, other than the seat being changed: a friend sits once. */
export const seatedFriends = (seats: readonly Seat[], except: string | null): Set<string> =>
  new Set(seats.flatMap((s) => (s.friend && s.key !== except ? [s.friend.publicId] : [])));

/** Seats a pod fills: the friends in join order that fit, and who did not. A pod of any size is clamped to the log's 2 to 8. */
export const POD_SIZE_MIN = 2;
export const POD_SIZE_MAX = 8;

export type PodFill = { podSize: number; add: SeatFriend[]; unseated: Array<string | ThirdPartyName> };

/**
 * One press of a Seat a pod chip (plan note 2). The pod's member count (the player included) is the pod size, held
 * to the log's range, and never below what the filled seats need. Its friends not already at the table are seated
 * in join order while a seat is free; the rest are named in `unseated`.
 */
export function podFill(seats: readonly Seat[], memberCount: number, friends: readonly SeatFriend[]): PodFill {
  const podSize = Math.min(POD_SIZE_MAX, Math.max(POD_SIZE_MIN, memberCount, seats.length + 1));
  const seated = seatedFriends(seats, null);
  const free = seatCount(podSize) - seats.length;
  const fresh = friends.filter((f) => !seated.has(f.publicId));
  return { podSize, add: fresh.slice(0, free), unseated: fresh.slice(free).map((f) => f.name) };
}

export const seatWithout = (seats: readonly Seat[], key: string): Seat[] => seats.filter((s) => s.key !== key);

/**
 * What a typed or pasted label may hold while it is being typed: no control or format character but the
 * zero-width joiner (composed emoji need it), the way `cleanName` refuses them. A pasted zero-width space or
 * bidi mark would otherwise pass the counter and make the server refuse the WHOLE game, result and notes
 * included. Whitespace is left alone here, so a space can be typed between two words; `cleanLabel` collapses it.
 */
const stripUnsendable = (text: string) => text.replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === "\u200D" ? c : ""));

/** The label as it is sent: the server's own cleaning (NFC, trimmed, spaces collapsed), or none when nothing is left. */
export function cleanLabel(text: string): string {
  return stripUnsendable(text).normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function seatLabelled(seats: readonly Seat[], key: string, label: string): Seat[] {
  // NFC first: composing can ADD code points (U+0958 becomes two), and the cap is the server's, counted after it.
  const typed = Array.from(stripUnsendable(label).normalize("NFC")).slice(0, SEAT_LABEL_MAX).join("");
  return seats.map((s) => (s.key === key ? { ...s, label: typed, table: null } : s));
}

/** Pressing a trophy moves the mark to that seat; pressing the winner again clears it. At most one seat holds it. */
export function seatWon(seats: readonly Seat[], key: string): Seat[] {
  const was = seats.find((s) => s.key === key)?.won ?? false;
  return seats.map((s) => ({ ...s, won: s.key === key ? !was : false }));
}

/** A result that is not Lost has no winner among them. */
export function seatsForResult(seats: readonly Seat[], result: string | null): Seat[] {
  return result === "loss" || !seats.some((s) => s.won) ? [...seats] : seats.map((s) => ({ ...s, won: false }));
}

/** The commander's short name, before the comma: `Yuriko` for `Yuriko, the Tiger's Shadow`. */
export const shortName = (name: string) => name.split(",")[0].trim();

/** The seat's own name for a screen reader and a heading: the table's name for it, the friend, else the label when there is one, else the commander. */
export const seatName = (s: Seat) => s.table?.name ?? s.friend?.name ?? (cleanLabel(s.label) || shortName(s.commander?.name ?? ""));

/**
 * The seats a table's prefill fills, in seat order: every other seat, a waiting one too. Each draws the table's name
 * and deck and carries nothing but its number to send. `key` names each seat, as a picker press does.
 */
export function prefillSeats(prefill: Pick<TablePrefill, "seats">, key: (seat: number) => string): Seat[] {
  return prefill.seats.map((t) => ({
    key: key(t.seat),
    commander: null,
    friend: null,
    deck: null,
    label: "",
    won: false,
    table: { seat: t.seat, name: t.name, deckName: t.deckName, artCropUri: t.artCropUri, mark: !t.friend },
  }));
}

/** What `logGame` is sent. A label only when typed, `won` only when set and the game was lost. */
export function opponentsFor(seats: readonly Seat[], result: string | null): OpponentInput[] {
  return seats.map((s) => {
    const won = s.won && result === "loss" ? { won: true } : {};
    // A table seat is its number: who sat there, and with what, is read on the server (decision 5).
    if (s.table) return { tableSeat: s.table.seat, ...won };
    // A friend's deck carries its own name and commanders, so none is sent beside it (`parseOpponents` refuses them).
    if (s.friend && s.deck) return { friend: s.friend.publicId, deck: s.deck.id, ...won };
    if (s.friend) return { friend: s.friend.publicId, ...(s.commander ? { commander: s.commander.oracleId } : {}), ...won };
    const label = cleanLabel(s.label);
    return { commander: s.commander?.oracleId, ...(label !== "" ? { label } : {}), ...won };
  });
}
