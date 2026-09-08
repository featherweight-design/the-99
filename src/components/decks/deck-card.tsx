import Link from "next/link";
import { ART_STRIPES, WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";
import { refreshCopy } from "../../lib/copy/refresh";
import { MATURE_DECK_SIZE } from "../../lib/decks/availability";
import { colorLabel } from "../../lib/decks/format";
import { formatCents } from "../../lib/decks/price";
import type { DeckListItem } from "../../lib/decks/read";
import type { DeckShopping } from "../../lib/decks/shopping-rollup";
import { statusBarStyle } from "../../lib/decks/status-style";
import { formatWhen } from "../../lib/format/when";
import { DeckCardOverflow } from "./deck-card-overflow";
import { StatusPillBadge } from "./status-pill";

/**
 * The one figure that explains the status (`STATES-deck-statuses.md` §7). Total
 * over the six values: a status with no branch here would render an empty slot,
 * which reads as a bug rather than as an absence.
 *
 * Null is a branch, not a gap: several statuses are explained by the `87 / 99`
 * the meta row already prints, and for those the honest detail is nothing at
 * all rather than a second figure invented to fill the slot.
 */
function detailFor(
  deck: DeckListItem,
  shopping: DeckShopping | undefined,
  now: Date,
): { text: string; color: string } | null {
  const c = refreshCopy.decks;
  const statusDetail = statusDetailFor(deck, shopping, now);
  // Fills the slot only where the status has nothing to say in it. The clause is
  // a fact about the collection, and `4 over` or `3 lines unresolved` is a fact
  // about the deck the reader opened the tile for — the narrower reading of the
  // table's "in place of the ordinary detail figure", and the one that never
  // hides a warning. Flagged for Design to ratify.
  if (statusDetail === null && deck.inUseElsewhere > 0) {
    return { text: c.detailInUseElsewhere(deck.inUseElsewhere), color: "var(--accent)" };
  }
  return statusDetail === null
    ? null
    : { text: statusDetail, color: DETAIL_COLOR[deck.statusPill] };
}

function statusDetailFor(
  deck: DeckListItem,
  shopping: DeckShopping | undefined,
  now: Date,
): string | null {
  const c = refreshCopy.decks;
  switch (deck.statusPill) {
    case "Draft":
      // `detailDraft` is the literal `created today`, so it is only true on the
      // day of creation. An older Draft draws no figure rather than being told
      // a date it does not have — a Draft deck older than a day is a real state
      // the copy file does not cover, and the gap report says so.
      return formatWhen(deck.createdAt, now) === "today" ? c.detailDraft : null;
    case "Building":
      // No figure. Building's count IS its explanation, and the count already
      // has its own slot in the same row — a second copy of `87 / 99` beside
      // the first says nothing and reads as a rendering fault.
      return null;
    case "Over":
      return c.detailOver(deck.built - MATURE_DECK_SIZE);
    case "Unresolved":
      return c.detailUnresolved(deck.unresolvedCount);
    case "To buy": {
      // Every figure here comes from the roll-up, never from `deck.toBuyCount`.
      // The roll-up excludes basics, as every Shopping surface does;
      // `toBuyCount` is `built − ownedCount` and does not, so the two are
      // different definitions of "unowned" and mixing them prints a cost that
      // covers fewer copies than the number beside it.
      //
      // A deck whose only unowned cards are basics therefore has a `To buy`
      // pill — that threshold counts them — and no roll-up entry at all. It
      // draws no figure rather than a count of cards no Shopping surface will
      // offer to sell; the `87 / 99` beside it already says how far along it is.
      if (!shopping) return null;
      // No price row is not "free" — the copies still print, the cost does not.
      return shopping.cents > 0
        ? c.detailToBuy(shopping.copies, formatCents(shopping.cents))
        : c.detailUnowned(shopping.copies);
    }
    case "Complete":
      return c.detailComplete;
  }
}

/** The detail figure carries the status's colour only where the status is a warning. */
const DETAIL_COLOR: Record<DeckListItem["statusPill"], string> = {
  Draft: "var(--fg-faint)",
  Building: "var(--fg-faint)",
  Over: "var(--danger)",
  Unresolved: "var(--warning)",
  "To buy": "var(--fg-faint)",
  Complete: "var(--fg-faint)",
};

interface DeckCardProps {
  deck: DeckListItem;
  /** Absent when the deck's cards are all owned — absent, never a zeroed row. */
  shopping: DeckShopping | undefined;
  /**
   * A prop for the same reason `formatWhen` takes one: the page is a server
   * component, it reads the clock once, and every tile on it must agree.
   */
  now: Date;
}

/**
 * A deck tile: commander art with the status pill and the name over it, then a
 * meta row, a 3px progress bar and — on desktop — a detail row.
 *
 * **No call to action.** The whole tile is the link, so an "Open builder"
 * button would be a second way to do the one thing the tile already does. The
 * absolute-inset `<Link>` is what makes that work; the overflow is a
 * `relative z-10` sibling so its clicks never reach the overlay.
 *
 * The body is a grid rather than a stack of rows, because the phone and the
 * desktop put the same nodes in different places: the detail figure sits in the
 * meta row on a phone and below the bar on desktop. Two grid-area maps move one
 * set of nodes; two subtrees would read the label twice to a screen reader and
 * pass a property check on both columns while being wrong.
 */
export function DeckCard({ deck, shopping, now }: DeckCardProps) {
  const detail = detailFor(deck, shopping, now);
  const count = `${deck.built} / ${MATURE_DECK_SIZE}`;
  const lastPlayed = deck.lastPlayedAt
    ? formatWhen(deck.lastPlayedAt, now)
    : refreshCopy.decks.lastPlayedNever;

  const ariaLabel =
    detail === null
      ? refreshCopy.decks.cardAriaNoDetail(deck.name, deck.statusPill, count)
      : refreshCopy.decks.cardAria(deck.name, deck.statusPill, count, detail.text);

  return (
    <article
      className="relative flex-none overflow-hidden rounded-[14px]"
      style={{ background: "var(--surface-inset)", border: "1px solid var(--border)" }}
    >
      {/* 1 · Art header. Always present: `decks.commander_oracle_id` is NOT
          NULL, so every deck has a commander and every tile has art — Draft
          included. The stripes are the fallback for a commander whose printing
          carries no image, not for a deck without one. */}
      <div
        data-deck-art
        className="relative h-[124px] sm:h-[118px]"
        style={{
          background: deck.commanderImageUri
            ? `${cssUrl(deck.commanderImageUri)} center/cover`
            : ART_STRIPES,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--bg) 10%, transparent), color-mix(in srgb, var(--surface-inset) 96%, transparent))",
          }}
        />
        <StatusPillBadge status={deck.statusPill} />
        <DeckCardOverflow deckId={deck.id} deckName={deck.name} built={deck.built} />
        <h3
          className="absolute inset-x-0 bottom-0 truncate px-[13px] pb-[10px] font-display text-[17px] font-semibold sm:text-[15px]"
          style={{ color: "var(--fg)" }}
        >
          {deck.name}
        </h3>
      </div>

      {/* 2 · Body. Phone: `pips detail count` over the bar. Desktop: the colour
          label takes the middle slot, and the detail drops below the bar beside
          last played. */}
      <div
        className="grid items-center gap-x-[8px] gap-y-[10px] pt-[11px] pr-[13px] pb-[13px] pl-[13px] [grid-template-areas:'pips_detail_count''bar_bar_bar'] sm:gap-y-[9px] sm:[grid-template-areas:'pips_label_count''bar_bar_bar''detail_._played']"
        style={{ gridTemplateColumns: "auto 1fr auto" }}
      >
        <span className="flex gap-[3px]" style={{ gridArea: "pips" }} aria-hidden>
          {deck.commanderColorIdentity.map((color) => (
            <span
              key={color}
              className="h-[9px] w-[9px] rounded-[2px]"
              style={{
                background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                // Every pip carries a hairline so `--b` survives a light ground.
                border: "1px solid var(--border-strong)",
              }}
            />
          ))}
        </span>

        <span
          className="hidden truncate font-mono text-[10.5px] sm:inline"
          style={{ gridArea: "label", color: "var(--fg-faint)" }}
        >
          {colorLabel(deck.commanderColorIdentity)}
        </span>

        {detail !== null && (
          <span
            className="truncate font-mono text-[11px] sm:text-[10.5px]"
            style={{ gridArea: "detail", color: detail.color }}
          >
            {detail.text}
          </span>
        )}

        <span
          className="text-right font-mono text-[12.5px] tabular-nums sm:text-[12px]"
          style={{
            gridArea: "count",
            color: deck.statusPill === "Draft" ? "var(--fg-muted)" : "var(--fg)",
          }}
        >
          {count}
        </span>

        {/* 3 · Progress. The track is drawn for every status; the fill is
            omitted entirely for Draft, which is what "empty track" means. */}
        <div
          data-deck-bar
          className="relative h-[3px] rounded-[2px]"
          style={{ gridArea: "bar", background: "var(--border)" }}
        >
          {deck.statusPill !== "Draft" && (
            <div
              data-deck-bar-fill
              className="absolute top-0 bottom-0 left-0 rounded-[2px]"
              style={statusBarStyle(deck.statusPill, deck.built)}
            />
          )}
        </div>

        {/* 4 · Last played, desktop only. A Draft tile has none: its detail row
            carries `created today` alone. */}
        {deck.statusPill !== "Draft" && (
          <span
            className="hidden text-right font-mono text-[10.5px] sm:inline"
            style={{ gridArea: "played", color: "var(--fg-faint)" }}
          >
            {lastPlayed}
          </span>
        )}
      </div>

      {/* The whole tile is the target. Last in the DOM so it overlays the body,
          and named with the same four things the tile shows, in the same
          order. */}
      <Link
        href={`/decks/${deck.id}`}
        className="absolute inset-0"
        aria-label={ariaLabel}
      />
    </article>
  );
}
