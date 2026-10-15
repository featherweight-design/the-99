"use client";

// One row of the update diff (#277). Three shapes, one component: a removal
// carries a Keep control, an addition carries its source line, and neither is
// struck through or tinted --danger.
//
// No strikethrough and no red anywhere. A struck-through row says the deletion
// has happened, and nothing has happened yet — the group heading, its count and
// its sentence carry that fact. The row stays a legible card with a control on
// it, the same principle as the add panel's spent slot.
//
// Two rows here are mounted twice over — by the update flow and by #389's review
// page — and that is why neither draws a type label and why neither owns its own
// action any more:
//
// - the type is a HEADING over the rows that share it, said once instead of once
//   per row. Both mountings group by `groupByCardType`, so the label carried
//   nothing the group above it does not. `DiffRowCard.typeLine` stays on the type
//   because the grouping reads it, and stops being drawn. `DiffRowUnnamed` is
//   untouched: an unmatched line has no type to group under.
// - the decision is the mounting's, passed in. The update flow's `Keep` is
//   `DiffRowKeep` in `DiffRowOut`'s action slot; the review page's is a pull. A
//   row that owned both would be a row that offers a Keep on a surface where
//   putting a card back means adding it to the deck.

import Link from "next/link";
import { hasFrontFaceCost } from "../../lib/cards/faces";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { Availability } from "../../lib/decks/availability";
import type { PriceFact } from "../../lib/decks/price";
import { CardDetailTrigger, useCardDetail, useCardIntent, type Sibling } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips, CostTrack } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { ROW_RADIUS, ROW_SHELL } from "../ui/row-shell";
import { BuyTag } from "./buy-tag";
import { usePreviewRow } from "./hover-preview";
import { ProxyTag } from "./proxy-tag";

const copy = deckImportCopy.update.diff;

/**
 * The review page's box: 40px desktop, 44px phone, and 44px at both widths on a
 * row carrying an action, because the control is 44px on the phone and the plate
 * cannot be shorter than what stands on it.
 *
 * THE REVIEW PAGE'S ALONE, which is what `review` on both rows is for. The
 * update flow draws six row kinds in one list and only two of them are these
 * components; retuning the pair to the newer box would leave a kept removal and
 * an unchanged row 4px taller and 3px wider beside their neighbours in a list
 * whose alignment is its whole legibility.
 */
const ROW_BOX = "min-h-[44px] md:min-h-[40px] px-[8px] md:px-[9px]";
const ROW_BOX_ACTION = "min-h-[44px] p-[8px] md:py-0 md:pl-[9px] md:pr-[6px]";

/** The stacked row's box. It keeps the phone's 8px vertical padding at every
 *  width, because two lines inside a 44px plate with no padding is what the
 *  desktop reset was written against: `md:py-0` belongs to the single-line rows
 *  that still draw a 34px control on a 44px plate, and applying it here would
 *  press the two lines against the plate's edges. */
const ROW_BOX_STACKED = "min-h-[44px] p-[8px] md:pl-[9px] md:pr-[6px]";

/** A pull-bearing row is two lines at EVERY width: the card name on the first,
 *  the holding deck, the price and the control on the second.
 *
 *  It was one line above 768px, with `md:contents` dissolving both groupings into
 *  the flat flex row every other row is, and that row does not fit. A type group
 *  takes its direction column's full width — about 574px at 1300px, and under
 *  400px at the narrowest desktop — against a line asking for a dot, a card
 *  name, a deck name, a price tag, a 44px control and the cost track. Whichever
 *  item was the flexible one went to zero: first the card name, which is the
 *  reported bug, then the deck name once the row split in two. Two lines is what
 *  the phone already draws and what the row can honour, and both of those lines
 *  wrap for the same reason.
 *
 *  Short groups used to share a line as ~276px sub-columns, which made the same
 *  row narrower again; that pairing is retired (2026-09-14). The shell does not
 *  depend on it either way — with it gone the row is measured at 406px/195px for
 *  the card name at 1300px/820px, still short of the ~561px a single line asks
 *  for. Every figure in this file is the post-pairing one. */
