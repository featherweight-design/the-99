/**
 * A read that FELL BACK: it caught an error and handed back something the page can still draw
 * (an empty map, the oracle art, the plain shuffle) rather than failing the render.
 *
 * That is right for a render and wrong for a cache. `cachePageForUser` stores what a load
 * returned under the reader's data stamp, and the stamp only moves on a write, so a fallback
 * stored once is served until the reader next changes something. Every fallback on a cached
 * page's path therefore records itself here, and a load that recorded one is served and not
 * stored. `check:list-cache` fails on a `catch` in those loaders that neither records nor says,
 * with a `not a fallback:` comment, why it is not one.
 *
 * Request-scoped through `AsyncLocalStorage`, so a loader records without being handed anything
 * and without knowing whether its caller caches. Outside `watchSoftFailures` it does nothing.
 */
import { AsyncLocalStorage } from "node:async_hooks";

const scope = new AsyncLocalStorage<{ fellBack: boolean }>();

export function recordSoftFailure(): void {
  const current = scope.getStore();
  if (current) current.fellBack = true;
}

export async function watchSoftFailures<T>(run: () => Promise<T>): Promise<{ value: T; fellBack: boolean }> {
  const state = { fellBack: false };
  const value = await scope.run(state, run);
  return { value, fellBack: state.fellBack };
}
