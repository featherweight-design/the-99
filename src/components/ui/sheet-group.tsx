import { twMerge } from "tailwind-merge";

/**
 * A sheet's list group: the heading with its note at the right, and the toggle that expands the
 * group in place and folds it back. Drawn as the swap sheet's `StandInGroup` draws them (addendum
 * §1b); the Change commander sheet takes the same treatment (Hugh's staging walk, 2026-09-25), and
 * `StandInGroup` moves onto these once its own PRs land, so the two sheets cannot drift apart.
 */
export function SheetGroupHeading({ label, note, as: Tag = "h4" }: { label: string; note: string; as?: "h3" | "h4" }) {
  return (
    <div className="flex items-baseline justify-between gap-[10px] pb-[6px] border-b border-[color:var(--border)]">
      <Tag className="m-0 font-mono font-normal text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
        {label}
      </Tag>
      <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: "var(--fg-locked)" }}>{note}</span>
    </div>
  );
}

/**
 * The toggle under a group's first screen: `label` while folded, `fewer` while expanded. The caller
 * decides whether the group is long enough to draw one. `className` sets the left indent, which
 * lines the label up with its rows' name column (43px on the swap sheet).
 */
export function SheetGroupToggle({ all, onToggle, label, fewer, className }: {
  all: boolean;
  onToggle: () => void;
  label: string;
  fewer: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={all}
      onClick={onToggle}
      className={twMerge(
        "flex items-center gap-[8px] w-full min-h-[44px] md:min-h-[34px] pl-[43px] pr-0 py-0 bg-transparent border-0 border-b border-[color:var(--border)] text-left text-[12.5px] font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] cursor-pointer",
        className,
      )}
    >
      <span>{all ? fewer : label}</span>
      <span aria-hidden="true" className="text-[10px]" style={{ color: "var(--fg-faint)" }}>{all ? "▴" : "▾"}</span>
    </button>
  );
}
