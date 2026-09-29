import { readSynergyCards } from "../../app/commanders/[slug]/synergy-read";
import { cacheForUser } from "../cache/user-lists";

// "2" since the pair branch: `readSynergyCards` now answers from `commander_pair_support_cards`
// for a two-commander deck, so the payload says something different for UNCHANGED rows. The
// cache helper's own rule — a deployment that changes what a payload says for unchanged rows is
// an input to the key — and at the time, without the bump, an entry assembled by the previous
// deployment would have gone on being served for up to the hour ceiling. The deployment id in
// the key now covers that; the bump is kept as history.
const DECK_SYNERGY_KEY = ["deck-synergy", "2"];

/**
 * The ranked support list a deck's top-off list draws, CACHED, and the one read of it.
 *
 * Two readers need the same answer: the deck page, which draws the list, and the bulk controls,
 * which may only plan cards the list draws (`topOffAllowList`). The page caches this read and a
 * fresh read beside it would disagree for as long as the cached entry lives (a commander-index
 * rebuild moves the table without retiring the entry), and the plan would then pick a card the
 * list on screen has no row for. So both go through here and are served the same entry.
 *
 * With images: the page's top-off list draws the hover preview. `/commanders/[slug]` shares
 * `readSynergyCards` and draws none, so it takes the reader's default instead.
 */
export function readDeckSynergy(userId: string, commanderOracleId: string, partnerOracleId: string | null) {
  return cacheForUser(
    userId,
    [...DECK_SYNERGY_KEY, commanderOracleId, partnerOracleId ?? "-"],
    () => readSynergyCards(
      userId,
      [commanderOracleId, ...(partnerOracleId ? [partnerOracleId] : [])],
      [],
      true,
    ),
  );
}
