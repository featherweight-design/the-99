import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings } from "../../db/schema";
import { recordSoftFailure } from "../cache/soft-failure";
import { comparePrintings, type BrowsePrinting } from "../collection/browse";
import { loadOwnedPrintingPrices } from "./prices";
import type { PrintingPrices } from "./price-lookup";

/**
 * The printing a card the reader does NOT own opens on, in ONE place: card details opens on it (`catalogCard`) and
 * every surface that previews such a card draws it (`chainArt`'s fallback), so a hover and a press show one picture.
 *
 * The rule (it was card details' alone, and the previews drew `cards.image_uri` instead, a different printing for
 * the cards it matters for: Zul Ashur's oracle default had no live price, so the modal opened on a printing the
 * tile never showed): the modal's price tag belongs to the printing on screen, so it opens on the oracle's own
 * printing when the shop carries it NOW, else the cheapest live printing with art of its own, else on neither
 * (null: the caller keeps the oracle-level art it holds). Live is AGENTS.md's rule: a non-foil price at the newest
 * `as_of`.
 */
export type OpeningCandidate = { scryfallId: string; ownArt: boolean; liveCents: number | null };

export function openingScryfallId(candidates: readonly OpeningCandidate[], defaultScryfallId: string | null): string | null {
  const byDefault = candidates.find((c) => c.scryfallId === defaultScryfallId);
  if (byDefault && byDefault.ownArt && byDefault.liveCents !== null) return byDefault.scryfallId;
  const live = candidates
    .filter((c): c is OpeningCandidate & { liveCents: number } => c.ownArt && c.liveCents !== null)
    .sort((a, b) => a.liveCents - b.liveCents);
  return live[0]?.scryfallId ?? null;
}

/** A printing's live non-foil price in cents, or null: priced at the newest `as_of` the table holds. */
export function liveCents(prices: PrintingPrices | null | undefined, scryfallId: string): number | null {
  const fact = prices?.byScryfallId[scryfallId];
  return prices?.newestAsOf != null && fact !== undefined && fact.cents !== null
    && fact.asOf.getTime() === prices.newestAsOf.getTime() ? fact.cents : null;
}

/** The printing a card opens on: its art, and the set and rarity printed on it. */
export type OpeningPrinting = { scryfallId: string; imageUri: string; setCode: string; rarity: string | null };

/**
 * The printing each card opens on, for the cards the rule finds one for (a card it finds none for is absent, and
 * the caller keeps what it holds). One printings read and one batched price read for all the ids; fail-soft, an
 * empty map on a failed read. A surface that captions the printing it draws (the proxy list names its set and
 * rarity) takes them from here, so art and caption are one printing.
 */
export async function loadOpeningPrintings(oracleIds: readonly string[]): Promise<Map<string, OpeningPrinting>> {
  const ids = [...new Set(oracleIds)];
  const out = new Map<string, OpeningPrinting>();
  if (ids.length === 0) return out;
  try {
    const [rows, prices] = await Promise.all([
      db.select({
        oracleId: printings.oracleId, scryfallId: printings.scryfallId, imageUri: printings.imageUri,
        setCode: printings.setCode, collectorNumber: printings.collectorNumber, rarity: printings.rarity, defaultId: cards.scryfallId,
      })
        .from(printings)
        .innerJoin(cards, eq(cards.oracleId, printings.oracleId))
        .where(and(inArray(printings.oracleId, ids), isNotNull(printings.imageUri))),
      loadOwnedPrintingPrices(ids),
    ]);
    const byCard = new Map<string, typeof rows>();
    for (const r of rows) byCard.set(r.oracleId, [...(byCard.get(r.oracleId) ?? []), r]);
    for (const [oracleId, list] of byCard) {
      // Card details' own order (`comparePrintings`), which breaks a tie between two equally cheap printings: the
      // rule takes the first of them, so a different order here is a different picture than the press opens.
      list.sort((a, b) => comparePrintings(
        { setCode: a.setCode.toUpperCase(), collectorNumber: a.collectorNumber } as BrowsePrinting,
        { setCode: b.setCode.toUpperCase(), collectorNumber: b.collectorNumber } as BrowsePrinting,
      ));
      const pick = openingScryfallId(
        list.map((r) => ({ scryfallId: r.scryfallId, ownArt: true, liveCents: liveCents(prices.get(oracleId), r.scryfallId) })),
        list[0].defaultId,
      );
      const r = list.find((x) => x.scryfallId === pick);
      if (r?.imageUri) out.set(oracleId, { scryfallId: r.scryfallId, imageUri: r.imageUri, setCode: r.setCode, rarity: r.rarity });
    }
  } catch {
    // Soft: the callers keep the catalog's art. Recorded, so a cached page does not store the fallback as the answer.
    recordSoftFailure();
    return new Map();
  }
  return out;
}

/** `loadOpeningPrintings`, as the art alone: oracle id to the image the card opens on. */
export async function loadOpeningArt(oracleIds: readonly string[]): Promise<Map<string, string>> {
  return new Map([...(await loadOpeningPrintings(oracleIds))].map(([id, p]) => [id, p.imageUri] as const));
}
