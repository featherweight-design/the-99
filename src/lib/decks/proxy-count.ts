import type { DeckDetailCard } from "./grouping";

/**
 * How many CARDS this deck prints — distinct marks, never copies.
 *
 * A SET of oracle ids rather than a row count plus two booleans: a commander can
 * also be a row on its own list, and adding the two counted that one printed
 * card twice, so the deck head disagreed with its own tile about one deck. The
 * server's `proxyCounts` folds the same case for the same reason — the primary
 * key says one mark — and ruling 5 says a proxy has no quantity, so a mark on a
 * quantity-4 row is still one printed card.
 *
 * Exported so the page and its test share one derivation. Reimplemented in a
 * test, the expression stays green while the shell's own copy regresses.
 */
export function proxiedCardCount(
  cards: readonly Pick<DeckDetailCard, "oracleId" | "proxied">[],
  commander: { oracleId: string; proxied?: boolean },
  partner: { oracleId: string; proxied?: boolean } | null,
): number {
  return new Set([
    ...cards.filter((c) => c.proxied).map((c) => c.oracleId),
    ...(commander.proxied ? [commander.oracleId] : []),
    ...(partner?.proxied ? [partner.oracleId] : []),
  ]).size;
}
