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
  afterDeeper = false,
}: {
  chips: readonly AnswerChip[];
  /** The build-around card's facts; its chip is the one in `chips` of kind `card`. */
  card: CardChip | null;
  notUsed: readonly string[];
  changeHref: string;
  startOverHref: string;
  offer?: ReactNode;
  /** A deeper look has settled on these answers: its leftovers are what even it could not place. */
  afterDeeper?: boolean;
}) {
  return (
    <section
      aria-labelledby="read-as-label"
      className="flex flex-col gap-[14px] p-[14px] md:p-[16px_18px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)]"
    >
      <div className="flex flex-col gap-[12px] md:flex-row md:items-start md:gap-[24px]">
        <div className="flex flex-col gap-[9px] flex-1 min-w-0">
          <h2 id="read-as-label" className="m-0 font-mono font-normal text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)]">
            {copy.readAs.label}
          </h2>
          {chips.length === 0 ? (
            // Said only when nothing at all was read: beside a Not used line it would contradict it.
            notUsed.length === 0 && <p className="m-0 flex items-center h-[26px] text-[13px] text-[color:var(--fg-muted)]">{copy.readAs.none}</p>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-[6px]">
              {/* The deeper look's chips follow every free-match chip, each group in the form's order. */}
              {[...chips.filter((c) => !c.deeper), ...chips.filter((c) => c.deeper)].map((chip, i) => (
                <li
                  key={`${chip.kind}-${i}`}
                  data-testid="answer-chip"
                  // One line, always: a long card name truncates inside the chip rather than wrapping out of it.
                  data-deeper={chip.deeper || undefined}
                  className={`inline-flex items-center gap-[6px] max-w-full min-w-0 whitespace-nowrap h-[32px] md:h-[28px] pl-[9px] pr-[8px] rounded-[6px] border ${chip.deeper ? "border-dashed border-[color:var(--accent)]" : "border-solid border-[color:var(--border-strong)]"} bg-[color:var(--surface)]`}
                >
                  <span className="shrink-0 font-mono text-[9px] tracking-[.1em] uppercase text-[color:var(--fg-locked)]">{chip.kind}</span>
                  {chip.codes ? (
                    // Printed in: the codes, mono, joined by "or"; the sets spoken in full.
                    <span data-testid="printed-in-codes" className="min-w-0 truncate">
                      <span className="sr-only">{chip.value}</span>
                      <span aria-hidden>
                        {chip.codes.map((c, j) => (
                          <span key={c}>
                            {j > 0 && <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{` ${copy.readAs.joiner} `}</span>}
                            <span className="font-mono text-[12px] font-semibold text-[color:var(--fg)]">{c}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  ) : chip.names ? (
                    // Any of: the names with a mono "or" drawn between them, and the chip's name spoken whole.
                    <span data-testid="any-of-names" className="min-w-0 truncate text-[12.5px] text-[color:var(--fg-body)]">
                      <span className="sr-only">{chip.value}</span>
                      <span aria-hidden>
                        {chip.names.map((n, j) => (
                          <span key={n}>
                            {j > 0 && <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{` ${copy.readAs.joiner} `}</span>}
                            {n}
                          </span>
                        ))}
                      </span>
                    </span>
                  ) : chip.kind === copy.readAs.kinds.card && card ? (
                    <CardValue card={card} />
                  ) : (
                    <span className="min-w-0 truncate text-[12.5px] text-[color:var(--fg-body)]">{chip.value}</span>
                  )}
                  {chip.tail && <span className="shrink-0 font-mono text-[9.5px] text-[color:var(--fg-faint)]">{chip.tail}</span>}
                  {chip.deeper && (
                    <span className="shrink-0 font-mono text-[9px] tracking-[.06em] text-[color:var(--accent)]">{copy.readAs.deeperMark}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {notUsed.length > 0 && (
            <div data-testid="not-used" className="flex flex-wrap items-baseline gap-[4px_10px]">
              <span className="font-mono text-[9.5px] tracking-[.1em] uppercase text-[color:var(--fg-locked)]">{afterDeeper ? copy.readAs.stillNotUsed : copy.readAs.notUsed}</span>
              {notUsed.map((phrase) => (
                // The quotes are the text's own, not a `q` element's: those are the browser's to draw.
                <span
                  key={phrase}
                  data-testid="not-used-phrase"
                  className="text-[13px] text-[color:var(--fg-muted)] border-0 border-b border-dotted border-[color:var(--border-dashed)]"
                >
                  {`“${phrase}”`}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-[8px] shrink-0">
          <Link
            href={changeHref}
            className="flex-[1_1_0] md:flex-none inline-flex items-center justify-center h-[44px] md:h-[36px] px-[16px] rounded-[8px] border border-solid border-[color:var(--accent)] text-[13.5px] font-semibold text-[color:var(--accent)] no-underline whitespace-nowrap"
          >
            {copy.readAs.change}
          </Link>
          <Link
            href={startOverHref}
            className="flex-[1_1_0] md:flex-none inline-flex items-center justify-center h-[44px] md:h-[36px] px-[14px] rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[13.5px] text-[color:var(--fg-body)] no-underline whitespace-nowrap"
          >
            {copy.readAs.startOver}
          </Link>
        </div>
      </div>
      {offer}
    </section>
  );
}

/** The build-around card as the results bar draws it; the create page's answers block reuses it. */
export function CardValue({ card, size = "chip" }: { card: CardChip; /** `row`: the answers block's 13.5px value. */ size?: "chip" | "row" }) {
  return (
    <>
      <CardDetailTrigger
        oracleId={card.oracleId}
        name={card.name}
        testId="card-chip-name"
        className={`min-w-0 truncate ${size === "row" ? "text-[13.5px]" : "text-[12.5px]"} font-semibold text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] cursor-pointer`}
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
