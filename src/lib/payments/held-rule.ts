/**
 * The paid credits an account holds, by source: what deleting it forfeits (buying credits §7; account settings D1). Pure,
 * so the Settings delete flow (a client component) can decide on it without importing the database.
 */
export type HeldPaid = { plan: number; pack: number };

/** Whether the delete draws the paid-credits split: only while a paid credit is held. */
export function warnsBeforeDelete(held: HeldPaid | null): held is HeldPaid {
  return held !== null && held.plan + held.pack > 0;
}
