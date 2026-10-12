"use client";
// Unresolved row — one line the import could not put a card to.
// §Unresolved row (state 15) (design table).
//
// A sibling of DecklistRow rather than a mode of it: DecklistRow carries a
// non-nullable oracleId through every branch, and this row has none. Three
// redundant signals mark it — the warning left rule, the `?` in the ownership
// dot's slot, and the `unmatched` tag in the `buy` tag's slot — and none of
// them is --danger, a strike-through or a dimmed opacity. The line is a card we
// cannot name, not a mistake the player made.
//
// The row is the disclosure control for its own resolution expander.

import { useRef } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import type { DeckUnresolvedRow } from "../../lib/decks/grouping";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { ROW_SHELL } from "../ui/row-shell";
import { ResolutionExpander } from "./resolution-expander";

const copy = deckImportCopy.unresolved;

interface UnresolvedRowProps {
  deckId: string;
  row: DeckUnresolvedRow;
  deckOracleIds: string[];
  commanderOracleId?: string;
  expanded: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  onResolved: (row: DeckUnresolvedRow, result: SearchResult) => void;
  onDeleted: (row: DeckUnresolvedRow) => void;
}

export function UnresolvedRow({
  deckId,
  row,
  deckOracleIds,
  commanderOracleId,
  expanded,
  onToggle,
  onCollapse,
  onResolved,
  onDeleted,
}: UnresolvedRowProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `fix-${row.id}`;

  // Esc, Collapse and "Leave it for now" all land here, and a disclosure that
  // closes without handing focus back leaves the keyboard at the top of the
  // document.
  function collapse() {
    onCollapse();
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        aria-label={copy.rowAria(row.rawName, row.quantity)}
        onClick={expanded ? collapse : onToggle}
        className={`${ROW_SHELL} w-full text-left px-[8px] py-[6px] md:px-[9px] md:py-[7px] min-h-[44px] cursor-pointer bg-[color:var(--surface-rail)] border-l-2 border-[color:var(--warning)] active:bg-[color:var(--surface-raised)] md:hover:bg-[color:var(--surface-raised)] transition-colors`}
      >
        <span
          className="flex-none text-center w-[7px] md:w-[8px] text-[11px] md:text-[12px]"
          style={{ color: "var(--warning)" }}
          aria-hidden
        >
          ?
        </span>
        {/* The `?` is the only visual marker of what this row is, so the reader
            gets it in words. */}
        <span className="sr-only">unmatched line</span>

        <span
          className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[11.5px] md:text-[12.5px]"
          style={{ color: "var(--fg-body)" }}
        >
          {row.rawName}
        </span>

        {/* Desktop draws no multiplier: the resolution expander shows the line as
            it came, quantity included, and the column is tight. */}
        {row.quantity > 1 && (
          <>
            <span
              aria-hidden
              className="md:hidden flex-none font-mono text-[10px]"
              style={{ color: "var(--fg-faint)" }}
            >
              ×{row.quantity}
            </span>
            {/* Announced at every width — the visual multiplier is mobile-only, but
                a desktop screen reader would otherwise never hear the copy count. */}
            <span className="sr-only">{row.quantity} copies</span>
          </>
        )}

        <span
          className="flex-none font-mono text-[10px] md:text-[10.5px]"
          style={{ color: "var(--fg-locked)" }}
        >
          {deckImportCopy.resolve.rawLineNumber(row.sourceLine)}
        </span>

        <span
          className="flex-none font-mono text-[9px] md:text-[9.5px] rounded-[4px] px-[5px] py-[1px]"
          style={{ color: "var(--warning)", background: "color-mix(in oklab, var(--warning) 13%, transparent)" }}
        >
          {copy.rowTag}
        </span>

        {/* The whole row is the target at both widths; desktop also names the
            action in the slot the remove ✕ occupies on a card row. */}
        <span
          aria-hidden
          className="hidden md:inline flex-none text-[12px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {copy.rowFix}
        </span>
      </button>

      {expanded && (
        <ResolutionExpander
          id={panelId}
          deckId={deckId}
          row={row}
          deckOracleIds={deckOracleIds}
          commanderOracleId={commanderOracleId}
          onCollapse={collapse}
          onResolved={(result) => onResolved(row, result)}
          onDeleted={() => onDeleted(row)}
        />
      )}
    </>
  );
}