const ROW_SHELL_STACKED = `flex flex-col items-stretch gap-[8px] ${ROW_RADIUS}`;
const STACK_LINE = "flex items-center gap-[9px]";

/** What the update flow has always drawn. `DiffRowOut` reserves its right edge
 *  for the keep control; `DiffRowIn` has no action in that flow. */
const ROW_BOX_OUT_IMPORT = "min-h-[44px] pl-[12px] pr-[6px]";
const ROW_BOX_IN_IMPORT = "min-h-[44px] px-[12px]";

// The plate, the seam the availability marker cuts its notch against, and the
// hover state — all three at once, because hover moves the plate and a seam left
// behind would notch the marker against a colour the row has stopped being.
//
// Hover is a fill and NOT the border the canvas drew with it. An
// `--accent-shadow` row border is already a statement on this component: it is
// how the update flow says a removal has been kept. A hover that borrowed it
// would make a row the pointer is merely passing over indistinguishable from one
// the player has decided about — and the design bundle flags the same collision
// itself, the hover fill having no brand token behind it.
//
// The hover is the review page's, for the reason the box is: four of the update
// flow's six row kinds cannot hover, so a pair that could would single itself out
// of a list where a row's tint already means something.
const ROW_PLATE =
  "group bg-[color:var(--surface)] [--row-bg:var(--surface)] [border:1px_solid_var(--border)]";
export const ROW_PLATE_HOVER =
  "md:cursor-pointer md:hover:bg-[color:var(--elevated-hover)] md:hover:[--row-bg:var(--elevated-hover)]";
const ROW_PLATE_KEPT =
  "group bg-[color:var(--elevated-hover)] [--row-bg:var(--elevated-hover)] " +
  "[border:1px_solid_var(--accent-shadow)]";
const SEAM = "var(--row-bg)";

export type DiffRowCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  /** True only of a card the app placed. False covers a hand-add and a previous
   *  import's rows alike, so it carries no marker of its own. */
  auto: boolean;
  owned: boolean;
  /**
   * This deck prints its copy. **Tested before `owned`**, because a printed card
   * is unowned by design: the shipped slot opened `if (buyable && !card.owned)`
   * and so quoted a price on the review screen for a card its owner had decided
   * not to buy — one deck, one card, one surface away from the decklist saying
   * the opposite.
   */
  proxied?: boolean;
  /** Governs the availability marker only, never the slot's occupant. Null for
   *  an unowned card and for a failed rollup alike, and neither draws a marker.
   *  A card nothing competes for is NOT null: it carries a real rollup that the
   *  marker itself renders as nothing, so null and `free` reach the same drawing
   *  by different routes and must not be collapsed into one. An unowned row
   *  still fills the slot, with the buy tag. */
  availability: Availability | null;
  /** Review page only. The update flow passes none of the four and draws exactly
   *  what it drew before: no cost track, a bare `buy` tag, and the two-state dot.
   *  The cost is the printed string rather than the mana value, because
   *  `{W}{W}{U}{U}` and `{4}` are the same integer and different cards. */
  manaCost?: string | null;
  price?: PriceFact | null;
  /** Liveness is one comparison against the newest row in the price table. */
  newestAsOf?: Date | null;
  /** Owned but spoken for by another deck — the ownership dot's third state, and
   *  the one row that is owned and still has a price worth reading. */
  committed?: boolean;
  /**
   * Copies this row still has to be bought, when the caller knows.
   *
   * `owned` is not that answer. `bucketAdds` files a partially covered add with
   * no claimant under `unowned` — one copy owned against an ask of four is three
   * copies short with nobody to ask — so that row is owned, not committed, and
   * still sends the player shopping. Without this the slot drew its availability
   * marker and hid the price on a row the page's own buy count includes.
   *
   * Absent from the update flow, which knows no shortfall and keeps the reading
   * it has always had.
   */
  shortfall?: number;
  /** Review page only: the art the hover preview shows. The update flow passes
   *  none and mounts no `HoverPreviewProvider`, so its rows stay inert. */
  imageUri?: string | null;
};

