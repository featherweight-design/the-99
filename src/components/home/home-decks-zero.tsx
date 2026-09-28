import { refreshCopy } from "@/lib/copy/refresh";
import { DecksZeroActions } from "@/components/decks/decks-zero";

/**
 * Home's "No decks yet" section: the resume slot for a player whose collection is read and
 * who has no deck (first-run R2, frames 6a to 6c; Hugh's O1 ruling, 2026-09-28). Home goes to
 * the dashboard as soon as the collection is read, and this is where its two ways in live.
 *
 * The actions are `/decks`' own `DecksZeroActions`, never a copy, so the two surfaces cannot
 * drift. Home passes no buildable figure: Ready to build, just above, already states the
 * count, and the shared line draws nothing without one. No card fan: it marks a whole empty
 * surface, and here it would sit under Ready to build's portraits. Left-aligned, like every
 * Home section.
 *
 * Spacing is the extraction's, not the canvas's: the group keeps its own `mt-[4px]
 * sm:mt-[2px]`, so under this card's gap the body sits 18px above the buttons on a phone and
 * 16px on desktop (audit correction 8). The section gap is ResumeDecks' own (correction 10),
 * and the card is drawn at R2's stated padding and gap (correction 9).
 */
export function HomeDecksZero() {
  const c = refreshCopy.zero;
  return (
    <section className="flex flex-col gap-[12px] min-[1180px]:gap-[11px]">
      {/* §SectionLabel, with the resume label's own `margin-top: 6`. */}
      <h2 className="m-0 mt-[6px] font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {c.decksHeading}
      </h2>
      <div className="flex flex-col gap-[14px] rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-inset)] p-[16px] sm:p-[16px_18px]">
        {/* The two paragraphs and their breakpoint swap are DecksZero's, for the same
            reason: which one shows is a CSS fact. */}
        <p className="m-0 text-[13.5px] leading-[1.65] text-[color:var(--fg-muted)] sm:hidden">
          {c.decksBodyShort}
        </p>
        <p className="m-0 hidden text-[14px] leading-[1.65] text-[color:var(--fg-muted)] sm:block sm:max-w-[520px]">
          {c.decksBody}
        </p>
        {/* DecksZero's column gives the group these gaps; this column gives the same. */}
        <div className="flex flex-col gap-[15px] sm:gap-[16px]">
          <DecksZeroActions />
        </div>
      </div>
    </section>
  );
}
