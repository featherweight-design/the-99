"use client";
// *We read this as* (HANDOFF §4, the results' first block). The answers the search ran on, READ
// ONLY after the submit (H1): no chip is editable or removable here, and the only ways back are
// *Change answers* (the form, pre-filled) and *Start over* (the form, blank). The one control
// among the chips is the build-around card's name, which opens its card.
//
// *Not used* is not a chip: it is what the submit read in the words and set aside, quoted as the
// player wrote it. PR 6's deeper-read offer mounts in `offer`, under the top row.

import Link from "next/link";
import type { ReactNode } from "react";

import { CardDetailTrigger } from "../cards/card-detail-provider";
import { BuyTag } from "../decks/buy-tag";
import { OwnershipDot } from "../ui/ownership-dot";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { AnswerChip } from "../../lib/intake/present";
import type { CardChip } from "../../lib/intake/rows";
import { priceFactOf } from "./price-fact";

export function ReadAsBar({
  chips,
  card,
  notUsed,
  changeHref,
  startOverHref,
  offer,
}: {
  chips: readonly AnswerChip[];
  /** The build-around card's facts; its chip is the one in `chips` of kind `card`. */
  card: CardChip | null;
  notUsed: readonly string[];
  changeHref: string;
  startOverHref: string;
  offer?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="read-as-label"
      className="flex flex-col gap-[14px] p-[14px] md:p-[16px_18px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)]"
    >
      <div className="flex flex-col gap-[12px] md:flex-row md:items-start md:gap-[24px]">
        <div className="flex flex-col gap-[10px] flex-1 min-w-0">
          <h2 id="read-as-label" className="m-0 font-mono font-normal text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)]">
            {copy.readAs.label}
          </h2>
          {chips.length === 0 ? (
            <p className="m-0 flex items-center h-[26px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.readAs.none}</p>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-[6px]">
              {chips.map((chip, i) => (
                <li
                  key={`${chip.kind}-${i}`}
                  data-testid="answer-chip"
                  className="inline-flex items-center gap-[6px] h-[32px] md:h-[28px] pl-[9px] pr-[8px] rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]"
                >
                  <span className="font-mono text-[9px] tracking-[.1em] uppercase text-[color:var(--fg-locked)]">{chip.kind}</span>
                  {chip.kind === copy.readAs.kinds.card && card ? (
                    <CardValue card={card} />
                  ) : (
                    <span className="text-[12.5px] text-[color:var(--fg-body)]">{chip.value}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {notUsed.length > 0 && (
            <div data-testid="not-used" className="flex flex-wrap items-baseline gap-[4px_10px]">
              <span className="font-mono text-[9.5px] uppercase text-[color:var(--fg-locked)]">{copy.readAs.notUsed}</span>
              {notUsed.map((phrase) => (
                <q
                  key={phrase}
                  className="text-[13px] text-[color:var(--fg-muted)] underline decoration-dotted decoration-[color:var(--border-dashed)] underline-offset-[3px]"
                >
                  {phrase}
                </q>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-[8px] shrink-0">
          <Link
            href={changeHref}
            className="flex-[1_1_0] md:flex-none inline-flex items-center justify-center h-[44px] md:h-[36px] px-[14px] md:px-[16px] rounded-[8px] border border-solid border-[color:var(--accent)] text-[13.5px] font-semibold text-[color:var(--accent)] no-underline whitespace-nowrap"
          >
            {copy.readAs.change}
          </Link>
          <Link
            href={startOverHref}
            className="flex-[1_1_0] md:flex-none inline-flex items-center justify-center h-[44px] md:h-[36px] px-[14px] md:px-[16px] rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[13.5px] text-[color:var(--fg-body)] no-underline whitespace-nowrap"
          >
            {copy.readAs.startOver}
          </Link>
        </div>
      </div>
      {offer}
    </section>
  );
}

function CardValue({ card }: { card: CardChip }) {
  return (
    <>
      <CardDetailTrigger
        oracleId={card.oracleId}
        name={card.name}
        testId="card-chip-name"
        className="text-[12.5px] font-semibold text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] cursor-pointer"
      >
        {card.name}
      </CardDetailTrigger>
      {card.owned ? (
        <OwnershipDot owned size={6} />
      ) : card.price.kind === "priced" ? (
        <BuyTag variant="row" {...priceFactOf(card.price)} />
      ) : (
        // Never stocked or sold out: the price reads unknown, never $0 (F8).
        <span
          data-testid="card-chip-no-price"
          className="font-mono text-[9.5px] rounded-[4px] px-[5px] py-[1px] text-[color:var(--warning)] bg-[color-mix(in_oklab,var(--warning)_13%,transparent)]"
        >
          {addPanelCopy.unowned.tag}
          <span aria-hidden="true" className="px-[3px] text-[color:var(--border-strong)]">·</span>
          <span className="text-[color:var(--fg-faint)]">{copy.readAs.noPriceTail}</span>
        </span>
      )}
    </>
  );
}
