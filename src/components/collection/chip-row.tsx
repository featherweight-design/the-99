"use client";
// Filter chips per property table §Filter Chip Row.
// The row + chip pills are wrapped in table-exact px/hex values below.

import type { ReactNode } from "react";
import type { BrowseFilters, SortKey } from "../../lib/collection/browse";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { availabilityLabel } from "../../lib/collection/availability-filter";
import type { AvailabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityGlyph } from "../ui/availability-marker";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Sort: Name", quantity: "Sort: Quantity", set: "Sort: Set",
  rarity: "Sort: Rarity", color: "Sort: Color",
};

export function ChipRow({
  filters,
  sort,
  resultCount,
  uniqueCount,
  totalQuantity,
  onClearAll,
  onRemoveColor,
  onRemoveType,
  setLabels,
  onRemoveSet,
  onClearSearch,
  onRemoveAvailability,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  resultCount: number;
  uniqueCount: number;
  totalQuantity: number;
  onClearAll: () => void;
  onRemoveColor: (c: string) => void;
  onRemoveType: (type: string) => void;
  /** Set code → set name. Chips read names, never raw codes (#86). */
  setLabels: Record<string, string>;
  onRemoveSet: (code: string) => void;
  onClearSearch: () => void;
  onRemoveAvailability: (state: AvailabilityState) => void;
}) {
  const anyActive =
    filters.search.trim() !== "" ||
    filters.colors.length > 0 ||
    filters.types.length > 0 ||
    filters.setCodes.length > 0 ||
    (filters.availability?.length ?? 0) > 0;

  // Result count copy per §Result Count Label / §Copy (result count variants).
  // uniqueCount = distinct cards in the whole collection; totalQuantity = sum of
  // quantities across the whole collection (the "2,933" in the design copy).
  const desktopCopy = anyActive
    ? `Showing ${resultCount.toLocaleString()} of ${totalQuantity.toLocaleString()}`
    : `Showing ${uniqueCount.toLocaleString()} unique · ${totalQuantity.toLocaleString()} total`;
  const mobileCopy = `${resultCount.toLocaleString()} results`;

  return (
    // Container: display flex, gap 6px mobile / 8px desktop, margin-top 10px mobile / 12px desktop, flex-wrap wrap on mobile.
    <div className="mt-[10px] md:mt-[12px] flex flex-wrap md:flex-nowrap items-center gap-[6px] md:gap-[8px]">
      {/* Desktop-only "FILTERS:" label per §"FILTERS:" Label */}
      {anyActive && (
        <span className="hidden md:inline font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          FILTERS:
        </span>
      )}

      {/* Search chip */}
      {filters.search.trim() !== "" && (
        <Chip label={`"${filters.search.trim()}"`} onRemove={onClearSearch} />
      )}
      {/* Color chips — leading colored dot */}
      {filters.colors.map((c) => (
        <Chip
          key={c}
          label={c}
          leadingDot={WUBRG_COLOR[c]}
          onRemove={() => onRemoveColor(c)}
        />
      ))}
      {/* One chip per selected type, in selection order — same treatment as sets. */}
      {filters.types.map((t) => (
        <Chip key={t} label={t} onRemove={() => onRemoveType(t)} />
      ))}
      {/* One chip per selected set, in selection order. Labelled with the set
          name; falls back to the code when the `sets` catalog has no row. */}
      {filters.setCodes.map((code) => (
        <Chip key={code} label={setLabels[code] ?? code} onRemove={() => onRemoveSet(code)} />
      ))}
      {/* One chip per selected availability state, carrying the same glyph the
          list markers use. */}
      {(filters.availability ?? []).map((state) => (
        <Chip
          key={state}
          label={availabilityLabel(state)}
          leadingGlyph={
            state === "free" ? null : (
              <AvailabilityGlyph state={state} seam="var(--elevated)" />
            )
          }
          removeAria={availabilityCopy.collection.chipRemoveAria(availabilityLabel(state))}
          onRemove={() => onRemoveAvailability(state)}
        />
      ))}

      {/* Sort chip — non-removable, shows current sort */}
      {sort !== "name" && (
        <span
          className="inline-flex items-center rounded-full font-sans text-[12px] md:text-[12.5px] px-[9px] py-[5px] md:pr-[8px] md:pl-[11px]"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {SORT_LABEL[sort]}
        </span>
      )}

      {/* "Clear all" link */}
      {anyActive && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-[2px] text-[12px] text-[color:var(--accent)]"
        >
          Clear all
        </button>
      )}

      {/* Result count — right-aligned, turns amber when zero. Mobile shows the
          short "N results" variant; desktop shows the full variants per
          §Copy (result count variants). */}
      <span
        className={`md:hidden font-mono text-[11px] ${resultCount === 0 ? "text-[var(--warning)]" : "text-[var(--fg-faint)]"}`}
      >
        {mobileCopy}
      </span>
      <span
        className={`hidden md:inline md:ml-auto font-mono text-[11px] ${resultCount === 0 ? "text-[var(--warning)]" : "text-[var(--fg-faint)]"}`}
      >
        {desktopCopy}
      </span>
    </div>
  );
}

function Chip({
  label,
  leadingDot,
  leadingGlyph,
  removeAria,
  onRemove,
}: {
  label: string;
  leadingDot?: string;
  leadingGlyph?: ReactNode;
  removeAria?: string;
  onRemove: () => void;
}) {
  return (
    // Chip per §Filter Chip: inline-flex, gap 6/7px, font 12/12.5px, radius 999px,
    // bg --elevated, border 1px --border-strong
    <span
      className="inline-flex items-center rounded-full font-sans text-[12px] md:text-[12.5px] gap-[6px] md:gap-[7px] px-[9px] py-[5px] md:pl-[11px] md:pr-[8px]"
      style={{
        color: "var(--fg)",
        background: "var(--elevated)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {leadingDot && (
        // §Filter Chip WUBRG Dot: 9×9 rounded 999px
        <span
          aria-hidden
          className="rounded-full"
          style={{ width: 9, height: 9, background: leadingDot }}
        />
      )}
      {leadingGlyph}
      {label}
      {/* Dismiss "✕" — §Filter Chip Dismiss, color --fg-faint.
          The glyph draws about 10×19px, so the hit area is grown to 44px with a
          centred pseudo-element rather than with padding: padding would inflate
          the chip itself, and the chip's size is drawn. The overlay is wider
          than the chip is tall, which is safe because it can only reach its own
          chip's label — the next chip's ✕ is a full chip width away. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeAria ?? `Remove ${label} filter`}
        className={[
          "relative cursor-pointer",
          "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:w-[44px]",
          "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
          "text-[color:var(--fg-faint)]",
        ].join(" ")}
      >
        ✕
      </button>
    </span>
  );
}