/** A copy count that moved rather than a card arriving or leaving whole. */
export type DiffRowRecount = { from: string; to: string };

/** The shipped `auto` tag, and nothing in its place when the card is not the
 *  app's. No column records who placed a card, so a second marker would assert
 *  something the data cannot support — Product ruled it out on 2026-09-05. */
function Marker({ auto }: { auto: boolean }) {
  // Keeps its box when there is no tag, so the type line beside it does not
  // shift between an app-placed row and a player's own. The border stays in both
  // states because its width is part of that box.
  return (
    <span
      className={[
        "hidden md:inline font-mono text-[10px] rounded-full px-[8px] py-[3px] flex-none",
        "text-[color:var(--fg-faint)] [border:1px_solid_var(--border)]",
        auto ? "" : "invisible",
      ].join(" ")}
    >
      auto
    </span>
  );
}

/**
 * The floor's one availability slot: the buy tag on a row with no free copy, the
 * marker when there is one. Never both — a row with nothing free has no headroom
 * to report, and a row that holds a free copy is not one to buy.
 *
 * The question the slot asks is "has this row a free copy", not "is the card
 * owned", and the difference is the sleeved add: the copy exists and is in
 * somebody else's deck, so buying it is the alternative the pull is weighed
 * against and the price is the whole point of drawing it. `committed` is how the
 * caller says so, and the update flow, which does not pass it, keeps the reading
 * it has always had.
 *
 * `shortfall` is the other half of that same correction, for the row that is
 * owned and has no claimant at all: one copy held against an ask of four buys
 * three, and neither `owned` nor `committed` says so.
 *
 * An owned card nothing competes for draws nothing here, and that is the slot
 * being filled correctly rather than left empty: the marker returns null at
 * `free` on every surface in the app.
 *
 * The tag is the full `buy`, not the decklist's collapsed `$` — the collapse is
 * an All-tab affordance on a list the player is scanning, and this is a diff
 * they are reading once.
 *
 * `selfClaimed` is the caller's answer to the one question `selfExcluded` is
 * allowed to mean: does THIS deck's own claim account for the shortfall? The
 * rollup was read with `excludeDeckId`, so a removal — a card the deck holds
 * today — reaches `free === 0` by having its own claim subtracted, and must not
 * be called hard.
 *
 * An addition's answer depends on which flow is drawing it, which is why the
 * review page's adds pass `review` here. A staged draft's add is already a
 * `deck_cards` row, so the deck's own claim on it WAS subtracted and a
 * `free === 0` means the collection covers the add. The update flow's adds are a
 * proposed import that has written nothing, so nothing of theirs was subtracted
 * and a `free === 0` there is a genuine claim by another deck.
 *
 * `buyable` is false where the card is leaving: the review page's out column is
 * cards going back to the pool, and its header says so, so a `buy` tag there
 * quotes a price for a copy the reader is about to stop needing. The update
 * flow's removals keep the tag they have always drawn — that list is a proposed
 * import, where a row coming out may still have to be bought back.
 */
