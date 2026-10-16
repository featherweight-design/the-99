// CartDeckGroup — one deck's share of the cart, by deck (handoff A5, A5-t). The header carries the
// deck's select and its roll-up figure; the body lists what that deck buys, each at that deck's own
// pick, with the other selected decks that need the card too (`also …`). Shaped like Consider's
// shelf header, without its motion. An unselected deck stays folded.

import { useId } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { formatCents } from "../../../lib/decks/price";
import { figuresOf, type CartDeck, type CartLine } from "../../../lib/decks/cart";
import { BuyTag } from "../buy-tag";
import { lineFact } from "./cart-line";
import { Chevron } from "../../ui/chevron";
import { CardDetailTrigger } from "../../cards/card-detail-provider";
import { TwoFacedMark } from "../../cards/two-faced-mark";
import { frontFaceName } from "../../../lib/cards/faces";
import { OtherWaysPress } from "../../social/spare-markers";
import { Checkbox } from "../../ui/checkbox";

export function CartDeckGroup({
  deck,
  lines,
  on,
  open,
  priced,
  deckNames,
  selected,
  newestAsOf,
  onToggle,
  onFold,
}: {
  deck: CartDeck;
  /** Every cart line this deck buys a copy of. */
  lines: CartLine[];
  on: boolean;
  open: boolean;
  priced: boolean;
  deckNames: Map<string, string>;
  selected: ReadonlySet<string>;
  newestAsOf: Date | null;
  onToggle: () => void;
  onFold: () => void;
}) {
  const labelId = useId();
  const bodyId = useId();
  const expanded = on && open;
  return (
    <section aria-labelledby={labelId} className="border-t border-[color:var(--border)]">
      <div className="flex min-h-[52px] items-center gap-[10px]">
        <label className="-m-[13px] flex cursor-pointer p-[13px]">
          <Checkbox checked={on} onChange={onToggle} ariaLabel={copy.selections.aria(deck.name, on)} />
        </label>
        <h3 className="m-0 min-w-0 flex-1">
          <button
            id={labelId}
            type="button"
            onClick={onFold}
            disabled={!on}
            aria-expanded={expanded}
            aria-controls={expanded ? bodyId : undefined}
            className="flex min-h-[44px] w-full items-center gap-[10px] text-left disabled:cursor-default"
          >
            <span className="min-w-0 flex-1 text-[14px] font-medium leading-[1.35] [text-wrap:pretty]" style={{ color: on ? "var(--fg)" : "var(--fg-muted)" }}>
              {deck.name}
            </span>
            <span className="flex-none font-mono text-[11px]" style={{ color: on ? "var(--fg-body)" : "var(--fg-locked)" }}>
              {priced && deck.cents > 0
                ? copy.selections.figure(deck.copies, formatCents(deck.cents))
                : copy.selections.figureNoPrice(deck.copies)}
            </span>
            <span aria-hidden className="flex min-h-[44px] w-[28px] flex-none items-center justify-center text-[color:var(--fg-muted)]">
              <Chevron kind="disclosure" open={expanded} />
            </span>
          </button>
        </h3>
      </div>
      {expanded ? (
        <ul id={bodyId} className="m-0 flex list-none flex-col pl-[28px] pb-[10px]">
          {lines.map((line) => {
            const own = line.rows.find((r) => r.deckId === deck.id);
            if (!own) return null;
            // In the selections' own order (the canvas's), which `deckNames` was built in.
            const others = [...deckNames]
              .filter(([id]) => id !== deck.id && selected.has(id) && line.rows.some((r) => r.deckId === id))
              .map(([, name]) => name);
            // From THIS deck's vantage: every copy held by any other deck, on the line or off it. The
            // line's own `heldElsewhere` leaves out every line deck's copies, which is right for the
            // by-card line and wrong here, where another line deck's copies are in another deck.
            const elsewhere = line.heldElsewhere + line.rows.reduce((n, r) => n + (r.deckId === deck.id ? 0 : r.held), 0);
            // This deck's own copy, at this deck's own pick: the figure its own Shopping list draws.
            const fact = lineFact({ ...line, selectedRows: [own], ...figuresOf([own]) }, newestAsOf);
            return (
              <li key={line.oracleId} className="flex items-start gap-[12px] border-t border-[color:var(--border)] py-[11px]">
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
                    <CardDetailTrigger
                      oracleId={line.oracleId}
                      name={line.name}
                      imageUri={line.imageUri ?? null}
                      preview
                      className="text-left text-[14px] leading-[1.4] text-[color:var(--fg)] [text-wrap:pretty] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]"
                    >
                      {frontFaceName(line.name, line.layout)}
                    </CardDetailTrigger>
                    <TwoFacedMark layout={line.layout} />
                    {own.commander ? (
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{copy.list.commander}</span>
                    ) : null}
                  </div>
                  {others.length > 0 ? (
                    <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{copy.list.also(others)}</span>
                  ) : null}
                  {line.owned > 0 ? (
                    <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
                      {elsewhere === line.owned ? copy.list.owned(line.owned) : copy.list.ownedSome(line.owned, elsewhere)}
                    </span>
                  ) : null}
                </div>
                {/* S5: the spare glyph before the tag, as the By card line draws it. */}
                <span className="mt-[3px] flex flex-none items-center gap-[8px]">
                  <OtherWaysPress
                    card={{ oracleId: line.oracleId, name: line.name, printedName: null, layout: line.layout ?? null, imageUri: line.imageUri ?? null, price: fact }}
                    standIn={false}
                    standInAria=""
                    limitFigure=""
                    className="-my-[9px] md:my-0"
                  />
                  <BuyTag variant="row" reserveSlot price={fact} newestAsOf={newestAsOf} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
