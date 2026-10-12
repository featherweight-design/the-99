"use client";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { formatCents } from "../../lib/decks/price";
import type { MoneyGroup, MoneyStats } from "../../lib/decks/stats-money";
import { Shell } from "./deck-stats-shell";

const copy = deckStatsCopy.money;

/** A group's figure: its dollars when any copy is priced, else its count, never $0.00. */
function groupFigure(g: MoneyGroup): string {
  return g.pricedCopies > 0 ? formatCents(g.cents) : copy.copiesFig(g.copies);
}

function Figure({ k, v, sub, ink }: { k: string; v: string; sub: string; ink: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]" data-money-figure={k}>
      <span className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{k}</span>
      <span className="whitespace-nowrap font-mono text-[16px] font-semibold md:text-[20px]" style={{ color: ink }}>{v}</span>
      <span className="text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]">{sub}</span>
    </div>
  );
}

export function MoneyCard({ money, onShop }: { money: MoneyStats; onShop?: () => void }) {
  const { value, owned, toBuy, basics, total, priciest } = money;
  const denom = copy.denom(total);
  const nothingToBuy = toBuy.copies === 0;

  const valueFig = value.pricedCopies > 0 ? formatCents(value.cents) : copy.noPrice;
  const valueSub = value.pricedCopies < value.copies ? copy.valuePartial(value.pricedCopies, value.copies) : copy.valueSub;
  const ownedFig = groupFigure(owned);
  const toBuyFig = nothingToBuy ? copy.toBuyNone : groupFigure(toBuy);
  const toBuySub = nothingToBuy
    ? copy.toBuyNoneSub
    : toBuy.pricedCopies === 0
      ? toBuy.copies === 1 ? copy.noPriceOne : copy.noPriceMany
      : toBuy.pricedCopies < toBuy.copies
        ? copy.toBuyPartial(toBuy.pricedCopies, toBuy.copies)
        : copy.toBuySub(toBuy.copies);
  const ownedSub =
    owned.pricedCopies > 0 && owned.pricedCopies < owned.copies
      ? copy.ownedPartial(owned.pricedCopies, owned.copies, basics)
      : copy.ownedSub(owned.copies, basics);

  const widest = Math.max(1, ...priciest.map((p) => p.cents ?? 0));

  return (
    <Shell title={deckStatsCopy.cards.money} id="money" denom={denom} label={`${deckStatsCopy.cards.money}, ${denom}`}>
      <div className="grid grid-cols-3 gap-[12px]">
        <Figure k={copy.value} v={valueFig} sub={valueSub} ink="var(--fg)" />
        <Figure k={copy.owned} v={ownedFig} sub={ownedSub} ink="var(--fg)" />
        <Figure k={copy.toBuy} v={toBuyFig} sub={toBuySub} ink={nothingToBuy ? "var(--fg-body)" : "var(--warning)"} />
      </div>
      {nothingToBuy || !onShop ? null : (
        <button
          type="button"
          data-money-shop
          onClick={onShop}
          className="-mt-[6px] flex min-h-[44px] items-center self-start md:min-h-[28px]"
        >
          <span className="border-b border-b-[color:color-mix(in_oklab,var(--warning)_45%,transparent)] font-mono text-[11px] text-[color:var(--warning)]">{copy.shopLink(toBuy.copies)}</span>
          <span aria-hidden="true" className="ml-[8px] text-[12px] text-[color:var(--fg-muted)]">⟶</span>
        </button>
      )}
      <div className="flex flex-col gap-[8px]">
        <div aria-hidden="true" className="grid grid-cols-10 gap-[5px] md:grid-cols-[repeat(20,minmax(0,1fr))] md:gap-[4px]" data-money-squares>
          {Array.from({ length: owned.copies }, (_, i) => (
            <span key={`o${i}`} data-money-square="owned" className="aspect-square rounded-[3px] border border-[color:var(--fg-muted)] bg-[color:var(--fg-muted)]" />
          ))}
          {Array.from({ length: basics }, (_, i) => (
            <span key={`b${i}`} data-money-square="basic" className="aspect-square rounded-[3px] border border-[color:var(--border-strong)]" />
          ))}
          {Array.from({ length: toBuy.copies }, (_, i) => (
            <span key={`t${i}`} data-money-square="toBuy" className="aspect-square rounded-[3px] border border-[color:var(--warning)] bg-[color:var(--warning)]" />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] text-[11.5px] text-[color:var(--fg-body)]" data-money-legend>
          <span className="inline-flex items-center gap-[6px]">
            <span aria-hidden="true" className="size-[10px] rounded-[2px] border border-[color:var(--fg-muted)] bg-[color:var(--fg-muted)]" />
            {copy.legend.owned}
          </span>
          <span className="inline-flex items-center gap-[6px]">
            <span aria-hidden="true" className="size-[10px] rounded-[2px] border border-[color:var(--border-strong)]" />
            {copy.legend.basic}
          </span>
          {nothingToBuy ? null : (
            <span className="inline-flex items-center gap-[6px]">
              <span aria-hidden="true" className="size-[10px] rounded-[2px] border border-[color:var(--warning)] bg-[color:var(--warning)]" />
              {copy.legend.toBuy}
            </span>
          )}
        </div>
      </div>
      {priciest.length > 0 ? (
        <div className="flex flex-col gap-[2px]" data-money-priciest>
          <span className="pb-[6px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.priciest}</span>
          <ul className="flex flex-col">
            {priciest.map((p) => (
              <li
                key={p.oracleId}
                data-money-priciest-row={p.toBuy ? "toBuy" : "owned"}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[4px] border-b border-b-[color:var(--border)] py-[6px]"
              >
                <span className="min-w-0 text-[13px] text-[color:var(--fg)]">
                  {p.name}{" "}
                  <span className="ml-[4px] font-mono text-[10px]" style={{ color: p.toBuy ? "var(--warning)" : "var(--fg-faint)" }}>
                    {p.toBuy ? copy.tagToBuy : copy.tagOwned}
                  </span>
                </span>
                <span className="whitespace-nowrap text-right font-mono text-[12px] text-[color:var(--fg)]">
                  {p.cents === null ? copy.noPrice : p.qualifier ? `${formatCents(p.cents)} ${p.qualifier}` : formatCents(p.cents)}
                </span>
                <span aria-hidden="true" className="col-span-2 h-[4px] overflow-hidden rounded-full bg-[color:var(--elevated)]">
                  <span
                    className="anim-grow-x origin-left block h-full"
                    style={{ width: `${p.cents === null ? 0 : (p.cents / widest) * 100}%`, background: p.toBuy ? "var(--warning)" : "var(--fg-muted)" }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <span className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.caption}</span>
    </Shell>
  );
}
