// Decklist group header — label + count, with an optional desktop right note.
// Server-pure (no "use client" directive).
// §Decklist Group, §`Couldn't identify` group header (design table).

// src/lib/copy/recommendations is imported here so the auto-count clause
// ("9 · 9 auto") comes from the copy module rather than a bare inline string.
import { recommendationsCopy } from "../../lib/copy/recommendations";

interface DecklistGroupHeaderProps {
  label: string;
  /** Null draws no count at all: a group whose read failed has no honest figure to give. */
  count: number | null;
  /** The unresolved group draws its count in --warning; every other group is faint. */
  countColor?: string;
  /** Right-aligned on desktop only (e.g. "37 recommended"). */
  note?: string;
  /** The draft note is brass; every other note is the quiet default. */
  noteColor?: string;
  /** Promotes the label to an h3 so a group can be a labelled landmark. */
  headingId?: string;
  /** Gives the heading a −1 tabindex so a write can hand focus to it. The review
   *  page lands here after a restore: the group the row left names where the
   *  reader is, which a bare wrapper div would not. Off everywhere else — a
   *  heading nothing focuses does not need to be focusable. */
  focusable?: boolean;
  /**
   * Shopping groups: the arithmetic this group closes, shown beside the label in
   * mono 10px --fg-faint. E.g. "1 · closes 2→10". Omit in normal groups.
   * Brief: mono 10px --accent label, mono 10px --fg-faint gap clause beside it.
   */
  gapClause?: string;
  /**
   * How many cards in this group carry the `auto` flag. When > 0, the count
   * span reads "{count} · {autoCount} auto" using recommendationsCopy.auto.groupCount.
   * Zero means no auto clause — "9 · 0 auto" would be noise for groups where
   * the player has already kept or removed everything.
   */
  autoCount?: number;
}

export function DecklistGroupHeader({
  label,
  count,
  countColor = "var(--fg-faint)",
  note,
  noteColor = "var(--fg-locked)",
  headingId,
  focusable = false,
  gapClause,
  autoCount = 0,
}: DecklistGroupHeaderProps) {
  // The mobile gap was absent, not zero by intent: "Lands 1" rendered as
  // "Lands1". 6px matches the tab's own label/count pairing.
  // Shopping groups use mono 10px --accent for the label; normal groups use the
  // standard sans/display weight.
  const labelClass = gapClause
    ? "font-mono text-[10px] m-0 uppercase tracking-[.14em]"
    : "font-sans md:font-display font-semibold text-[12.5px] md:text-[15px] m-0";
  const labelColor = gapClause ? "var(--accent)" : "var(--fg)";

  return (
    <div className="flex items-baseline justify-between mb-[6px] md:mb-[8px] md:pb-[7px] md:border-b md:border-b-[color:var(--border)] md:border-[color:var(--border)]">
      <div className="flex items-baseline gap-[6px] md:gap-[10px]">
        {headingId ? (
          // Labelled rather than left to its text content, so the count is part
          // of the one announcement — "Couldn't identify · 2" — instead of
          // arriving as a bare number from the sibling span.
          <h3
            id={headingId}
            tabIndex={focusable ? -1 : undefined}
            aria-label={count === null ? label : `${label} · ${count}`}
            className={labelClass}
            style={{ color: labelColor }}
          >
            {label}
          </h3>
        ) : (
          <span className={labelClass} style={{ color: labelColor }}>
            {label}
          </span>
        )}

        {/* Shopping: gap clause (e.g. "1 · closes 2→10") in --fg-faint beside label. */}
        {gapClause ? (
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {gapClause}
          </span>
        ) : count === null ? null : (
          <span
            className="font-mono text-[10px] md:text-[11px]"
            style={{ color: countColor }}
            aria-hidden={headingId ? true : undefined}
          >
            {autoCount > 0
              ? `${count} · ${recommendationsCopy.auto.groupCount(String(autoCount))}`
              : count}
          </span>
        )}
      </div>

      {note && (
        <span
          className="hidden md:block font-mono text-[10.5px]"
          style={{ color: noteColor, marginLeft: "auto" }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
