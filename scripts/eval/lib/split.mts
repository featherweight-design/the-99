/**
 * The one split of the rated set, fixed before any output is seen (plan, "The rated set").
 *
 * Deck ids are sorted, then shuffled by a seeded generator, so the split depends on nothing but the
 * ids and the seed. The first `DEV_COUNT` are the development decks, used only to develop Haiku
 * prompt variants. The rest are held out: every decision-rule figure is computed on them, and
 * they are the decks of Hugh's blind read. The first `OVERLAY_COUNT` held-out decks carry the
 * synthetic evidence overlay, in this same order. For prompt development the overlay is also laid,
 * in order, over the development decks (`--overlay --set dev`), reported as `dev-overlay`.
 */
export const SPLIT_SEED = 20260923;
export const DEV_COUNT = 4;
export const OVERLAY_COUNT = 6;

/** mulberry32: small, deterministic, and good enough to shuffle nineteen ids. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const next = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type Split = { seed: number; dev: string[]; heldOut: string[]; overlay: string[] };

export function splitDecks(deckIds: readonly string[]): Split {
  const order = seededShuffle([...deckIds].sort(), SPLIT_SEED);
  const heldOut = order.slice(DEV_COUNT);
  return { seed: SPLIT_SEED, dev: order.slice(0, DEV_COUNT), heldOut, overlay: heldOut.slice(0, OVERLAY_COUNT) };
}
