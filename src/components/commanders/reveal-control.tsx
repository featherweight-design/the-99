"use client";
// Windowing furniture for the /commanders list (#52) — the reveal control, the
// end-of-ranking rule, and the header window count.
//
// One deliberate departure from the handoff, recorded in the PR body: the
// `Revealing…` working state (E1c/N4) is not built. The reveal is a synchronous
// slice of an array already in memory, so the state can never be perceptible,
// and its two colours (#1B1711, #6E6353) have no var(--*) while the handoff also
// forbids new tokens. Building it would mean inlining raw hexes for a state no
// one can see.
//
// The mobile chevron is part of the label string and so cannot turn brass
// independently the way the desktop one does. That is drawn consistently across
// all four mobile frames, so it is built as drawn.

/** Cards revealed per activation. Deliberately > the 24 generals the beta
 *  collection yields, so the control stays unreachable on real data for now. */
export const REVEAL_STEP = 25;

export function RevealControl({
  remaining,
  onReveal,
}: {
  remaining: number;
  onReveal: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={`Show ${REVEAL_STEP} more commanders, ${remaining.toLocaleString("en-US")} remaining`}
      className="group w-full rounded-lg flex flex-col items-center gap-[3px] min-h-[52px] px-[16px] py-[14px] sm:min-h-0 sm:flex-row sm:justify-center sm:gap-[12px] sm:px-[20px] sm:py-[15px] sm:cursor-pointer bg-[color:var(--surface)] [border:1px_solid_var(--border-strong)] hover:bg-[color:var(--elevated-hover)] hover:[border:1px_solid_var(--border-dashed)] focus-visible:bg-[color:var(--elevated-hover)] focus-visible:[border:1px_solid_var(--border-dashed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brass)]"
    >
      <span
        className="font-semibold text-[14.5px] sm:text-[14px]"
        style={{ color: "var(--fg)" }}
      >
        Show {REVEAL_STEP} more<span className="sm:hidden"> ↓</span>
      </span>
      <span className="font-mono text-[11px] sm:text-[11.5px] text-[color:var(--fg-faint)] group-hover:text-[color:var(--fg-muted)] group-focus-visible:text-[color:var(--fg-muted)]">
        {remaining.toLocaleString("en-US")} remaining
      </span>
      <span
        aria-hidden
        className="hidden sm:block text-[13px] leading-none text-[color:var(--fg-faint)] group-hover:text-[color:var(--brass)] group-focus-visible:text-[color:var(--brass)]"
      >
        ↓
      </span>
    </button>
  );
}

/** Renders only once a list that *was* windowed has been fully revealed — a list
 *  short enough never to have shown the control ends on a plain spacer. */
export function EndOfRanking({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-[10px] sm:gap-[14px] pt-[14px] pb-[4px] sm:pt-[16px] sm:pb-0">
      <Hairline />
      <Diamond />
      <span
        className="font-mono uppercase text-[9.5px] sm:text-[10.5px] tracking-[0.16em]"
        style={{ color: "var(--fg-faint)" }}
      >
        End of ranking · {total.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
      </span>
      <Diamond />
      <Hairline />
    </div>
  );
}

function Hairline() {
  return (
    <span
      aria-hidden
      className="flex-1 h-px"
      style={{ background: "var(--border)" }}
    />
  );
}

function Diamond() {
  return (
    <span
      aria-hidden
      className="w-[5px] h-[5px] sm:w-[6px] sm:h-[6px] rotate-45 shrink-0"
      style={{ background: "var(--border-strong)" }}
    />
  );
}

/**
 * Header window count. Never uses the "showing N of M" shape — that phrasing
 * belongs to the colour filter's own count, which sits beside this one and would
 * otherwise read as a second opinion on the same number.
 */
export function WindowCount({
  shown,
  filteredTotal,
  className,
}: {
  shown: number;
  filteredTotal: number;
  className?: string;
}) {
  const remaining = Math.max(0, filteredTotal - shown);
  return (
    <span className={className} style={{ color: "var(--fg-faint)" }}>
      {remaining === 0 ? (
        <>
          all <Figure>{filteredTotal}</Figure> shown
        </>
      ) : (
        <>
          <Figure>{shown}</Figure> shown · <Figure>{remaining}</Figure> more below
        </>
      )}
    </span>
  );
}

function Figure({ children }: { children: number }) {
  return (
    <b style={{ color: "var(--fg-body)", fontWeight: 600 }}>
      {children.toLocaleString("en-US")}
    </b>
  );
}
