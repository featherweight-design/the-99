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
 *
 * Client-safe: no imports.
 */

export const SPARE_REQUEST_DAYS = 14;
export const DECLINE_COOLDOWN_DAYS = 14;

const DAY_MS = 86_400_000;

export const STORED_STATUSES = ["open", "yes", "no", "expired"] as const;
export type StoredStatus = (typeof STORED_STATUSES)[number];
/** What a reader is shown: the stored status, with an open ask past its days read as expired. */
export type RequestState = StoredStatus;

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
  if (asks.some((a) => requestState(a, now) === "open")) return "asked";
  const floor = declineFloor(now).getTime();
  if (asks.some((a) => a.holderUserId === holderUserId && a.status === "no" && a.answeredAt !== null && a.answeredAt.getTime() > floor)) {
    return "declined";
  }
  return null;
}

/**
 * Whether the asker's own list still shows an ask: open; answered within `SPARE_REQUEST_DAYS` of now; or expired
 * within `SPARE_REQUEST_DAYS` of now. Anything older has said all it had to say. Every shown ask was created after
 * `shownFloor`, which the read uses to bound its rows before this decides.
 */
export function askShown(a: { status: StoredStatus; createdAt: Date; answeredAt: Date | null }, now: Date): boolean {
  const state = requestState(a, now);
  const floor = openFloor(now).getTime();
  if (state === "open") return true;
  if (state === "yes" || state === "no") return a.answeredAt !== null && a.answeredAt.getTime() > floor;
  return expiresAt(a.createdAt).getTime() > floor;
}

/** Every ask `askShown` keeps was created after this. */
export const shownFloor = (now: Date): Date => new Date(now.getTime() - 2 * SPARE_REQUEST_DAYS * DAY_MS);
