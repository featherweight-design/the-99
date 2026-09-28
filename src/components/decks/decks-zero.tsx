// The body of the Decks surface when the player owns no decks at all. The
// header above it is `DecksView`'s and keeps its shape, so this file draws the
// body only — the toolbar does not change between empty and populated.
//
// Distinct from the filtered empty, which offers Clear and no illustration.

import { refreshCopy } from "../../lib/copy/refresh";
import { GhostButton, PrimaryButton } from "../ui/button";

const CARD = "absolute h-[76px] w-[56px] rounded-[6px] border border-solid sm:h-[84px] sm:w-[62px] sm:rounded-[7px]";

/**
 * The card-fan mark. Three divs rather than the shipped `CardFan` SVG: the
 * design's geometry — 56×76 cards, 1px borders, a `99` on the accent-bordered
 * front card — disagrees with that mark's angles and fills, and restyling it
 * would leave two drawings claiming to be the same one.
 */
function CardFanMark() {
  return (
    <div aria-hidden="true" className="relative h-[100px] w-[118px] sm:h-[110px] sm:w-[130px]">
      <div
        className={`${CARD} left-[12px] top-[16px] rotate-[-14deg] border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] sm:left-[14px] sm:top-[18px] sm:rotate-[-16deg]`}
      />
      <div
        className={`${CARD} left-[28px] top-[11px] border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] sm:left-[32px] sm:top-[13px]`}
      />
      <div
        className={`${CARD} left-[44px] top-[16px] flex rotate-[14deg] items-center justify-center border-[color:var(--accent)] bg-[color:var(--surface-inset)] font-display text-[18px] font-bold text-[color:var(--accent)] sm:left-[50px] sm:top-[18px] sm:rotate-[15deg] sm:text-[20px]`}
      >
        99
      </div>
    </div>
  );
}

export function DecksZero({ buildable, cards }: { buildable: number; cards: number }) {
  const c = refreshCopy.zero;
  return (
    <div className="flex min-h-0 flex-auto flex-col items-center justify-center gap-[15px] px-[22px] py-[24px] text-center sm:gap-[16px] sm:px-[40px] sm:py-[26px]">
      <CardFanMark />

      <h2 className="m-0 font-display text-[22px] font-bold text-[color:var(--fg)] sm:text-[25px]">
        {c.decksHeading}
      </h2>

      {/* Two paragraphs, not one string chosen at runtime: the breakpoint is a
          CSS fact, and reading `window` to pick copy would paint the wrong one
          first. Only one is ever visible. */}
      <p className="m-0 text-[13.5px] leading-[1.65] text-[color:var(--fg-muted)] sm:hidden">
        {c.decksBodyShort}
      </p>
      <p className="m-0 hidden max-w-[430px] text-[14px] leading-[1.65] text-[color:var(--fg-muted)] sm:block">
        {c.decksBody}
      </p>

      <DecksZeroActions buildable={buildable} cards={cards} />
    </div>
  );
}

/**
 * The zero state's actions: Browse commanders (primary), Import a deck (ghost) and the
 * buildable line. ONE component for `/decks` and Home's "No decks yet" section, so the two
 * cannot drift (first-run ruling O1, 2026-09-28). A fragment, every class and margin as it
 * was inline here, so `/decks` renders identically; each host supplies the column around it.
 * Home passes no `buildable`, so its line never draws there (Hugh's ruling, 2026-09-28).
 */
export function DecksZeroActions({ buildable = 0, cards = 0 }: { buildable?: number; cards?: number }) {
  const c = refreshCopy.zero;
  return (
    <>
      <div className="mt-[4px] flex w-full flex-col gap-[9px] sm:mt-[2px] sm:w-auto sm:flex-row sm:gap-[10px]">
        <PrimaryButton
          href="/commanders"
          className="flex h-[44px] items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
        >
          {c.browseCommanders}
        </PrimaryButton>
        <GhostButton
          href="/decks/import"
          className="flex h-[44px] items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:justify-start sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
        >
          {c.importDeck}
        </GhostButton>
      </div>

      {/* Omitted entirely at zero: the line exists to justify Browse commanders
          being the primary, and "0 commanders buildable" argues the opposite. */}
      {buildable > 0 && (
        <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)] sm:mt-[2px]">
          {c.buildableFrom(buildable, cards.toLocaleString("en-US"))}
        </p>
      )}
    </>
  );
}
