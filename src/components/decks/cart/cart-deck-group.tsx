// CartDeckGroup — one deck's share of the cart, by deck (handoff A5, A5-t). The header carries the
// deck's select and its roll-up figure; the body lists what that deck buys, each at that deck's own
// pick. Shaped like Consider's shelf header, without its motion. An unselected deck stays folded.
// v2 (PR 5): the body's rows are the v2 row (`CartFactsRow`), under the group's own column header on desktop, and the
// need fact reads from this deck's point of view: its own count, then `also` the other selected decks that need it.

import { useId } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { formatCents } from "../../../lib/decks/price";
import { figuresOf, ownFact, selectLine, type CartDeck, type CartLine, type OwnFact, type SelectedLine } from "../../../lib/decks/cart";
import { CartFactsRow, lineFact } from "./cart-line";
import { CartColumns } from "./cart-columns";
import { Chevron } from "../../ui/chevron";
import { usePageSpares } from "../../social/spare-markers";
import { Checkbox } from "../../ui/checkbox";

/**
 * A line as the open deck's row reads it: this deck's own copy alone, at this deck's own pick (the figure its own
 * Shopping list draws), a commander only when it is THIS deck's. Null when the deck buys none of it.
 */
export function deckLineOf(line: CartLine, deckId: string): SelectedLine | null {
  const own = line.rows.find((r) => r.deckId === deckId);
  if (!own) return null;
  return { ...line, commander: own.commander, selectedRows: [own], ...figuresOf([own]) };
}

/**
 * The need fact's `also`: the OTHER selected decks that need the card, each with its copies, in the selections' order
 * (`deckNames` was built in it). The open deck is never one of them: it is the count the fact leads with.
 */
export function alsoDecks(
  line: CartLine, deckId: string, selected: ReadonlySet<string>, deckNames: ReadonlyMap<string, string>,
): { name: string; count: number }[] {
  return [...deckNames].flatMap(([id, name]) => {
    if (id === deckId || !selected.has(id)) return [];
    const row = line.rows.find((r) => r.deckId === id);
    return row ? [{ name, count: row.quantity }] : [];
  });
}

/**
 * The own fact from the open deck's point of view. Named, it is By card's (where every owned copy is in use, this deck
 * included). Its fallback counts as elsewhere every copy any OTHER deck holds, on the line or off it: the line's own
 * `heldElsewhere` leaves out every line deck's copies, which is right by card and wrong here, where another line deck's
 * copies are in another deck.
 */
export function deckOwnFact(
  line: CartLine, deckId: string, selected: ReadonlySet<string>,
  rank: ReadonlyMap<string, number>, names: ReadonlyMap<string, string>,
): OwnFact | null {
  const picked = selectLine(line, selected);
  const own = picked ? ownFact(picked, selected, rank, names) : null;
  if (own?.kind !== "elsewhere") return own;
  const elsewhere = line.heldElsewhere + line.rows.reduce((n, r) => n + (r.deckId === deckId ? 0 : r.held), 0);
  return { ...own, elsewhere };
}

export function CartDeckGroup({
  deck,
  lines,
  on,
  open,
  priced,
  deckNames,
  holders,
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
  /** Who holds what, for the own fact (G1): each deck's place in the selections' order, and every holding deck's name. */
  holders: { rank: ReadonlyMap<string, number>; names: ReadonlyMap<string, string> };
  selected: ReadonlySet<string>;
  newestAsOf: Date | null;
  onToggle: () => void;
  onFold: () => void;
}) {
  const labelId = useId();
  const bodyId = useId();
  const expanded = on && open;
  const spares = usePageSpares();
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
        // The body's inset: none on a phone (the board's 390 `.bd2`), 28 from md, under the deck name past the select.
        <div id={bodyId} className="pb-[6px] md:pl-[28px]">
          <CartColumns view="deck" />
          <ul className="m-0 flex list-none flex-col p-0">
            {lines.map((line) => {
              const mine = deckLineOf(line, deck.id);
              if (!mine) return null;
              const also = alsoDecks(line, deck.id, selected, deckNames);
              return (
                <CartFactsRow
                  key={line.oracleId}
                  line={mine}
                  fact={lineFact(mine, newestAsOf)}
                  need={{
                    label: copy.facts.deck,
                    count: mine.copies,
                    items: also,
                    prefix: copy.facts.also,
                    head: copy.facts.alsoDecks(also.length),
                  }}
                  spares={spares?.byCard.get(line.oracleId) ?? []}
                  own={deckOwnFact(line, deck.id, selected, holders.rank, holders.names)}
                  newestAsOf={newestAsOf}
                  inGroup
                />
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
