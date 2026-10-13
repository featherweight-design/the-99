import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { redactSecrets } from "./scripts/lib/redact-env.mjs";

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

// The art layers remember every crop they have asked for, so a list restored by Back never blanks one
// (src/components/ui/art-wash-near.tsx). Within a test file that memory would let one test's crop
// skip the next test's viewport gate, so it is emptied here, by its registered symbol.
afterEach(() => {
  (globalThis as Record<symbol, Set<string> | undefined>)[Symbol.for("the99.artAskedFor")]?.clear();
});

// No test may see a live credential from the shell that started it: a failing assertion over an
// object built from `process.env` prints the whole object (scripts/lib/redact-env.mjs).
// The names it replaced are kept as the proof it ran (`redact-env.test.mts`): assigned from THIS
// call, so removing the call removes the proof, wherever else the function runs.
(globalThis as { __setupRedaction?: string[] }).__setupRedaction = redactSecrets(process.env);

// Client components import server actions directly (the pattern throughout src/components),
// and `src/db` throws at module load without a connection string. No test opens a connection;
// this is the same stub the production build uses to typecheck without a database. Set outright,
// not defaulted: the redaction above leaves a shell's DATABASE_URL non-empty but unusable.
process.env.DATABASE_URL = "postgres://stub:stub@localhost/stub";

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
