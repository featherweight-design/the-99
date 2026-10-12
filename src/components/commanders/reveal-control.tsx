"use client";
// Windowing furniture for the /commanders list (#52) — the reveal control, the
// end-of-ranking rule, and the header window count.
//
// One deliberate departure from the handoff, recorded in the PR body: the
// `Revealing…` working state (E1c/N4) is not built. The reveal is a synchronous
// slice of an array already in memory, so the state can never be perceptible,
// and neither of its two colours was in the token set the handoff shipped,
// which also forbade new tokens. Building it would have meant inlining raw
// hexes for a state no one can see.
//
// The mobile chevron is part of the label string and so cannot turn accent
// independently the way the desktop one does. That is drawn consistently across
// all four mobile frames, so it is built as drawn.

import { REVEAL_STEP } from "../../lib/commanders/reveal-step";

export { REVEAL_STEP };

/**
 * What the live region says once a reveal has committed. Both scopes send the
 * same sentence — the handoff's state 9 asks discovery to keep the shipped
 * message — so it lives here rather than being written out at each list.
 */
export function revealAnnouncement(shown: number, total: number, before: number) {
  const n = (v: number) => v.toLocaleString("en-US");
  return `${n(shown)} shown, ${n(total - shown)} more below. Ranks ${n(before + 1)} to ${n(shown)} added.`;
}

export function RevealControl({
  remaining,
  onReveal,
  band,
  busy = false,
}: {
  remaining: number;
  onReveal: () => void;
  /**
   * The rows the last press asked for are still arriving (`/discover`'s withheld draw fields):
   * said with `aria-busy`, and a press while it holds does nothing. No visual change: the rows
   * land in about one round trip, and a drawn waiting state is a Design question this does not
   * answer.
   */
  busy?: boolean;
  /** Discovery's rank band, e.g. "ranks 1,026–1,050 of 3,334 · …". Omitted by
      the owned scope: at 242 rows the band was implicit, and at 3,334 it is
      not. */
  band?: string;
}) {
  // The shipped line, kept as one node rather than written twice: with a band it
  // sits inside a row wrapper and without one it is the button's own content,
  // and two copies would be two places the label could drift.
  const line = (
    <>
      <span
        className="font-semibold text-[14.5px] sm:text-[14px]"
        style={{ color: "var(--fg)" }}
      >
        Show {REVEAL_STEP} more<span className="sm:hidden"> ↓</span>
      </span>
      <span className="font-mono text-[11px] sm:text-[11.5px] text-[color:var(--fg-faint)] group-hover:text-[color:var(--fg-muted)] group-focus-visible:text-[color:var(--fg-muted)] transition-colors">
        {remaining.toLocaleString("en-US")} remaining
      </span>
      <span
        aria-hidden
        className="hidden sm:block text-[13px] leading-none text-[color:var(--fg-faint)] group-hover:text-[color:var(--accent)] group-focus-visible:text-[color:var(--accent)] transition-colors"
      >
        ↓
      </span>
    </>
  );

  return (
    <button
      type="button"
      onClick={busy ? undefined : onReveal}
      aria-busy={busy || undefined}
      aria-label={`Show ${REVEAL_STEP} more commanders, ${remaining.toLocaleString("en-US")} remaining`}
      className={[
        "group w-full rounded-lg flex flex-col items-center min-h-[52px] px-[16px] py-[14px] sm:min-h-0 sm:justify-center sm:px-[20px] sm:py-[15px] sm:cursor-pointer bg-[color:var(--surface)] [border:1px_solid_var(--border-strong)] hover:bg-[color:var(--elevated-hover)] hover:[border:1px_solid_var(--border-dashed)] focus-visible:bg-[color:var(--elevated-hover)] focus-visible:[border:1px_solid_var(--border-dashed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] transition-colors",
        // With a band the control stays a column at both widths and the shipped
        // row moves inside — "shipped geometry unchanged, plus one line". Without
        // one it is byte-identical to what the owned scope shipped.
        band ? "gap-[4px]" : "gap-[3px] sm:flex-row sm:gap-[12px]",
      ].join(" ")}
    >
      {band ? (
        <span className="flex flex-col items-center gap-[3px] sm:flex-row sm:items-center sm:gap-[12px]">
          {line}
        </span>
      ) : (
        line
      )}
      {band ? (
        // `--fg-locked` under AA by permission: the line only repeats figures
        // the list already states, so it is a convenience, not the only source.
        <span className="font-mono text-[10.5px] text-[color:var(--fg-locked)]">{band}</span>
      ) : null}
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
        End of ranking · {total.toLocaleString("en-US")}
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