function AvailabilitySlot({
  card,
  selfClaimed,
  buyable = true,
}: {
  card: DiffRowCard;
  selfClaimed: boolean;
  buyable?: boolean;
}) {
  // FIRST, and before `buyable` is even consulted: a printed card asks the
  // collection for nothing, so neither the buy tag nor the marker beside it has
  // anything true to say about it. `deckRowTag` makes the same call on the
  // decklist; this is that ruling reaching its third surface.
  // `silent`: this row's full sentence rides `aria-describedby` on the card
  // trigger, and the tag's own word would announce the same state twice — where
  // the guard tags beside it speak exactly once.
  if (card.proxied) return <ProxyTag variant="row" silent />;
  if (buyable && (!card.owned || card.committed || (card.shortfall ?? 0) > 0)) {
    return (
      <BuyTag variant="row" price={card.price ?? null} newestAsOf={card.newestAsOf ?? null} />
    );
  }
  if (!card.availability) return null;
  return (
    <AvailabilityMarker bareOne
      availability={card.availability}
      seam={SEAM}
      selfExcluded={selfClaimed}
      // The marker sets no size and no family of its own (card-availability
      // design 3.4: the row density rides the meta line it sits on), and this
      // row has no meta line — `ROW_SHELL` declares a flex box and nothing
      // about type. Left to inherit, the label painted in the page's sans base,
      // half again the size of the `buy` tag that alternates with it in this
      // same slot. The pair is the decklist row's, a step below the card name.
      className="flex-none font-mono text-[11px] md:text-[11.5px]"
    />
  );
}

/**
 * The plate's own way into the card, and the review page's alone — the hover fill
 * makes the whole row read as a target, and until this only the name was one.
 *
 * There is no pointer hint beside the name. One drew `open card →` on hover, and
 * it arrived as a new inline item on a row whose items are all `flex-none`: the
 * trailing column and the control were pushed past the plate's right edge, so a
 * row the pointer merely touched lost the button it was meant to explain.
 *
 * A POINTER affordance and nothing more: the row takes no `role` and no
 * `tabIndex`. The name inside it is already a real button, so a second control
 * wrapping the first would either nest two interactive elements illegally or make
 * every row two tab stops for one card. The keyboard path is the name, unchanged.
 *
 * A click that started on a control of its own is left to that control: the name's
 * trigger would otherwise open the card a second time over its own fetch, and the
 * pull button would open it while writing.
 */
export function useRowOpen(
  card: Pick<DiffRowCard, "oracleId">,
  siblings: readonly Sibling[] | undefined,
  review: boolean,
): React.HTMLAttributes<HTMLElement> {
  const { open } = useCardDetail();
  // The row body opens the card too, so resting on it prefetches the card as the name does.
  const intent = useCardIntent(card.oracleId);
  if (!review) return {};
  return {
    ...intent,
    onClick: (event) => {
      if ((event.target as HTMLElement).closest("button, a")) return;
      open(card.oracleId, siblings);
    },
  };
}

/** Which deck is sleeving the copy this row wants. Drawn on a sleeved add only,
 *  where it is the subject of the pull beside it — the reader is deciding whether
 *  to take a card out of a named deck, and the name is the whole question.
 *
 *  It takes the row's second line at every width, and is the flexible item on it,
 *  so the tag and the control beside it sit at the row's right edge rather than
 *  bunching against the deck name. A deck name is accepted up to `DECK_NAME_MAX`
 *  — 120 characters — so it truncates rather than pushing the control off the
 *  line. The card name above it is never competing for these pixels, which is the
 *  point of the two lines.
 *
 *  The floor is what makes `flex-1` safe. A basis of 0 shrinks to nothing, and at
 *  the narrowest desktop this name is measured at 167px beside a tag and a 44px
 *  control (`probe:review`, 820px) — without a floor it went to zero and the row
 *  named a deck it did not print. With one it truncates and the line wraps
 *  instead. */
function HeldBy({ deck }: { deck: string }) {
  return (
    <span className="flex-1 min-w-[90px] truncate font-mono text-[10px] text-[color:var(--fg-faint)]">
      {deckVersioningCopy.review.heldBy(deck)}
    </span>
  );
}

/** 2+ sources a pull could choose between (addendum R1) — the same slot and
 *  geometry as `HeldBy`, naming a count rather than a deck: the reader has not
 *  chosen one yet, so this row names no single answer. */
function HeldByMany({ n }: { n: number }) {
  return (
    <span className="flex-1 min-w-[90px] truncate font-mono text-[10px] text-[color:var(--fg-faint)]">
      {deckVersioningCopy.review.heldByMany(n)}
    </span>
  );
}

