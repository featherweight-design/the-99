/**
 * Canary for Card Kingdom's pricelist contract. Touches no database and needs no secrets.
 *
 * `api.cardkingdom.com/api/v2/pricelist` is public and unauthenticated but undocumented, so its shape can move
 * without notice. The store ingest runs daily; this turns a silent change into a same-day alert. Mirrors
 * check-manapool-contract.ts.
 */
import { fetchCardKingdomPricelist, parseCardKingdomPricelist } from "../src/lib/stores/cardkingdom";
import { cardKingdomContractProblems } from "../src/lib/stores/cardkingdom-contract";

async function main(): Promise<void> {
  const raw = await fetchCardKingdomPricelist();
  const problems = cardKingdomContractProblems(raw);
  if (problems.length > 0) {
    console.error("Card Kingdom contract check FAILED:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  const feed = parseCardKingdomPricelist(raw);
  console.log(`Card Kingdom contract OK: ${feed.rows.length} printings as of ${feed.asOf.toISOString()} (${feed.skipped} rows skipped, ${feed.collapsed} SKUs collapsed).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
