/**
 * Find a deck read's limits, apart from the prompt so the price table (`model/prices.ts`, which is
 * client-safe) reads them without the prompt's imports.
 */

/** The reply's output ceiling. MEASURED: 4,257 at most on the eval (Haiku, version 2 prompt). */
export const FITS_READ_MAX_TOKENS = 8_000;

/**
 * The read's model: ONE constant, so Hugh's pick (the eval doc, 2026-10-12) is a one-line change.
 * Haiku 5.5 at effort medium is the eval's recommendation and the default pending his call.
 */
export const FITS_READ_MODEL = "claude-haiku-5-5";
export const FITS_READ_EFFORT = "medium" as const;
/**
 * The prompt's input ceiling, in tokens. MEASURED: 63,360 at most on the eval (Tangle Wire, 21
 * candidate decks, staging, 2026-10-12). 100,000 is Haiku 5.5's lower rate card's edge, so a read
 * is never priced on the higher one; a press whose prompt would pass it is refused before any credit.
 */
export const FITS_READ_INPUT_CEILING = 100_000;
/** One deadline over both attempts. The eval's slowest Haiku press took 21 s. */
export const FITS_READ_DEADLINE_MS = 110_000;
/** A pending read older than this was abandoned (the deadline plus margin), and is failed and refunded. */
export const FITS_READ_REAP_MS = 5 * 60 * 1000;
