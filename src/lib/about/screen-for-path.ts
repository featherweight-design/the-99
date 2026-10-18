import type { AboutScreen } from "../copy/about";

/**
 * The About screen a reader stands on, read from the path the ? is pressed on (discovery R2·8, README-r2 E8). Pure. The
 * routes are the ones `SCREEN_WHERE` prints. `null` is a page no entry lives on (the all-decks cart, a friend's page,
 * About itself, admin): the ? then draws G21's empty line.
 *
 * - `card-details` is the open card dialog on a Collection list, which the list mirrors as `?card=`.
 * - `account` never resolves from a path: the menu is on every screen, and its entries are found by search.
 * - `deck` is every view of a deck; which view is the builder's live state (`BuilderScreenContext`), never the URL.
 */
const COLLECTION_LISTS: Record<string, AboutScreen> = {
  "/collection": "collection",
  "/collection/sets": "sets",
  "/collection/proxies": "proxies",
  "/collection/history": "history",
  "/collection/wishlist": "wishlist",
};

/** Under `/decks/`, the segments that are not a deck's id. */
const DECKS_ROUTES = new Set(["new", "precons", "import", "shopping"]);

export function screenForPath(pathname: string, search: string | URLSearchParams = ""): AboutScreen | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const seg = path.split("/").filter(Boolean);

  if (path === "/") return "home";

  if (seg[0] === "collection") {
    if (seg[1] === "replace") return "upload";
    // A set's own page is the Sets tab's, one level down.
    const list = seg[1] === "sets" ? "sets" : COLLECTION_LISTS[path];
    if (list === undefined) return null;
    return params.get("card") ? "card-details" : list;
  }
  if (seg[0] === "commanders") return "commanders";
  if (path === "/discover") return "discover";
  if (seg[0] === "decks") {
    if (seg.length === 1) return "decks";
    if (seg[1] === "new" || seg[1] === "precons" || seg[1] === "import") return "new-deck";
    // A deck's own page; its sub-pages (`/changes`, `/import`) are not a screen of the deck's.
    if (!DECKS_ROUTES.has(seg[1]) && seg.length === 2) return "deck";
    return null;
  }
  if (path === "/friends") return "friends";
  return null;
}
