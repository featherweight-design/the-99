// The offer's mark (R2b, the crown's diamond): a 46px square turned 45 degrees, the pack's count upright inside
// it. CSS only, in the shipped tokens (no image, no new token). The container is 74px wide and reaches 5px above
// its box, as the board's does, so the diamond's points sit clear of the title beside it.
//
// The numeral is centred on its CAP HEIGHT (`text-box: trim-both cap alphabetic`, lining figures), not its line box:
// the six display faces put their digits at six different heights in a line box, and Cormorant's default figures
// descend. Measured per face, the ink centre sits within 1px of the diamond's centre. Metamorphous (First Frost,
// `.offer-numeral` in globals.css) keeps its digits 1.5px low even so. A browser without `text-box` falls back to
// the plain `leading-none` centring.

export function OfferArt({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="flex w-[74px] flex-none flex-col items-center pb-[12px] pt-[4px]">
      <span className="flex h-[46px] w-[46px] rotate-45 items-center justify-center rounded-[4px] border border-solid border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface))]">
        <b className="offer-numeral -rotate-45 font-display text-[21px] font-bold leading-none text-[color:var(--accent)] [font-variant-numeric:lining-nums] [text-box:trim-both_cap_alphabetic]">{count}</b>
      </span>
    </span>
  );
}
