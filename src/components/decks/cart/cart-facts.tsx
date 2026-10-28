"use client";

// The cart row's facts (v2 call 1): need, spare and own, each a count followed by the names behind it. On a phone each
// is a labelled line; on desktop each is a column under `cart-columns.tsx`'s header, the label kept for a screen reader.
//
// A list of names longer than its cell shows what fits, then a pill (call 2, G6, addendum R2 ruling 3): whole names
// only, dropped from the end until the rest fit beside the pill; a first name too wide even alone is the one name ever
// cut, with an ellipsis. The pill opens the full list in place, under the fact, and reads `less` to fold it. The
// accessible name always carries every name in full.

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { TOUCH_HIT } from "../../ui/touch-hit";

/** The pill after the names: `+N` names left out, or `more` when the only thing hidden is the end of one cut name. */
export type FitPill = { kind: "count"; rest: number } | { kind: "more" } | null;
/** How many whole names show, whether the first of them is cut, and the pill. */
export type Fit = { shown: number; cut: boolean; pill: FitPill };

/**
 * The fit rule, on measured widths in px: `avail` is the slot the names and the pill share, `names` each name's
 * width, `sep` the `, ` between two, `gap` the space before the pill, `pill(rest)` a `+rest` pill's width.
 * Unmeasured (`avail` 0, before layout or with nothing drawn), every name shows and the cell's own clip applies.
 */
export function fitNames(input: {
  avail: number;
  names: readonly number[];
  sep: number;
  gap: number;
  pill: (rest: number) => number;
}): Fit {
  const { avail, names, sep, gap, pill } = input;
  const n = names.length;
  if (n === 0 || avail <= 0) return { shown: n, cut: false, pill: null };
  const run = (k: number) => names.slice(0, k).reduce((w, x) => w + x, 0) + sep * (k - 1);
  if (run(n) <= avail) return { shown: n, cut: false, pill: null };
  for (let k = n - 1; k >= 1; k--) {
    if (run(k) + gap + pill(n - k) <= avail) return { shown: k, cut: false, pill: { kind: "count", rest: n - k } };
  }
  // Not even the first name fits beside its pill: it is cut, and the pill names what follows it, or the cut itself.
  return { shown: 1, cut: true, pill: n > 1 ? { kind: "count", rest: n - 1 } : { kind: "more" } };
}

const PILL =
  "inline-flex h-[19px] flex-none items-center rounded-[5px] border border-[color:var(--border-strong)] font-mono text-[10.5px] font-medium leading-none";
const GAP = 7;

type Measure = () => void;

/**
 * One `ResizeObserver` for a whole list (G6: per list, never per row), and the pill ruler every fact in it reads:
 * `+8` and `+88` give a `+N` pill's width at any digit count, since the face is monospaced.
 */
class FitRegistry {
  private ro: ResizeObserver | null = null;
  private fits = new Map<Element, Measure>();
  private ruler: HTMLElement | null = null;

  /** Set from the provider's layout effect, which runs after its facts' own: a fact measured before it read no ruler,
   *  so attaching one measures every fact again, still before paint. */
  attach(ruler: HTMLElement | null) {
    this.ruler = ruler;
    if (ruler) for (const measure of this.fits.values()) measure();
  }

  watch(el: Element, measure: Measure): () => void {
    this.fits.set(el, measure);
    if (typeof ResizeObserver !== "undefined") {
      this.ro ??= new ResizeObserver((entries) => {
        for (const e of entries) this.fits.get(e.target)?.();
      });
      this.ro.observe(el);
    }
    measure();
    return () => {
      this.fits.delete(el);
      this.ro?.unobserve(el);
    };
  }

  pill(rest: number): number {
    const [one, two] = this.ruler ? [...this.ruler.children].map(width) : [0, 0];
    return one + (String(rest).length - 1) * Math.max(0, two - one);
  }
}

/** A drawn width to the fraction of a pixel: `offsetWidth` rounds, and rounded names summed can cut one at its end. */
const width = (el: Element) => el.getBoundingClientRect().width;

const FitContext = createContext<FitRegistry | null>(null);

/** Wraps one list: its rows' facts share the observer and the ruler. */
export function NameFitProvider({ children }: { children: ReactNode }) {
  const ruler = useRef<HTMLSpanElement>(null);
  const [registry] = useState(() => new FitRegistry());
  useLayoutEffect(() => {
    registry.attach(ruler.current);
    return () => registry.attach(null);
  }, [registry]);
  return (
    <FitContext.Provider value={registry}>
      {children}
      <span
        aria-hidden
        ref={ruler}
        className="invisible absolute left-0 top-0 h-0 w-0 overflow-hidden"
      >
        <span className={`${PILL} px-[6px]`}>+8</span>
        <span className={`${PILL} px-[6px]`}>+88</span>
      </span>
    </FitContext.Provider>
  );
}

/**
 * The fit for one list of names in one slot: measured before paint and again whenever the list's observer sees the
 * slot change size. Without a provider nothing is measured and every name shows.
 */
function useNameFit(names: readonly string[]) {
  const registry = useContext(FitContext);
  const slot = useRef<HTMLSpanElement>(null);
  const ruler = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<Fit>({ shown: names.length, cut: false, pill: null });
  const key = names.join("\u0000");
  useLayoutEffect(() => {
    const el = slot.current;
    if (!registry || !el) return;
    return registry.watch(el, () => {
      const parts = ruler.current ? [...ruler.current.children].map(width) : [];
      const sep = parts.pop() ?? 0;
      const next = fitNames({ avail: width(el), names: parts, sep, gap: GAP, pill: (rest) => registry.pill(rest) });
      setFit((prev) => (prev.shown === next.shown && prev.cut === next.cut && pillKey(prev.pill) === pillKey(next.pill) ? prev : next));
    });
  }, [registry, key]);
  return { fit, slot, ruler };
}

