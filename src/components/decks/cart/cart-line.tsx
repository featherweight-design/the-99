// CartLine — one card on the cart, by card (handoff S0): its name, the decks that need it with
// their copies (`3 · HD - Gishath, HD - Kratos, HD -Thorin`, full names, wrapped, never truncated),
// the owned fact when the player owns it, and the buy tag at the line's total.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import type { PriceFact } from "../../../lib/decks/price";
import type { SelectedLine } from "../../../lib/decks/cart";
import { BuyTag } from "../buy-tag";
import { useCartGotIt } from "./cart-got-it";
import { CardDetailTrigger } from "../../cards/card-detail-provider";
import { TOUCH_HIT } from "../../ui/touch-hit";
import { TwoFacedMark } from "../../cards/two-faced-mark";
import { frontFaceName } from "../../../lib/cards/faces";
import { OtherWaysPress } from "../../social/spare-markers";

/**
 * The line's figure as one fact for the shared tag: the priced copies' sum (audit finding 9), each
 * at its own deck's pick. With nothing priced, a sold-out copy reads `sold out` (an `as_of` older
 * than the feed's newest) and anything else reads bare. Null on a failed read (T2): bare `buy`.
 */
export function lineFact(line: SelectedLine, newestAsOf: Date | null): PriceFact | null {
  if (!newestAsOf) return null;
  if (line.pricedCopies > 0) {
    // A live copy at $0.00 is still live, never sold out: it draws bare `buy`, as the tile draws
    // no figure for a zero total, rather than `$0.00`.
    if (line.cents === 0) return null;
    // Every priced copy of ONE finish other than normal: the sum is that finish's figure, and the
    // tag says `foil` or `etched` as each deck's own Shopping row does. A normal-priced copy, or a
    // mix of finishes, makes it an ordinary figure with no qualifier, since none is true of it all.
    const finishes = new Set(line.selectedRows.filter((r) => r.cents !== null).map((r) => r.finish));
    const only = finishes.size === 1 ? [...finishes][0] : null;
    return only === "foil"
      ? { cents: null, foilCents: line.cents, etchedCents: null, asOf: newestAsOf }
      : only === "etched"
        ? { cents: null, foilCents: null, etchedCents: line.cents, asOf: newestAsOf }
        : { cents: line.cents, foilCents: null, etchedCents: null, asOf: newestAsOf };
  }
  if (line.selectedRows.some((r) => r.state === "soldOut")) {
    return { cents: null, foilCents: null, etchedCents: null, asOf: new Date(0) };
  }
  return null;
}

