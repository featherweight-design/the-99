/**
 * Canary for MTGJSON's precon contract (plan `2026-10-11-commander-precons.md`, brief lock 4).
 * Touches no database and needs no secrets; runs daily in `Upstream contract checks`, ahead of the
 * catalog refresh whose precon ingest would otherwise be the first to meet a shape change.
 *
 * Fetches `DeckList.json` and the NEWEST Commander deck and asserts what the ingest relies on: the
 * index's entries and `type`, and that the deck's cards carry `scryfallId` and `scryfallOracleId`
 * and total 100. It runs the real `commanderDeckEntries` and `deriveDeck`, so a feed we can fetch
 * but not derive fails here too.
 */
import {
  commanderDeckEntries, deriveDeck, fetchDeckListIndex, MIN_PRECONS, MTGJSON_HEADERS, mtgjsonDeckUrl, PRECON_SIZE,
} from "../src/lib/precons/feed";

async function main(): Promise<void> {
  const problems: string[] = [];
  const index = await fetchDeckListIndex();
  const entries = commanderDeckEntries(index);
  if (entries.length < MIN_PRECONS) problems.push(`${entries.length} Commander Deck entries, under the ingest's floor of ${MIN_PRECONS}`);

  const newest = [...entries].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.fileName.localeCompare(b.fileName))[0];
  if (newest) {
    const res = await fetch(mtgjsonDeckUrl(newest.fileName), { headers: MTGJSON_HEADERS, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`${newest.fileName}: ${res.status} ${res.statusText}`);
    const deck = deriveDeck(newest, await res.json());
    const total = deck.cards.reduce((n, c) => n + c.count, 0);
    if (total !== PRECON_SIZE) problems.push(`${newest.fileName}: ${total} cards, not ${PRECON_SIZE}`);
    if (!deck.cards.some((c) => c.commander)) problems.push(`${newest.fileName}: no commander entry`);
    const noOracle = deck.cards.filter((c) => c.oracleId === null).length;
    const noPrinting = deck.cards.filter((c) => c.scryfallId === null).length;
    if (noOracle > 0) problems.push(`${newest.fileName}: ${noOracle} card entries lack identifiers.scryfallOracleId`);
    if (noPrinting > 0) problems.push(`${newest.fileName}: ${noPrinting} card entries lack identifiers.scryfallId`);
    console.log(`newest: ${newest.name} (${newest.code}, ${newest.releaseDate}), ${total} cards in ${deck.cards.length} entries`);
  }
  console.log(`${entries.length} Commander Deck entries`);

  if (problems.length > 0) {
    console.error(`MTGJSON contract broken:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log("MTGJSON contract holds.");
}

main().catch((err) => { console.error(err); process.exit(1); });
