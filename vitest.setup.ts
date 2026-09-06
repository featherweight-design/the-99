import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-registers its cleanup hook when Vitest runs with
// `globals: true`. This project keeps globals off and imports explicitly, so
// the hook has to be registered here — without it, rendered DOM accumulates
// across tests and role queries fail with "multiple elements found".
afterEach(cleanup);

// jsdom's localStorage is shared by every test in a file, so a component that
// persists a dismissal leaves its key behind for whatever runs next. Several
// test files already cleared it themselves; clearing it here is what lets a
// test assert the *absence* of a key without depending on its neighbours.
// Guarded because `scripts/**/*.test.mts` runs in the node environment, which
// has no localStorage at all.
afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});

// Client components import server actions directly (the pattern throughout src/components),
// and `src/db` throws at module load without a connection string. No test opens a connection;
// this is the same stub the production build uses to typecheck without a database.
process.env.DATABASE_URL ??= "postgres://stub:stub@localhost/stub";

// jsdom ships no ResizeObserver either. jsdom lays nothing out, so a real one
// would never fire anyway — components that measure an element keep whatever
// fallback they render before the first observation.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom ships no matchMedia, so any component reaching useIsDesktop() throws
// before it renders. Phone is the default because it is the hook's own SSR
// snapshot; tests that need the other breakpoint redefine this themselves.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
