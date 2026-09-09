// "Your decks · n" — the rail, and the one route to /decks that Home draws.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md §DeckRail.
// The heading counts the decks the player HAS, never the rows drawn: the rail
// is a directory, not a ranking, and it keeps `listDecksWithStats`'s own order
// so the reader can walk it. The footer's count and `All decks` are how the
// rest is reached.
//
// Placement inside the two-column §HomeBody belongs to the layout task; this
// draws the section and nothing around it.

import Link from "next/link";
import { ART_STRIPES, cssUrl } from "../../lib/collection/browse";
import { refreshCopy } from "../../lib/copy/refresh";
import { MATURE_DECK_SIZE } from "../../lib/decks/availability";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { STATUS_TOKEN } from "../../lib/decks/status-style";

export const RAIL_ROWS = 4;
export const RAIL_ROWS_PHONE = 3;

/**
 * The phone status line's clause, or null for the status word alone.
 *
 * Deliberately NOT the deck tile's `statusDetailFor`. That one answers a
 * different question — it explains a status in a row that has a price, a clock
 * and an in-use-elsewhere fallback to spend on it — and three of its six
 * branches have no counterpart here: `Draft`'s `created today` needs the `now`
 * the rail has no reason to take, `Complete`'s `all owned` is already said by
 * the `99 / 99` this line sits beside, and the tile's price clause needs a
 * per-deck cost the rail never prints. Lifting a shared helper over the two
 * would mean passing a clock and a price into a rail that uses neither, so
 * they stay two switches over one vocabulary: the strings are shared, the
 * rules are not.
 */
function railClause(deck: DeckListItem, shopping: ShoppingRollup): string | null {
  const c = refreshCopy.decks;
  switch (deck.statusPill) {
    case "To buy": {
      // The roll-up and only the roll-up. It excludes basics, as every Shopping
      // surface does; `deck.toBuyCount` is `built − ownedCount`, which neither
      // excludes basics nor knows about seniority, so the two are different
      // definitions of "to buy". A deck whose only
      // unowned cards are basics therefore has a `To buy` pill — that threshold
      // counts them — and no roll-up entry at all; it draws the status alone
      // rather than a count of cards no Shopping surface will offer to sell.
      const copies = shopping.byDeck.get(deck.id)?.copies ?? 0;
      return copies > 0 ? c.detailCopies(copies) : null;
    }
    case "Unresolved":
      return c.detailUnresolved(deck.unresolvedCount);
    case "Over":
      return c.detailOver(deck.built - MATURE_DECK_SIZE);
    // The three statuses the `87 / 99` on the same line already explains. A
    // clause invented to fill the slot would say it twice.
    case "Draft":
    case "Building":
    case "Complete":
      return null;
  }
}

/** §DeckRailRow — the 3px left keyline, the row's only piece of status colour. */
function keyline(deck: DeckListItem) {
  return { borderLeftColor: `var(${STATUS_TOKEN[deck.statusPill]})` };
}

function statusColor(deck: DeckListItem) {
  return { color: `var(${STATUS_TOKEN[deck.statusPill]})` };
}

function DesktopRow({ deck }: { deck: DeckListItem }) {
  return (
    <Link
      href={`/decks/${deck.id}`}
      // The whole row is the target — no per-row button, because a button would
      // be a second way to do the one thing the row already does.
      //
      // Every row carries the rule, the last one included: the footer sits under
      // it inside the same frame, and without one the two would run together.
      className="flex items-center gap-[10px] border-b border-l-[3px] border-solid border-b-[color:var(--border)] px-[13px] py-[10px]"
      style={keyline(deck)}
    >
      <span className="min-w-0 flex-auto truncate font-display text-[14px] font-semibold text-[color:var(--fg)]">
        {deck.name}
      </span>
      {/* Desktop prints the status word alone: the column is 316px wide and the
          frame draws neither art nor a count beside it. */}
      <span className="flex-none font-mono text-[10px]" style={statusColor(deck)}>
        {deck.statusPill}
      </span>
    </Link>
  );
}

