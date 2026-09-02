"use client";

// Group Toggle — All/Shopping filter pills + By type / By role grouping pills.
// §Decklist Group Toggle (design table).

interface GroupToggleProps {
  allCount: number;
  shoppingCount: number;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
}

export function GroupToggle({
  allCount,
  shoppingCount,
  filter,
  grouping,
  onFilterChange,
  onGroupingChange,
}: GroupToggleProps) {
  return (
    /* Toggle bar container: mobile p=9px 16px | desktop p=14px 26px 10px */
    <div
      className="flex items-center gap-[7px] md:gap-[10px] px-[16px] py-[9px] md:px-[26px] md:pt-[14px] md:pb-[10px] border-b border-[color:var(--border)] md:border-b-0"
    >
      {/* "All N" filter pill — active: accent bg dark text | idle: muted with border */}
      <button
        type="button"
        onClick={() => onFilterChange("all")}
        className={[
          "font-sans font-semibold transition-[filter] hover:brightness-125 text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]",
          filter === "all"
            ? "text-[color:var(--bg)] bg-[color:var(--accent)]"
            : "text-[color:var(--fg-faint)] bg-transparent border border-solid border-[color:var(--border-strong)]",
        ].join(" ")}
      >
        All {allCount}
      </button>

      {/* "Shopping N" filter pill — idle: amber text with amber border */}
      <button
        type="button"
        onClick={() => onFilterChange("shopping")}
        className={[
          "font-sans transition-[filter] hover:brightness-125 text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]",
          filter === "shopping"
            ? "font-semibold text-[color:var(--bg)] bg-[color:var(--accent)]"
            : "font-medium text-[color:var(--warning)] bg-transparent border border-solid border-[color:color-mix(in_srgb,var(--accent)_30%,var(--bg))]",
        ].join(" ")}
      >
        Shopping {shoppingCount}
      </button>

      {/* Spacer: pushes group pills to the right on both breakpoints */}
      <span className="flex-1" aria-hidden />

      {/* "Group" label — desktop only, margin-left: auto is handled by spacer above */}
      <span
        className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ color: "var(--fg-faint)" }}
      >
        Group
      </span>

      {/* By type — active: dark pill with border | idle: plain muted text */}
      {/* Mobile active: px-10 py-4; Desktop active: px-13 py-5              */}
      {/* Mobile idle:   px-6 py-4 no border; Desktop idle: px-13 py-5 border */}
      <button
        type="button"
        onClick={() => onGroupingChange("type")}
        className={
          grouping === "type"
            ? "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[10px] py-[4px] md:px-[13px] md:py-[5px] font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
            : "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[6px] py-[4px] md:px-[13px] md:py-[5px] border-0 md:border md:border-solid md:border-[color:var(--border)] font-medium text-[color:var(--fg-faint)] bg-transparent"
        }
      >
        By type
      </button>

      {/* By role — idle: no border mobile, 1px solid var(--border) desktop */}
      <button
        type="button"
        onClick={() => onGroupingChange("role")}
        className={
          grouping === "role"
            ? "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[10px] py-[4px] md:px-[13px] md:py-[5px] font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
            : "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[6px] py-[4px] md:px-[13px] md:py-[5px] border-0 md:border md:border-solid md:border-[color:var(--border)] font-medium text-[color:var(--fg-faint)] bg-transparent"
        }
      >
        By role
      </button>
    </div>
  );
}
