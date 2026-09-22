import type { Bracket } from "./types";

/**
 * Which drawing of the bracket mark a given size gets.
 *
 * THREE FORMS, and the third is the one a naive reader misses. `ASSETS.md`: the full mark is
 * drawn at 26 / 36 / 44, the chip form at 22, and **below 20px `BracketMark` draws the numeral
 * alone and no file is used.**
 *
 * That floor is not a style choice. At 22px the chip's own numeral renders at ~9px and is not
 * legible, so the SILHOUETTE carries the rank — and below 20px the silhouette stops carrying it
 * too. A glyph nobody can read is not a signal, so the numeral takes over rather than a smaller
 * unreadable mark being drawn.
 */
export type MarkForm = "full" | "chip" | "numeral";

export function markForm(px: number): MarkForm {
  if (px < 20) return "numeral";
  return px < 26 ? "chip" : "full";
}

/**
 * The asset a form resolves to, or null where no file is used.
 *
 * SLUGS ARE DERIVED FROM ONE TABLE, never spelled at a call site. `fetch:mana` records what a
 * spelled slug costs: a rename ships as a silent 404, because the markup is identical whether or
 * not the art resolved.
 */
const SLUG: Record<Bracket, string> = {
  1: "bracket-1-exhibition",
  2: "bracket-2-core",
  3: "bracket-3-upgraded",
  4: "bracket-4-optimized",
  5: "bracket-5-cedh",
};

export function markAsset(bracket: Bracket, px: number): string | null {
  const form = markForm(px);
  if (form === "numeral") return null;
  return `/brackets/${SLUG[bracket]}${form === "chip" ? "-chip" : ""}.svg`;
}
