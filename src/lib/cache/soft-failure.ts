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
import type { AsyncLocalStorage } from "node:async_hooks";

type State = { fellBack: boolean };

// The one Next puts on `globalThis` on the server, never an import of `node:async_hooks`: some
// of the loaders that record also ship in client bundles (their types and pure helpers are
// imported by components), and a browser chunk cannot carry a Node builtin. In a browser there
// is no global, and recording is a no-op, which is right: nothing there caches a page.
let scope: AsyncLocalStorage<State> | null | undefined;
function current(): AsyncLocalStorage<State> | null {
  if (scope === undefined) {
    const Storage = (globalThis as { AsyncLocalStorage?: typeof AsyncLocalStorage }).AsyncLocalStorage;
    scope = Storage ? new Storage<State>() : null;
  }
  return scope;
}

export function recordSoftFailure(): void {
  const state = current()?.getStore();
  if (state) state.fellBack = true;
}

export async function watchSoftFailures<T>(run: () => Promise<T>): Promise<{ value: T; fellBack: boolean }> {
  const state: State = { fellBack: false };
  const storage = current();
  // With no storage nothing can be heard, so nothing is claimed clean: the caller does not store.
  if (!storage) return { value: await run(), fellBack: true };
  const value = await storage.run(state, run);
  return { value, fellBack: state.fellBack };
}
