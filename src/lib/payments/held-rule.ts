/**
 * The paid credits an account holds, by source: what deleting it forfeits (buying credits §7, D1/D2; plan E6). Pure,
 * so the account menu (a client component) can decide on it without importing the database.
 */
export type HeldPaid = { plan: number; pack: number };

/** Whether Manage account opens the deletion warning first: only while a paid credit is held. */
export function warnsBeforeDelete(held: HeldPaid | null): held is HeldPaid {
  return held !== null && held.plan + held.pack > 0;
}
