"use client";

// The two-segment view well, and the one place its metrics are declared.
//
// `/collection` had it first as rows/grid; the deck builder's bar adopted it as
// list/card. They are one control on two surfaces, which is why the segments,
// the well, the radii and the selected skin live here rather than being typed
// out twice — a hand-copied metric on a second surface is exactly how five
// copies of a row radius drifted apart before `row-shell` collected them.

export type ViewToggleOption<T extends string> = {
  value: T;
  /** Drawn, never spoken: the accessible name is `label`. */
  glyph: string;
  label: string;
};

/**
 * The well's size is arithmetic, not a second declaration: two segments plus
 * the 2px gap plus the well's 2px padding on each side is Design's 94×48 on the
 * phone and 70×36 on the desktop. Those are content-box figures; the well's 1px
 * border puts another 2px on each axis, so anything measuring the rendered box —
 * a probe, a devtools readout — reads 96×50 and 72×38.
 */
export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  className = "",
  compact,
}: {
  options: readonly [ViewToggleOption<T>, ViewToggleOption<T>];
  /** `null` while the real view is still unresolved (no hint, pre-hydration): neither segment
      is pressed, rather than one claiming a state the page is not actually showing. */
  value: T | null;
  onChange: (next: T) => void;
  className?: string;
  /**
   * Force the compact (44px) segments regardless of Tailwind's `md:`. The
   * chassis switches form at 1000px and `md:` is 768, so a chassis-mounted
   * toggle took its 32px desktop size across 768-999 while every control
   * beside it kept the compact form's 44px target. Left undefined, the
   * component keeps its own `md:` behaviour for the surfaces that are not in
   * the chassis.
   */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex gap-[2px] rounded-lg p-[2px] flex-none ${className}`}
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {options.map((option, i) => {
        const active = value !== null && option.value === value;
        // No real value yet (a first visit's SSR/hydration gap): the app's own
        // dual-render split draws the first option below `md` and the second
        // from `md`, so the well's paint follows the same rule rather than
        // showing neither pressed over a view the page is visibly drawing.
        // `aria-pressed` stays false either way — this is paint only, and the
        // real value still resolves to one segment within the same render.
        const activeClasses =
          "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] [box-shadow:inset_0_0_0_1px_var(--border-strong)]";
        const inactiveClasses = "bg-transparent text-[color:var(--fg-faint)] md:hover:text-[color:var(--fg-body)]";
        // Tailwind's scanner reads the raw source text for class-like tokens — it cannot see a
        // `variant:` prefix assembled at runtime (`prefixEach`), so the unresolved paint below is
        // spelled out literally rather than composed, with every property the `md:` step flips
        // reset explicitly (weight and box-shadow included, not just colour).
        const paintClasses =
          value !== null
            ? active
              ? activeClasses
              : inactiveClasses
            : i === 0
              ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] [box-shadow:inset_0_0_0_1px_var(--border-strong)] " +
                "md:font-normal md:text-[color:var(--fg-faint)] md:bg-transparent md:[box-shadow:none] md:hover:text-[color:var(--fg-body)]"
              : "font-normal bg-transparent text-[color:var(--fg-faint)] " +
                "md:font-semibold md:text-[color:var(--fg)] md:bg-[color:var(--elevated)] md:[box-shadow:inset_0_0_0_1px_var(--border-strong)]";
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              "flex items-center justify-center rounded-md cursor-pointer",
              "text-[13px]",
              compact === undefined
                ? "w-[44px] h-[44px] md:w-[32px] md:h-[32px]"
                : compact
                  ? "w-[44px] h-[44px]"
                  : "w-[32px] h-[32px]",
              // Selected is bone on `--elevated` with a ring, never accent: the
              // builder's control bar spends accent on nothing, and the two
              // surfaces draw the same control.
              paintClasses,
            ].join(" ")}
          >
            <span aria-hidden="true">{option.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
