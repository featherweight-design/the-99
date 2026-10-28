/**
 * The list a start writes: every card but the commanders, one row per card, because the feed can list
 * one card under two printings. ONE definition: the pre-written overview's list fingerprint
 * (`precons/overview.ts`) must be the fingerprint of exactly the deck this writes.
 */
export function preconDeckCards(lines: readonly Pick<{ oracleId: string; quantity: number; isCommander: boolean }, "oracleId" | "quantity" | "isCommander">[]): { oracleId: string; quantity: number }[] {
  const body = new Map<string, number>();
  for (const l of lines) {
    if (l.isCommander) continue;
    body.set(l.oracleId, (body.get(l.oracleId) ?? 0) + l.quantity);
  }
  return [...body].map(([oracleId, quantity]) => ({ oracleId, quantity }));
}
