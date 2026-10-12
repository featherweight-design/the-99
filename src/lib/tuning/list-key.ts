import { listFingerprint } from "../profile/fingerprint";

/** A deck's LIST as `listFingerprint` keys one: copies summed per card, so the key depends on the list and
 *  never on how its rows are split. One definition for the count's History record and the trade's lock check. */
export function listKeyOf(list: {
  commanderOracleId: string;
  partnerOracleId: string | null;
  cards: readonly { oracleId: string; quantity: number }[];
}): string {
  const copies = new Map<string, number>();
  for (const c of list.cards) copies.set(c.oracleId, (copies.get(c.oracleId) ?? 0) + c.quantity);
  return listFingerprint({
    commanderOracleId: list.commanderOracleId,
    partnerOracleId: list.partnerOracleId,
    cards: [...copies].map(([oracleId, quantity]) => ({ oracleId, quantity })),
  });
}
