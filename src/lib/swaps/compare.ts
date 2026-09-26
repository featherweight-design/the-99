/**
 * A spell stand-in's comparison line (the stand-in row addendum, 3a): what it keeps, gains and loses
 * against the card it replaces, fitted to the row's budget before it is drawn.
 *
 * The budget is 1 line at 1300 (the comparison measures ~560px) and 2 at 390 (~315px). Over budget the
 * writer drops a gained item, then the whole gains group, then keeps items past the first. It NEVER drops
 * a loss. The row clips at 19px / 41px as a backstop only; `measure:swap-lines` asserts it never engages.
 *
 * The fit is decided by simulating the row's inline flow, not by counting characters. The line breaks
 * only between items (READINESS E3): a group that fits a line stays whole, and one that doesn't may start
 * on the current line and continue on the next. The widths are IBM Plex Sans at 12px and Plex Mono,
 * measured in the app (2026-09-26), so the simulation and the browser agree to within a few pixels.
 * The budget keeps 3px of slack a line for that (`SLACK`).
 */

export type CompareGroup = "keeps" | "gains" | "loses";

export type Compare = {
  /** An other-types row's type, and `staple` for a universal staple (mono 10.5, no tag). */
  type: string | null;
  keeps: string[];
  gains: string[];
  loses: string[];
};

/** The comparison's width and line budget at each layout (addendum 3a). */
export const COMPARE_BUDGETS = [
  { width: 560, lines: 1 },
  { width: 315, lines: 2 },
] as const;

/** IBM Plex Sans advance widths at 12px, measured in the app. */
const SANS_12: Record<string, number> = (() => {
  const groups: [number, string][] = [
    [2.83, " "], [2.9, "'"], [3, "ij"], [3.21, "l"], [3.26, ",."], [3.28, "’"], [3.3, "/"], [3.41, "!"], [3.5, ":;"],
    [3.77, "|"], [3.8, "[]"], [3.89, "f"], [4.02, "()"], [4.12, "t{}"], [4.4, "r"], [4.6, "\\"], [4.79, "-"], [4.8, "I"],
    [5.03, "\""], [5.4, "*"], [5.57, "z"], [5.72, "?"], [5.78, "s"], [5.9, "v"], [5.97, "c"], [5.99, "y"], [6.01, "L"],
    [6.05, "J"], [6.08, "x"], [6.33, "k"], [6.36, "g"], [6.41, "a"], [6.59, "e"], [6.71, "F"], [6.72, "o"], [6.78, "_"],
    [6.82, "hnu"], [6.86, "S"], [6.96, "Zbdpq"], [7, "E"], [7.11, "T"], [7.12, "Y"], [7.18, "$"], [7.2, "0123456789+<=>^`~"],
    [7.27, "P"], [7.31, "C"], [7.36, "VX"], [7.61, "K"], [7.68, "R"], [7.84, "B"], [7.85, "A"], [8.05, "D"], [8.14, "U"],
    [8.33, "&"], [8.34, "G"], [8.48, "HN"], [8.5, "OQ"], [8.56, "#"], [9.22, "w"], [9.75, "M"], [10.48, "m"], [10.69, "@"],
    [10.75, "W"], [11.12, "%"],
  ];
  return Object.fromEntries(groups.flatMap(([w, chars]) => [...chars].map((c) => [c, w])));
})();
/** A character the table lacks (a symbol, an accented letter): a wide lowercase letter's width, to err long. */
const SANS_FALLBACK = 7.2;
/** Plex Mono at 10.5px: every glyph is the same width. */
const MONO_10_5 = 7.35;
/** A tag: 29.75px of 8.5px mono at 0.1em, 5px padding each side, a 1px border each side. */
const TAG = 29.75 + 10 + 2;
/** The tag's gap to its first item. */
const TAG_GAP = 6;
/** Between groups: the group's 11px end margin plus the space that lets the line break there (14px). */
const GROUP_GAP = 11;
const SPACE = SANS_12[" "];
/**
 * The model's error against the browser, per line. The table's advances are rounded and carry no kerning,
 * so a comparison the model puts within a pixel of the budget can still wrap: 1px let 4 rows at 390 and 3
 * at 1300 clip (measured 2026-09-26), where the old trailing group gap had been absorbing it by accident.
 */
const SLACK = 3;

const sans = (text: string) => [...text].reduce((w, c) => w + (SANS_12[c] ?? SANS_FALLBACK), 0);

/**
 * The comparison as the unbreakable runs the browser lays out: each run's own width, the space before it,
 * and the margin after it (a group's last run carries the gap to the next group).
 */
