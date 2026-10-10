"use client";

// Arrival strip — state 13, §10 of the design table. A full-width band directly
// below the spine on the first render after a clean import.
//
// There is no "import complete" screen anywhere in this flow: the deck is the
// confirmation, and this one line is the only thing that says where it came from.

import { deckImportCopy } from "../../lib/copy/deck-import";
import { arrivalDismissKey, type ArrivalPrintings } from "../../lib/decks/arrival";
import { useLocalFlag } from "./use-local-flag";

const copy = deckImportCopy.arrival;

interface ArrivalStripProps {
  deckId: string;
  /** Lines that came over, not cards — the sentence below says "lines", and a
   *  single line can carry many copies. */
  importedLineCount: number;
  /** The import's printing counts (deck printings); null adds no clause. */
  printings?: ArrivalPrintings | null;
}

export function ArrivalStrip({ deckId, importedLineCount, printings = null }: ArrivalStripProps) {
  const [dismissed, dismiss] = useLocalFlag(arrivalDismissKey(deckId));
  if (dismissed) return null;

  // The locale is pinned for the same reason src/lib/copy/commanders.ts pins
  // it: an unpinned toLocaleString renders "1.418" under a European locale.
  const n = importedLineCount.toLocaleString("en-US");

  return (
    <div
      className="flex items-center gap-[9px] px-[16px] py-[10px] md:gap-[11px] md:px-[30px] md:py-[12px]"
      style={{ background: "var(--surface-rail)", borderBottom: "1px solid var(--border)" }}
    >
      <span
        aria-hidden
        className="text-[12px] md:text-[14px] leading-none"
        style={{ color: "var(--success)" }}
      >
        ✓
      </span>
      <p className="flex-1 m-0" style={{ color: "var(--fg-body)" }}>
        <span className="md:hidden font-mono text-[10.5px]">
          {printings ? copy.cleanWithPrintingsMobile(n, printings.kept, printings.notOwned) : copy.cleanMobile(n)}
        </span>
        <span className="hidden md:inline text-[13.5px]">
          {printings ? copy.cleanWithPrintings(n, printings.kept, printings.notOwned) : copy.clean(n)}
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="font-mono text-[10px] md:text-[11px] flex-none cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] md:hover:text-[color:var(--accent)] transition-colors"
      >
        <span className="md:hidden">✕</span>
        <span className="hidden md:inline">{copy.dismiss} ✕</span>
      </button>
    </div>
  );
}
