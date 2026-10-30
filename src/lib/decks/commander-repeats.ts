/**
 * Whether a deck's name already says its commander (friend decks handoff, call 6): the whole name, or the part before
 * its comma (`Giada` for Giada, Font of Hope), compared after folding case and punctuation. A two-faced commander is
 * its front face (`Esika, God of the Tree` for Esika, God of the Tree // The Prismatic Bridge). A pair never repeats: its
 * line always names both. Pure, so the friend's tile and the friend's deck page decide it the same way.
 */
import { testName, type ThirdPartyName } from "../person-name";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function commanderRepeats(deckName: string | ThirdPartyName, commanderName: string, partnerName: string | null): boolean {
  if (partnerName !== null) return false;
  const front = commanderName.split(" // ")[0];
  return testName(deckName, (name) => {
    const deck = fold(name);
    return deck !== "" && (deck === fold(front) || deck === fold(front.split(",")[0]));
  });
}