export function CartLine({
  line,
  deckNames,
  newestAsOf,
  end,
  inPanel = false,
  spare,
  data,
}: {
  line: SelectedLine;
  deckNames: Map<string, string>;
  newestAsOf: Date | null;
  /**
   * What sits before the buy tag in place of the spare press: By friend's Ask or one-word status (spare requests PR
   * 3c), where the glyph would say nothing. Absent, the line draws the shipped press.
   */
  end?: React.ReactNode;
  /** Inside a By friend panel (`.fg .cl`): inset 14px, ruled between lines, the right side centred on the line. */
  inPanel?: boolean;
  /**
   * By friend: the panel's friend's spare copies of this card, after the decks line in the modal row's figure ("2
   * spares"), so a reader can see how many before asking. Absent elsewhere.
   */
  spare?: number;
  /** Data attributes for the line's `<li>`: By friend marks its friend and state, for the focus landing and probes. */
  data?: Record<`data-${string}`, string>;
}) {
  const names = line.selectedRows.map((r) => deckNames.get(r.deckId) ?? "");
  const fact = lineFact(line, newestAsOf);
  // What the spares-only modal draws of the line: its card, art and the line's figure.
  // A cart line carries the oracle name and no printing, so no printed name stands in for it.
  const spareCard = { oracleId: line.oracleId, name: line.name, printedName: null, layout: line.layout ?? null, imageUri: line.imageUri ?? null, price: fact, quantity: line.copies };
  // I got it (cart PR 6): the tag is the press, when buying is on (the provider is mounted).
  const gotIt = useCartGotIt();
  const id = line.oracleId;
  const added = gotIt?.held.get(id)?.added ?? 0;
  const press = gotIt
    ? {
        onPress: (trigger: HTMLElement) => gotIt.open(line, trigger),
        state: gotIt.openFor === id
          ? (gotIt.pending ? "pending" as const : "open" as const)
          : gotIt.undoing.has(id) ? "disabled" as const : "rest" as const,
        cardName: line.name,
      }
    : undefined;
  return (
    <li {...data} className={inPanel
      ? "flex items-center gap-[12px] border-t border-[color:var(--border)] px-[14px] py-[11px] first:border-t-0"
      : "flex items-start gap-[12px] border-t border-[color:var(--border)] py-[11px]"}>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
          <CardDetailTrigger
            oracleId={line.oracleId}
            name={line.name}
            imageUri={line.imageUri ?? null}
            preview
            // The name draws at its ~21px line; a coarse pointer gets 44px, reaching under a pixel past the row's 11px padding
            // (onto the row above's empty bottom padding) and, for a very short name, over the plain text beside it.
            className={`${TOUCH_HIT} text-left text-[14px] leading-[1.4] text-[color:var(--fg)] [text-wrap:pretty] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]`}
          >
            {frontFaceName(line.name, line.layout)}
          </CardDetailTrigger>
          <TwoFacedMark layout={line.layout} />
          {line.commander ? (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
              {copy.list.commander}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">
          {copy.list.decks(line.copies, names)}
          {/* The separator and the count wrap as one, so a narrow line never leaves a hanging "·". */}
          {spare !== undefined ? (
            <>
            {" "}
            <span className="whitespace-nowrap">
              {"· "}
              <em data-testid="cart-line-spare" className="not-italic text-[color:var(--fact)]">{copy.byFriend.spares(spare)}</em>
            </span>
            </>
          ) : null}
        </span>
        {/* Why a card the player owns is on a buy list, said without a verdict or a warning colour
            (lock 4): the other decks hold the copies. */}
        {line.owned > 0 ? (
          <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
            {line.heldElsewhere === line.owned
              ? copy.list.owned(line.owned)
              : copy.list.ownedSome(line.owned, line.heldElsewhere)}
          </span>
        ) : null}
        {/* S4: bought this visit and still listed, at the count the read gives it now. */}
        {added > 0 ? (
          <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.list.addedThisVisit(added)}</span>
        ) : null}
      </div>
      {/* S5: the spare glyph before the tag while a friend holds a spare, opening the spares-only modal. The cart has
          no stand-ins, so the press never holds ⇄. */}
      <span className={inPanel ? "mt-[1px] flex flex-none items-center gap-[10px]" : "mt-[3px] flex flex-none items-center gap-[8px]"}>
        {end !== undefined ? end : (
          <OtherWaysPress card={spareCard} standIn={false} standInAria="" limitFigure="" className="-my-[9px] md:my-0" />
        )}
        <BuyTag variant="row" reserveSlot price={fact} newestAsOf={newestAsOf} press={press} />
      </span>
    </li>
  );
}

/**
 * S3: a line bought this visit that the cart no longer lists keeps its place as a held slot, the
 * shape a deck's Shopping row leaves (`gotItCopy.slot.held`), until the cart is next read.
 */
export function CartHeldSlot({ name, added }: { name: string; added: number }) {
  return (
    <li data-held-slot className="anim-slot-in my-[6px] flex items-center gap-[10px] rounded-[9px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[11px]">
      <span className="min-w-0 flex-1 text-[13.5px] leading-[1.4] text-[color:var(--fg-muted)] [text-wrap:pretty]">
        {gotItCopy.slot.held(name)}
      </span>
      <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.list.added(added)}</span>
    </li>
  );
}
