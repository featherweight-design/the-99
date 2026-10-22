/**
 * The spare request's rules (G5, `boards/me-page-workshop-2026-10-21.md` rounds 4, 5 and 8; plan
 * `2026-10-22-spare-requests.md`). Pure: `spare-requests.ts` applies them inside its transactions and renders the same
 * boundaries into SQL through `openFloor` and `declineFloor`, so the rule and the statement cannot disagree.
 *
 * - An ask is OPEN until the holder answers or `SPARE_REQUEST_DAYS` pass (round 8, Q5). Expiry is derived from
 *   `created_at`, never swept by a job.
 * - An asker has at most ONE open ask per card, across every friend (Q6, "one friend per card"): after a No or an
 *   expiry they may ask the next holder.
 * - After a No, the same holder is not asked for that card again for `DECLINE_COOLDOWN_DAYS`; the next holder may be
 *   asked at once (Hugh, 2026-10-22). After an expiry the same holder may be asked at once (Q5, "ask again").
 * - The asker may WITHDRAW an open ask (handoff G1: ✕ on it, or Ask instead): `withdrawn` holds nothing (no open ask,
 *   no cooldown) and is never shown. ✕ on an answered or expired ask only CLEARS it from the asker's list
 *   (`asker_cleared_at`): a cleared No still holds that holder back.
 * - The asker sees an open ask as `unavailable` when the holder no longer offers the card, and as `unneeded` when the
 *   asker's own lists no longer want it (G3, derived at read, `askerState`).
 *
 * Client-safe: no imports.
 */

export const SPARE_REQUEST_DAYS = 14;
export const DECLINE_COOLDOWN_DAYS = 14;

const DAY_MS = 86_400_000;

export const STORED_STATUSES = ["open", "yes", "no", "expired", "withdrawn"] as const;
export type StoredStatus = (typeof STORED_STATUSES)[number];
/** The stored status, with an open ask past its days read as expired. */
export type RequestState = StoredStatus;

/** What the ASKER is shown of an ask they can still see (G3): never `withdrawn`. */
export const ASKER_STATES = ["open", "yes", "no", "expired", "unavailable", "unneeded"] as const;
export type AskerState = (typeof ASKER_STATES)[number];

/** The most copies one ask can name (the column's check); the friend's spare count caps it lower. */
export const MAX_COPIES = 99;

export type Answer = "yes" | "no";
export const isAnswer = (v: unknown): v is Answer => v === "yes" || v === "no";

/** An ask created AT or before this has expired. */
export const openFloor = (now: Date): Date => new Date(now.getTime() - SPARE_REQUEST_DAYS * DAY_MS);
/** A No answered AFTER this still holds the holder back. */
export const declineFloor = (now: Date): Date => new Date(now.getTime() - DECLINE_COOLDOWN_DAYS * DAY_MS);

/** When an ask stops being open, whatever its status. */
export const expiresAt = (createdAt: Date): Date => new Date(createdAt.getTime() + SPARE_REQUEST_DAYS * DAY_MS);

export function requestState(r: { status: StoredStatus; createdAt: Date }, now: Date): RequestState {
  if (r.status === "open" && r.createdAt.getTime() <= openFloor(now).getTime()) return "expired";
  return r.status;
}

export type PriorAsk = { holderUserId: string; status: StoredStatus; createdAt: Date; answeredAt: Date | null };

/** Why the asker may not ask this holder for this card now, or null. `asks` are the asker's asks for the card. */
export type AskRefusal = "asked" | "declined";

export function askRefusal(asks: readonly PriorAsk[], holderUserId: string, now: Date): AskRefusal | null {
  // A withdrawn ask holds nothing: neither the card nor a cooldown (G1).
  const held = asks.filter((a) => a.status !== "withdrawn");
  if (held.some((a) => requestState(a, now) === "open")) return "asked";
  const floor = declineFloor(now).getTime();
  if (held.some((a) => a.holderUserId === holderUserId && a.status === "no" && a.answeredAt !== null && a.answeredAt.getTime() > floor)) {
    return "declined";
  }
  return null;
}

/**
 * Whether the asker's own list still shows an ask: open; answered within `SPARE_REQUEST_DAYS` of now; or expired
 * within `SPARE_REQUEST_DAYS` of now. Anything older has said all it had to say. Every shown ask was created after
 * `shownFloor`, which the read uses to bound its rows before this decides. A withdrawn ask is never shown, nor one the
 * asker cleared (`askerClearedAt`).
 */
export function askShown(
  a: { status: StoredStatus; createdAt: Date; answeredAt: Date | null; askerClearedAt?: Date | null }, now: Date,
): boolean {
  if (a.status === "withdrawn" || (a.askerClearedAt ?? null) !== null) return false;
  const state = requestState(a, now);
  const floor = openFloor(now).getTime();
  if (state === "open") return true;
  if (state === "yes" || state === "no") return a.answeredAt !== null && a.answeredAt.getTime() > floor;
  return expiresAt(a.createdAt).getTime() > floor;
}

/** Every ask `askShown` keeps was created after this. */
export const shownFloor = (now: Date): Date => new Date(now.getTime() - 2 * SPARE_REQUEST_DAYS * DAY_MS);

/**
 * The asker's view of a shown ask (G3). An OPEN ask reads `unavailable` when the holder no longer offers the card to
 * the asker (`offered` false: kept back, under their threshold, or claimed by their decks), else `unneeded` when the
 * asker no longer wants it (`needed` false); the holder's answer, an expiry, and every other state read as stored.
 */
export function askerState(
  a: { status: Exclude<StoredStatus, "withdrawn">; createdAt: Date }, now: Date, live: { offered: boolean; needed: boolean },
): AskerState {
  const state = requestState(a, now);
  if (state !== "open") return state as Exclude<RequestState, "open" | "withdrawn">;
  if (!live.offered) return "unavailable";
  if (!live.needed) return "unneeded";
  return "open";
}

/** Whole days an open ask has left, counted up (1 on its last day); 0 once it has expired. */
export function daysLeft(createdAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt(createdAt).getTime() - now.getTime()) / DAY_MS));
}

/**
 * The copies an ask names (G2): a whole number from 1 to the friend's spare count (and `MAX_COPIES`). Anything that
 * is not a number reads as 1; a fraction is cut down. The copies are display only, so a bad value is mended, never refused.
 */
export function capCopies(v: unknown, spare: number): number {
  const top = Math.max(1, Math.min(MAX_COPIES, Math.floor(spare)));
  if (typeof v !== "number" || !Number.isFinite(v)) return 1;
  return Math.min(top, Math.max(1, Math.floor(v)));
}
