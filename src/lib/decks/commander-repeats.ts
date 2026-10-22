/**
 * Whether a deck's name already says its commander (friend decks handoff, call 6): the whole name, or the part before
 * its comma (`Giada` for Giada, Font of Hope), compared after folding case and punctuation. A pair never repeats: its
 * line always names both. Pure, so the friend's tile and the friend's deck page decide it the same way.
 */
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function commanderRepeats(deckName: string, commanderName: string, partnerName: string | null): boolean {
  if (partnerName !== null) return false;
  const deck = fold(deckName);
  return deck !== "" && (deck === fold(commanderName) || deck === fold(commanderName.split(",")[0]));
}
