import { isUuid } from "../uuid";
import { dollarsToCents, type StorePriceRow } from "./rows";

export const CARDKINGDOM_PRICELIST_URL = "https://api.cardkingdom.com/api/v2/pricelist";

const HEADERS = {
  accept: "application/json",
  // The same identified caller ManaPool sees: one Card Kingdom can contact about cadence or shape.
  "user-agent": "the-99 (+https://the-99.dev)",
};

// ~69MB on 2026-11-22. Five minutes, as for ManaPool's feed; the workflow is the real backstop.
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Downloads Card Kingdom's full retail pricelist. Public and unauthenticated; Hugh ruled to include it
 * (2026-11-22) on the basis that the feed is intentionally public, with no published terms found.
 * Buffered whole like ManaPool's feed, so the parser stays a pure function of a plain object; callers
 * set `NODE_OPTIONS=--max-old-space-size=4096`.
 */
export async function fetchCardKingdomPricelist(): Promise<unknown> {
  const res = await fetch(CARDKINGDOM_PRICELIST_URL, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Card Kingdom responded ${res.status} ${res.statusText}`);
  return res.json();
}

type Finish = "nonfoil" | "foil" | "etched";

type Sku = { finish: Finish; cents: number; quantity: number; url: string };

/**
 * A SKU's finish. Card Kingdom lists each finish as its own SKU: `is_foil` is the string "true" or "false",
 * and an etched foil is a variation starting "Foil Etched" (1,162 rows on 2026-11-22, with `is_foil` either way).
 */
function finishOf(row: Record<string, unknown>): Finish | null {
  if (typeof row.variation === "string" && /^foil etched/i.test(row.variation)) return "etched";
  if (row.is_foil === "true") return "foil";
  if (row.is_foil === "false") return "nonfoil";
  return null;
}

/**
 * Of two SKUs for one printing and finish, the one a buyer would be sent to: in stock beats sold out, then
 * the cheaper. 238 SKUs folded into another for the same printing and finish on 2026-11-22, a card's own set and its reprint on
 * The List under the same Scryfall id.
 */
function better(a: Sku, b: Sku): Sku {
  if ((a.quantity > 0) !== (b.quantity > 0)) return a.quantity > 0 ? a : b;
  return b.cents < a.cents ? b : a;
}

export type CardKingdomFeed = { rows: StorePriceRow[]; asOf: Date; skipped: number; collapsed: number };

/**
 * Card Kingdom's pricelist to one row per printing, the finishes folded together.
 *
 * `meta.created_at` (`"2026-11-22 12:11:03"`, no zone) is read as UTC. The feed does not say its zone
 * (likely US local), so `as_of` is only for ordering Card Kingdom's own runs against each other (liveness is per
 * store), where a fixed offset shifts nothing; never compare it with the clock. A daily midday build never meets
 * the repeated hour of a DST fall-back. `price_retail` is the
 * NM retail price; a row with no well-formed Scryfall id, finish, price, quantity or link is skipped and counted.
 */
export function parseCardKingdomPricelist(payload: unknown): CardKingdomFeed {
  const p = payload as { meta?: { created_at?: unknown; base_url?: unknown }; data?: unknown } | null;
  const created = p?.meta?.created_at;
  const base = p?.meta?.base_url;
  if (typeof created !== "string") throw new Error("Card Kingdom pricelist: meta.created_at is not a string");
  if (typeof base !== "string" || !/^https:\/\//.test(base)) throw new Error("Card Kingdom pricelist: meta.base_url is not an https URL");
  if (!Array.isArray(p?.data)) throw new Error("Card Kingdom pricelist: data is not an array");
  const asOf = new Date(`${created.replace(" ", "T")}Z`);
  if (Number.isNaN(asOf.getTime())) throw new Error(`Card Kingdom pricelist: meta.created_at is not a date: ${created}`);

  const byPrinting = new Map<string, Partial<Record<Finish, Sku>>>();
  let skipped = 0;
  let collapsed = 0;
  for (const raw of p.data as unknown[]) {
    const row = (raw ?? {}) as Record<string, unknown>;
    // The id lands in a uuid column, so a malformed one would fail the whole lookup chunk, not one row: one
    // 35-character id in the 2026-11-22 feed did exactly that. Lowercased, because the lookup hands back
    // Postgres's canonical form and a row is matched against it as a string.
    const id = isUuid(row.scryfall_id) ? (row.scryfall_id as string).toLowerCase() : null;
    const finish = finishOf(row);
    const cents = dollarsToCents(row.price_retail);
    const quantity = row.qty_retail;
    if (id === null || finish === null || cents === null
      || typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 0
      || typeof row.url !== "string" || row.url.length === 0) {
      skipped++;
      continue;
    }
    // Relative to the feed's own base, and refused if it resolves anywhere else: a link we draw goes to Card Kingdom.
    // A link that does not parse is one bad row, counted like the others, never a throw out of the whole feed.
    let url: URL;
    try { url = new URL(row.url, base); } catch { skipped++; continue; }
    if (url.origin !== new URL(base).origin) { skipped++; continue; }
    const sku: Sku = { finish, cents, quantity, url: url.href };
    const finishes = byPrinting.get(id) ?? {};
    const held = finishes[finish];
    if (held) collapsed++;
    finishes[finish] = held ? better(held, sku) : sku;
    byPrinting.set(id, finishes);
  }

  const rows: StorePriceRow[] = [];
  for (const [scryfallId, f] of byPrinting) {
    rows.push({
      scryfallId,
      store: "cardkingdom",
      priceCents: f.nonfoil?.cents ?? null,
      priceCentsFoil: f.foil?.cents ?? null,
      priceCentsEtched: f.etched?.cents ?? null,
      quantity: f.nonfoil?.quantity ?? null,
      quantityFoil: f.foil?.quantity ?? null,
      quantityEtched: f.etched?.quantity ?? null,
      // The nonfoil page where there is one; a foil-only printing's foil page otherwise.
      buyUrl: (f.nonfoil ?? f.foil ?? f.etched)!.url,
      buyUrlFoil: f.foil?.url ?? null,
      buyUrlEtched: f.etched?.url ?? null,
      asOf,
    });
  }
  return { rows, asOf, skipped, collapsed };
}
