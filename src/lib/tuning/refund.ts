/**
 * When a run that DID produce suggestions gives the credit back (Hugh, 2026-10-11).
 *
 * A run that keeps nothing already refunds (`runTuning`'s `ungrounded` failure). A run that keeps a
 * line or two used to spend the credit on an answer that is mostly the checks' leftovers: Soldiers
 * asked for 11 and kept 2, and cost a credit. The suggestions that held up are still shown; the
 * credit comes back, and the panel says so.
 *
 * Fewer than three kept, or fewer than a third of the lines the model returned. Counted on what the
 * player is SHOWN (the first five of each list), against what the model returned.
 */
export const REFUND_BELOW_KEPT = 3;
export const REFUND_BELOW_SHARE = 1 / 3;

export function refundsCredit(kept: number, asked: number): boolean {
  if (kept < REFUND_BELOW_KEPT) return true;
  return asked > 0 && kept / asked < REFUND_BELOW_SHARE;
}