/** After the pull (addendum R1) — the same slot `HeldBy` draws before it, now
 *  linked: the control and the buy tag are both gone, so this is the row's one
 *  remaining way to the deck the copy came from. */
function PulledFrom({ deck }: { deck: { sourceDeckId: string; sourceDeckName: string } }) {
  return (
    <Link
      href={`/decks/${deck.sourceDeckId}`}
      className="flex-1 min-w-[90px] truncate font-mono text-[10px] text-[color:var(--fg-faint)] underline-offset-2 hover:underline"
    >
      {deckVersioningCopy.review.pulledFrom(deck.sourceDeckName)}
    </Link>
  );
}

/** The auto tag, and the invisible box it keeps when there is no tag to draw.
 *  That box is the update flow's rhythm and not a slot the design reserves, so a
 *  row drawing a cost track — which has a fixed trailing column of its own —
 *  gives the space back rather than holding it empty. */
function markerDrawn(card: DiffRowCard): boolean {
  // The FRONT face's cost, not the stored string's truthiness. A land-front,
  // spell-back card stores `" // {3}{R}"` — non-empty, and describing a face
  // this row does not show — so a truthiness test would take the box away from
  // a row that draws no pips at all.
  return card.auto || !hasFrontFaceCost(card.manaCost);
}

/** The row's name, and the flow's one way into the card itself. A player
 *  deciding whether to keep a removal is exactly the person who needs to reread
 *  what the card does, and every other deck surface already opens the modal from
 *  the name. The plate is not a control, so the trigger nests cleanly; the Keep
 *  button beside it stays the row's own action. */
function DiffRowName({
  oracleId,
  name,
  tone,
  siblings,
  describedBy,
  recount,
}: {
  oracleId: string;
  name: string;
  tone: string;
  siblings?: readonly Sibling[];
  describedBy?: string;
  recount?: DiffRowRecount;
}) {
  const trigger = (
    <CardDetailTrigger
      oracleId={oracleId}
      name={name}
      title={name}
      siblings={siblings}
      describedBy={describedBy}
      className={[
        "min-w-0",
        "truncate text-left text-[12.5px] md:text-[13px]",
        recount ? "" : "flex-auto",
      ].join(" ")}
      style={{ color: tone }}
    >
      {name}
    </CardDetailTrigger>
  );
  if (!recount) return trigger;
  return (
    <span
      className="flex-auto flex items-baseline gap-[6px] min-w-0"
    >
      {trigger}
      {/* The counts are the shipped recount's shape with the name taken off the
          front, because the name is the element beside it: one arrow and one
          spacing rule in the app rather than a second phrasing of a fact the
          update flow already words. Outside the trigger, so a long name
          truncates and the figures that make the row worth reading do not. */}
      <span className="flex-none font-mono text-[11.5px] text-[color:var(--fg-faint)]">
        {copy.recountedItem("", recount.from, recount.to).trim()}
      </span>
    </span>
  );
}

/** What both mountings pass through to the name, and neither of them owns.
 *
 *  `siblings` is the list the modal's Prev/Next pages: the update flow has no
 *  single ordered change set to hand over — its rows are four groups, two of them
 *  collapsed — so it passes nothing and the modal reads "1 of 1". The review page
 *  has exactly one, across both columns.
 *
 *  `describedBy` is text that QUALIFIES the card in its row rather than renaming
 *  the trigger. The review page carries the availability word there so the buy
 *  tag's colour is not the only statement of it. */
type DiffRowNameExtras = {
  siblings?: readonly Sibling[];
  describedBy?: string;
};

/** A row of `Coming out`. Whether it carries a decision is the mounting's call:
 *  the update flow puts its `Keep` toggle in the action slot, and the review page
 *  puts a `Pull it` control there. */
