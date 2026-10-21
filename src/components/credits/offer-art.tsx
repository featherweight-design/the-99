// The offer's mark (R2b, the crown's diamond): a 46px square turned 45 degrees, the pack's count upright inside
// it. CSS only, in the shipped tokens (no image, no new token). The container is 74px wide and reaches 5px above
// its box, as the board's does, so the diamond's points sit clear of the title beside it.
//
// The numeral is centred on its CAP HEIGHT (`text-box: trim-both cap alphabetic`, lining figures), not its line box:
// the six display faces put their digits at six different heights in a line box, and Cormorant's default figures
// descend. Measured per face, the ink centre sits within 1px of the diamond's centre. Metamorphous (First Frost,
// `.offer-numeral` in globals.css) keeps its digits 1.5px low even so. A browser without `text-box` falls back to
// the plain `leading-none` centring.
//
// The plan's mark carries the crown (`crown`): three small diamonds, the middle one the tallest, 17px above the
// large one so the turned square's top point stays clear of them. The path is R2b's `.dm3` verbatim. A pack's
// mark has none.

export function OfferArt({ count, crown = false }: { count: number; crown?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex w-[74px] flex-none flex-col items-center pb-[12px] pt-[4px] ${crown ? "gap-[17px]" : ""}`}>
      {crown ? (
        <svg data-offer-crown width="35" height="12" viewBox="0 0 34.99 12.02" fill="var(--accent)" aria-hidden="true">
          <path d="M4.24 3.54 L8.49 7.78 L4.24 12.02 L0.00 7.78Z" />
          <path d="M17.50 0.00 L23.51 6.01 L17.50 12.02 L11.49 6.01Z" />
          <path d="M30.75 3.54 L34.99 7.78 L30.75 12.02 L26.51 7.78Z" />
        </svg>
      ) : null}
      <span className="flex h-[46px] w-[46px] rotate-45 items-center justify-center rounded-[4px] border-[1.5px] border-solid border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface))]">
        <b className="offer-numeral -rotate-45 font-display text-[21px] font-bold leading-none text-[color:var(--accent-text)] [font-variant-numeric:lining-nums] [text-box:trim-both_cap_alphabetic]">{count}</b>
      </span>
    </span>
  );
}
