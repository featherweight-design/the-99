// Unresolved row — one line the import could not put a card to.
// Server-pure (no "use client" directive).
// §Unresolved row (state 15) (design table).
//
// A sibling of DecklistRow rather than a mode of it: DecklistRow carries a
// non-nullable oracleId through every branch, and this row has none. Three
// redundant signals mark it — the warning left rule, the `?` in the ownership
// dot's slot, and the `unmatched` tag in the `buy` tag's slot — and none of
// them is --danger, a strike-through or a dimmed opacity. The line is a card we
// cannot name, not a mistake the player made.

import { deckImportCopy } from "../../lib/copy/deck-import";
import type { DeckUnresolvedRow } from "../../lib/decks/grouping";

const copy = deckImportCopy.unresolved;

interface UnresolvedRowProps {
  row: DeckUnresolvedRow;
}

export function UnresolvedRow({ row }: UnresolvedRowProps) {
  return (
    <div
      className="flex items-center gap-[9px] md:gap-[10px] px-[8px] py-[6px] md:px-[9px] md:py-[7px] rounded-[6px] md:rounded-[7px] min-h-[44px]"
      style={{ background: "#1A160F", borderLeft: "2px solid #E0913C" }}
    >
      <span
        className="flex-none text-center w-[7px] md:w-[8px] text-[11px] md:text-[12px]"
        style={{ color: "#E0913C" }}
        aria-hidden
      >
        ?
      </span>
      {/* The `?` is the only visual marker of what this row is, so the reader
          gets it in words. */}
      <span className="sr-only">unmatched line</span>

      <span
        className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[11.5px] md:text-[12.5px]"
        style={{ color: "#C6B79A" }}
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
            style={{ color: "#8E8269" }}
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
        style={{ color: "#6E6353" }}
      >
        {deckImportCopy.resolve.rawLineNumber(row.sourceLine)}
      </span>

      <span
        className="flex-none font-mono text-[9px] md:text-[9.5px] rounded-[4px] px-[5px] py-[1px]"
        style={{ color: "#E0913C", background: "rgba(224,145,60,0.13)" }}
      >
        {copy.rowTag}
      </span>
    </div>
  );
}
