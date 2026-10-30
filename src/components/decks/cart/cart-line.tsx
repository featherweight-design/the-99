// The cart's v2 rows (call 1): the card, then need, spare and own as facts, then the action stack.
// CartCardLine is By card's, CartFriendLine By friend's (PR 6), and By deck draws CartFactsRow itself.

import type { ReactNode } from "react";
import { compareNames } from "../../../lib/person-name";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import type { PriceFact } from "../../../lib/decks/price";
import type { OwnFact, SelectedLine } from "../../../lib/decks/cart";
import type { FriendSpare } from "../../../lib/social/spares";
import { CartFact, type FactItem } from "./cart-facts";
import { FACTS_GRID, FACTS_GRID_CLOSED, FRIEND_GRID, useSpareColumn } from "./cart-columns";
import { BuyTag } from "../buy-tag";
import { useCartGotIt } from "./cart-got-it";
import { CardDetailTrigger } from "../../cards/card-detail-provider";
import { TOUCH_HIT } from "../../ui/touch-hit";
import { TwoFacedMark } from "../../cards/two-faced-mark";
import { frontFaceName } from "../../../lib/cards/faces";
import { OtherWaysPress, usePageSpares } from "../../social/spare-markers";
import { BAR } from "../../ui/tile-skeleton";

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

/**
 * I got it (cart PR 6): the tag is the press, when buying is on (the provider is mounted), and what was added this
 * visit (S4).
 */
function useLinePress(line: SelectedLine) {
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
  return { added, press };
}

/** What the spares-only modal draws of a line: its card, art and figure. A cart line carries the oracle name and no printing. */
function spareCardOf(line: SelectedLine, fact: PriceFact | null) {
  return { oracleId: line.oracleId, name: line.name, printedName: null, layout: line.layout ?? null, imageUri: line.imageUri ?? null, price: fact, quantity: line.copies };
}

/**
 * By card's row (v2 call 1): the card, then its three facts, then the action stack, which By card holds the tag alone
 * (call 3: Ask lives in the spares modal).
 */
export function CartCardLine({
  line,
  deckNames,
  own,
  spares,
  newestAsOf,
}: {
  line: SelectedLine;
  /** The cart's decks by id: the need fact's names. */
  deckNames: ReadonlyMap<string, string>;
  /** The own fact (`ownFact`): where every owned copy is in use, or the shipped row's fallback; null with none owned. */
  own: OwnFact | null;
  /** Friends' spares of this card (S5), or none. */
  spares: readonly FriendSpare[];
  newestAsOf: Date | null;
}) {
  const fact = lineFact(line, newestAsOf);
  const { added, press } = useLinePress(line);
  const need = line.selectedRows.map((r) => ({ name: deckNames.get(r.deckId) ?? "", count: r.quantity }));
  return (
    <CartFactsRow
      line={line}
      fact={fact}
      need={{ label: copy.facts.need, count: line.copies, items: need, head: copy.facts.forDecks(need.length) }}
      spares={spares}
      own={own}
      press={press}
      added={added}
      newestAsOf={newestAsOf}
    />
  );
}

/**
 * By friend's row (v2 call 1, PR 6): the card, need, this friend's spare copies as a bare count, and own, then the action
 * stack with the Ask (or its status) above the tag (call 3). The row sits in a friend's panel.
 */
export function CartFriendLine({
  line,
  deckNames,
  own,
  spare,
  ask,
  data,
  newestAsOf,
}: {
  line: SelectedLine;
  deckNames: ReadonlyMap<string, string>;
  own: OwnFact | null;
  /** The panel's friend's spare copies of this card. */
  spare: number;
  /** `RowEnd` at the cart's size: Ask, or the status in its place. */
  ask: ReactNode;
  /** Data attributes for the row's `<li>`: its friend and ask state, for the focus landing and probes. */
  data: Record<`data-${string}`, string>;
  newestAsOf: Date | null;
}) {
  const fact = lineFact(line, newestAsOf);
  const { added, press } = useLinePress(line);
  const need = line.selectedRows.map((r) => ({ name: deckNames.get(r.deckId) ?? "", count: r.quantity }));
  return (
    <CartFactsRow
      line={line}
      fact={fact}
      need={{ label: copy.facts.need, count: line.copies, items: need, head: copy.facts.forDecks(need.length) }}
      spares={[]}
      friendSpare={spare}
      own={own}
      press={press}
      added={added}
      ask={ask}
      inPanel
      data={data}
      newestAsOf={newestAsOf}
    />
  );
}

