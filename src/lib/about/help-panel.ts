import type { AboutScreen, DeckView } from "../copy/about";
import { DECK_VIEW_NAMES, SCREEN_NAMES, helpPanelCopy } from "../copy/discovery";
import type { EntryPayload } from "./entries-payload";

/**
 * The ? panel's model (discovery R2·8, design table `discovery-r2-8-help.md`). Pure, over the reader's visible entries
 * as `GET /api/about/entries` returns them, so an entry behind an off switch is absent everywhere.
 */

/** Where the panel is: a screen and, on a deck, its view. */
export type HelpPlace = { screen: AboutScreen; view?: DeckView };

/** A deck's views, in the deck's own order: the chips' order (rows 114 to 116). */
const DECK_ORDER: readonly DeckView[] = ["your-deck", "shopping", "stats", "notes", "analysis", "games", "versions"];

/** Collection's tabs, Card details and Upload a file, in the order a reader meets them (row 117). */
export const COLLECTION_GROUP: readonly AboutScreen[] = [
  "collection", "card-details", "sets", "proxies", "history", "wishlist", "upload",
];

const COLLECTION_PREFIX = `${SCREEN_NAMES.collection.split(" · ")[0]} · `;

/** The entries the list shows for a place: its screen's and, on a deck, its view's (row 74). */
export function entriesAt<E extends Pick<EntryPayload, "screen" | "view">>(entries: readonly E[], place: HelpPlace): E[] {
  return entries.filter((e) => e.screen === place.screen && (place.screen !== "deck" || e.view === place.view));
}

/** The panel's title, always the screen in view: `A deck · Shopping` (row 47). */
export function helpTitle(place: HelpPlace): string {
  return helpPanelCopy.screenName(SCREEN_NAMES[place.screen], place.view ? DECK_VIEW_NAMES[place.view] : undefined);
}

/** A place's short name: a deck's view (`Your deck`), Collection's tab (`Cards`, `Sets`), or the screen's own name. */
export function placeName(place: HelpPlace): string {
  if (place.screen === "deck") return DECK_VIEW_NAMES[place.view ?? "your-deck"];
  const name = SCREEN_NAMES[place.screen];
  return COLLECTION_GROUP.includes(place.screen) && name.startsWith(COLLECTION_PREFIX) ? name.slice(COLLECTION_PREFIX.length) : name;
}

export type ElsewhereKind = keyof typeof helpPanelCopy.elsewhere;

/** Which Elsewhere a screen carries: the deck page's, Collection's, or none (rows 105, 106). */
export function elsewhereKind(screen: AboutScreen): ElsewhereKind | null {
  if (screen === "deck") return "deck";
  return COLLECTION_GROUP.includes(screen) ? "collection" : null;
}

export type HelpChip = { place: HelpPlace; key: string; label: string; count: number };

/**
 * The Elsewhere chips: every other view of the deck, or every other place in Collection, in order, each with its
 * visible count, and none whose count is zero (rows 114 to 119). `here` is the screen in view, `shown` the list a chip
 * chose: the chosen one leaves the chips and the one it replaced comes back. The Your deck chip reads `All` while
 * Shopping is in view.
 */
export function elsewhereChips<E extends Pick<EntryPayload, "screen" | "view">>(
  entries: readonly E[],
  here: HelpPlace,
  shown: HelpPlace,
): HelpChip[] {
  const kind = elsewhereKind(here.screen);
  if (kind === null) return [];
  const places: HelpPlace[] =
    kind === "deck" ? DECK_ORDER.map((view) => ({ screen: "deck", view })) : COLLECTION_GROUP.map((screen) => ({ screen }));
  return places
    .filter((p) => placeKey(p) !== placeKey(shown))
    .map((p) => ({
      place: p,
      key: placeKey(p),
      label: p.view === "your-deck" && here.view === "shopping" ? helpPanelCopy.all : placeName(p),
      count: entriesAt(entries, p).length,
    }))
    .filter((c) => c.count > 0);
}

export function placeKey(place: HelpPlace): string {
  return place.view ? `${place.screen}-${place.view}` : place.screen;
}

/** The Reference's own anchor for an entry (rows 96, 123). */
export function entryHref(id: string): string {
  return `/about?tab=reference#${id}`;
}

/** The Reference at its top, with no query (rows 135, 148). */
export const REFERENCE_HREF = "/about?tab=reference";
/** Tools, About's default tab (row 145). */
export const TOOLS_HREF = "/about";

/** A search snippet's context either side of the match, cut at a word, as the Reference cuts its own. */
const CONTEXT = 70;
export function aroundMatch(before: string, after: string): [string, string] {
  const b = before.length > CONTEXT ? `…${before.slice(-CONTEXT).replace(/^\S*\s/, "")}` : before;
  const a = after.length > CONTEXT ? `${after.slice(0, CONTEXT).replace(/\s\S*$/, "")}…` : after;
  return [b, a];
}
