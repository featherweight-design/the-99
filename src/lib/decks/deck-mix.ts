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

/** A deck's commanders, as `loadMixesForCommanders` keys them. */
export type CommanderPair = { commanderOracleId: string; partnerOracleId: string | null };
/** The pair's key, ORDER-SENSITIVE on purpose. The skeleton reads the pair row canonically, but its
 *  fallback reads the FIRST commander's own row, so (A, B) and (B, A) can resolve different targets
 *  once the pair row is absent or half-measured. Each deck is asked about in its own column order,
 *  as the deck page asks it, so the need a picker quotes is the one that deck's page draws. */
export const mixKey = (p: CommanderPair) => `${p.commanderOracleId}|${p.partnerOracleId ?? ""}`;

/**
 * The mix for MANY decks at once (Fits your decks), resolved once per distinct commander pair
 * rather than once per deck: two decks led by the same commander ask the same question. The
 * identities come from one read, and the chains run in parallel. Never throws; a pair whose chain
 * fails gets the asserted baseline, exactly as `loadDeckMix` does.
 */
export async function loadMixesForCommanders(pairs: readonly CommanderPair[]): Promise<Map<string, RecommendedMix>> {
  const distinct = [...new Map(pairs.map((p) => [mixKey(p), p])).values()];
  const out = new Map<string, RecommendedMix>();
  if (distinct.length === 0) return out;
  let identityOf = new Map<string, string[]>();
  try {
    const ids = [...new Set(distinct.flatMap((p) => [p.commanderOracleId, p.partnerOracleId]).filter(
      (v): v is string => typeof v === "string",
    ))];
    const rows = await db
      .select({ oracleId: cards.oracleId, colorIdentity: cards.colorIdentity })
      .from(cards)
      .where(inArray(cards.oracleId, ids));
    identityOf = new Map(rows.map((r) => [r.oracleId, r.colorIdentity ?? []]));
  } catch (err) {
    console.warn("loadMixesForCommanders: no identities — every pair quotes the asserted targets", err);
    for (const p of distinct) out.set(mixKey(p), recommendedMix(null, p.partnerOracleId !== null));
    return out;
  }
  await Promise.all(distinct.map(async (p) => {
    const hasPartner = p.partnerOracleId !== null;
    try {
      const identity = new Set([
        ...(identityOf.get(p.commanderOracleId) ?? []),
        ...(p.partnerOracleId ? identityOf.get(p.partnerOracleId) ?? [] : []),
      ]);
      const { skeleton } = await loadSkeletonForCommanders(p.commanderOracleId, p.partnerOracleId, [...identity]);
      out.set(mixKey(p), recommendedMix(skeleton, hasPartner));
    } catch (err) {
      console.warn("loadMixesForCommanders: no skeleton for a pair — it quotes the asserted targets", err);
      out.set(mixKey(p), recommendedMix(null, hasPartner));
    }
  }));
  return out;
}
