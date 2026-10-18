// The manual grant's limits and input check (admin plan A-R5), pure so the admin form can share them with the
// server's write (`gift.ts`, which reads Clerk and the database and must never reach a client bundle).

export const GIFT_UNITS_MIN = 1;
export const GIFT_UNITS_MAX = 500;
export const GIFT_NOTE_MAX = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GiftInput = { accountId?: unknown; units?: unknown; note?: unknown; actionId?: unknown };
export type GiftRefusal = "account" | "units" | "note" | "action" | "unknown" | "deleted" | "failed";
export type GiftResult = { ok: true; id: string; repeated: boolean } | { ok: false; error: GiftRefusal };

/** Checked before anything is read: a refusal reads nothing and writes nothing. Pure. */
export function validateGift(input: GiftInput):
  | { ok: true; gift: { accountId: string; units: number; note: string; actionId: string } }
  | { ok: false; error: "account" | "units" | "note" | "action" } {
  const { accountId, units, actionId } = input;
  if (typeof accountId !== "string" || accountId.trim() === "" || accountId.length > 200) return { ok: false, error: "account" };
  if (typeof units !== "number" || !Number.isInteger(units) || units < GIFT_UNITS_MIN || units > GIFT_UNITS_MAX) return { ok: false, error: "units" };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note === "" || note.length > GIFT_NOTE_MAX) return { ok: false, error: "note" };
  if (typeof actionId !== "string" || !UUID.test(actionId)) return { ok: false, error: "action" };
  return { ok: true, gift: { accountId: accountId.trim(), units, note, actionId: actionId.toLowerCase() } };
}
