"use client";

// The Theme field's All / Any segment (three-answers addendum §1). It sits at the right of the
// field's label, on the color control's geometry: a 2px inset, 26px segments on desktop and 36px on
// a phone, `--elevated` under the selected one. Greyed below two themes, where there is nothing to
// join, and like Any / Exactly it keeps its value while greyed.

import { useRef } from "react";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import type { ThemeJoin } from "../../lib/intake/rank";

const copy = helpMeChooseCopy.intake.themeJoin;
const MODES: readonly ThemeJoin[] = ["all", "any"];

export function ThemeJoinControl({ value, onChange, live }: { value: ThemeJoin; onChange: (j: ThemeJoin) => void; live: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="radiogroup"
      aria-label={copy.aria}
      // The state, not `disabled`: the control stays in the tab order, as the color modifier does.
      aria-disabled={live ? undefined : true}
      className="ml-auto flex gap-[2px] p-[2px] rounded-[8px] border border-solid border-[color:var(--border-strong)]"
    >
      {MODES.map((m, i) => {
        const selected = m === value;
        return (
          <button
            key={m}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => live && onChange(m)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (dir === 0) return;
              e.preventDefault();
              if (!live) return;
              const next = (i + dir + MODES.length) % MODES.length;
              refs.current[next]?.focus();
              onChange(MODES[next]);
            }}
            className={[
              "flex items-center h-[36px] md:h-[26px] px-[11px] rounded-[6px] border-0 text-[12.5px]",
              live ? "cursor-pointer" : "cursor-default",
              selected ? "font-semibold" : "font-normal",
              selected && live ? "bg-[color:var(--elevated)]" : "bg-transparent",
              !live ? "text-[color:var(--fg-disabled)]" : selected ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]",
            ].join(" ")}
          >
            {m === "all" ? copy.all : copy.any}
          </button>
        );
      })}
    </div>
  );
}
