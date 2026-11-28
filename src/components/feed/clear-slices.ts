import { clearFeedItemsAction, restoreFeedItemsAction, type ClearResult, type DismissResult } from "../../app/feed-dismiss-actions";
import { CLEAR_ALL_MAX } from "../../lib/social/feed-dismiss-limits";

/** `keys` cut into slices one clear or restore write accepts (`CLEAR_ALL_MAX`), in order. Pure. */
export function slices(keys: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += CLEAR_ALL_MAX) out.push(keys.slice(i, i + CLEAR_ALL_MAX));
  return out;
}

/**
 * Clears `keys` slice by slice, stopping at the first refusal: a rolled trade match (Cart on your wishlist Q1) can stand
 * for more stored items than one write takes. `cleared` is every key the writes newly dismissed, for Undo.
 */
export async function clearInSlices(keys: readonly string[]): Promise<ClearResult> {
  const cleared: string[] = [];
  for (const s of slices(keys)) {
    const r = await clearFeedItemsAction(s);
    if (!r.ok) return r;
    cleared.push(...r.cleared);
  }
  return { ok: true, cleared };
}

/** Undo's twin of `clearInSlices`: lifts the dismissals slice by slice, stopping at the first refusal. */
export async function restoreInSlices(keys: readonly string[]): Promise<DismissResult> {
  for (const s of slices(keys)) {
    const r = await restoreFeedItemsAction(s);
    if (!r.ok) return r;
  }
  return { ok: true };
}