function runs(c: Compare): { w: number; gap: number; trail: number }[] {
  const out: { w: number; gap: number; trail: number }[] = [];
  let pending = 0;
  if (c.type) { out.push({ w: c.type.length * MONO_10_5, gap: 0, trail: GROUP_GAP }); pending = SPACE; }
  const groups = (["keeps", "gains", "loses"] as const).filter((g) => c[g].length > 0);
  groups.forEach((group, gi) => {
    const items = c[group];
    // Only a group with another after it carries the end margin, as `Comparison` draws it.
    const groupTrail = gi < groups.length - 1 ? GROUP_GAP : 0;
    items.forEach((item, i) => {
      const last = i === items.length - 1;
      // The tag rides with the first item: a tag never ends a line.
      out.push({ w: (i === 0 ? TAG + TAG_GAP : 0) + sans(last ? item : `${item},`), gap: i === 0 ? pending : SPACE, trail: last ? groupTrail : 0 });
    });
    pending = SPACE;
  });
  return out;
}

/** How many lines the comparison takes at a width, breaking only between runs. */
export function compareLines(c: Compare, width: number): number {
  const rs = runs(c);
  if (rs.length === 0) return 0;
  let lines = 1;
  let x = -1;
  for (const r of rs) {
    // The break comes at the space AFTER a group's end margin, so the margin stays on the line with its
    // group and has to fit there too; only the space may hang.
    if (x < 0) { x = r.w + r.trail; continue; }
    if (x + r.gap + r.w + r.trail <= width - SLACK) { x += r.gap + r.w + r.trail; continue; }
    lines += 1;
    x = r.w + r.trail;
  }
  return lines;
}

const fits = (c: Compare) => COMPARE_BUDGETS.every((b) => compareLines(c, b.width) <= b.lines);

/**
 * The comparison cut to its budget, in the addendum's order: gained items from the last, then the whole
 * gains group, then kept items past the first. Losses are never dropped. A comparison that still does not
 * fit is returned as it stands, for the measure to report.
 */
export function fitCompare(c: Compare): Compare {
  let out = { ...c, keeps: [...c.keeps], gains: [...c.gains], loses: [...c.loses] };
  if (fits(out)) return out;
  // 1. One gained item, the last (a lower mana value is written last, so it goes first).
  if (out.gains.length > 1) out = { ...out, gains: out.gains.slice(0, -1) };
  if (fits(out)) return out;
  // 2. The whole gains group.
  out = { ...out, gains: [] };
  // 3. Kept items past the first, from the last.
  while (!fits(out) && out.keeps.length > 1) out = { ...out, keeps: out.keeps.slice(0, -1) };
  return out;
}

/**
 * The row's classes, beside the widths above that model them, so `measure:swap-lines` lays out the same
 * markup the sheet draws. The 6px after a tag and the 11px after a group, plus the space that follows it,
 * must stay in step with `TAG_GAP` and `GROUP_GAP`.
 */
/**
 * The canvas sets a 3px gap between wrapped lines. An inline flow has no row gap, so below `md` the line box
 * carries it: 12 x 1.45 = 17.4px plus 3 is a 20.4px line, and the margins take back the 1.5px of extra
 * leading above the first line and below the last, so the row sits where the canvas draws it. Two lines are
 * 40.8px, under the 41px backstop. From `md` the comparison is one line and keeps its 1.45.
 */
export const COMPARE_CLASS =
  "col-span-full m-0 pl-[43px] mt-[0.5px] -mb-[1.5px] leading-[20.4px] max-h-[41px] md:mt-[3px] md:mb-0 md:leading-[1.45] md:max-h-[19px] text-[12px] overflow-hidden";
export const TYPE_CLASS = "mr-[11px] whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-muted)]";
export const GROUP_GAP_CLASS = "mr-[11px]";
export const COMMA_CLASS = "text-[color:var(--fg-faint)]";

const TAG_BASE = "inline-block align-middle mr-[6px] px-[5px] py-[2px] rounded-[4px] font-mono text-[8.5px] leading-none uppercase tracking-[0.1em]";
export const TAG_CLASS = {
  keeps: `${TAG_BASE} text-[color:var(--fg-body)] bg-[var(--surface)] border border-[color:var(--border-strong)]`,
  gains: `${TAG_BASE} text-[color:var(--fg-body)] bg-[var(--surface)] border border-[color:var(--border-strong)]`,
  loses: `${TAG_BASE} text-[color:var(--fg-muted)] bg-transparent border border-dashed border-[color:var(--border-dashed)]`,
} as const;
/** Kept and gained items in `--fg-body`, lost ones in `--fg-muted`; an item never breaks inside itself. */
export const ITEM_CLASS = {
  keeps: "whitespace-nowrap text-[color:var(--fg-body)]",
  gains: "whitespace-nowrap text-[color:var(--fg-body)]",
  loses: "whitespace-nowrap text-[color:var(--fg-muted)]",
} as const;
