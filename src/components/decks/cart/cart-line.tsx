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
}: {
  line: SelectedLine;
  deckNames: Map<string, string>;
  newestAsOf: Date | null;
}) {
  const names = line.selectedRows.map((r) => deckNames.get(r.deckId) ?? "");
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
    <li className="flex items-start gap-[12px] border-t border-[color:var(--border)] py-[11px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
          <CardDetailTrigger
            oracleId={line.oracleId}
            name={line.name}
            imageUri={line.imageUri ?? null}
            preview
            className="text-left text-[14px] leading-[1.4] text-[color:var(--fg)] [text-wrap:pretty] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] transition-colors"
          >
            {line.name}
          </CardDetailTrigger>
          {line.commander ? (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
              {copy.list.commander}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">
          {copy.list.decks(line.copies, names)}
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
      <span className="mt-[3px] flex-none">
        <BuyTag variant="row" reserveSlot price={lineFact(line, newestAsOf)} newestAsOf={newestAsOf} press={press} />
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
