/**
 * What the combo block counts as "in this deck".
 *
 * THE COMMANDERS COUNT AS HELD — §4.3b rule 3, which the combo reader's own parameter doc
 * states — and they are COLUMNS on `decks` rather than `deck_cards` rows. A scope built from
 * the card list alone misses them, so a partner that IS the commander is labelled
 * `you own it` with the scope line naming that very commander directly above it, and a brew
 * holding only its commander misclassifies every partner it has.
 *
 * Its own function because the deck page passes this as a prop and nothing downstream can
 * see what went into it: with the expression inline, dropping the commanders left the whole
 * suite green. This is the same shape as `comboLookupIds` — the projection a server component
 * builds inline is the projection no test can reach.
 */
export function comboScopeIds(deck: {
  cards: readonly { oracleId: string }[];
  commander: { oracleId: string };
  partner?: { oracleId: string } | null;
}): string[] {
  return [
    ...deck.cards.map((c) => c.oracleId),
    deck.commander.oracleId,
    ...(deck.partner ? [deck.partner.oracleId] : []),
  ];
}
