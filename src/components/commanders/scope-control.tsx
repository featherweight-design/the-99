"use client";

import { useRef } from "react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { PENDING_OPACITY } from "./list-nav";

type Scope = "owned" | "play";

const SEGMENTS = [
  {
    scope: "owned" as const,
    label: discoveryCopy.scope.owned,
    short: discoveryCopy.scope.ownedShort,
    aria: discoveryCopy.scope.ownedAria,
  },
  {
    scope: "play" as const,
    label: discoveryCopy.scope.play,
    short: discoveryCopy.scope.playShort,
    aria: discoveryCopy.scope.playAria,
  },
];

/**
 * Which population the list ranks — the header's tier-1 control, above the
 * filter bar's `Score against` rather than beside it, because it decides what
 * `Score against` is even scoring.
 *
 * Both segments are always available. Unlike `What's free`, neither depends on
 * a deck read that can fail: the owned scope needs no index and the discovery
 * scope needs no availability.
 *
 * Each segment renders both labels and lets the breakpoint hide one, so the
 * control is a single radiogroup in the accessibility tree. A mobile subtree
 * beside a desktop one would put two of every radio in the DOM, and a screen
 * reader would read the group as four options.
 */
export function ScopeControl({
  scope,
  pending = null,
  onChange,
}: {
  scope: Scope;
  /** The scope a flip is heading for, or null. See `Nav` in list-nav.ts. */
  pending?: Scope | null;
  onChange: (next: Scope) => void;
}) {
  // The flip is a server round-trip that swaps one list component for the other,
  // so without this the segment the reader clicked stays unselected until the
  // whole ranking lands and the screen reads as frozen.
  const shown = pending ?? scope;
  // A radiogroup is one tab stop with arrows moving inside it, and selection
  // follows focus — the same pattern `ScoreAgainst` ships, so the two controls
  // on this page behave identically.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = (from: number, dir: 1 | -1) => {
    const next = (from + dir + SEGMENTS.length) % SEGMENTS.length;
    refs.current[next]?.focus();
    onChange(SEGMENTS[next].scope);
  };

  return (
    <div className="flex items-center gap-[10px]">
      {/* Desktop only: at 390px the segments sit directly under the subtitle,
          which already says which population is showing. The radiogroup keeps
          the same word as its accessible name at both widths, so this span is
          hidden from the tree rather than being the group's label. */}
      <span
        aria-hidden
        className="hidden sm:inline font-mono text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]"
      >
        {discoveryCopy.scope.label}
      </span>
      <div
        role="radiogroup"
        aria-label={discoveryCopy.scope.label}
        // The control only, never the list: the discovery table's "no dimmed
        // list, no skeleton" ruling is about the 3,300 rows underneath, and it
        // says nothing about the control the reader just pressed.
        aria-busy={pending !== null || undefined}
        className="flex gap-[3px] rounded-lg p-[3px] w-full sm:w-auto"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-strong)",
          opacity: pending !== null ? PENDING_OPACITY : undefined,
        }}
      >
        {SEGMENTS.map((s, i) => {
          const active = s.scope === shown;
          return (
            <button
              key={s.scope}
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={s.aria}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(s.scope)}
              onKeyDown={(e) => {
                const dir =
                  e.key === "ArrowRight" || e.key === "ArrowDown"
                    ? 1
                    : e.key === "ArrowLeft" || e.key === "ArrowUp"
                      ? -1
                      : 0;
                if (dir === 0) return;
                e.preventDefault();
                step(i, dir);
              }}
              className={[
                "flex items-center justify-center rounded-md border-0 cursor-pointer",
                "flex-1 h-[38px] px-[10px] text-[13px]",
                "sm:flex-none sm:h-8 sm:px-[13px] sm:text-[12.5px]",
                active
                  ? "font-semibold text-[color:var(--bg)] bg-[color:var(--accent)]"
                  : "font-medium bg-transparent text-[color:var(--fg-body)]",
              ].join(" ")}
              style={{ whiteSpace: "nowrap" }}
            >
              {/* Both labels ship; the breakpoint picks one. The long pair is the
                meaning, and the phone buys the short pair back with the
                subtitle immediately beneath it. */}
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
