// THE MIX FOR ONE DECK, resolved once and defined once.
//
// Three surfaces draw the same five cells about the same deck — the deck page's strip, the
// what-changed strip on `/decks/[id]/changes`, and the Add panel's shelf headers — so what
// they are measured against cannot be resolved three times by three readers. It would not
// merely cost three chains; it would let them disagree on any commander whose measured ramp
// is not ten, which is most of them.
//
// This is the reader for a surface that holds only a deck id. `loadDeckSuggestions` already
// has the commander rows in hand and exposes its own result on the payload rather than
// calling here again; the deck page takes that. Both end at `recommendedMix`.
//
// NOT `loadDeckProfile`: a profile assembles bracket flags, the Spellbook two-card
// aggregation, tutor classification and the staples join, and every one of those is waste
// when the question is five integers. The basis chain is the only part needed and
// `loadSkeletonForCommanders` is the part that resolves it.
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { loadSkeletonForCommanders } from "../profile/load";
import { recommendedMix, type RecommendedMix } from "./mix";

/** Never throws. A deck whose chain cannot be resolved draws the asserted baseline and says
    so through `measured` — a strip drawing figures beats a strip drawing nothing, as long as
    it does not claim they came from EDHREC. */
export async function loadDeckMix(deckId: string, userId: string): Promise<RecommendedMix> {
  // HOISTED, because the fallback needs it. `landTarget` subtracts a slot for a partner, so a
  // pair deck whose chain fails mid-read would otherwise fall back to 37 lands where every
  // other pair surface says 36 — a disagreement that appears only on the degraded path, which
  // is where nobody is looking.
  let hasPartner = false;
  try {
    const [deck] = await db
      .select({
        commanderOracleId: decks.commanderOracleId,
        partnerOracleId: decks.partnerOracleId,
      })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    if (!deck || !deck.commanderOracleId) return recommendedMix(null, hasPartner);
    hasPartner = Boolean(deck.partnerOracleId);

    const ids = [deck.commanderOracleId, deck.partnerOracleId].filter(
      (v): v is string => typeof v === "string",
    );
    const rows = await db
      .select({ oracleId: cards.oracleId, colorIdentity: cards.colorIdentity })
      .from(cards)
      .where(inArray(cards.oracleId, ids));

    const identity = new Set<string>();
    for (const r of rows) for (const c of r.colorIdentity ?? []) identity.add(c);

    const { skeleton } = await loadSkeletonForCommanders(
      deck.commanderOracleId,
      deck.partnerOracleId ?? null,
      [...identity],
    );
    return recommendedMix(skeleton, hasPartner);
  } catch (err) {
    console.warn("loadDeckMix: no skeleton — the strip quotes the asserted targets", err);
    return recommendedMix(null, hasPartner);
  }
}
