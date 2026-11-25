// Collection quick filters (plans/2026-11-25-collection-quick-filters.md): the chips, what each one keeps, and the
// counts they print. Pure: the browser reads it, so does the server's first window, and both must agree.
//
// FIVE CHIPS ARE A KEPT COLUMN, NOT A FIELD READ OFF THE CARD. `facts` is a draw field (withheld past the first
// window until the fields route fills it) and `foil` is the finish every copy of the DRAWN printing shares, so
// neither can decide a filter or a count. `q` is one small int per card, set where the printings are still in hand,
// and every predicate below reads it alone. In no deck is not here: it is `availability = ["free"]`, so the chip
// and the Availability menu's Free are one state.
import type { CardFact } from "../copy/card-mark";
// Types only from `browse.ts`, which imports this file; the counts that need `filterCards` live in `quick-counts.ts`.
import type { BrowseFilters, BrowseListCard, Finish } from "./browse";

export const QUICK_KEYS = ["gc", "tutor", "turns", "mld", "foil"] as const;
export type QuickKey = (typeof QUICK_KEYS)[number];

const BIT: Record<QuickKey, number> = { gc: 1, tutor: 2, turns: 4, mld: 8, foil: 16 };

/** The standing bracket fact each fact-backed chip keeps. */
const FACT_OF: Record<Exclude<QuickKey, "foil">, CardFact> = {
  gc: "gameChanger",
  tutor: "tutor",
  turns: "extraTurns",
  mld: "massLandDenial",
};

/**
 * A card's `q`: a bit for each fact it carries and one for holding ANY foil or etched copy, in any printing.
 * 0 means none, and the list drops the key then (an absent key costs nothing on the wire).
 */
export function quickMask(
  facts: readonly CardFact[] | undefined,
  printings: readonly { finishes: Partial<Record<Finish, number>> }[],
): number {
  let q = 0;
  for (const key of Object.keys(FACT_OF) as (keyof typeof FACT_OF)[]) {
    if (facts?.includes(FACT_OF[key])) q |= BIT[key];
  }
  if (printings.some((p) => (p.finishes.foil ?? 0) > 0 || (p.finishes.etched ?? 0) > 0)) q |= BIT.foil;
  return q;
}

export const matchesQuick = (card: Pick<BrowseListCard, "q">, key: QuickKey): boolean => ((card.q ?? 0) & BIT[key]) !== 0;

/** An unknown or absent value is no chip: a shared URL can carry anything. */
export function parseQuick(param: string | null): QuickKey | undefined {
  return (QUICK_KEYS as readonly string[]).includes(param ?? "") ? (param as QuickKey) : undefined;
}

/** In no deck is pressed while Free is the whole availability selection. */
export const isFreeAlone = (f: Pick<BrowseFilters, "availability">): boolean =>
  f.availability?.length === 1 && f.availability[0] === "free";
