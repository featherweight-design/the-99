import { TOOLS, type ToolId } from "../discovery/tools";
import { DEFAULT_THEME, isThemeKey } from "../theme/themes";
import { SHOTS } from "./shots.generated";

/**
 * About's screenshot set (discovery R2·4, plan `2026-10-16-discovery-r2-r3.md`, decision 4): the 14 tool crops and the
 * tour's three pictures, in every theme. Captured by `pnpm capture:about` into `public/about/shots/<theme>/<id>.webp`,
 * which writes `shots.generated.ts` beside this.
 *
 * Client-safe: constants only.
 */

export function toolShotId(tool: ToolId): string {
  return `tool-${tool}`;
}

/** The tour's locked stops' pictures (R3 C5): Commanders, Decks, and Buying's, which is a deck's Shopping. */
export const TOUR_SHOTS = ["tour-commanders", "tour-decks", "tour-shopping"] as const;

/** Every image the set must hold in every theme. */
export const REQUIRED_SHOTS: readonly string[] = [
  ...TOOLS.map((t) => toolShotId(t.id)),
  ...TOUR_SHOTS,
];

/** A tool's control within its crop, as fractions of the crop: left, top, width, height. */
export type HaloBox = { x: number; y: number; w: number; h: number };

export type Shot = { src: string; width: number; height: number; halo: HaloBox | null };

type Box = readonly [number, number, number, number];
/** `halo`: a tool crop's control, as fractions of the crop. */
export type ShotEntry = { width: number; height: number; bytes: number; quality: number; halo?: Box };
export type ShotSet = Record<string, Record<string, ShotEntry>>;
const SET = SHOTS as unknown as ShotSet;

/** A captured entry, read as an own property only: `toString` or `constructor` is never a shot. */
function entry_(set: ShotSet, theme: string, id: string): ShotEntry | undefined {
  const shots = Object.hasOwn(set, theme) ? set[theme] : undefined;
  return shots !== undefined && Object.hasOwn(shots, id) ? shots[id] : undefined;
}

/** The theme a read lands on and its entry: the reader's own capture, else the default theme's. */
function resolve(theme: string | undefined, id: string, set: ShotSet): { key: string; e: ShotEntry } | null {
  const own = isThemeKey(theme) ? entry_(set, theme, id) : undefined;
  if (own) return { key: theme as string, e: own };
  const fallback = entry_(set, DEFAULT_THEME, id);
  return fallback ? { key: DEFAULT_THEME, e: fallback } : null;
}

const box = (b: Box): HaloBox => ({ x: b[0], y: b[1], w: b[2], h: b[3] });

/**
 * The image for `id` in the reader's `theme` (the theme cookie's value, as the shell reads it). A theme with no capture
 * of it, an unknown theme included, reads the default theme's; an id the default has not captured is null.
 */
export function shotFor(theme: string | undefined, id: string, set: ShotSet = SET): Shot | null {
  const r = resolve(theme, id, set);
  if (!r) return null;
  return { src: `/about/shots/${r.key}/${id}.webp`, width: r.e.width, height: r.e.height, halo: r.e.halo ? box(r.e.halo) : null };
}
