import { MOTION, prefersReducedMotion } from "./motion";

/**
 * Bring an element into view the way the app moves a reader to something they asked for: a beat
 * (`MOTION.delayMs`), then an eased scroll of its nearest scrollable ancestor (or the window) whose
 * length grows with the distance, capped; a jump under `prefers-reduced-motion: reduce` (Hugh,
 * 2026-10-11: picking a tool jumped; 2026-10-12: motion waits a beat, then eases). Any wheel, touch,
 * key or pointer press from the reader stops it where it is, so it never fights their own scroll.
 * Only `scrollTop`/`scrollLeft` move, one frame at a time: nothing is laid out again.
 *
 * `inline` moves the nearest sideways scroller too (a row of tiles); without it only the vertical
 * axis moves. A later reveal cancels one still running. Returns its own cancel.
 */
export type RevealBlock = "start" | "center" | "nearest";
export type RevealInline = "center" | "nearest";

/** What one axis of a scroller and the target measure, in that scroller's coordinates. */
export type AxisGeometry = {
  /** The scroller's offset now. */
  current: number;
  /** The furthest it can scroll. */
  max: number;
  /** Where its visible box starts on screen, and how long it is. */
  viewStart: number;
  viewSize: number;
  /** Where the target starts on screen (scroll margin included), and how long it is. */
  elStart: number;
  elSize: number;
};

/** The offset that puts the target where `mode` asks, clamped to what the scroller can reach. */
export function scrollTarget(g: AxisGeometry, mode: RevealBlock): number {
  const delta = g.elStart - g.viewStart;
  let to: number;
  if (mode === "start") to = g.current + delta;
  else if (mode === "center") to = g.current + delta - (g.viewSize - g.elSize) / 2;
  else if (delta < 0 || g.elSize > g.viewSize) to = g.current + delta;
  else if (delta + g.elSize > g.viewSize) to = g.current + delta + g.elSize - g.viewSize;
  else to = g.current;
  return Math.round(Math.min(Math.max(to, 0), Math.max(g.max, 0)));
}

/** Milliseconds per pixel past the floor: about 1,500px reaches the cap. */
export const SCROLL_MS_PER_PX = 0.25;

/** A scroll's length: the motion duration, plus a little per pixel, never past the cap. */
export function scrollDuration(distance: number): number {
  return Math.min(MOTION.scrollMaxMs, MOTION.durationMs + Math.abs(distance) * SCROLL_MS_PER_PX);
}

/** Where a scroll stands at `elapsed` ms into `duration`, on the motion curve. */
export function scrollAt(from: number, to: number, elapsed: number, duration: number): number {
  const p = duration <= 0 ? 1 : Math.min(Math.max(elapsed / duration, 0), 1);
  return from + (to - from) * MOTION.ease(p);
}

/** The reader's own input, any of which stops a reveal in flight. */
export const CANCEL_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

type Axis = "x" | "y";
/** A scroller on one axis; `null` is the window. */
type Track = { node: Element | null; axis: Axis; from: number; to: number };

function isRoot(n: Element): boolean {
  return n === document.documentElement || n === document.body;
}

function scrollerOf(el: Element, axis: Axis): Element | null | undefined {
  for (let n = el.parentElement; n && !isRoot(n); n = n.parentElement) {
    const s = getComputedStyle(n);
    const overflow = axis === "y" ? s.overflowY : s.overflowX;
    if (!/(auto|scroll|overlay)/.test(overflow)) continue;
    if (axis === "y" ? n.scrollHeight > n.clientHeight : n.scrollWidth > n.clientWidth) return n;
  }
  // The window scrolls the page vertically; nothing in this app scrolls the page sideways.
  return axis === "y" ? null : undefined;
}

function read(node: Element | null, axis: Axis): number {
  if (node) return axis === "y" ? node.scrollTop : node.scrollLeft;
  return axis === "y" ? window.scrollY : window.scrollX;
}

