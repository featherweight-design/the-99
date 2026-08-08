"use client";
// ConsiderToolbar — Sort plus the provenance line, per design table §1 and §2.
//
// One component with two mount points rather than two copies: on desktop it
// rides the tab row pushed right, on phone it draws as its own row above the
// shelves. The strings exist once, so the two widths cannot drift.

import { addPanelCopy } from "../../lib/copy/decks-builder";

export type SortKey = "gaps" | "edhrec" | "cheapest";

interface ConsiderToolbarProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  ownedCount: number;
  /** The EDHREC staples getDeckSuggestions appends that the collection lacks. */
  unownedCount: number;
  /** With EDHREC down the provenance line claims a pedigree the shelves lack. */
  degraded: boolean;
}

export function ConsiderToolbar({
  sort, onSortChange, ownedCount, unownedCount, degraded,
}: ConsiderToolbarProps) {
  return (
    <>
      {/* The provenance line names EDHREC as a source. With EDHREC down the
          banner speaks for the state instead and only Sort remains. */}
      {!degraded && (
        <p
          // Phone splits the row sort-left / provenance-right; desktop reads
          // provenance then sort, so the order flips at the breakpoint.
          className="font-mono text-[10px] md:text-[10.5px] order-2 md:order-1"
          style={{ color: "var(--fg-faint)" }}
        >
          {/* The two-sided form only once there is a second side to state. */}
          {unownedCount > 0
            ? addPanelCopy.consider.provenanceWithUnowned(ownedCount, unownedCount)
            : addPanelCopy.consider.provenance(ownedCount)}
        </p>
      )}
      <label className="contents">
        <span className="sr-only">{addPanelCopy.consider.sortLabel}</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          aria-label={addPanelCopy.consider.sortAria}
          className="rounded-[8px] px-[11px] py-[7px] md:px-[12px] text-[12px] md:text-[12.5px] font-medium cursor-pointer order-1 md:order-2"
          style={{
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
          }}
        >
          <option value="gaps">{addPanelCopy.consider.sortGaps}</option>
          <option value="edhrec">{addPanelCopy.consider.sortEdhrec}</option>
          <option value="cheapest">{addPanelCopy.consider.sortCheapest}</option>
        </select>
      </label>
    </>
  );
}
