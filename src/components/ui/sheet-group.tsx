import { twMerge } from "tailwind-merge";
import { Chevron } from "./chevron";

/**
 * A sheet's list group: the heading with its note at the right, and the toggle that expands the
 * group in place and folds it back. Drawn as the swap sheet's `StandInGroup` draws them (addendum
 * §1b); the Change commander sheet takes the same treatment (Hugh's staging walk, 2026-09-25), and
 * `StandInGroup` moves onto these once its own PRs land, so the two sheets cannot drift apart.
 */
export function SheetGroupHeading({ label, note, as: Tag = "h4" }: { label: string; note: string; as?: "h3" | "h4" }) {
  return (
    <div className="flex items-baseline justify-between gap-[10px] pb-[6px] border-b border-b-[color:var(--border)] border-[color:var(--border)]">
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
export function SheetGroupToggle({ all, onToggle, label, fewer, className, busy = false }: {
  all: boolean;
  onToggle: () => void;
  label: string;
  fewer: string;
  className?: string;
  /** The press is fetching the rest of a capped group (the swap sheet's Show all): busy, and not pressable. */
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={all}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onToggle}
      className={
        twMerge(
          "flex items-center gap-[8px] w-full min-h-[44px] md:min-h-[34px] pl-[43px] pr-0 py-0 bg-transparent text-left text-[12.5px] font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] cursor-pointer",
          className,
        )
        // twMerge's conflict resolution drops `border-b-[color:...]` when it sits alongside a bare
        // `border-b` — a false conflict, since in real Tailwind those are two different utilities
        // (width vs. this app's mana-token color collision), not one twMerge can override. Appended
        // outside the merge, untouched, since no caller's `className` here ever sets a border.
        + " border-0 border-b border-b-[color:var(--border)] border-[color:var(--border)]"
      }
    >
      <span>{all ? fewer : label}</span>
      <Chevron open={all} style={{ color: "var(--fg-faint)" }} />
    </button>
  );
}
