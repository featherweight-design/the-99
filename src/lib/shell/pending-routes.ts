import type { shellCopy } from "../copy/shell";

export type LoadingKey = keyof typeof shellCopy.loading;

/**
 * Which screen a route shows while it loads: the words the navigation-pending overlay draws when a
 * press is still pending at 400ms, and the words the shell's page-load fallback streams on a direct
 * load or refresh (navigation-pending escalation addendum, E4). It is exactly what the retired
 * `loading.tsx` files resolved: each route's nearest boundary.
 *
 * KEPT routes keep their own `loading.tsx`, so their screen commits at press, and they get no
 * overlay (addendum, "Files and tests"). `choose` is Help me choose's own screen (`ChooseLoading`),
 * which picks the form or the results skeleton by address, never the crown screen.
 */
export type PendingRoute =
  | { kind: "overlay"; key: LoadingKey }
  | { kind: "kept"; screen: LoadingKey | "choose" | "precons" };

/** The path a link or push goes to, without its query or hash. */
export function pathOf(href: string): string {
  const path = href.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function pendingRouteFor(href: string): PendingRoute {
  const seg = pathOf(href).split("/").filter(Boolean);
  const [top, second, third] = seg;
  switch (top) {
    case undefined:
      return { kind: "overlay", key: "home" };
    case "about":
      return { kind: "overlay", key: "about" };
    case "collection":
      if (second === "proxies") return { kind: "overlay", key: "proxies" };
      if (second === "sets") return { kind: "overlay", key: third ? "setGrid" : "sets" };
      return { kind: "overlay", key: "collection" };
    case "commanders":
      return { kind: "overlay", key: "commanders" };
    case "discover":
      return { kind: "overlay", key: "discover" };
    case "decks":
      if (second === undefined) return { kind: "overlay", key: "decks" };
      // `/decks/import` inherited the /decks boundary (audit correction 5).
      if (second === "import") return { kind: "overlay", key: "decks" };
      // `/decks/shopping` (the all-decks cart) is a list route like `/decks`, not a deck id.
      if (second === "shopping") return { kind: "overlay", key: "decks" };
      // `/decks/precons` and an open precon are list routes too, never a deck id.
      // The LIST keeps its own boundary (`precons/(list)/loading.tsx`: tiles, not the crown) and so gets no overlay; an open
      // precon sits outside that route group and keeps the decks screen.
      if (second === "precons") return third === undefined ? { kind: "kept", screen: "precons" } : { kind: "overlay", key: "decks" };
      if (second === "new") return third === "choose" ? { kind: "kept", screen: "choose" } : { kind: "overlay", key: "deckNew" };
      if (third === "import") return { kind: "kept", screen: "deckUpdate" };
      return { kind: "kept", screen: "decks" };
    default:
      // A route with no boundary of its own showed the root's.
      return { kind: "overlay", key: "home" };
  }
}