function PhoneRow({
  deck,
  clause,
  last,
}: {
  deck: DeckListItem;
  clause: string | null;
  last: boolean;
}) {
  return (
    <Link
      href={`/decks/${deck.id}`}
      className={`flex min-h-[56px] items-center gap-[10px] border-l-[3px] border-solid px-[13px] py-[12px] ${
        // Phone drops the last row's rule: nothing follows it inside the frame,
        // so the rule would draw an edge against the card's own border.
        last ? "" : "border-b border-b-[color:var(--border)]"
      }`}
      style={keyline(deck)}
    >
      {/* The art spine is phone's alone. 56px is the touch target, and the
          height it buys is what the chip fills. The stripes are the fallback
          for a commander whose printing carries no image, the same one the
          tile and the hero use. */}
      <span
        className="h-[36px] w-[26px] flex-none rounded-[4px]"
        aria-hidden
        style={{
          background: deck.commanderImageUri
            ? `${cssUrl(deck.commanderImageUri)} center/cover`
            : ART_STRIPES,
        }}
      />

      <span className="flex min-w-0 flex-auto flex-col gap-[3px]">
        {/* The DECK name, not the commander's — a renamed deck must show the
            name its owner gave it, as the tile and the resume rows do. */}
        <span className="truncate font-display text-[14.5px] font-semibold text-[color:var(--fg)]">
          {deck.name}
        </span>
        <span className="truncate font-mono text-[10.5px]" style={statusColor(deck)}>
          {clause === null ? deck.statusPill : `${deck.statusPill} · ${clause}`}
        </span>
      </span>

      <span className="flex-none font-mono text-[12px] tabular-nums text-[color:var(--fg)]">
        {deck.built} / {MATURE_DECK_SIZE}
      </span>
    </Link>
  );
}

/**
 * `n` is this subtree's own remainder, never a constant.
 *
 * Four rows on desktop and three on phone, so a six-deck player reads `2 more`
 * on one and `3 more` on the other, and both are true. That is why each list
 * carries its own footer rather than sharing one.
 */
function RailFooter({ more }: { more: number }) {
  const c = refreshCopy.home;
  return (
    <div className="flex items-center justify-between px-[13px] py-[9px]">
      {more > 0 && (
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {c.decksMore(more)}
        </span>
      )}
      {/* Always drawn, including when nothing is hidden: this is the route to
          the page, not a footnote on a count that may not be there. `ml-auto`
          therefore has to survive being the row's only child. */}
      <Link href="/decks" className="ml-auto text-[12.5px] text-[color:var(--fg-body)]">
        {c.allDecks}
      </Link>
    </div>
  );
}

export function DeckRail({
  decks,
  shopping,
}: {
  decks: DeckListItem[];
  shopping: ShoppingRollup;
}) {
  // A heading over nothing is worse than silence: a player with a collection
  // and no decks reads the heroes and no rail.
  if (decks.length === 0) return null;

  const desktop = decks.slice(0, RAIL_ROWS);
  const phone = decks.slice(0, RAIL_ROWS_PHONE);

  return (
    <section className="flex flex-col gap-[11px]">
      {/* §SectionLabel. The TOTAL, not the number of rows below it. */}
      <h2 className="m-0 flex-none font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {refreshCopy.home.decksHeading(decks.length)}
      </h2>

      <div className="overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-inset)]">
        {/* Two subtrees, and the only pair in this feature. They are not one row
            drawn at two sizes: the lists hold different decks, the rows hold
            different nodes, and the footers print different counts. A single
            list cannot state two remainders, and a CSS-only answer would put
            the second one in a `content:` string no screen reader can reach. */}
        <div data-rail="desktop" className="hidden sm:block">
          {desktop.map((deck) => (
            <DesktopRow key={deck.id} deck={deck} />
          ))}
          <RailFooter more={Math.max(0, decks.length - RAIL_ROWS)} />
        </div>

        <div data-rail="phone" className="sm:hidden">
          {phone.map((deck, i) => (
            <PhoneRow
              key={deck.id}
              deck={deck}
              clause={railClause(deck, shopping)}
              last={i === phone.length - 1}
            />
          ))}
          {/* The phone frame ends at the third row. The footer ships anyway: a
              reader told there are six decks and shown three has been given a
              count with no route, and the tab bar is not one. Recorded as a
              deviation from the drawing. */}
          <RailFooter more={Math.max(0, decks.length - RAIL_ROWS_PHONE)} />
        </div>
      </div>
    </section>
  );
}
