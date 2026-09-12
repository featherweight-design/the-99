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

import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { Availability } from "../../lib/decks/availability";
import type { PriceFact } from "../../lib/decks/price";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { AvailabilityMarker } from "../ui/availability-marker";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { ROW_RADIUS, ROW_SHELL } from "../ui/row-shell";
import { BuyTag } from "./buy-tag";

const copy = deckImportCopy.update.diff;

// The affordance the row writes under the pointer. No copy module owns it: both
// modules a diff row reads are a flow's copy, and this string belongs to the row
// itself — it wants a key of its own the next time either is opened.
const OPEN_CARD_HINT = "open card →";

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

/** A pull-bearing row is two lines on the phone and one above it: the control is
 *  44px and the holding deck, the price and the button together are wider than
 *  390px leaves after a card name. The `md:contents` on each line dissolves the
 *  grouping, so the desktop row is the same flat flex line every other row is. */
const ROW_SHELL_STACKED = `flex flex-col items-stretch gap-[8px] md:flex-row md:items-center md:gap-[10px] ${ROW_RADIUS}`;
const STACK_LINE = "flex items-center gap-[9px] md:contents";

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
const ROW_PLATE_HOVER =
  "md:hover:bg-[color:var(--elevated-hover)] md:hover:[--row-bg:var(--elevated-hover)]";
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
 * be called hard. An addition is not on the deck yet, so nothing of its was
 * subtracted and a `free === 0` there is a genuine claim by another deck.
 */
function AvailabilitySlot({
  card,
  selfClaimed,
}: {
  card: DiffRowCard;
  selfClaimed: boolean;
}) {
  if (!card.owned || card.committed) {
    return (
      <BuyTag variant="row" price={card.price ?? null} newestAsOf={card.newestAsOf ?? null} />
    );
  }
  if (!card.availability) return null;
  return (
    <AvailabilityMarker
      availability={card.availability}
      seam={SEAM}
      selfExcluded={selfClaimed}
      className="flex-none"
    />
  );
}

/** The cost, as the pips every surface that draws a cost column draws. The track
 *  and the cap come from the shipped constants rather than a width of this row's
 *  own: the shingle arithmetic behind them is what makes five pips measure 40px,
 *  and a caller that picked its own would either misalign against the rows beside
 *  it or burst a track the module still believes is 40px wide. */
function CostTrack({ cost }: { cost: string }) {
  return (
    <span className="flex flex-none items-center justify-end">
      <CostPips cost={cost} size={COST_PIP_SIZE} track={COST_TRACK} cap={COST_PIP_CAP} spoken />
    </span>
  );
}

/** What the row does, said only while the pointer is on it and never to a screen
 *  reader: the name's own accessible name already says it opens the card, so this
 *  is a second utterance of one fact and a sighted reader's only clue that a row
 *  with no chevron is a way in. */
function OpenHint() {
  return (
    <span
      aria-hidden="true"
      className="hidden md:group-hover:inline flex-none font-mono text-[10px] text-[color:var(--fg-faint)]"
    >
      {OPEN_CARD_HINT}
    </span>
  );
}

/** Which deck is sleeving the copy this row wants. Drawn on a sleeved add only,
 *  where it is the subject of the pull beside it — the reader is deciding whether
 *  to take a card out of a named deck, and the name is the whole question. */
function HeldBy({ deck }: { deck: string }) {
  return (
    <span className="flex-none truncate font-mono text-[10px] text-[color:var(--fg-faint)]">
      {deckVersioningCopy.review.heldBy(deck)}
    </span>
  );
}

/** The auto tag, and the invisible box it keeps when there is no tag to draw.
 *  That box is the update flow's rhythm and not a slot the design reserves, so a
 *  row drawing a cost track — which has a fixed trailing column of its own —
 *  gives the space back rather than holding it empty. */
