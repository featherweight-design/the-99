import { createHash } from "node:crypto";

import { cacheForUser } from "../cache/user-lists";
import { loadInDeckPartners, type ComboPartner } from "./near-miss";

/**
 * The deck row's combo marks, cached by what they are computed FROM (launch perf survey, 2026-10-18).
 *
 * `loadInDeckPartners` is one SQL statement over the Spellbook tables (~390ms on staging for a 100-card deck) and its answer depends
 * on exactly three things: the deck's cards, its commanders, and the combo index. The key names the first two itself: the deck id (so
 * two decks never share an entry) and a hash of the SORTED card ids and, apart, the sorted commander ids (a commander counts as held,
 * rule 3, so a card moving between the list and the command zone is a different question). The third is `cacheForUser`'s catalog
 * generation, already in every key: both combo publishers stamp `catalog_refreshes` (`seed.ts` after `publishVariants`, and the copy
 * harness inside the publish transaction via `publishOnTarget`), so a combo refresh retires every entry. A deck edit changes the
 * hash, so the entry that would be wrong is never asked for: nothing here can serve stale data, and the user-lists tag and one-hour
 * ceiling are a backstop only. `cacheForUser` also adds the reader and the deployment.
 *
 * NOTHING THE READER'S FRIENDS OR COLLECTION TOUCH goes into it: the statement reads the Spellbook tables and the ids it is handed.
 *
 * Stored as entries, not a `Map` (the data cache is JSON); a deck has at most one entry per card.
 */
export function inDeckPartnersKey(args: {
  deckId: string;
  deckOracleIds: readonly string[];
  commanderOracleIds: readonly string[];
}): string[] {
  const part = (ids: readonly string[]) => [...new Set(ids)].sort().join(",");
  const hash = createHash("sha256").update(part(args.deckOracleIds)).update("|").update(part(args.commanderOracleIds)).digest("hex").slice(0, 32);
  return ["in-deck-partners", args.deckId, hash];
}

export async function loadInDeckPartnersCached(args: {
  userId: string;
  deckId: string;
  deckOracleIds: readonly string[];
  commanderOracleIds: readonly string[];
}): Promise<Map<string, ComboPartner>> {
  const entries = await cacheForUser(
    args.userId,
    inDeckPartnersKey(args),
    async () => [...(await loadInDeckPartners({ deckOracleIds: args.deckOracleIds, commanderOracleIds: args.commanderOracleIds })).entries()],
  );
  return new Map(entries);
}
