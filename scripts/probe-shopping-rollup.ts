// Gate for the shopping roll-up (`src/lib/decks/shopping-rollup.ts`), hand-run
// like its siblings and not part of `pnpm test`.
//
// `sumShopping` is pure and unit-tested. `loadShoppingRollup` is a query, and
// the repo's untested-query pattern leaves those to the type checker and a real
// database — so this runs it against the dev data and checks the three things a
// type cannot:
//
//   1. A deck whose cards are all owned is ABSENT from byDeck, not present at
//      zero. Home has to tell "nothing to buy" apart from "no deck".
//   2. total.copies never EXCEEDS the sum of every tile's toBuyCount. It is
//      allowed to fall short: the roll-up excludes basics, as every Shopping
//      surface does, while toBuyCount is `built − coveredCount` and does not, so
//      an unowned Forest is the whole of any gap. Exceeding would mean the
//      roll-up counted a copy the deck does not want.
//
//      `coveredCount`, not `ownedCount`, since proxies: a printed card is one
//      the player has acquired, so it is not in the gap. The roll-up agrees —
//      `list_claims` anti-joins the proxy table — so the inequality still holds
//      and for the same reason it always did.
//   3. An unpriced copy still counts as a copy. pricedCopies <= copies, and a
//      deck holding a card the feed has never stocked has the gap.
//
//   pnpm tsx scripts/probe-shopping-rollup.ts
import "./lib/env.mjs";
import { desc } from "drizzle-orm";
import { db } from "../src/db";
import { decks } from "../src/db/schema";
import { listDecksWithStats } from "../src/lib/decks/read";
import { loadShoppingRollup } from "../src/lib/decks/shopping-rollup";

async function main() {
  const owners = await db
    .select({ userId: decks.userId })
    .from(decks)
    .orderBy(desc(decks.createdAt))
    .limit(50);
  const userIds = [...new Set(owners.map((o) => o.userId))];

  if (userIds.length === 0) {
    console.log("no decks in this database — cannot probe");
    return;
  }

  for (const userId of userIds) {
    const rollup = await loadShoppingRollup(userId, undefined, process.env);
    const tiles = await listDecksWithStats(userId, "lastPlayed", { includeProxyStats: true });
    const tileTotal = tiles.reduce((n, d) => n + d.toBuyCount, 0);

    // `ownedCount === built`, NOT `toBuyCount === 0`. Since proxies, to-buy is
    // coverage-based: a deck whose last gaps are printed reads 0 while owning
    // none of those cards, and it SHOULD still appear in the roll-up if it has
    // anything to buy. Read the coverage figure here and this invariant quietly
    // stops being about ownership at all.
    const fullyOwned = tiles.filter((d) => d.ownedCount === d.built);
    const wronglyPresent = fullyOwned.filter((d) => rollup.byDeck.has(d.id)).map((d) => d.name);

    const perDeck = tiles.map((d) => ({
      name: d.name,
      toBuyCount: d.toBuyCount,
      rollupCopies: rollup.byDeck.get(d.id)?.copies ?? null,
      cents: rollup.byDeck.get(d.id)?.cents ?? null,
      pricedCopies: rollup.byDeck.get(d.id)?.pricedCopies ?? null,
      lastPlayedAt: d.lastPlayedAt,
    }));

    console.log(
      JSON.stringify(
        {
          userId,
          decks: tiles.length,
          total: rollup.total,
          tileToBuyTotal: tileTotal,
          rollupWithinTileTotal: rollup.total.copies <= tileTotal,
          /** Unowned basics, which the roll-up refuses and `toBuyCount` counts. */
          basicsGap: tileTotal - rollup.total.copies,
          fullyOwnedDecks: fullyOwned.length,
          fullyOwnedButPresentInRollup: wronglyPresent,
          unpricedCopies: rollup.total.copies - rollup.total.pricedCopies,
          perDeck,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
