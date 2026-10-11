// I got it's confirm (plan `2026-10-10-i-got-it.md`, "How the preset is chosen"): which printing
// and finish it opens on, how many copies the deck needs, and what a stale answer re-bases to.
// Pure: the confirm and its tests read these as plain values.
import type { PrintingChoice } from "../collection/catalog-read";
import type { CollectionItemIdentity, Finish } from "../collection/key";
import { availabilityState } from "./availability";
import type { DeckDetailCard } from "./grouping";
import { MARK_BOUGHT_MAX } from "./mark-bought";
import { priceState, type PriceFact } from "./price";

export type GotItPreset = { scryfallId: string | null; finish: Finish | null };

/**
 * The finish a printing takes (audit finding 1): the one asked for when the printing offers it,
 * else nonfoil, else its first offered finish. Null only for a printing with no finish at all.
 */
export function finishFor(finishes: readonly Finish[], wanted: Finish | null): Finish | null {
  if (wanted !== null && finishes.includes(wanted)) return wanted;
  if (finishes.includes("nonfoil")) return "nonfoil";
  return finishes[0] ?? null;
}

/**
 * The preselection (Hugh, 2026-10-10): the printing behind the row's figure when that figure is
 * LIVE (`priced` or `foilOnly`), which is the deck's in-stock pick or today's cheapest in-stock
 * printing (`priceFor` already chose between them). A `sold out` row's printing is stale and an
 * absent row has none, so nothing is preselected and Add reads `Choose a printing`. The one
 * exception is a card with exactly one printing, which is selected whatever the price says: it is
 * the only answer.
 *
 * The finish follows the price state: `priced` asks for nonfoil, `foilOnly` for foil when the
 * figure is a foil one, else etched; then `finishFor` keeps it to what the printing offers.
 */
export function gotItPreset(
  price: PriceFact | null | undefined,
  newestAsOf: Date | null,
  choices: readonly PrintingChoice[],
): GotItPreset {
  const state = priceState(price, newestAsOf);
  const live = state === "priced" || state === "foilOnly";
  const behind = live && price?.printing
    ? choices.find((c) => c.scryfallId === price.printing!.scryfallId) ?? null
    : null;
  const chosen = behind ?? (choices.length === 1 ? choices[0] : null);
  if (!chosen) return { scryfallId: null, finish: null };
  const wanted: Finish | null = !live || chosen !== behind
    ? null
    : state === "priced" ? "nonfoil" : price!.foilCents !== null ? "foil" : "etched";
  return { scryfallId: chosen.scryfallId, finish: finishFor(chosen.finishes, wanted) };
}

/**
 * Copies this deck still has to buy, from the vantage its Shopping row draws (`selfExcluded`): an
 * unowned card's whole count, or a spoken-for card's shortfall (A3: never the deck's ask), never
 * more than the deck asks for.
 */
export function gotItNeed(card: Pick<DeckDetailCard, "owned" | "quantity" | "availability">): number {
  if (!card.owned) return card.quantity;
  const a = card.availability;
  if (!a || availabilityState(a, { selfExcluded: true }) !== "over") return 0;
  return Math.min(card.quantity, -a.free);
}

/** The stepper's start: the need, at least one and at most the cap (call D). */
export function presetQuantity(need: number): number {
  return Math.min(MARK_BOUGHT_MAX, Math.max(1, need));
}

/**
 * What a `stale` answer re-bases to (STATES B8). `current` is the server's rows for the holding the
 * confirm sent. The holding moved by `now - expected` somewhere else, either way: copies added lower
 * the need, copies removed raise it, never past the deck's own `quantity`. The next press sends the
 * new count as its `expected`. `added` says which way it moved, because the banner's sentence names
 * an addition. Nothing was written.
 */
export function rebaseStale(
  current: readonly (CollectionItemIdentity & { quantity: number })[],
  printing: Pick<PrintingChoice, "setCode" | "collectorNumber">,
  finish: Finish,
  expected: number,
  need: number,
  quantity: number,
): { expected: number; need: number; added: boolean } {
  const now = current
    .filter((r) => r.setCode === printing.setCode && r.collectorNumber === printing.collectorNumber && r.finish === finish)
    .reduce((n, r) => n + r.quantity, 0);
  const moved = now - expected;
  return { expected: now, need: Math.min(quantity, Math.max(0, need - moved)), added: moved > 0 };
}