function markerDrawn(card: DiffRowCard): boolean {
  return card.auto || !card.manaCost;
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
  siblings?: string[];
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
      className={`min-w-0 truncate text-left text-[12.5px] md:text-[13px] ${recount ? "" : "flex-auto"}`}
      style={{ color: tone }}
    >
      {name}
    </CardDetailTrigger>
  );
  if (!recount) return trigger;
  return (
    <span className="flex-auto min-w-0 flex items-baseline gap-[6px]">
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
  siblings?: string[];
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
  /** Review page only: the copies this row lost, inside the row rather than on a
   *  line under it repeating the name. */
  recount?: DiffRowRecount;
} & DiffRowNameExtras) {
  return (
    <div
      className={[
        ROW_SHELL,
        review ? (action ? ROW_BOX_ACTION : ROW_BOX) : ROW_BOX_OUT_IMPORT,
        kept ? ROW_PLATE_KEPT : ROW_PLATE,
        review && !kept ? ROW_PLATE_HOVER : "",
      ].join(" ")}
    >
      <OwnershipDot owned={card.owned} committed={card.committed} size={7} />
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg)"
        siblings={siblings}
        describedBy={describedBy}
        recount={recount}
      />
      {review ? <OpenHint /> : null}
      {markerDrawn(card) ? <Marker auto={card.auto} /> : null}
      <AvailabilitySlot card={card} selfClaimed />
      {/* The removes column draws the same anatomy as the adds, cost track and
          all. A card with no printed cost — a land — ends the row short rather
          than holding an empty slot: the track's width is the shipped constant's
          and no longer a reserved column of this row's own. */}
      {card.manaCost ? <CostTrack cost={card.manaCost} /> : null}
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
}: {
  card: DiffRowCard;
  sourceLine: number | null;
  action?: React.ReactNode;
  /** Review page only: the copies this row gained, inside the row. */
  recount?: DiffRowRecount;
  /** The review page's box, hover fill and pointer hint — see `DiffRowOut`. */
  review?: boolean;
  /** The deck sleeving the copy, on a sleeved add. Null on a free or unowned one,
   *  which no deck holds. */
  heldBy?: string | null;
} & DiffRowNameExtras) {
  // Two lines on the phone, one above it. Only a row carrying a decision earns
  // the second line: a plain add has nothing on its right but a tag.
  const stacked = review && action !== null;
  const nameLine = (
    <>
      <OwnershipDot owned={card.owned} committed={card.committed} size={7} />
      <DiffRowName
        oracleId={card.oracleId}
        name={card.name}
        tone="var(--fg)"
        siblings={siblings}
        describedBy={describedBy}
        recount={recount}
      />
      {review ? <OpenHint /> : null}
      {markerDrawn(card) ? <Marker auto={card.auto} /> : null}
    </>
  );
  const metaLine = (
    <>
      {heldBy ? <HeldBy deck={heldBy} /> : null}
      {/* The slot sits BEFORE the trailing column, not after it. The name is the
          only flexible item, so anything that can disappear has to sit on the
          name's side of the fixed column — with the slot trailing, an owned row's
          line number landed a tag's width right of an unowned row's. */}
      <AvailabilitySlot card={card} selfClaimed={false} />
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
          card.manaCost ? "flex" : "hidden md:flex",
          "items-center justify-end font-mono text-[11px] min-w-[54px] flex-none",
          "text-right tabular-nums whitespace-nowrap text-[color:var(--fg-faint)]",
          // The cost rides the name line on a stacked phone row, and stays the
          // row's last item above it — the one place the two orders disagree.
          stacked ? "md:order-last" : "",
        ].join(" ")}
      >
        {card.manaCost ? (
          <CostPips
            cost={card.manaCost}
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
      className={[
        stacked ? ROW_SHELL_STACKED : ROW_SHELL,
        review ? (action ? ROW_BOX_ACTION : ROW_BOX) : ROW_BOX_IN_IMPORT,
        ROW_PLATE,
        review ? ROW_PLATE_HOVER : "",
      ].join(" ")}
    >
      {stacked ? (
        <>
          <span className={`${STACK_LINE} min-w-0`}>
            {nameLine}
            {trailing}
          </span>
          {/* The meta line is indented to the name's own text, so the deck being
              raided reads as a fact about the card above it. */}
          <span className={`${STACK_LINE} pl-[16px] md:pl-0`}>{metaLine}</span>
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
