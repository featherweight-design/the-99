"use client";

// Arrival strip — state 13, §10 of the design table. A full-width band directly
// below the spine on the first render after a clean import.
//
// There is no "import complete" screen anywhere in this flow: the deck is the
// confirmation, and this one line is the only thing that says where it came from.

import { deckImportCopy } from "../../lib/copy/deck-import";
import { arrivalDismissKey, type ArrivalPrintings } from "../../lib/decks/arrival";
import { useLocalFlag } from "./use-local-flag";
import { preconsCopy } from "../../lib/copy/precons";
import type { PreconArrival } from "../../lib/precons/arrival-read";

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
  // The locale is pinned for the same reason src/lib/copy/commanders.ts pins
  // it: an unpinned toLocaleString renders "1.418" under a European locale.
  const n = importedLineCount.toLocaleString("en-US");
  return (
    <ArrivalBand
      deckId={deckId}
      phone={printings ? copy.cleanWithPrintingsMobile(n, printings.kept, printings.notOwned) : copy.cleanMobile(n)}
      desktop={printings ? copy.cleanWithPrintings(n, printings.kept, printings.notOwned) : copy.clean(n)}
    />
  );
}

/**
 * The strip's shell, for any arrival that says where a deck came from: an import, in one line per
 * width, or a precon start, in three lines at both (its handoff's S2: a head, a body, a meta line).
 * One dismissal per deck, kept in the browser, so a refresh does not bring it back.
 */
export function ArrivalBand({ deckId, ...text }: { deckId: string } & (
  | { phone: string; desktop: string }
  | { lines: { head: string; body: string; meta: string } }
)) {
  const [dismissed, dismiss] = useLocalFlag(arrivalDismissKey(deckId));
  if (dismissed) return null;

  return (
    <ArrivalBandShell>
      <span
        aria-hidden
        className="text-[12px] md:text-[14px] leading-none"
        style={{ color: "var(--success)" }}
      >
        ✓
      </span>
      {"lines" in text ? (
        <div className="flex flex-1 flex-col gap-[3px]">
          <p className="m-0 text-[13.5px] font-semibold text-[color:var(--fg)]">{text.lines.head}</p>
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{text.lines.body}</p>
          <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{text.lines.meta}</p>
        </div>
      ) : (
        <p className="flex-1 m-0" style={{ color: "var(--fg-body)" }}>
          <span className="md:hidden font-mono text-[10.5px]">{text.phone}</span>
          <span className="hidden md:inline text-[13.5px]">{text.desktop}</span>
        </p>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="font-mono text-[10px] md:text-[11px] flex-none cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] md:hover:text-[color:var(--accent)] transition-colors"
      >
        <span className="md:hidden">✕</span>
        <span className="hidden md:inline">{copy.dismiss} ✕</span>
      </button>
    </ArrivalBandShell>
  );
}

/** The band itself: full width under the header, on the rail's ground. Shared with the precon
 *  suggestion (R3 audit finding 5), so two strips under one header never differ. */
export function ArrivalBandShell({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div
      className={`relative flex ${align === "center" ? "items-center" : "items-start"} gap-[9px] px-[16px] py-[10px] md:gap-[11px] md:px-[30px] md:py-[12px]`}
      style={{ background: "var(--surface-rail)", borderBottom: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

/** The strip after "Start a deck from this" (precons S2, S2b). Every card the reader does not own
 *  is in the deck's Shopping, since the deck holds the precon's whole list. */
export function PreconArrivalBand({ deckId, arrival }: { deckId: string; arrival: PreconArrival }) {
  const c = preconsCopy.arrival;
  return (
    <ArrivalBand
      deckId={deckId}
      lines={{
        head: c.head(arrival.name),
        body: arrival.owned === arrival.of
          ? c.bodyAll(arrival.cards, arrival.unmapped)
          : c.body(arrival.cards, arrival.unmapped, arrival.owned, arrival.of, arrival.of - arrival.owned),
        meta: c.meta(arrival.setCode),
      }}
    />
  );
}
