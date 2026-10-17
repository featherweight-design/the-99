// The offer's mark (R2b, the crown's diamond): a 46px square turned 45 degrees, the pack's count upright inside
// it. CSS only, in the shipped tokens (no image, no new token). The container is 74px wide and reaches 5px above
// its box, as the board's does, so the diamond's points sit clear of the title beside it.

export function OfferArt({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="flex w-[74px] flex-none flex-col items-center pb-[12px] pt-[4px]">
      <span className="flex h-[46px] w-[46px] rotate-45 items-center justify-center rounded-[4px] border border-solid border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface))]">
        <b className="-rotate-45 pt-[2px] font-display text-[21px] font-bold leading-none text-[color:var(--accent)]">{count}</b>
      </span>
    </span>
  );
}
