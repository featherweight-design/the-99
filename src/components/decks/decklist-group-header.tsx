// Decklist group header — label + count, with an optional desktop right note.
// Server-pure (no "use client" directive).
// §Decklist Group, §`Couldn't identify` group header (design table).

interface DecklistGroupHeaderProps {
  label: string;
  count: number;
  /** The unresolved group draws its count in --warning; every other group is faint. */
  countColor?: string;
  /** Right-aligned on desktop only (e.g. "37 recommended"). */
  note?: string;
  /** Promotes the label to an h3 so a group can be a labelled landmark. */
  headingId?: string;
}

export function DecklistGroupHeader({
  label,
  count,
  countColor = "#8E8269",
  note,
  headingId,
}: DecklistGroupHeaderProps) {
  // The mobile gap was absent, not zero by intent: "Lands 1" rendered as
  // "Lands1". 6px matches the tab's own label/count pairing.
  const labelClass = "font-sans md:font-display font-semibold text-[12.5px] md:text-[15px] m-0";

  return (
    <div className="flex items-baseline justify-between mb-[6px] md:mb-[8px] md:pb-[7px] md:border-b md:border-[#2A241D]">
      <div className="flex items-baseline gap-[6px] md:gap-[10px]">
        {headingId ? (
          // Labelled rather than left to its text content, so the count is part
          // of the one announcement — "Couldn't identify · 2" — instead of
          // arriving as a bare number from the sibling span.
          <h3
            id={headingId}
            aria-label={`${label} · ${count}`}
            className={labelClass}
            style={{ color: "#EDE6D8" }}
          >
            {label}
          </h3>
        ) : (
          <span className={labelClass} style={{ color: "#EDE6D8" }}>
            {label}
          </span>
        )}

        <span
          className="font-mono text-[10px] md:text-[11px]"
          style={{ color: countColor }}
          aria-hidden={headingId ? true : undefined}
        >
          {count}
        </span>
      </div>

      {note && (
        <span
          className="hidden md:block font-mono text-[10.5px]"
          style={{ color: "#6E6353", marginLeft: "auto" }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
