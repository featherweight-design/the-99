"use client";
// The colour pips and their match modifier — one control, because the modifier
// modifies the pips and the handoff's geometry says so: on the rack it sits
// INSIDE the pip wrapper behind a hairline.
//
// Call 1 of the handoff: with no pip lit the match control is GREYED IN PLACE,
// never removed. This reverses `commanders_plane`'s ruling that it is absent —
// locked decision 4 is the newer instruction. Greying teaches that the mode
// belongs to the pips; absence taught nothing and made the stack jump. The
// greyed control keeps its value, keeps `aria-disabled`, and stays focusable so
// an AT user can find the thing a pip-tap would wake.
//
// One subtree at either width, branched on `wide` — never a desktop copy and a
// phone copy hidden past each other, which would put two identical radiogroups
// in the accessibility tree.

import { useRef } from "react";
import { ColourPips } from "../../ui/colour-pips";
import type { JoinMode } from "../../../lib/commanders/filter";
import { filterCopy } from "../../../lib/copy/lanes";

// The lane's parameter order, lower-case as `lane-params.ts` writes it. The
// shared palette is keyed upper-case, hence the lift at the lookup.
const WUBRG = ["w", "u", "b", "r", "g"] as const;
type Hue = (typeof WUBRG)[number];

export function ColourControl({
  colors,
  match,
  onColorsChange,
  onMatchChange,
  wide,
}: {
  colors: string[];
  match: JoinMode;
  onColorsChange: (c: string[]) => void;
  onMatchChange: (m: JoinMode) => void;
  wide: boolean;
}) {
  // With nothing lit there is nothing to be exact about: the modifier is inert,
  // but present and remembered.
  const live = colors.length > 0;

  const segments = [
    {
      mode: "contains" as const,
      // The rack's segments are mono 10.5px and take the short word; the name
      // announced is the full one at either width.
      label: wide ? filterCopy.match.anyShort : filterCopy.match.any,
      aria: filterCopy.match.any,
    },
    {
      mode: "exactly" as const,
      label: wide ? filterCopy.match.exactlyShort : filterCopy.match.exactly,
      aria: filterCopy.match.exactly,
    },
  ];

  // A radiogroup is one tab stop and the arrows move within it — the pattern
  // every screen-reader user expects the moment the role is announced, and the
  // one `ScoreAgainst` and `FacetStrip` already use. Selection follows focus.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = (from: number, dir: 1 | -1) => {
    // Inert while greyed: moving focus here would otherwise change a mode the
    // control is telling the reader it cannot act on.
    if (!live) return;
    const next = (from + dir + segments.length) % segments.length;
    refs.current[next]?.focus();
    onMatchChange(segments[next].mode);
  };

  const toggle = (hue: Hue) =>
    onColorsChange(
      // Rebuilt in WUBRG order rather than appended, so the chip and the URL
      // read the same whichever order the pips were tapped in.
      WUBRG.filter((h) => (h === hue ? !colors.includes(h) : colors.includes(h))),
    );

  return (
    <div
      // No `role="group"` here any more. `ColourPips` brings its own, named
      // `Color identity` by this caller, and the match modifier beside it is
      // its own `radiogroup`. An umbrella group around both would put a second
      // name on one control and have it read out twice. This div is what it
      // looks like: a box.
      className={[
        wide
          ? "flex items-center gap-[8px] h-[34px] rounded-[9px] px-[10px] border border-solid bg-[color:var(--bg)]"
          : "flex flex-col gap-[10px] border-0 bg-transparent",
        // The wrapper's border is the pips' active state on the rack; in the
        // sheet the pips carry it themselves and there is no wrapper to light.
        wide && live ? "border-[color:var(--accent)]" : "border-[color:var(--border)]",
      ].join(" ")}
    >
      {!wide && <Caption>{filterCopy.colour.legend}</Caption>}

      {/* The app's ONE colour control. This drew its own swatches until the
          filter chassis landed: a token square dimmed to .34 unlit on the rack
          and .40 in the sheet, which across six themes floors at 1.37:1 and
          fails the 3:1 non-text minimum in 30 of 30 theme-and-hue combinations
          here — the worst of the three controls `ColourPips` replaced, and the
          last to be migrated. The symbols are Scryfall's own artwork at full
          strength, and a 2px `--accent` ring is the entire lit treatment.

          The rack keeps its state lowercase, so the canonical uppercase code
          the pips emit is mapped back on the way out. Reading is
          case-tolerant, so the lit set needs no conversion going in. */}
      <ColourPips
        form={wide ? "wide" : "sheet"}
        legend={filterCopy.colour.legend}
        value={colors}
        onToggle={(code) => toggle(code.toLowerCase() as Hue)}
      />

      {wide && (
        <span
          aria-hidden
          className="block h-[20px] w-px shrink-0 bg-[color:var(--border)]"
        />
      )}
      {!wide && <Caption>{filterCopy.match.legend}</Caption>}

      <div
        role="radiogroup"
        aria-label={filterCopy.match.legend}
        // The state, not a `disabled` attribute: the control must stay in the
        // tab order (call 1).
        aria-disabled={live ? undefined : true}
        // No box of its own on the rack: the pip wrapper is already the box, and
        // the hairline to its left is what says the modifier is inside it.
        // No `pr` of its own. The wrapper above already pays 10px of padding on
        // both sides, and 6px more on this side alone put 16px to the right of
        // `Exactly` against 10px to the left of the first pip — the box read as
        // lopsided at every width. Reported 2026-09-13.
        className={wide ? "flex items-center gap-[2px]" : "flex gap-[8px]"}
      >
        {segments.map((s, i) => {
          const selected = s.mode === match;
          return (
            <button
              key={s.mode}
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={s.aria}
              // Roving: the checked segment is the group's single tab stop.
              tabIndex={selected ? 0 : -1}
              onClick={() => live && onMatchChange(s.mode)}
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
                "flex items-center justify-center border border-solid",
                live ? "cursor-pointer" : "cursor-default",
                wide
                  ? "font-mono rounded-[6px] px-[8px] h-[22px] text-[10.5px]"
                  : "rounded-full h-[44px] px-[16px] text-[13.5px]",
                // Greying removes emphasis; it must not erase state, or a
                // player lights a pip and the mode appears to change by itself.
                // The selected segment keeps its border either way.
                !live
                  ? [
                      "bg-[color:var(--surface-sunken)] text-[color:var(--fg-locked)]",
                      selected
                        ? "border-[color:var(--border-strong)]"
                        : "border-[color:var(--border)]",
                    ].join(" ")
                  : selected
                    ? wide
                      ? "bg-[color:var(--elevated)] border-[color:var(--border-strong)] text-[color:var(--fg)]"
                      : "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] border-[color:var(--accent)] text-[color:var(--fg)]"
                    : wide
                      ? "bg-transparent border-transparent text-[color:var(--fg-muted)]"
                      : "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-body)]",
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Module scope, deliberately: a component declared inside `ColourControl` would
// be a new type on every render and would remount its whole subtree.
function Caption({ children }: { children: string }) {
  return (
    <p className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]">
      {children}
    </p>
  );
}
