import { inArray } from "drizzle-orm";

import { db } from "../../db";
import { cardBracketFlags } from "../../db/schema";

/**
 * The two card-level bracket facts that are not on a Scryfall card.
 *
 * SERVER-ONLY — it imports the Drizzle client, which throws at module init without
 * `DATABASE_URL`. Nothing a `"use client"` component can value-import may reach this file.
 * The rest of `src/lib/bracket/` is pure and client-safe; this one is the exception.
 *
 * `game_changer` is deliberately NOT here: it is a column on `cards`, so every reader that
 * already selects a card row gets it free, and routing it through a second query would cost
 * a join for a fact the caller is holding.
 */
export type CardBracketFlags = {
  massLandDenial: boolean;
  massLandDenialSources: string[];
  extraTurn: boolean;
  extraTurnSources: string[];
};

/** A card with no row is all-false — the default-false direction, never "unknown". */
export const NO_BRACKET_FLAGS: CardBracketFlags = {
  massLandDenial: false,
  massLandDenialSources: [],
  extraTurn: false,
  extraTurnSources: [],
};

/**
 * Flags for many cards in one query.
 *
 * An absent id means NEITHER FLAG APPLIES, and that is all it means. The writer
 * (`unionFlagRows`) emits no row for a card no source claims, so a card the sweep resolved
 * and cleared is byte-identical here to one the sweep never returned — this read cannot tell
 * them apart and must not be described as if it could. What a reader disputing a verdict is
 * owed is the per-flag SOURCES on a row that exists; the ingest's own coverage figures are
 * reported by the ingest, not recoverable from this table.
 */
export async function loadBracketFlags(
  oracleIds: readonly string[],
): Promise<Map<string, CardBracketFlags>> {
  // Empty in, empty out, with no round trip — the `readEdhrecCache` shape.
  if (oracleIds.length === 0) return new Map();

  const rows = await db
    .select({
      oracleId: cardBracketFlags.oracleId,
      massLandDenial: cardBracketFlags.massLandDenial,
      massLandDenialSources: cardBracketFlags.massLandDenialSources,
      extraTurn: cardBracketFlags.extraTurn,
      extraTurnSources: cardBracketFlags.extraTurnSources,
    })
    .from(cardBracketFlags)
    .where(inArray(cardBracketFlags.oracleId, [...new Set(oracleIds)]));

  return new Map(
    rows.map((r) => [
      r.oracleId,
      {
        massLandDenial: r.massLandDenial,
        massLandDenialSources: r.massLandDenialSources,
        extraTurn: r.extraTurn,
        extraTurnSources: r.extraTurnSources,
      },
    ]),
  );
}