/**
 * A v2 row, By card's, By deck's and By friend's (call 1): the card, then need, spare and own as facts, then the tag. Phone: the facts
 * are labelled lines under the name, the tag at the right. Desktop: the facts are columns under `CartColumns`, the name
 * cell and the facts dissolving into the row's grid. The need fact is the view's: By card's `need` counts every selected
 * deck's copies `for` them; By deck's `deck` counts the open deck's, then names the others `also`.
 */
export function CartFactsRow({
  line,
  fact,
  need,
  spares,
  own,
  press,
  added = 0,
  inGroup = false,
  friendSpare,
  ask,
  inPanel = false,
  data,
  newestAsOf,
}: {
  /** The line as this row reads it: By deck's is the open deck's own row alone, at its own pick. */
  line: SelectedLine;
  fact: PriceFact | null;
  need: { label: string; count: number; items: readonly FactItem[]; head: string; prefix?: string };
  /** Friends' spares of this card (S5), or none. */
  spares: readonly FriendSpare[];
  own: OwnFact | null;
  /** The tag's I got it press; By deck's tag has none. */
  press?: ReturnType<typeof useLinePress>["press"];
  added?: number;
  /** Inside a By deck group, whose body sets the inset: no padding of the row's own across, and a rule over the first. */
  inGroup?: boolean;
  /**
   * By friend: the panel's friend's spare copies, drawn as the spare fact's count alone, on every row and at every width
   * (By friend's grid, its 64px spare column). Absent elsewhere, where the spare fact is every friend's.
   */
  friendSpare?: number;
  /** By friend: the Ask or its status, on top of the action stack, the tag under it (call 3). */
  ask?: ReactNode;
  /** Inside a By friend panel (`.fpn .nrw`, `.fpn .prw`): 14px across at every width. */
  inPanel?: boolean;
  data?: Record<`data-${string}`, string>;
  newestAsOf: Date | null;
}) {
  // Most spares first, then by name, so the name that leads is the friend most likely to have one to give.
  const friends = [...spares]
    .sort((a, b) => b.spare - a.spare || compareNames(a.friend.displayName, b.friend.displayName))
    .map((s) => ({ name: s.friend.displayName, count: s.spare }));
  const spareCount = friends.reduce((n, f) => n + f.count, 0);
  // G1: the decks holding the copies, by name, only when they account for every copy. Otherwise the shipped row's facts:
  // `in other decks` while other decks hold them all, the count elsewhere while a deck on the line holds some.
  const fallback = own?.kind === "elsewhere"
    ? (own.elsewhere === own.owned ? copy.facts.inOther : own.elsewhere > 0 ? copy.facts.someInOther(own.elsewhere) : "")
    : undefined;
  const ownItems = own?.kind === "named" ? own.decks.map((d) => ({ name: d.name, count: d.held })) : [];
  // Every friend's spares (By card, By deck) while this card's read is out: the cell draws the skeleton bar (call 9), on a
  // phone as a SPARE line every row keeps until the read lands. After a failed read the column is closed (B2).
  const pageSpares = usePageSpares();
  const spareOpen = useSpareColumn();
  const reading = friendSpare === undefined && pageSpares !== null && !pageSpares.loaded.has(line.oracleId);
  const grid = friendSpare !== undefined ? FRIEND_GRID : spareOpen ? FACTS_GRID : FACTS_GRID_CLOSED;
  return (
    <li
      {...data}
      data-cart-row
      // In a group the column header sits just above the first row, which keeps its own rule under the header's (the
      // board's `.colh` then `.nrw`, not its first child); on a phone there is no header and the first row has none.
      className={`flex items-start gap-[12px] border-t border-[color:var(--border)] py-[12px] first:border-t-0 xl:grid xl:min-h-[64px] xl:items-center xl:has-[[data-fact-open]]:items-start ${
        inPanel ? "px-[14px]" : inGroup ? "xl:px-0 xl:first:border-t" : "xl:px-[14px]"
      } ${grid}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px] xl:contents">
        <div className="flex min-w-0 flex-col gap-[3px] xl:col-start-1 xl:row-start-1">
          <span className="flex min-w-0 items-baseline gap-[8px]">
            <CardDetailTrigger
              oracleId={line.oracleId}
              name={line.name}
              imageUri={line.imageUri ?? null}
              preview
              // One line (the board's `.nm2`): the ellipsis is on the inner text, since clipping the press itself would
              // clip the coarse pointer's 44px hit drawn past it.
              className={`${TOUCH_HIT} min-w-0 max-w-full text-left text-[14px] leading-[1.4] text-[color:var(--fg)] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]`}
            >
              <span className="block truncate">{frontFaceName(line.name, line.layout)}</span>
            </CardDetailTrigger>
            <TwoFacedMark layout={line.layout} />
          </span>
          {line.commander ? (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{copy.list.commander}</span>
          ) : null}
          {/* S4: bought this visit and still listed, at the count the read gives it now. */}
          {added > 0 ? (
            <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.list.addedThisVisit(added)}</span>
          ) : null}
        </div>
        <CartFact
          testId="need"
          label={need.label}
          count={need.count}
          items={need.items}
          prefix={need.prefix}
          head={need.head}
          moreAria={copy.facts.moreDecksAria}
          className="xl:col-start-2 xl:row-start-1"
        />
        {friendSpare !== undefined ? (
          <CartFact
            testId="spare"
            label={copy.facts.spare}
            count={friendSpare}
            items={[]}
            head=""
            moreAria={copy.facts.moreFriendsAria}
            className="xl:col-start-3 xl:row-start-1"
          />
        ) : reading ? (
          <SpareReading />
        ) : friends.length > 0 && spareOpen ? (
          <CartFact
            testId="spare"
            label={copy.facts.spare}
            count={spareCount}
            items={friends}
            head={copy.facts.fromFriends(friends.length)}
            moreAria={copy.facts.moreFriendsAria}
            // S5: the shipped glyph press, opening the spares-only modal where Ask lives. Its coarse hit stays 44px across
            // but only 2px above and below, as the pill's does: a 44px-tall hit would reach the need line's pill above it.
            lead={
              <OtherWaysPress
                card={spareCardOf(line, fact)}
                standIn={false}
                standInAria=""
                limitFigure=""
                oneLine
                className="pointer-coarse:after:h-[calc(100%+4px)]!"
              />
            }
            className="xl:col-start-3 xl:row-start-1"
          />
        ) : null}
        {own ? (
          <CartFact
            testId="own"
            label={copy.facts.own}
            count={own.owned}
            items={ownItems}
            prefix={copy.facts.in}
            fallback={fallback}
            head={copy.facts.inDecks(ownItems.length)}
            moreAria={copy.facts.moreDecksAria}
            dim
            className="xl:col-start-4 xl:row-start-1"
          />
        ) : null}
      </div>
      <span className="flex flex-none flex-col items-end gap-[10px] xl:col-start-5 xl:row-start-1 xl:gap-[7px]">
        {/* By friend's Ask (or its status) on top: 36px on a phone, 28 on desktop, so the tag never moves (call 3). */}
        {ask !== undefined ? <span data-cart-ask className="flex h-[36px] items-center xl:h-[28px]">{ask}</span> : null}
        {/* The tag's row in the stack: 22px on a phone, 20 on desktop, the shipped tag centred in it. Under an Ask, the
            tag's coarse 44px hit is cut at the gap's midline (5px up on a phone, 3.5 on desktop), where the Ask's stops:
            the two meet there and never overlap. */}
        <span
          className={`flex h-[22px] items-center xl:h-[20px] ${
            ask !== undefined ? "[clip-path:inset(-5px_-100vw_-100vw_-100vw)] xl:[clip-path:inset(-3.5px_-100vw_-100vw_-100vw)]" : ""
          }`}
        >
          <BuyTag variant="row" reserveSlot price={fact} newestAsOf={newestAsOf} press={press} />
        </span>
      </span>
    </li>
  );
}

/**
 * A spare cell while its card's read is out (Loading A, B): the shipped skeleton bar, breathing, 58px in the desktop
 * column and 74px on the phone's labelled line. The result line says what it waits for, so the cell is hidden from a
 * screen reader.
 */
function SpareReading() {
  return (
    <div
      aria-hidden
      data-fact="spare"
      data-fact-reading=""
      className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-baseline xl:col-start-3 xl:row-start-1 xl:flex xl:flex-col xl:items-stretch"
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] xl:hidden">{copy.facts.spare}</span>
      <span className="font-mono text-[11.5px] leading-[1.5]">
        <span data-testid="spare-skeleton" className={`${BAR} anim-skeleton inline-block h-[10px] w-[74px] align-middle xl:w-[58px]`} />
      </span>
    </div>
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