export function DiffRowOut({
  card,
  kept = false,
  action = null,
  siblings,
  describedBy,
  recount,
  review = false,
}: {
  card: DiffRowCard;
  /** Plate-and-seam only, and the update flow's alone: a kept removal is tinted,
   *  and the review page has nothing to keep. */
  kept?: boolean;
  /** The review page's box, hover fill and pointer hint. Off by default, so the
   *  update flow's list keeps the one geometry all six of its row kinds share. */
  review?: boolean;
  /** Whatever this mounting's decision is. `null` renders no control and no
   *  reserved box, because a row with nothing to decide should not hold a gap
   *  where a button would be. */
  action?: React.ReactNode;
  /** The copies this row lost, inside the row rather than on a line under it repeating the name:
   *  the review page, and a count drop in the update flow. */
  recount?: DiffRowRecount;
} & DiffRowNameExtras) {
  const rowOpen = useRowOpen(card, siblings, review);
  const previewHandlers = usePreviewRow(card.imageUri);
  return (
    <div
      {...rowOpen}
      {...previewHandlers}
      data-diff-row
      className={[
        ROW_SHELL,
        // Same wrap, and the same reason, as the adds column's first line: a
        // costless card draws the marker box, and the name, that box, the 54px
        // cost track and a control do not fit the width a type column gets at
        // the narrowest desktop. `flex-wrap` sizes items at their hypothetical
        // width rather than their shrunk one, so the trailing items drop below
        // instead of squeezing the name out.
        review && action ? "flex-wrap" : "",
        review ? (action ? ROW_BOX_ACTION : ROW_BOX) : ROW_BOX_OUT_IMPORT,
        kept ? ROW_PLATE_KEPT : ROW_PLATE,
        review && !kept ? ROW_PLATE_HOVER : "",
      ].join(" ")}
    >
      {/* `!card.proxied`, the same exclusion the decklist row and the card tile
          make. `draft-state.ts` carries the flag beside `owned` and says the row
          decides what to draw — and a solid dot next to the `P` this row renders
          from the same field decides it wrongly. Reachable on any basic land,
          which is forced `owned: true` there. */}
      <OwnershipDot owned={card.owned && !card.proxied} committed={card.committed} size={7} />
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg)"
        siblings={siblings}
        describedBy={describedBy}
        recount={recount}
      />
      {markerDrawn(card) ? <Marker auto={card.auto} /> : null}
      <AvailabilitySlot card={card} selfClaimed buyable={!review} />
      {/* The removes column draws the same anatomy as the adds, cost track and
          all — including on a card with no printed cost, where the track is
          drawn empty so the land and the spell above it end on the same line.
          The update flow, which passes no cost at all, draws no track: its six
          row kinds share one geometry and a 40px column on two of them would
          leave the other four short. */}
      {review || hasFrontFaceCost(card.manaCost) ? (
        <CostTrack cost={card.manaCost ?? null} />
      ) : null}
      {action}
    </div>
  );
}

/** The update flow's `Keep`, which used to be written inside the row above.
 *  Unchanged ink, unchanged `aria-pressed`, unchanged accessible name — only
 *  where it is written down moved, so the review page can put its own control in
 *  the same place without inheriting a decision it does not offer. */
export function DiffRowKeep({
  name,
  kept,
  onToggle,
}: {
  name: string;
  kept: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={kept}
      aria-label={copy.keepAria(name)}
      className={[
        `font-mono text-[11.5px] ${ROW_RADIUS} h-[38px] md:h-[34px] min-w-[64px] flex-none`,
        "flex items-center justify-center cursor-pointer bg-transparent transition-colors",
        kept
          ? "text-[color:var(--accent)] [border:1px_solid_var(--accent)] [background:color-mix(in_oklab,var(--accent)_10%,transparent)]"
          : "text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:hover:[border-color:var(--accent)] md:hover:text-[color:var(--accent-hover)]",
      ].join(" ")}
    >
      <span className="md:hidden">{kept ? copy.keptMobile : copy.keep}</span>
      <span className="hidden md:inline">{kept ? copy.kept : copy.keep}</span>
    </button>
  );
}

