import { vi } from "vitest";

/** A matchMedia that reports a viewport width and can be resized. Shared by the
 *  hook's own tests and by every component whose layout `useMinWidth` decides,
 *  because jsdom's matchMedia always reports false and would otherwise pin each
 *  of those components to its phone branch. */
export function stubViewport(width: number) {
  const listeners = new Map<string, Set<() => void>>();
  let current = width;

  const matchesFor = (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return current >= min;
  };

  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matchesFor(query);
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, fn: () => void) => {
          const set = listeners.get(query) ?? new Set();
          set.add(fn);
          listeners.set(query, set);
        },
        removeEventListener: (_: string, fn: () => void) => {
          listeners.get(query)?.delete(fn);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );

  return {
    resizeTo(next: number) {
      current = next;
      for (const set of listeners.values()) for (const fn of set) fn();
    },
    listenerCount() {
      return [...listeners.values()].reduce((n, set) => n + set.size, 0);
    },
  };
}
