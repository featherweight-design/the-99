"use client";

// The annotation numeral, in one place.
//
// "Annotation is a numeral and a line" is the handoff's grammar, and the page
// shipped with the numerals on the LINES only — a numeral with nothing to point
// at is a bullet. The figure needs the same mark on the part each line
// describes, so the mark is a component rather than two class lists that agree
// today.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function KeyNumeral({
  n,
  className = "",
  style,
  onFigure = true,
}: {
  n: number;
  className?: string;
  style?: CSSProperties;
  /** False for the key list's own numerals, which are not marks ON a figure. */
  onFigure?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-key-numeral={onFigure ? n : undefined}
      className={`flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[9px] text-[color:var(--accent)] ${className}`}
      style={style}
    >
      {n}
    </span>
  );
}

/**
 * Where an anchored numeral sits against the part it names:
 * - `gutter`: in the wrapper's left gutter, level with the part
 * - `before` / `after`: 6px to the part's left or right, centred on it
 * - `above` / `below`: centred over or under the part, just clear of it
 * - `inset-tl` / `inset-tr` / `inset-br`: 5px inside that corner of the part
 */
export type NumeralSide = "gutter" | "before" | "after" | "above" | "below" | "inset-tl" | "inset-tr" | "inset-br";

export type NumeralAnchor = {
  n: number;
  /** Finds the part inside the figure; the figure's own copy or an existing test id or role. */
  find: (root: HTMLElement) => Element | null;
  side: NumeralSide;
  /** The side from 768px up, where the part moves between layouts. */
  mdSide?: NumeralSide;
  /** Level with the part's top line rather than its middle. */
  align?: "center" | "top";
};

const SIZE = 14;
const GAP = 6;

function place(side: NumeralSide, align: "center" | "top", t: DOMRect, r: DOMRect): { left: number; top: number } {
  const middle = align === "top" ? t.top - r.top + 1 : t.top - r.top + t.height / 2 - SIZE / 2;
  switch (side) {
    case "gutter":
      return { left: 0, top: middle };
    case "before":
      return { left: t.left - r.left - GAP - SIZE, top: middle };
    case "after":
      return { left: t.right - r.left + GAP, top: middle };
    case "above":
      return { left: t.left - r.left + t.width / 2 - SIZE / 2, top: t.top - r.top - SIZE - 2 };
    case "below":
      return { left: t.left - r.left + t.width / 2 - SIZE / 2, top: t.bottom - r.top + 2 };
    case "inset-tl":
      return { left: t.left - r.left + 5, top: t.top - r.top + 5 };
    case "inset-tr":
      return { left: t.right - r.left - SIZE - 5, top: t.top - r.top + 5 };
    case "inset-br":
      return { left: t.right - r.left - SIZE - 5, top: t.bottom - r.top - SIZE - 5 };
  }
}

/**
 * Numerals placed on parts of a MOUNTED app component, measured rather than guessed.
 *
 * A figure that mounts the app's own component cannot put a numeral inside it without editing
 * that component for the About page's sake, and a fixed pixel offset is right at one width and
 * wrong at the other (log-a-game's were). So the wrapper finds each part after layout, and places
 * the numeral against the part's own box, again whenever the figure resizes. Every numeral is in
 * the document from the first render, hidden until measured, so a count of them never depends on
 * layout.
 */
export function AnchoredNumerals({
  marks,
  gutter = false,
  className = "",
  children,
}: {
  marks: NumeralAnchor[];
  /** Reserves a 22px left gutter for `gutter` numerals. */
  gutter?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<Record<number, { left: number; top: number } | null>>({});

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const wide = window.matchMedia?.("(min-width: 768px)").matches ?? false;
      const next: Record<number, { left: number; top: number } | null> = {};
      for (const m of marks) {
        const target = m.find(el);
        next[m.n] = target
          ? place(wide && m.mdSide ? m.mdSide : m.side, m.align ?? "center", target.getBoundingClientRect(), r)
          : null;
      }
      setSpots(next);
    };
    measure();
    // Webfonts move text after the first layout without resizing the figure.
    void document.fonts?.ready.then(measure);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // The marks are declared inline by each figure; they are stable in meaning, and re-measuring
    // on every render would loop through the state write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className={`relative ${gutter ? "pl-[22px]" : ""} ${className}`}>
      {children}
      {marks.map((m) => {
        const at = spots[m.n];
        return (
          <KeyNumeral
            key={m.n}
            n={m.n}
            className="pointer-events-none absolute z-[60] bg-[color:var(--bg)]"
            style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: "hidden" }}
          />
        );
      })}
    </div>
  );
}

/**
 * The first element in `els` that is laid out, else the first at all. Many mounted components draw
 * a phone and a desktop copy and hide one, and a hidden copy measures as a zero box at the origin.
 */
function laidOut(els: Iterable<Element>): Element | null {
  let fallback: Element | null = null;
  for (const el of els) {
    if (el.getClientRects().length > 0) return el;
    fallback ??= el;
  }
  return fallback;
}

/** A finder for the first `selector` whose text is `text`, or contains it with `contains`. */
export function withText(selector: string, text: string, contains = false) {
  return (root: HTMLElement) =>
    laidOut(
      [...root.querySelectorAll(selector)].filter((el) =>
        contains ? (el.textContent ?? "").includes(text) : (el.textContent ?? "").trim() === text,
      ),
    );
}

/** A finder for the first laid-out element matching `selector`. */
export function first(selector: string) {
  return (root: HTMLElement) => laidOut(root.querySelectorAll(selector));
}

/** A finder for the `n`th laid-out element matching `selector`, counting from 0. */
export function nth(selector: string, n: number) {
  return (root: HTMLElement) =>
    [...root.querySelectorAll(selector)].filter((el) => el.getClientRects().length > 0)[n] ?? null;
}

/** A finder for the first element under `scope` whose `aria-label` starts with `prefix`. */
export function byAriaPrefix(scope: string, prefix: string) {
  return (root: HTMLElement) =>
    laidOut(
      [...root.querySelectorAll(`${scope} [aria-label]`)].filter((el) =>
        (el.getAttribute("aria-label") ?? "").startsWith(prefix),
      ),
    );
}


/** A finder for the first leaf under the first `scope` whose whole text matches `pattern`. */
export function leafMatching(scope: string, pattern: RegExp) {
  return (root: HTMLElement) =>
    laidOut(
      [...(first(scope)(root)?.querySelectorAll("*") ?? [])].filter(
        (el) => el.children.length === 0 && pattern.test((el.textContent ?? "").trim()),
      ),
    );
}