/** A row of `Going in`. In the update flow, a list and not a decision: there is
 *  deliberately no per-row toggle, because refusing individual additions turns
 *  update into a curated merge, which is the quick-add bar's job.
 *
 *  The review page's one exception rides in `action` — a pull is not a choice
 *  about whether the card goes in, which is settled, but about where the copy
 *  comes from. The update flow passes nothing and draws nothing. */
export function DiffRowIn({
  card,
  sourceLine,
  siblings,
  describedBy,
  action = null,
  recount,
  review = false,
  heldBy = null,
  heldByCount = null,
  pulledFrom = null,
}: {
  card: DiffRowCard;
  sourceLine: number | null;
  action?: React.ReactNode;
  /** The copies this row gained, inside the row: the review page, and a count rise in the update flow. */
  recount?: DiffRowRecount;
  /** The review page's box, hover fill and pointer hint — see `DiffRowOut`. */
  review?: boolean;
  /** The deck sleeving the copy, on a sleeved add. Null on a free or unowned one,
   *  which no deck holds — and null whenever `heldByCount` or `pulledFrom` applies
   *  instead (addendum R1: a row shows exactly one of the three). */
  heldBy?: string | null;
  /** 2+ sources a pull could choose between (addendum R1) — "in {n} decks" rather
   *  than naming one of them. */
  heldByCount?: number | null;
  /** The source of the reader's most recent pull on this card, for this asking
   *  deck (addendum R1) — "pulled from {deck}", linked to it. Takes priority over
   *  `heldBy`/`heldByCount`: once a release exists the claim it freed is gone. */
  pulledFrom?: { sourceDeckId: string; sourceDeckName: string } | null;
} & DiffRowNameExtras) {
  const rowOpen = useRowOpen(card, siblings, review);
  const previewHandlers = usePreviewRow(card.imageUri);
  // Two lines on the phone, one above it. Only a row carrying a decision earns
  // the second line: a plain add has nothing on its right but a tag.
  const stacked = review && action !== null;
  const nameLine = (
    <>
      {/* `!card.proxied`, the same exclusion the decklist row and the card tile
          make. `draft-state.ts` carries the flag beside `owned` and says the row
          decides what to draw — and a solid dot next to the `P` this row renders
          from the same field decides it wrongly. Reachable on any basic land,
          which is forced `owned: true` there. */}
      <OwnershipDot owned={card.owned && !card.proxied} committed={card.committed} size={7} />
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg)"
        siblings={siblings}
        describedBy={describedBy}
        recount={recount}
      />
      {markerDrawn(card) ? <Marker auto={card.auto} /> : null}
    </>
  );
  const metaLine = (
    <>
      {pulledFrom ? (
        <PulledFrom deck={pulledFrom} />
      ) : heldByCount ? (
        <HeldByMany n={heldByCount} />
      ) : heldBy ? (
        <HeldBy deck={heldBy} />
      ) : null}
      {/* The slot sits BEFORE the trailing column, not after it. The name is the
          only flexible item, so anything that can disappear has to sit on the
          name's side of the fixed column — with the slot trailing, an owned row's
          line number landed a tag's width right of an unowned row's. */}
      <AvailabilitySlot card={card} selfClaimed={review} />
      {/* Between the tag and the trailing column, for the reason above it: the
          action is the row's other item that can be absent, so it sits on the
          name's side of the one fixed column. */}
      {action}
    </>
  );
  const trailing = (
    <>
      {/* One trailing column, whichever mounting is drawing: the import's line
          number, or the cost track that the deleted type label paid for. They
          are never both — a row with a printed cost is the review page's, which
          has no lines to cite — so the column is written once and the review row
          inherits the width the line number reserved.

          Desktop-only when it holds the line number, because the import's phone
          row does not cite lines; drawn at both widths when it holds pips, which
          the design puts on the phone row too. One element either way. */}
      <span
        // `whitespace-nowrap` because the string has a space in it: a long line
        // number would otherwise wrap and take the row's height with it. The
        // sibling slots get it from `truncate`. `min-w` rather than `w` so the
        // slot holds its place on short numbers but grows past four digits
        // instead of colliding with the type line — nothing caps import length.
        className={[
          hasFrontFaceCost(card.manaCost) ? "flex" : "hidden md:flex",
          "items-center justify-end font-mono text-[11px] min-w-[54px] flex-none",
          "text-right tabular-nums whitespace-nowrap text-[color:var(--fg-faint)]",
        ].join(" ")}
      >
        {hasFrontFaceCost(card.manaCost) ? (
          <CostPips
            cost={card.manaCost ?? null}
            size={COST_PIP_SIZE}
            track={COST_TRACK}
            cap={COST_PIP_CAP}
            spoken
          />
        ) : sourceLine !== null ? (
          copy.sourceLine(String(sourceLine))
        ) : (
          ""
        )}
      </span>
    </>
  );
  return (
    <div
      {...rowOpen}
      {...previewHandlers}
      data-diff-row
      className={[
        stacked ? ROW_SHELL_STACKED : ROW_SHELL,
        stacked ? ROW_BOX_STACKED : review ? ROW_BOX : ROW_BOX_IN_IMPORT,
        ROW_PLATE,
        review ? ROW_PLATE_HOVER : "",
      ].join(" ")}
    >
      {stacked ? (
        <>
          {/* Wraps for the same reason the meta line does. A costless card draws
              the marker box, and the name, that box and the 54px cost track do
              not fit one 150px line, so without this the name shrank to 13px.
              `flex-wrap` measures items at their hypothetical size rather than
              their shrunk one, so the track drops below instead. */}
          <span className={`${STACK_LINE} min-w-0 flex-wrap`}>
            {nameLine}
            {trailing}
          </span>
          {/* The meta line is indented to the name's own text, so the deck being
              raided reads as a fact about the card above it. A `div` because the
              action on it is one: `PullControl` draws a block, and its refusal a
              paragraph under that, neither of which is legal inside a span. */}
          {/* It WRAPS. At the narrowest desktop this line gives the deck name
              167px (`probe:review`, 820px), and that name, the buy tag and a 44px
              control do not fit on one line there — the name is the flexible item,
              so it went to zero and the row named a deck it could not print.
              Wrapped, the control drops to a line of its own and the name keeps
              its own floor. */}
          <div className={`${STACK_LINE} flex-wrap pl-[16px]`}>{metaLine}</div>
        </>
      ) : (
        <>
          {nameLine}
          {metaLine}
          {trailing}
        </>
      )}
    </div>
  );
}

/** A row of `We cannot name these`. The shipped unresolved plate, reused whole
 *  — an unmatched line is a resolvable row on the deck, not a failure. */
export function DiffRowUnnamed({
  rawName,
  sourceLine,
}: {
  rawName: string;
  sourceLine: number;
}) {
  return (
    <div className={`${ROW_SHELL} min-h-[44px] px-[12px] bg-[color:var(--surface-rail)] [border:1px_dashed_var(--accent-shadow)]`}>
      <span className="flex-auto min-w-0 font-mono text-[13px] truncate text-[color:var(--fg-body)]">
        {rawName}
      </span>
      <span className="font-mono text-[11px] flex-none text-[color:var(--fg-faint)]">
        {copy.sourceLine(String(sourceLine))}
      </span>
    </div>
  );
}

/** A row of the collapsed `unchanged` group. No control and no marker: it is
 *  there to be counted, and expanding it is already the player asking. */
export function DiffRowUnchanged({
  card,
}: {
  card: { oracleId: string; name: string; typeLine: string };
}) {
  return (
    <div className={`${ROW_SHELL} min-h-[44px] px-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border)]`}>
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg-body)"
      />
    </div>
  );
}
