import { DEFAULT_THEME, isThemeKey } from "../theme/themes";
import { PAGE_MANIFEST } from "./page-shots.generated";

/**
 * About as six visual pages (plan `2026-10-27-about-visual.md`, PR 2): the captures the pages draw, at the width the
 * reader is on, in every theme. Captured by `pnpm capture:about` into `public/about/pages/<theme>/<width>/<capture>.webp`
 * (and the desktop tool crops into `…/desktop/tools/<toolId>.webp`), which writes `page-shots.generated.ts` beside this.
 * The 390-only set (`shots.ts`) is untouched until PR 7b.
 *
 * THE RULE (Review Focus 4): the picture matches the device. A capture missing for a theme falls back to the default
 * theme's capture at the SAME width, never the other width's.
 *
 * Client-safe: constants only.
 */

export const PAGE_WIDTHS = ["phone", "desktop"] as const;
export type PageWidth = (typeof PAGE_WIDTHS)[number];

/** A box as fractions of its image: left, top, width, height. */
export type PageBox = readonly [number, number, number, number];

/** One capture: its pixel size, and each label region's and tool's box on it. */
export type PageShotEntry = {
  w: number;
  h: number;
  bytes: number;
  quality: number;
  regions: Record<string, PageBox>;
  tools: Record<string, PageBox>;
};

/** A tool card's desktop crop: the capture it was cut from, its pixel size and the tool's control within it. */
export type PageToolCrop = { capture: string; w: number; h: number; bytes: number; quality: number; halo: PageBox };

export type PageManifest = {
  shots: Record<string, Partial<Record<PageWidth, Record<string, PageShotEntry>>>>;
  tools: Record<string, Record<string, PageToolCrop>>;
};

export type PageShot = PageShotEntry & { src: string; theme: string; width: PageWidth };

export const PAGE_SHOTS = PAGE_MANIFEST.shots;

/** An own property only: `toString` or `constructor` is never a theme, a width or a capture. */
function own<T>(o: Record<string, T> | undefined, key: string): T | undefined {
  return o !== undefined && Object.hasOwn(o, key) ? o[key] : undefined;
}

function at(m: PageManifest, theme: string, width: PageWidth, capture: string): PageShotEntry | undefined {
  return own(own(own(m.shots, theme), width) as Record<string, PageShotEntry> | undefined, capture);
}

/**
 * The capture `capture` at `width` in the reader's `theme`: its own, else the default theme's at the same width. Null when
 * neither holds it; never a capture of the other width.
 */
export function pageShotFor(
  theme: string | undefined,
  width: PageWidth,
  capture: string,
  manifest: PageManifest = PAGE_MANIFEST,
): PageShot | null {
  const mine = isThemeKey(theme) ? at(manifest, theme, width, capture) : undefined;
  const key = mine ? (theme as string) : DEFAULT_THEME;
  const e = mine ?? at(manifest, DEFAULT_THEME, width, capture);
  if (!e) return null;
  return { ...e, src: `/about/pages/${key}/${width}/${capture}.webp`, theme: key, width };
}

/** A tool card's desktop crop in the reader's `theme`, else the default theme's. */
export function pageToolCropFor(
  theme: string | undefined,
  tool: string,
  manifest: PageManifest = PAGE_MANIFEST,
): (PageToolCrop & { src: string }) | null {
  const mine = isThemeKey(theme) ? own(own(manifest.tools, theme), tool) : undefined;
  const key = mine ? (theme as string) : DEFAULT_THEME;
  const e = mine ?? own(own(manifest.tools, DEFAULT_THEME), tool);
  return e ? { ...e, src: `/about/pages/${key}/desktop/tools/${tool}.webp` } : null;
}
