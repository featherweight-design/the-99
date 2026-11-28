import { clearFeedItemsAction, restoreFeedItemsAction, type ClearResult, type DismissResult } from "../../app/feed-dismiss-actions";
import { captureClientError } from "../../lib/sentry/capture-client";
import { CLEAR_ALL_MAX } from "../../lib/social/feed-dismiss-limits";

/** `keys` cut into slices one clear or restore write accepts (`CLEAR_ALL_MAX`), in order. Pure. */
export function slices(keys: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += CLEAR_ALL_MAX) out.push(keys.slice(i, i + CLEAR_ALL_MAX));
  return out;
}

/**
 * Clears `keys` slice by slice: a rolled trade match (Cart on your wishlist Q1) can stand for more stored items than one
 * write takes. All or nothing, as one write is: a slice refused or failed takes back the slices already written before
 * the refusal returns (or the failure is thrown), so the rows the caller brings back are the rows still in the feed.
 * `cleared` is every key the writes newly dismissed, for Undo.
 */
export async function clearInSlices(keys: readonly string[]): Promise<ClearResult> {
  const cleared: string[] = [];
  try {
    for (const s of slices(keys)) {
      const r = await clearFeedItemsAction(s);
      if (!r.ok) {
        await takeBack(cleared);
        return r;
      }
      cleared.push(...r.cleared);
    }
  } catch (error) {
    await takeBack(cleared);
    throw error;
  }
  return { ok: true, cleared };
}

/**
 * Lifts the dismissals a part-done clear wrote. A take-back that throws is reported (those rows stay gone); a refusal
 * (the feed switched off) is an expected outcome and stays silent.
 */
async function takeBack(cleared: readonly string[]): Promise<void> {
  if (cleared.length === 0) return;
  await restoreInSlices(cleared).catch((error: unknown) => captureClientError("feed.clear-take-back", error));
}

/** Undo's twin of `clearInSlices`: lifts the dismissals slice by slice, stopping at the first refusal. */
export async function restoreInSlices(keys: readonly string[]): Promise<DismissResult> {
  for (const s of slices(keys)) {
    const r = await restoreFeedItemsAction(s);
    if (!r.ok) return r;
  }
  return { ok: true };
}