function write(node: Element | null, axis: Axis, v: number): void {
  if (node) {
    if (axis === "y") node.scrollTop = v;
    else node.scrollLeft = v;
  } else if (axis === "y") window.scrollTo(window.scrollX, v);
  else window.scrollTo(v, window.scrollY);
}

function track(el: Element, axis: Axis, mode: RevealBlock): Track | null {
  const node = scrollerOf(el, axis);
  if (node === undefined) return null;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const before = parseFloat(axis === "y" ? s.scrollMarginTop : s.scrollMarginLeft) || 0;
  const after = parseFloat(axis === "y" ? s.scrollMarginBottom : s.scrollMarginRight) || 0;
  let viewStart = 0, viewSize: number, max: number;
  if (node) {
    const b = node.getBoundingClientRect();
    viewStart = axis === "y" ? b.top + node.clientTop : b.left + node.clientLeft;
    viewSize = axis === "y" ? node.clientHeight : node.clientWidth;
    max = axis === "y" ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
  } else {
    const root = document.documentElement;
    viewSize = axis === "y" ? window.innerHeight : window.innerWidth;
    max = axis === "y" ? root.scrollHeight - viewSize : root.scrollWidth - viewSize;
  }
  const from = read(node, axis);
  const to = scrollTarget(
    {
      current: from,
      max,
      viewStart,
      viewSize,
      elStart: (axis === "y" ? r.top : r.left) - before,
      elSize: (axis === "y" ? r.height : r.width) + before + after,
    },
    mode,
  );
  return { node, axis, from, to };
}

let active: (() => void) | null = null;

/** A keypress that edits text in a field: a character, or a deletion, in an input, a textarea or
 *  editable content. */
function isTyping(e: KeyboardEvent): boolean {
  const t = e.target;
  const editable = t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)
    || (t instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(t.type));
  return editable && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete");
}

export function reveal(
  el: Element | null | undefined,
  block: RevealBlock = "start",
  inline?: RevealInline,
): () => void {
  if (!el || typeof window === "undefined") return () => {};
  // A hidden instance (the card modal draws its meta twice, one hidden by CSS) has no box to bring.
  if (el.getClientRects().length === 0) return () => {};
  active?.();
  const plan = () =>
    [track(el, "y", block), inline ? track(el, "x", inline) : null].filter(
      (t): t is Track => t !== null && t.to !== t.from,
    );

  if (prefersReducedMotion()) {
    for (const t of plan()) write(t.node, t.axis, t.to);
    return () => {};
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let frame: number | null = null;
  const stop = () => {
    if (timer !== null) clearTimeout(timer);
    if (frame !== null) cancelAnimationFrame(frame);
    timer = frame = null;
    for (const type of CANCEL_EVENTS) window.removeEventListener(type, onInput, true);
    if (active === stop) active = null;
  };
  // Typing into a field inside the target is the reader using what was brought to them (the note
  // field whose picker opened the reveal), not the reader going elsewhere, so it lets the scroll run.
  // Any other key (Tab, Enter, an arrow) moves focus or acts, and stops it as before.
  const onInput = (e: Event) => {
    if (e instanceof KeyboardEvent && isTyping(e) && e.target instanceof Node && el.contains(e.target)) return;
    stop();
  };
  for (const type of CANCEL_EVENTS) window.addEventListener(type, onInput, { capture: true, passive: true });
  active = stop;

  // Measured after the beat, not before it: whatever the reader's press drew has laid out by then.
  timer = setTimeout(() => {
    timer = null;
    const tracks = plan();
    if (tracks.length === 0) return stop();
    const duration = scrollDuration(Math.max(...tracks.map((t) => Math.abs(t.to - t.from))));
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      for (const t of tracks) write(t.node, t.axis, scrollAt(t.from, t.to, elapsed, duration));
      if (elapsed >= duration) return stop();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }, MOTION.delayMs);
  return stop;
}
