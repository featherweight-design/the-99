// Scryfall's printed mana symbols, committed under `public/mana/` by
// `pnpm fetch:mana`.
//
// They are finished illustrations — a filled ground with the symbol pathed over
// it, and a hybrid carries two differently-colored halves — so they are drawn
// as art and never masked or tinted, which is the same rule the color filter's
// pips follow (filter chassis decision 7). Masking would flatten a hybrid to one
// color.
//
// The large card-detail pip draws these. The small run-in-a-column pips do not:
// at 11–14px a printed symbol's interior line work is mud, and `CostPips` keeps
// its colored discs, which is also what the pip-gap and black-pip probes measure.

import { MANA_SYMBOL_SLUGS } from "./mana-symbol-slugs";
import { manaSpriteHref } from "./mana-sprite";

/**
 * A cost symbol's stem, without braces. `"W/U"` → `"WU"`, `"2/W"` → `"2W"`,
 * `"G/U/P"` → `"GUP"`.
 *
 * Scryfall names its own SVG files this way, so the slug and the remote basename
 * are the same string and neither has to be mapped to the other — a fact
 * `scripts/fetch-mana-symbols.ts` asserts per symbol rather than assumes.
 */
export function manaSymbolSlug(symbol: string): string {
  return symbol.replaceAll("/", "");
}

/**
 * The committed art for a cost symbol, or null when none is committed.
 *
 * Null is a real answer, not a failure: Scryfall's symbol list grows with the
 * card pool, the catalog refreshes weekly, and these files move only when
 * someone re-runs the fetch. A symbol printed after the last run has no art
 * here, and the caller falls back to a colored pip rather than drawing a gap.
 */
export function manaSymbolSrc(symbol: string): string | null {
  const slug = manaSymbolSlug(symbol);
  // The symbol's view in the one preloaded sprite, not its own file: see `mana-sprite.ts`.
  return MANA_SYMBOL_SLUGS.has(slug) ? manaSpriteHref(slug) : null;
}
