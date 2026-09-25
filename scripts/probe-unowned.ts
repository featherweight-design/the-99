// Gate 1 (state reachability) probe for #176 — hand-run, like probe-bottom.mjs.
//
// The unowned-staple branch in loadDeckSuggestions is only reachable when EDHREC
// returns topCards AND the catalog holds a colour-legal match the user does not
// own and has not already added. Types compiling and the route computing the
// field say nothing about that; this runs the real query against the real dev
// database and reports the count at every stage the filter can zero out.
//
//   pnpm tsx scripts/probe-unowned.ts
import "./lib/env.mjs";
import { and, arrayContained, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cards, collectionItems, deckCards, decks } from "../src/db/schema";
import { getEdhrecData } from "../src/lib/edhrec/client";
import { loadDeckSuggestions } from "../src/lib/decks/suggestions-read";
import { SHELF_CAP } from "../src/lib/decks/shelf-cap";

async function main() {
  const deckRows = await db
    .select({ id: decks.id, userId: decks.userId, commanderOracleId: decks.commanderOracleId })
    .from(decks)
    .limit(20);

  if (deckRows.length === 0) {
    console.log("no decks in this database — cannot probe");
    return;
  }

  for (const deck of deckRows) {
    const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
    if (!commander) continue;

    const { data, unreachable } = await getEdhrecData(commander.oracleId, commander.name);
    const topCards = data?.topCards ?? null;

    const ownedRows = await db
      .select({ oracleId: collectionItems.oracleId })
      .from(collectionItems)
      .where(eq(collectionItems.userId, deck.userId));
    const owned = new Set(ownedRows.map((r) => r.oracleId));

    const inDeckRows = await db
      .select({ oracleId: deckCards.oracleId })
      .from(deckCards)
      .where(eq(deckCards.deckId, deck.id));
    const inDeck = new Set(inDeckRows.map((r) => r.oracleId));

    let candidates = 0;
    let eligible = 0;
    if (topCards && topCards.length > 0) {
      const lowerTopCards = topCards.slice(0, 100).map((n) => n.toLowerCase());
      const candidateCards = await db
        .select({ oracleId: cards.oracleId, name: cards.name })
        .from(cards)
        .where(
          and(
            or(
              inArray(sql`lower(${cards.name})`, lowerTopCards),
              inArray(sql`lower(split_part(${cards.name}, ' // ', 1))`, lowerTopCards),
            ),
            eq(cards.commanderLegal, true),
            arrayContained(cards.colorIdentity, commander.colorIdentity),
          ),
        );
      candidates = candidateCards.length;
      eligible = candidateCards.filter(
        (c) => !owned.has(c.oracleId) && !inDeck.has(c.oracleId) && c.oracleId !== commander.oracleId,
      ).length;
    }

    const { suggestions } = await loadDeckSuggestions(deck.id, deck.userId);
    const unownedFromLoader = suggestions.filter((s) => !s.owned).length;

    console.log(
      [
        `deck ${deck.id.slice(0, 8)}`,
        `commander ${commander.name}`,
        `edhrec ${unreachable ? "UNREACHABLE" : topCards ? `${topCards.length} topCards` : "no data"}`,
        `catalog matches ${candidates}`,
        `owned ${owned.size}`,
        `in deck ${inDeck.size}`,
        `eligible ${eligible}`,
        // The loader's own count, not a restatement of its slice: a literal here once
        // said five while the shelf was capped at six, and agreed with a loader that
        // had the same stale five (#391). With eligible >= SHELF_CAP this must read
        // SHELF_CAP.
        `-> unowned suggestions ${unownedFromLoader} (cap ${SHELF_CAP})`,
      ].join(" · "),
    );
  }

}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
