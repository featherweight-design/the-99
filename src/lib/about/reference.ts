import { DECK_VIEWS, ABOUT_SCREENS, type AboutEntry, type AboutScreen, type DeckView } from "../copy/about";
import { entryRow } from "../copy/how-it-works-links";
import { SCREEN_WHERE, screenName, showcaseCopy } from "../copy/discovery";
import type { ShowcaseGroup } from "../discovery/showcase";
import { entryShotFor, type Shot } from "./shots";
import { firstSentence } from "./caption";

export { firstSentence };

/**
 * The Reference tab's model (discovery R2·6a, README-r2 C5): every visible entry under the screen it lives on, the 21
 * screens in the order a reader meets them (a deck's seven views each a screen). Pure, built on the server from the
 * RESOLVED entries `visibleEntries` returns, so a line its switch strips is never drawn or searched.
 */

/** Where an opened tool entry's Try it goes: the same place its Tools card does. */
export type EntryTry = { label: string; href: string };

export type ReferenceEntry = {
  id: string;
  title: string;
  caption: string;
  keys: readonly string[];
  /** The caption's first sentence: a closed row's one line. */
  first: string;
  /** `A deck · Shopping`: a search result names it. */
  screen: string;
  /** The entry's screen's frame with its control haloed, or null when its screen has no frame. */
  shot: Shot | null;
  /** The entry is a card on Tools (`in Tools`). */
  inTools: boolean;
  /** Try it, for a tool whose card opens somewhere. */
  tryIt: EntryTry | null;
  /** The How it works row that explains it, when one does. */
  row: string | null;
  /** The entry it is drawn in place of (`AboutEntry.replaces`), so a link to that id lands here. */
  replaces?: string;
};

export type ReferenceScreen = {
  /** `home`, or `deck-shopping` for a deck's view: its anchor and its key. */
  key: string;
  name: string;
  where: string;
  entries: ReferenceEntry[];
};

/** The 23 screens, in order. */
type Place = { screen: AboutScreen; view?: DeckView };
export const REFERENCE_SCREENS: readonly Place[] = ABOUT_SCREENS.flatMap((screen): Place[] =>
  screen === "deck" ? DECK_VIEWS.map((view) => ({ screen, view })) : [{ screen }],
);

export function screenKey(place: { screen: AboutScreen; view?: DeckView }): string {
  return place.view ? `${place.screen}-${place.view}` : place.screen;
}

function tryOf(card: ShowcaseGroup["cards"][number]): EntryTry | null {
  const s = card.state;
  if (s.kind === "deck") return { label: showcaseCopy.tryOn(s.deck), href: s.href };
  if (s.kind === "page") return { label: s.label, href: s.href };
  return null;
}

/**
 * The screens, each with its entries in About's order. `entries` are the visible, resolved entries with the reader's
 * allowance already filled. `tools` are the drawn Tools cards, so `in Tools` and Try it follow the same switches the
 * Tools tab does. A screen with no visible entry is not drawn.
 */
export function referenceScreens(
  entries: readonly AboutEntry[],
  tools: readonly ShowcaseGroup[],
  theme: string | undefined,
): ReferenceScreen[] {
  const cards = new Map(tools.flatMap((g) => g.cards).map((c) => [c.entry, c]));
  return REFERENCE_SCREENS.map((place) => {
    const here = entries.filter((e) => e.screen === place.screen && (place.screen !== "deck" || e.view === place.view));
    return {
      key: screenKey(place),
      name: screenName(place),
      where: SCREEN_WHERE[place.screen],
      entries: here.map((e): ReferenceEntry => {
        const card = cards.get(e.id);
        return {
          id: e.id,
          title: e.title,
          caption: e.caption,
          keys: e.keys,
          first: firstSentence(e.caption),
          screen: screenName(place),
          shot: entryShotFor(theme, { id: e.id, screen: place.screen, view: place.view, ...(e.frame ? { frame: e.frame } : {}) }),
          inTools: card !== undefined,
          tryIt: card ? tryOf(card) : null,
          row: entryRow[e.id] ?? null,
          ...(e.replaces ? { replaces: e.replaces } : {}),
        };
      }),
    };
  }).filter((s) => s.entries.length > 0);
}

/**
 * Where a frame sits in a 3:2 window, so the entry's control is in view (README-r2 C5: an opened entry leads with its
 * screen, its control haloed). Every figure is a percentage of the WINDOW: the image's top offset and height, and the
 * halo's box. `position` is the same offset as the image's `object-position` y, for an image drawn as the design
 * draws it (filling the window, `object-fit: cover`). With no control placed, the window shows the top of the screen
 * and no halo. Frames are taller than the window (390x844); a wider one would be cropped at its sides by `cover`.
 */
export function frameWindow(shot: Pick<Shot, "width" | "height" | "halo">): {
  top: number;
  height: number;
  position: number;
  halo: { left: number; top: number; width: number; height: number } | null;
} {
  const ratio = shot.height / shot.width; // the frame's height in units of its width
  const window = 2 / 3; // the window's height in the same units
  const box = shot.halo;
  const centre = box ? (box.y + box.h / 2) * ratio : window / 2;
  const offset = Math.min(Math.max(centre - window / 2, 0), Math.max(ratio - window, 0));
  const pct = (units: number) => (units / window) * 100;
  return {
    top: -pct(offset),
    height: pct(ratio),
    position: ratio > window ? (offset / (ratio - window)) * 100 : 50,
    halo: box
      ? { left: box.x * 100, top: pct(box.y * ratio - offset), width: box.w * 100, height: pct(box.h * ratio) }
      : null,
  };
}
