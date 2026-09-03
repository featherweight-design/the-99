import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-registers its cleanup hook when Vitest runs with
// `globals: true`. This project keeps globals off and imports explicitly, so
// the hook has to be registered here — without it, rendered DOM accumulates
// across tests and role queries fail with "multiple elements found".
afterEach(cleanup);

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

// jsdom's getComputedStyle cannot resolve CSS custom properties — var(--foo)
// stays at its initial default value, so toHaveStyle({ borderLeft: "3px solid
// var(--accent)" }) always fails even when the element has exactly that inline
// style. The proxy below prefers the element's own inline style value whenever
// that value references a CSS custom property (contains "var("), which is the
// only case where the computed style and the inline style diverge in a way that
// breaks assertions about design token values. All other reads go through to the
// real CSSStyleDeclaration unchanged.
if (typeof window !== "undefined" && window.getComputedStyle) {
  const _getComputedStyle = window.getComputedStyle.bind(window);
  Object.defineProperty(window, "getComputedStyle", {
    writable: true,
    configurable: true,
    value: (el: Element, pseudo?: string | null) => {
      const computed = _getComputedStyle(el, pseudo);
      const inlineStyle = (el as HTMLElement).style;
      if (!inlineStyle) return computed;
      return new Proxy(computed, {
        get(target, prop, receiver) {
          if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
          // Only intercept camelCase property names (not method names like
          // getPropertyValue, which have their own non-string-return paths).
          if (/^[a-z][a-zA-Z]+$/.test(prop)) {
            const kebab = prop.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
            const inlineVal = inlineStyle.getPropertyValue(kebab);
            // Prefer the raw inline value when it references a CSS custom
            // property — jsdom never resolves those, so the computed value is
            // always the property's default, not the intended design token.
            if (inlineVal && inlineVal.includes("var(")) return inlineVal;
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    },
  });
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
