"use client";
// Filter chips per property table §Filter Chip Row.
// The row + chip pills are wrapped in table-exact px/hex values below.

import type { BrowseFilters, SortKey } from "../../lib/collection/browse";
import { WUBRG_HEX } from "../../lib/collection/browse";

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
  onClearType,
  setLabels,
  onRemoveSet,
  onClearSearch,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  resultCount: number;
  uniqueCount: number;
  totalQuantity: number;
  onClearAll: () => void;
  onRemoveColor: (c: string) => void;
  onClearType: () => void;
  /** Set code → set name. Chips read names, never raw codes (#86). */
  setLabels: Record<string, string>;
  onRemoveSet: (code: string) => void;
  onClearSearch: () => void;
}) {
  const anyActive =
    filters.search.trim() !== "" ||
    filters.colors.length > 0 ||
    filters.type !== null ||
    filters.setCodes.length > 0;

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
          leadingDot={WUBRG_HEX[c]}
          onRemove={() => onRemoveColor(c)}
        />
      ))}
      {/* Type chip */}
      {filters.type && <Chip label={filters.type} onRemove={onClearType} />}
      {/* One chip per selected set, in selection order. Labelled with the set
          name; falls back to the code when the `sets` catalog has no row. */}
      {filters.setCodes.map((code) => (
        <Chip key={code} label={setLabels[code] ?? code} onRemove={() => onRemoveSet(code)} />
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
          className="ml-[2px] text-[12px]"
          style={{ color: "var(--brass)" }}
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
  onRemove,
}: {
  label: string;
  leadingDot?: string;
  onRemove: () => void;
}) {
  return (
    // Chip per §Filter Chip: inline-flex, gap 6/7px, font 12/12.5px, radius 999px,
    // bg #2A241D (--elevated), border 1px #3A3229 (--border-strong)
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
      {label}
      {/* Dismiss "✕" — §Filter Chip Dismiss, color #8E8269 (--fg-faint) */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="cursor-pointer"
        style={{ color: "var(--fg-faint)" }}
      >
        ✕
      </button>
    </span>
  );
}
