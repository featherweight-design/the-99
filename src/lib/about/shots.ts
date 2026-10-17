import { ABOUT_SCREENS, DECK_VIEWS, type AboutScreen, type DeckView } from "../copy/about";
import { TOOLS, type ToolId } from "../discovery/tools";
import { DEFAULT_THEME, isThemeKey } from "../theme/themes";
import { SHOTS } from "./shots.generated";

/**
 * About's screenshot set (discovery R2·4, plan `2026-10-16-discovery-r2-r3.md`, decision 4): one frame per screen (a
 * deck's seven views each count as one), the 14 tool crops, and the tour's three pictures, in every theme. Captured by
 * `pnpm capture:about` into `public/about/shots/<theme>/<id>.webp`, which writes `shots.generated.ts` beside this.
 *
 * Client-safe: constants only.
 */

/** A frame's id: the screen, or `deck-<view>` for a deck's view. */
export function screenShotId(screen: Exclude<AboutScreen, "deck">): string;
export function screenShotId(screen: "deck", view: DeckView): string;
export function screenShotId(screen: AboutScreen, view?: DeckView): string {
  return screen === "deck" ? `deck-${view}` : screen;
}

export function toolShotId(tool: ToolId): string {
  return `tool-${tool}`;
}

/** The tour's locked stops' pictures (R3 C5): Commanders, Decks, and Buying's, which is a deck's Shopping. */
export const TOUR_SHOTS = ["tour-commanders", "tour-decks", "tour-shopping"] as const;

/** Every image the set must hold in every theme. */
export const REQUIRED_SHOTS: readonly string[] = [
  ...ABOUT_SCREENS.flatMap((s) => (s === "deck" ? DECK_VIEWS.map((v) => screenShotId("deck", v)) : [s])),
  ...TOOLS.map((t) => toolShotId(t.id)),
  ...TOUR_SHOTS,
];

/** A tool's control within its crop, as fractions of the crop: left, top, width, height. */
export type HaloBox = { x: number; y: number; w: number; h: number };

export type Shot = { src: string; width: number; height: number; halo: HaloBox | null };

export type ShotEntry = { width: number; height: number; bytes: number; quality: number; halo?: readonly [number, number, number, number] };
export type ShotSet = Record<string, Record<string, ShotEntry>>;
const SET = SHOTS as unknown as ShotSet;

/** A captured entry, read as an own property only: `toString` or `constructor` is never a shot. */
function entry(set: ShotSet, theme: string, id: string): ShotEntry | undefined {
  const shots = Object.hasOwn(set, theme) ? set[theme] : undefined;
  return shots !== undefined && Object.hasOwn(shots, id) ? shots[id] : undefined;
}

/**
 * The image for `id` in the reader's `theme` (the theme cookie's value, as the shell reads it). A theme with no capture
 * of it, an unknown theme included, reads the default theme's; an id the default has not captured is null.
 */
export function shotFor(theme: string | undefined, id: string, set: ShotSet = SET): Shot | null {
  const own = isThemeKey(theme) ? entry(set, theme, id) : undefined;
  const key = own ? (theme as string) : DEFAULT_THEME;
  const e = own ?? entry(set, DEFAULT_THEME, id);
  if (!e) return null;
  const halo = e.halo ? { x: e.halo[0], y: e.halo[1], w: e.halo[2], h: e.halo[3] } : null;
  return { src: `/about/shots/${key}/${id}.webp`, width: e.width, height: e.height, halo };
}
