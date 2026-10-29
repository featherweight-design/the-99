// About's line on Home's banner, the browser's half (About visual PR 6b): what the banner is handed, and the two pure
// rules it draws with. Client-safe: no catalog, no manifest. The server's half is `notice.ts`.

import type { PageBox } from "./page-shots";

/** A label's region on one capture: the capture's address and pixel size, and the region as fractions of it. */
export type BannerCrop = { src: string; w: number; h: number; box: PageBox };

/** One launch line: what it names, where Show me lands, what its acknowledgement covers and its picture per width. */
export type AboutLaunch = {
  /** The announce key (`UnseenUnit.key`): what the ✕ claims and a page visit acknowledges. */
  key: string;
  /** What acknowledging it writes, as the server RENDERED it (`UnseenUnit.ack`): the ✕ claims these keys, and the
   *  server writes only those of them it still announces, so a sentence switched on after the render stays new. */
  ack: readonly string[];
  /** "New on {page}:", drawn in `--fg` before the unit's words (`ABOUT_PAGE_STRINGS.bannerLead`). */
  lead: string;
  /** The unit's words as this reader is drawn them: a label's lead and rest, a rule's text, or a new sentence alone. */
  text: string;
  /** Show me: the unit's page, lit, scrolled to its section. */
  href: string;
  /** The label's region at each width, or null (a rule, or a label no capture measured): the diamond mark instead. */
  phone: BannerCrop | null;
  desktop: BannerCrop | null;
};

/**
 * What the browser is handed. `ids` is what a page visit in the same document acknowledges: first run, every unit's
 * key (the line stands for every page); behind, each launch's key. The ✕ claims the RENDERED ack keys: first run,
 * `ack`, the whole baseline a first visit writes; behind, each launch's `ack`. `theme` is the theme the launches'
 * crops were cut in, so a theme picked in place asks the server again (`ThemeRefresh`).
 */
export type AboutLine =
  | { kind: "firstRun"; ids: string[]; ack: string[] }
  | { kind: "launches"; launches: AboutLaunch[]; ids: string[]; theme: string };

/** The banner's cap, the shipped one: four lines show in full; past four, three show and "and N more". */
export function bannerCap(n: number): { shown: number; more: number } {
  return n <= 4 ? { shown: n, more: 0 } : { shown: 3, more: n - 3 };
}

/** How much of the box the region fills, along its tighter side: the Ways-In crops leave a fifth of it as margin. */
export const CROP_FILL = 0.8;

/**
 * Where a crop's image sits in a box of `boxW` by `boxH` CSS pixels: scaled so the label's region fills `CROP_FILL` of
 * the box, centred on it, and held so the image never leaves a gap at the box's edge where it could cover it (the
 * Ways-In board's crops, measured: its Matchups and Proposed cuts regions are 80% of their boxes' widths).
 */
export function cropStyle(crop: BannerCrop, boxW: number, boxH: number): { left: number; top: number; width: number; height: number } {
  const [x, y, w, h] = crop.box;
  const scale = CROP_FILL * Math.min(boxW / Math.max(w * crop.w, 1), boxH / Math.max(h * crop.h, 1));
  const width = crop.w * scale;
  const height = crop.h * scale;
  const hold = (at: number, box: number, size: number) => Math.min(0, Math.max(box - size, at));
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    left: r(hold(boxW / 2 - (x + w / 2) * width, boxW, width)),
    top: r(hold(boxH / 2 - (y + h / 2) * height, boxH, height)),
    width: r(width),
    height: r(height),
  };
}