const pillKey = (p: FitPill) => (p === null ? "" : p.kind === "more" ? "more" : `+${p.rest}`);

export type FactItem = { name: string; count: number };

/**
 * One fact: the phone's label in its 44px gutter, then the count and what fits of the names, then the pill. Open, the
 * names give way to `head` (`for 4 decks`) and the full list sits under the line on `--surface-sunken`.
 */
export function CartFact({
  label,
  count,
  items,
  head,
  moreAria,
  prefix,
  fallback,
  lead,
  dim = false,
  className = "",
  testId,
}: {
  /** The phone's label (`need`, `spare`, `own`); on desktop the column header shows it, and it stays for a screen reader. */
  label: string;
  count: number;
  items: readonly FactItem[];
  /** The open list's head, in place of the names. */
  head: string;
  /** The pill's name while it shows `+N`. */
  moreAria: (rest: number) => string;
  /** A word before the names (`in`). */
  prefix?: string;
  /** Said in place of the names when they are not known (G1's `in other decks`): no pill. */
  fallback?: string;
  /** Drawn before the count (By card's spare glyph press). */
  lead?: ReactNode;
  /** The own fact, a step down: `--fg-muted` values with a weight-500 `--fg-body` count. */
  dim?: boolean;
  /** The cell's placement in the row's desktop grid. */
  className?: string;
  testId?: string;
}) {
  const names = items.map((i) => i.name);
  const { fit, slot, ruler } = useNameFit(fallback === undefined ? names : []);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const pill: FitPill = fallback !== undefined ? null : fit.pill;
  const shown = names.slice(0, fit.shown).join(", ");
  const line = (
    <span
      className={`flex min-w-0 items-baseline gap-[7px] whitespace-nowrap font-mono text-[11.5px] leading-[1.5] ${
        dim ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-body)]"
      }`}
    >
      <b className={`flex-none font-mono text-[13px] ${dim ? "font-medium text-[color:var(--fg-body)]" : "font-semibold text-[color:var(--fg)]"}`}>
        {count}
      </b>
      {fallback !== undefined ? (
        <span className="min-w-0 truncate">{fallback}</span>
      ) : (
        <>
          {prefix !== undefined && !open ? <span className="flex-none">{prefix}</span> : null}
          {/* The slot the names and the pill share, the width the rule fits to. The pill stays one element open or
              shut, so focus stays on it. */}
          <span ref={slot} data-fact-slot className="relative flex min-w-0 flex-1 items-baseline gap-[7px]">
            {open ? (
              <span key="head" className="min-w-0 truncate">{head}</span>
            ) : (
              <span key="names" aria-hidden data-fact-names className="min-w-0 flex-[0_1_auto] truncate">{shown}</span>
            )}
            {/* What fits is drawn; every name in full is read. */}
            {open ? null : <span key="read" className="sr-only">{names.join(", ")}</span>}
            <span key="ruler" ref={ruler} aria-hidden className="invisible absolute left-0 top-0 h-0 w-0 overflow-hidden whitespace-nowrap">
              {names.map((nm, i) => <span key={i} className="inline-block">{nm}</span>)}
              <span className="inline-block whitespace-pre">{", "}</span>
            </span>
            {open || pill !== null ? (
              <PillPress key="pill" pill={pill} open={open} listId={listId} moreAria={moreAria} onPress={() => setOpen(!open)} />
            ) : null}
          </span>
        </>
      )}
    </span>
  );
  return (
    <div
      data-fact={testId}
      data-fact-open={open ? "" : undefined}
      className={`grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-baseline md:flex md:flex-col md:items-stretch ${className}`}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] md:sr-only">{label}</span>
      {lead ? <span className="flex min-w-0 items-center gap-[8px]">{lead}{line}</span> : line}
      {open ? (
        <ul
          id={listId}
          className="col-start-2 m-0 mt-[4px] grid list-none grid-cols-[minmax(0,1fr)_auto] gap-x-[14px] gap-y-[3px] rounded-[8px] bg-[color:var(--surface-sunken)] px-[10px] py-[8px] font-mono text-[11.5px] leading-[1.5] text-[color:var(--fg-body)]"
        >
          {items.map((it, i) => (
            <li key={i} className="col-span-2 grid grid-cols-subgrid">
              <span className="min-w-0 [overflow-wrap:anywhere]">{it.name}</span>
              <span className="text-right text-[color:var(--fg-muted)]">{it.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PillPress({
  pill, open, listId, moreAria, onPress,
}: {
  pill: FitPill;
  open: boolean;
  listId: string;
  moreAria: (rest: number) => string;
  onPress: () => void;
}) {
  const words = open ? copy.facts.less : pill?.kind === "count" ? copy.facts.more(pill.rest) : copy.facts.moreName;
  const aria = open ? copy.facts.lessAria : pill?.kind === "count" ? moreAria(pill.rest) : copy.facts.moreNameAria;
  return (
    <button
      type="button"
      data-fact-pill={open ? "less" : pill?.kind}
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-label={aria}
      onClick={onPress}
      // `more` is a word, so it takes a pixel more each side (R2's `.mo.word`).
      className={`${TOUCH_HIT} ${PILL} cursor-pointer self-center bg-transparent ${!open && pill?.kind === "more" ? "px-[7px]" : "px-[6px]"} ${open ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-body)]"}`}
    >
      {words}
    </button>
  );
}
