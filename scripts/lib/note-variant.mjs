// Which credit note landed beside Analyze, and how far the Tuning hub may move when it does
// (Hugh, 2026-10-15). The empty state reserves TWO of the note's own lines while the note's read is out
// (`min-h-[2lh]` in analysis-empty.tsx), so a note of up to two lines must move nothing. The used-up
// and owner-share notes can run longer and grow past that frame by their extra lines (measured
// 2026-10-15: used up 3 lines at 1300, +7px).
// Read from the note's rendered words, mirroring the copy in src/lib/copy/synopsis.ts, credits.ts and
// notices.ts; a note matching none is "unknown" and FAILS, so an unexpected variant never passes silently.

/** Lines the empty state reserves for the note. */
export const RESERVED_LINES = 2;

/** The variants the reservation is built for, whose landing must move nothing. */
export const COVERED = new Set(["credit", "free", "check"]);

export function noteVariant(text) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t === "") return "none";
  if (/^Reads the bracket only; you(’|')ve used your testing share/.test(t)) return "ownerShare";
  if (/^Reads the bracket only; the overview (waits for a credit|stays as it was)\./.test(t)) return "usedUp";
  if (/^Reads the bracket only\. The overview waits until every card is legal/.test(t)) return "check";
  if (/^Also writes the overview, free this once/.test(t)) return "free";
  if (/^Also writes the overview, using a credit\./.test(t)) return "credit";
  return "unknown";
}

/**
 * The hub's allowed move for a note that landed. `shape` is `{ text, lines, lineHeight }` read in the
 * page (`NOTE_SHAPE`), or null when no note landed.
 *  - no note, or a covered variant: 1px (strict). A covered note that runs past the reserved lines is
 *    still held to 1px: the reservation was meant to hold it, so a move there is a finding.
 *  - used up, owner share: its extra lines past the reservation, plus 1px. An upper bound: at
 *    1300 the 44px button already holds part of a third line.
 *  - unknown: never allowed (`ok` false), whatever the move.
 */
export function hubMoveRule(shape) {
  const variant = shape ? noteVariant(shape.text) : "none";
  if (variant === "unknown") return { variant, strict: true, allowed: -1 };
  if (variant === "none" || COVERED.has(variant)) return { variant, strict: true, allowed: 1 };
  const extra = Math.max(0, (shape.lines ?? 0) - RESERVED_LINES);
  return { variant, strict: false, allowed: extra * (shape.lineHeight ?? 0) + 1 };
}

/** Judges a list of hub tops (from the hub's first frame) against the rule: `{ ok, moved, ...rule }`. */
export function judgeHubMove(tops, shape) {
  const rule = hubMoveRule(shape);
  const first = tops[0] ?? null;
  const moved = first === null ? null : Math.max(...tops.map((t) => Math.abs(t - first)));
  return { ...rule, moved, ok: moved !== null && rule.allowed >= 0 && moved <= rule.allowed };
}

/**
 * Evaluated in the page with the scope as its argument: the landed note's words, how many lines it
 * draws (distinct line tops of its contents) and its line height, or null when no note is drawn.
 */
export const NOTE_SHAPE = (scope) => {
  const p = document.querySelector(`${scope} [data-testid='press-note']`);
  if (!p || p.getClientRects().length === 0) return null;
  const r = document.createRange();
  r.selectNodeContents(p);
  const lines = new Set([...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0).map((x) => Math.round(x.top))).size;
  return { text: p.textContent, lines, lineHeight: parseFloat(getComputedStyle(p).lineHeight) };
};
