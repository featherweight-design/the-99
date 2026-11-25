// Finds the copy on the page. Walks the DOM once for text the editor knows (`matchText` against the rows), keeps a
// live Range per hit, and measures each Range on demand. Nothing is written to the page: no attribute, no class.
import { matchText, type Match, type RowIndex } from "../../lib/copy-editor/match";

/** The overlay's own nodes carry this attribute and are never scanned, targeted or clicked through. */
export const OVERLAY_ATTR = "data-copy-editor";

/** Longer text than this is not one copy line; a container is not tried as a whole. */
const MAX_LINE = 300;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "TEMPLATE", "TITLE"]);

export type Entry = {
  id: number;
  range: Range;
  matches: Match[];
  /** The first match decides it: a row with a `readOnly` reason cannot be edited. */
  readOnly: string;
  /** The ancestors (host included) whose overflow clips what the range draws. */
  clips: Element[];
};

export type Box = { x: number; y: number; w: number; h: number };
export type Placed = { entry: Entry; box: Box; clipped: boolean };

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function skipped(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName) || el.hasAttribute(OVERLAY_ATTR)) return true;
  if (el.namespaceURI === "http://www.w3.org/2000/svg" && el.tagName !== "svg") return true;
  return false;
}

function clipsOf(el: Element): Element[] {
  const out: Element[] = [];
  for (let e: Element | null = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.display === "contents") continue;
    if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) out.push(e);
  }
  return out;
}

function shown(el: Element): boolean {
  // A wrapper with no box of its own (`display: contents`) reads as not visible, yet its children draw.
  if (getComputedStyle(el).display === "contents") return true;
  const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  return check ? check.call(el, { visibilityProperty: true }) : true;
}

/** Every piece of visible text on the page that is a known copy row. */
export function scanPage(index: RowIndex, root: Element = document.body): Entry[] {
  const out: Entry[] = [];
  const seen = new Map<string, Match[]>();
  const find = (text: string): Match[] => {
    let hit = seen.get(text);
    if (!hit) {
      hit = matchText(index, text);
      seen.set(text, hit);
    }
    return hit;
  };
  const add = (range: Range, matches: Match[], host: Element) => {
    out.push({ id: out.length, range, matches, readOnly: matches[0].row.readOnly, clips: clipsOf(host) });
  };

  const visit = (el: Element) => {
    if (skipped(el) || !shown(el)) return;
    const nodes = [...el.childNodes];
    const direct = nodes.filter((n) => n.nodeType === Node.TEXT_NODE && squash((n as Text).data) !== "");
    if (direct.length > 0) {
      const whole = squash(el.textContent ?? "");
      if (whole.length <= MAX_LINE) {
        const matches = find(whole);
        if (matches.length > 0) {
          const range = document.createRange();
          range.selectNodeContents(el);
          // An element mixing text with child elements (a bold lead plus a body) whose whole text is only a template fit is
          // probably several rows side by side: try the parts first and keep the whole only when no part is a row.
          const mixed = nodes.some((n) => n.nodeType === Node.ELEMENT_NODE);
          if (!mixed || matches[0].how === "exact") {
            add(range, matches, el);
            return;
          }
          const before = out.length;
          visitChildren(el, nodes);
          if (out.length === before) add(range, matches, el);
          return;
        }
      }
    }
    visitChildren(el, nodes);
  };
  const visitChildren = (el: Element, nodes: ChildNode[]) => {
    for (const n of nodes) {
      if (n.nodeType === Node.ELEMENT_NODE) visit(n as Element);
      else if (n.nodeType === Node.TEXT_NODE) {
        const text = squash((n as Text).data);
        const matches = text ? find(text) : [];
        if (matches.length > 0) {
          const range = document.createRange();
          range.selectNode(n);
          add(range, matches, el);
        }
      }
    }
  };
  visit(root);
  return out;
}

/** Where an entry draws now, in viewport pixels, or null when nothing of it shows (scrolled out of a clip, zero size). */
export function place(entry: Entry): Placed | null {
  const r = entry.range.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  let left = r.left;
  let top = r.top;
  let right = r.right;
  let bottom = r.bottom;
  for (const c of entry.clips) {
    const b = c.getBoundingClientRect();
    left = Math.max(left, b.left);
    top = Math.max(top, b.top);
    right = Math.min(right, b.right);
    bottom = Math.min(bottom, b.bottom);
  }
  if (right - left < 1 || bottom - top < 1) return null;
  const clipped = left > r.left + 1 || top > r.top + 1 || right < r.right - 1 || bottom < r.bottom - 1;
  return { entry, box: { x: left, y: top, w: right - left, h: bottom - top }, clipped };
}

/** The placed entry under a point: of those that contain it, the smallest, so a word inside a paragraph wins. */
export function entryAt(placed: Placed[], x: number, y: number): Placed | null {
  let best: Placed | null = null;
  for (const p of placed) {
    const { box } = p;
    if (x < box.x - 2 || x > box.x + box.w + 2 || y < box.y - 2 || y > box.y + box.h + 2) continue;
    if (!best || box.w * box.h < best.box.w * best.box.h) best = p;
  }
  return best;
}
