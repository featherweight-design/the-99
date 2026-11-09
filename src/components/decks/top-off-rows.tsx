"use client";

// The Top off rows, drawn from props alone (landing demo split 5g).
//
// Everything here takes its facts and its handlers as props and draws. What the signed-in list
// keeps: the card-detail provider (the name's trigger and the row's open press), the hover
// preview's pointer handlers, the read, the selection state and the actions. They arrive as
// `nameTrigger` and `rowHandlers`, so a surface with no provider (the public landing's demo) passes a
// plain name and no handlers and draws the same row.

import { hasFrontFaceCost } from "../../lib/cards/faces";
import { useId, type HTMLAttributes, type ReactNode } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import { ComboClause, comboClauseSpoken } from "../cards/combo-clause";
import { CardNote, cardNoteSpoken } from "./card-note";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { factsFromCandidate } from "../../lib/bracket/facts";
import { cardFactName } from "../../lib/copy/card-mark";
import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import { formatCents, priceOf, priceState, type PriceFact } from "../../lib/decks/price";
import { availabilityState } from "../../lib/decks/availability";
import { typeWord } from "../../lib/cards/facet";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { AvailabilityMarker } from "../ui/availability-marker";
import { BuyTag } from "./buy-tag";
import { TOUCH_HIT } from "../ui/touch-hit";

/**
 * What this row draws: the DECK-SCOPED candidate, with both of its deck-scoped fields
 * REQUIRED.
 *
 * This type used to widen `TopOffCandidate` and make both fields optional, on the grounds
 * that fixtures have no opinion about facts. That is the dead-payload shape this feature's
 * own payload PR refused to ship: with `facts` optional here, `BuilderShellProps.candidates`
 * and `LastSlotsStripProps.candidates` erased it back to `TopOffCandidate`, so DELETING the
 * page's attachment compiled cleanly and silently drew no note on any top-off row.
 *
 * Fixtures state `facts: null` and `comboPartner: null` instead, which costs a line each and
 * is the honest thing for them to say: they are rows with no facts, not rows that decline to
 * answer.
 */
export type RowCandidate = TopOffCandidateWithFacts;

/** The type column, desktop only, as one figure the header and the rows share.
 *
 *  90px rather than the synergy panel's 150: that panel prints a real type line
 *  under a single facet, and this list prints one word per row (`typeWord`): the
 *  panel's bucket word, except that an instant or sorcery is named as one (H27)
 *  rather than as the merged `Spell`. `Enchantment` is still the longest, at
 *  about 76px. The name column is `flex-auto` and pays for it. */
export const TYPE_COL = "90px";

/** The three ownership clauses, matching the three occupancies of §8's slot. */
export function ownershipClause(c: RowCandidate, newestAsOf: Date | null): string {
  if (!c.owned) {
    return topOffCopy.list.unownedClause(moneyOf(c.price, newestAsOf));
  }
  // A failed availability read is null on an owned row, and the design draws
  // that row with no marker at all. The spoken clause matches it by dropping the
  // count rather than defaulting to one: a player with four copies would
  // otherwise hear a confident "×1 in your collection". `ariaOwned` is the
  // shipped synergy row's own word for ownership with no figure behind it.
  if (c.availability === null) return `${synergyCopy.figure.ariaOwned}.`;
  const qty = String(c.availability.owned);
  const committed = availabilityState(c.availability) === "hard";
  return committed
    ? topOffCopy.list.committedClause(qty)
    : topOffCopy.list.ownedClause(qty);
}

export function moneyOf(price: PriceFact | null, newestAsOf: Date | null): string | null {
  if (!price) return null;
  const cents = priceOf(price, priceState(price, newestAsOf));
  return cents === null ? null : formatCents(cents);
}

/** The row's accessible name. Every visual atom is aria-hidden, so this is the
 *  only place the marks are spoken — the cost first, uncapped, then the row.
 *
 *  `list.rowAria` bakes in "plus", so it can only speak a non-negative figure.
 *  A null or negative synergy takes the shipped four-branch string instead,
 *  which exists for exactly that case. No new string either way. */
export function rowLabel(
  c: RowCandidate,
  newestAsOf: Date | null,
  declaredBracket: Bracket | null,
  noteCounts: NoteCounts,
): string {
  const clause = ownershipClause(c, newestAsOf);
  // THE CARD NOTE IS SPOKEN HERE and nowhere else, for the reason the combo clause below is:
  // every visual atom on this row is aria-hidden, so the row's one accessible name is the
  // only place any of it is heard. Composed by `cardNoteSpoken` rather than re-joined here, so
  // what is drawn and what is spoken cannot disagree.
  //
  // It comes LAST, after the combo. The figures say what this copy is worth to this deck; the
  // note says what kind of card it is, which is context for all of them rather than another
  // column.
  const note = cardNoteSpoken({
    facts: c.facts,
    declared: declaredBracket,
    counts: noteCounts,
    density: "row",
  });
  const noteClause = note ? ` ${note}` : "";
  // THE MARKS ARE SPOKEN HERE and nowhere else, for the reason every other atom on this row
  // is: the row's one accessible name is where all of it is heard. They come BEFORE the note,
  // because the mark says WHICH kind and the note says how many and what the rules make of
  // it — which is the order a reader can follow, and the order they are drawn in.
  const markWords = factsFromCandidate(c.facts) ?? [];
  const marksClause =
    markWords.length > 0 ? ` ${markWords.map(cardFactName).join(", ")}.` : "";
  // THE COMBO IS SPOKEN HERE and nowhere else. Its glyph is aria-hidden and its sentence is
  // drawn aria-hidden too, because on the phone it stands in for the PIP TRACK and on desktop
  // it sits in the name cell's tail — neither of which a reader hears in a useful order. It
  // is appended, after the figures, because it describes what adding the card would DO rather
  // than what the card is or what this player's copies are.
  const combo = c.comboPartner
    ? ` ${comboClauseSpoken(c.comboPartner.name, "completes")}.`
    : "";
  // The type is drawn `aria-hidden`, so without this it is the one column on the
  // row a screen reader never hears. Spoken at BOTH widths rather than only where
  // the column is drawn: a reader who is not looking at the columns is not
  // served by matching them, and the card's type is as true on a phone as on a
  // desktop. It leads, beside the cost, because both are facts about the card
  // rather than about this player's copy of it.
  const type = typeWord(c.typeLine);
  const inclusion =
    c.inclusionPct === null
      ? synergyCopy.figure.inclusionNone
      : synergyCopy.figure.inclusion(String(c.inclusionPct));
  const cost = spokenManaCost(c.manaCost);
  if (c.synergyPts !== null && c.synergyPts >= 0) {
    return `${cost}. ${type}. ${topOffCopy.list.rowAria(c.name, clause, String(c.synergyPts), inclusion)}${combo}${marksClause}${noteClause}`;
  }
  const synergy =
    c.synergyPts === null
      ? synergyCopy.figure.synergyNone
      : synergySignedDisplay(c.synergyPts);
  return `${cost}. ${type}. ${synergyCopy.figure.rowAria(
    c.name,
    clause.replace(/\.$/, ""),
    synergy,
    inclusion,
  )}${combo}${marksClause}${noteClause}`;
}

/** Mounted twice, and only here. The phone track is uncapped and unshingled
 *  while the desktop track caps at five slots inside the shared `COST_TRACK` column —
 *  both are `cap`/`track` props, which no responsive class can reach. The two
 *  mounts read the same `cost`, so they cannot drift; both are aria-hidden and
 *  the cost is spoken once from the row's own label. */
export function CostTrack({ cost }: { cost: string | null }) {
  // The FRONT face, not the string. A land-front, spell-back card stores
  // `" // {3}{R}"` — non-null, and a cost this row never draws — so a null check
  // would mount this flex item and give the phone row the track's `gap-[8px]`
  // ahead of the score with nothing inside it.
  // A costless row still holds the column OPEN on desktop. The header reserves
  // `COST_TRACK` for every row, so a row that mounted nothing here pulled the buy
  // slot, the synergy, the inclusion and the decline 72px left of their own
  // headings — the same misalignment this component's header comment records,
  // arriving from the row's side instead of the header's.
  //
  // `md:` only, and empty: on the phone this track is a flex item in a gap-[8px]
  // line, so a spacer there would give a costless row a gap with nothing in it,
  // which is the exact defect the null return was written to avoid.
  if (!hasFrontFaceCost(cost)) {
    return (
      <span
        aria-hidden
        data-top-off-cost
        className="hidden md:block flex-none md:order-4"
        style={{ width: COST_TRACK }}
      />
    );
  }
  return (
    // order-4, after the type column that now sits beside the name. The header
    // above lists the same eight slots in the same order, and the two have to be
    // read together — a change here with no change there puts every heading to
    // the right of the data it names.
    // Named for the same reason the type column is: a test looking for pips by their shape
    // finds the row's own OWNERSHIP DOT, which is also a `rounded-full` span — so a check
    // that the cost survived passes on a build that suppressed it.
    <span data-top-off-cost className="flex-none md:order-4">
      <CostPips cost={cost} size={13} className="flex gap-[3px] md:hidden" />
      <CostPips
        cost={cost}
        size={COST_PIP_SIZE}
        cap={COST_PIP_CAP}
        track={COST_TRACK}
        className="hidden md:flex gap-[3px]"
      />
    </span>
  );
}

// ── Rows ───────────────────────────────────────────────────────────────────

export function CandidateRowView({
  candidate: c,
  ticked,
  inert,
  inflight,
  capLineId,
  newestAsOf,
  declaredBracket,
  noteCounts,
  isDesktop,
  nameTrigger,
  rowHandlers,
  onToggle,
  onDecline,
}: {
  candidate: RowCandidate;
  ticked: boolean;
  inert: boolean;
  inflight: boolean;
  capLineId: string;
  newestAsOf: Date | null;
  /** The card note's two deck-level inputs. See `LastSlotsStripProps`. */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
  /** Which width's layout to mount. Both widths open the card the same way: a press on the
      row's body opens it, and only the tick box ticks (Hugh's ruling of 2026-10-21, which
      supersedes the addendum's "the target is the row"). */
  isDesktop: boolean;
  /** The card's name as a button that opens its detail, given the class the width's layout wants.
      The list builds it from the card-detail provider; a surface with no provider passes a plain
      span carrying the same class. */
  nameTrigger: (className: string) => ReactNode;
  /** The row's own handlers: the open press and the hover preview's pointer events. The list
      builds them from its two providers; a surface with neither passes nothing. */
  rowHandlers?: HTMLAttributes<HTMLElement>;
  onToggle: () => void;
  onDecline: () => void;
}) {
  // The three standing facts, adapted from the candidate's own read. `undefined` for a card
  // with none and for a failed read alike — both draw nothing, the same rendering.
  const marks = factsFromCandidate(c.facts) ?? [];
  /**
   * THE FACT MARKS, inline after the name — `STATES-push-line.md` §C2, and Round 1's rule for
   * a card row. `silent`, and spoken once in `rowLabel` like every other atom here.
   *
   * MOUNTED ONCE PER WIDTH, guarded by `isDesktop`, which is the pattern the NAME beside them
   * already uses rather than a second one. The two widths put the name in different places —
   * the phone's sits on line 1 beside the dot, the desktop's is a direct child of the row's
   * flex context ordered by `md:order-2` — so "after the name" is two different positions in
   * the tree. Rendered once outside line 1, the marks landed on the phone's SECOND line:
   * measured at 73px from the row's left against a name ending at 251px, which is a different
   * line rather than a gap.
   *
   * Not a CSS `hidden`/`md:hidden` pair: `isDesktop` mounts one of the two, so there is no
   * duplicated subtree to keep in step.
   */
  const factMarks =
    marks.length > 0 ? (
      <span aria-hidden className="flex-none flex items-center gap-[4px]">
        {marks.map((fact) => (
          <FactTooltip key={fact} fact={fact}>
            <CardFactMark fact={fact} silent />
          </FactTooltip>
        ))}
      </span>
    ) : null;
  const committed =
    c.owned && c.availability !== null && availabilityState(c.availability) === "hard";
  const tickId = useId();
  // A PRESS ON THE ROW OPENS THE CARD, the way every other card row does; the box alone ticks.
  // Hugh's ruling of 2026-10-21 reverses the addendum's "the target is the row": a reader must
  // be able to read a card before deciding to add it. The list's `useRowOpen` leaves a press on
  // the box, the name's trigger and the decline to those controls; its handlers arrive here as
  // `rowHandlers`, together with the hover preview's.

  // At desktop each wrapper is `contents`, so the row is one flex context and
  // the eight slots order themselves against the column header.
  return (
    <div
      // The fill moves to CLASSES so a hover can exist at all: an inline
      // `background` outranks every utility, which is why this row has never had
      // one. `--row-bg` travels with it, the way `update-diff-row.tsx` and the
      // collection's own rows carry it, so anything drawing a seam against the
      // row tracks the swap rather than a fixed colour.
      //
      // `md:` only. A touch device has no hover, and the sticky :hover a phone
      // browser leaves behind after a tap would mark the last row pressed as
      // though it were still under a pointer.
      // A COLUMN, so the card note can sit BELOW the row's line and inside its box —
      // `HANDOFF.md` §Geometry. The row itself is the first child and keeps every class it
      // had; the box's padding, fill, border and hover stay out here so the note is inside
      // all four of them rather than hanging off the bottom edge.
      // NAMED, because the row is no longer the card name's parent element: the note made it
      // a column whose first child is the row's own line, so `parentElement` now lands on that
      // line rather than on the box carrying the fill. A handle says which box is the row
      // instead of leaving every reader to count levels — the reason `data-top-off-type`
      // below carries one.
      data-top-off-row
      {...rowHandlers}
      className={[
        "flex flex-col rounded-[7px] cursor-pointer",
        "pl-[8px] pr-[10px] md:px-[9px] py-[2px] md:py-[1px]",
        ticked
          ? "bg-[color:var(--elevated-hover)] [--row-bg:var(--elevated-hover)]"
          : "bg-[color:var(--surface)] [--row-bg:var(--surface)]"
            // Never on an inert row: at the cap a row cannot be ticked, and a
            // fill that lights under the pointer would promise it can.
            + (inert
              ? ""
              : " md:hover:bg-[color:var(--elevated-hover)] md:hover:[--row-bg:var(--elevated-hover)]"),
      ].join(" ")}
      style={{
        border: ticked
          ? "1px solid var(--accent-shadow)"
          : "1px solid var(--border)",
        ...(inert ? { opacity: 0.55 } : null),
      }}
    >
      {/* THE ROW'S OWN LINE. The box above now owns the padding, the fill and the border, so
          the note below is inside all three — and the row's own height came with it.

          THE HEIGHTS ADD BACK TO WHAT THE BOX HAD, AND THE BORDER IS PART OF THE SUM. The box
          was `min-h-[52px] md:min-h-[34px]` — a BORDER-BOX minimum, so its own 1px border was
          inside it. It is now that 1px border, plus `py-[2px] md:py-[1px]`, around a line of
          `min-h-[46px] md:min-h-[30px]`: 2 + 4 + 46 = 52, and 2 + 2 + 30 = 34, exactly what
          the box had. Written as a sum rather than left to look right, and the border counted
          rather than assumed — the first version of this split omitted it and left every
          phone row 2px taller, which is 76px of list across 38 rows. */}
      <div className="flex w-full items-center gap-[9px] md:gap-[10px] min-h-[46px] md:min-h-[30px]">
      <input
        type="checkbox"
        id={tickId}
        className="peer sr-only"
        checked={ticked}
        aria-label={rowLabel(c, newestAsOf, declaredBracket, noteCounts)}
        aria-disabled={inert || inflight ? true : undefined}
        aria-describedby={inert ? capLineId : undefined}
        onChange={onToggle}
      />
      {/* The checkbox is `sr-only`, so the global `:focus-visible` outline is
          drawn on a clipped 1px box and a keyboard reader sees nothing move.
          The ring is borrowed off the peer onto the box that is actually on
          screen, matching `quick-add-bar.tsx`'s own sr-only control. */}
      <label
        htmlFor={tickId}
        aria-hidden
        className={`${TOUCH_HIT} flex-none flex items-center justify-center font-mono w-[26px] h-[26px] md:w-[18px] md:h-[18px] rounded-[6px] md:rounded-[5px] text-[13px] md:text-[11px] cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--accent)]`}
        style={
          ticked
            ? {
                border: "1px solid var(--accent)",
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent-text)",
              }
            : {
                border: `1px solid var(--${inert ? "border" : "border-strong"})`,
                background: "transparent",
                color: `var(--fg-${inert ? "locked" : "faint"})`,
              }
        }
      >
        {ticked ? "✓" : "+"}
      </label>

      <span className="flex flex-auto min-w-0 flex-col gap-[4px] md:contents">
        <span className="flex items-center gap-[7px] md:contents">
          <OwnershipDot
            owned={c.owned}
            committed={committed}
            size={7}
            className="md:order-1"
          />
          {/* The phone's name is a trigger too, so the keyboard reaches the card at
              both widths; a press anywhere else on the row opens it through `rowOpen`. */}
          {!isDesktop && (
            /* THE NAME AND ITS MARKS ARE ONE GROUP, and the wrapper carries the `flex-auto`
               the name used to. "Inline after the name" is about the TEXT: with the name
               growing to fill the cell, a `flex-none` mark after it lands at the far right of
               the column beside the buy tag. Measured before this wrapper existed: the glyph
               sat 87px past the end of `Mu Yanling` at 390 and 535px past it at 1300. */
            <span className="flex-auto min-w-0 flex items-center gap-[7px]">
              {/* Named for the probe, for the reason `data-top-off-type` below is: the note
                  indents to THIS column, and recognising it by its type size would pick up
                  whatever else on the row happens to be set at 12.5px. */}
              {nameTrigger(
                "min-w-0 text-left truncate text-[12.5px] [color:var(--fg)]",
              )}
              {factMarks}
            </span>
          )}
          <span
            aria-hidden
            className="flex-none flex items-center justify-end whitespace-nowrap font-mono text-[10px] md:order-5 md:w-[84px]"
          >
            {!c.owned ? (
              <BuyTag
                variant="row"
                price={c.price}
                newestAsOf={newestAsOf}
                density="full"
              />
            ) : c.availability ? (
              // `--row-bg`, not the default `var(--bg)`. The over state draws a
              // doubled diamond whose seam has to be the colour directly BEHIND
              // it, and this row's fill is no longer one colour: it is `--surface`
              // at rest and `--elevated-hover` ticked or under the pointer. A
              // fixed seam draws the canvas colour through a surface-coloured
              // row, which reads as a hairline crack rather than as the join it
              // is — and the hover this round added is what made that reachable.
              <AvailabilityMarker bareOne
                availability={c.availability}
                seam="var(--row-bg)"
                nameless
              />
            ) : null}
          </span>
        </span>

        {/* `md:contents` on the parent makes this a direct child of the row's flex
            context, so `order` puts it back beside the dot however the DOM is arranged. */}
        {/* THE NAME AND ITS MARKS ARE ONE GROUP, carrying the `md:order-2` and the `flex-auto`
            the trigger used to own — so the shrink competition against the clause below is
            unchanged, and the glyph follows the TEXT rather than the cell. Measured before
            this wrapper existed: 535px past the end of `Mu Yanling` at 1300. */}
        {isDesktop && (
          <span className="md:order-2 flex-auto min-w-0 flex items-center gap-[7px]">
          {/* THE CLAUSE ELLIPSES BEFORE THE NAME DOES, which is the design's rule, and the
              name stays SHRINKABLE, which is how that rule is delivered without breaking
              the row.
              
              `flex-none` is the literal reading and it does not work: it sets
              `flex-shrink: 0` with `flex-basis: auto`, so the `truncate` beside it can never
              engage and a long name renders at full max-content width. The clause shrinks to
              zero first and then nothing on the row can give — the eight fixed columns and
              their gaps come to 535px — so the row overflows a box that is
              `md:overflow-y-auto`, which computes overflow-x to `auto`, and the reader gets
              a horizontal scrollbar with the decline control outside it.
              
              Shrink PRIORITY does the same job safely: the clause carries a far larger
              `flex-shrink`, so it absorbs essentially all of the reduction and the name only
              begins to give once the clause is spent — at which point the name still
              truncates rather than overflowing.
              NOT `flex-auto` any more: the GROUP above owns the growing now. Left on the
              trigger it fills the group and the mark lands at the group's far edge again,
              which is the 535px this wrapper exists to close — the fix measured as no fix
              until the grow moved up one level. */}
          {nameTrigger(
            "min-w-0 text-left truncate text-[13.5px] [color:var(--fg)]",
          )}
          {factMarks}
          </span>
        )}
        {/* The clause, in the name cell's TAIL. Desktop only — the phone draws it leading
            line 2, where there is room for a sentence. `flex-1 min-w-0` is what makes it the
            item that shrinks; the four fixed columns after it do not move. */}
        {isDesktop && c.comboPartner && (
          <span
            aria-hidden
            // `flex-auto`, NOT `flex-1`, and that is the whole of it. `flex-1` sets the
            // basis to `0%`, and flex distributes shrinkage in proportion to shrink factor
            // TIMES BASIS — so a zero basis gives the clause no shrink budget at all, the
            // `shrink-[999]` multiplies nothing, and a tight row takes the deficit out of the
            // name's `auto` basis instead. Exactly backwards from the rule.
            //
            // With an auto basis the clause has its own content width to give up, and at 999
            // against the name's 1 it is spent before the name moves.
            className="md:order-2 flex-auto shrink-[999] min-w-0"
          >
            <ComboClause partnerName={c.comboPartner.name} state="completes" />
          </span>
        )}

        {/* Type, desktop only. The phone row is two lines carrying the name, the
            two figures and the buy tag, and the handoff's own phone spec has no
            type in it — adding a word there would cost the figure beside it. */}
        {isDesktop && (
          <span
            aria-hidden
            // Named for the probe, which otherwise has to recognise this column
            // by its TEXT — and a card called `Spell` or `Land` is then
            // indistinguishable from the type word, so a phone row drawing no
            // type could fail and a desktop row missing it could pass on the
            // card's own name.
            data-top-off-type
            className="md:order-3 flex-none truncate font-mono text-[11px]"
            style={{ width: TYPE_COL, color: "var(--fg-faint)" }}
          >
            {typeWord(c.typeLine)}
          </span>
        )}

        <span className="flex items-center gap-[8px] font-mono text-[10px] md:contents">
          <span className="flex items-center gap-[8px] md:contents">
            {/* THE PIP TRACK YIELDS ONLY ON A ROW THAT CARRIES A CLAUSE — about 4 of 38.
                The other 34 keep their pips. Phone only: on desktop the clause sits in the
                name cell's tail and the cost column is one of the four fixed slots, which do
                not move for this. */}
            {!isDesktop && c.comboPartner ? (
              // The phone clause stands in for the pip track rather than sharing a line
              // with a name, so it simply takes the room: nothing beside it on line 2 is
              // competing for content width.
              <span aria-hidden className="flex-auto min-w-0">
                <ComboClause partnerName={c.comboPartner.name} state="completes" />
              </span>
            ) : (
              <CostTrack cost={c.manaCost} />
            )}
            <span
              aria-hidden
              className="flex-none md:order-6 md:w-[60px] md:text-right md:text-[12px]"
              style={{ color: "var(--accent-text)" }}
            >
              {c.synergyPts === null
                ? synergyCopy.figure.synergyNone
                : synergySignedDisplay(c.synergyPts)}
            </span>
            <span
              aria-hidden
              className="flex-none md:order-7 md:w-[36px] md:text-right md:text-[11px]"
              style={{ color: "var(--fg-faint)" }}
            >
              {c.inclusionPct === null
                ? synergyCopy.figure.inclusionNone
                : synergyCopy.figure.inclusion(String(c.inclusionPct))}
            </span>
          </span>

          {/* A word, never a glyph: the deck row's remove is a visually identical
              × one surface away, and that one is irreversible. The dashed
              underline is this app's reversible register and is the exact
              inverse of the declined row's `Show it again`. The rule belongs to
              the word rather than to the 44px tap target, which is why it sits
              on the inner span. */}
          <button
            type="button"
            onClick={onDecline}
            disabled={inflight}
            aria-label={topOffCopy.list.declineAria(c.name)}
            className="ml-auto md:ml-0 md:order-8 flex-none flex items-center justify-end min-h-[44px] md:min-h-0 md:w-[60px] font-mono text-[10.5px] bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-default [color:var(--fg-faint)] hover:[color:var(--fg-body)] transition-colors"
          >
            <span className="[border-bottom:1px_dashed_var(--border-dashed)]">
              {topOffCopy.list.decline}
            </span>
          </button>
        </span>
      </span>
      </div>

      {/* THE CARD NOTE, below the row's line and indented to the name column — `HANDOFF.md`
          §Geometry, §C's host matrix. `aria-hidden`, because `rowLabel` above already speaks
          it: every visual atom on this row is hidden and the tick's one accessible name is
          where all of it is heard, in an order a reader can follow.

          INDENTED TO THE NAME COLUMN, which is where §C's host matrix puts it — and computed
          from the shipped tick box rather than transcribed as the handoff's `27px`. That
          figure is drawn against a tick this row does not have: the shipped tick is `w-[26px]`
          with a `gap-[9px]` at 390 and `w-[18px]` with a `gap-[10px]` above `md`, so the name
          column starts 49px in at 390 and 46px in above `md`, both MEASURED in a browser
          rather than added up here — and the desktop figure is the reason to measure at all:
          its parts (tick 18 + gap 10 + dot 7 + gap 10) sum to 45, and the laid-out name is at
          46. 27px lands under the tick at 390.

          That is the `labelAtPx` lesson exactly: the constants live in the code and
          `probe:card-note` asserts the PROPERTY they were derived from — the note starts at
          the row's own laid-out name — so a later change to the tick or the dot fails the
          probe rather than drifting silently. */}
      <CardNote
        facts={c.facts}
        declared={declaredBracket}
        counts={noteCounts}
        density="row"
        spokenElsewhere
        className="pl-[49px] md:pl-[46px] pb-[7px]"
      />
    </div>
  );
}

export function DeclinedRow({
  name,
  onRestore,
  disabled,
}: {
  name: string;
  onRestore: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex items-center gap-[10px] min-h-[34px] rounded-[7px] px-[10px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <span
        className="flex-none font-mono uppercase"
        style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--fg-locked)" }}
      >
        {topOffCopy.list.declined}
      </span>
      <span
        className="flex-auto min-w-0 text-[13px]"
        style={{ color: "var(--fg-faint)" }}
      >
        {name}
      </span>
      <button
        type="button"
        onClick={onRestore}
        disabled={disabled}
        aria-label={topOffCopy.list.restoreAria(name)}
        className="flex-none font-mono text-[10.5px] bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-default [color:var(--fg-faint)] [border-bottom:1px_dashed_var(--border-dashed)]"
      >
        {topOffCopy.list.restore}
      </button>
    </div>
  );
}

export function IllegalRow({ name, inDeck }: { name: string; inDeck: boolean }) {
  return (
    <div
      className="flex items-center gap-[10px] min-h-[34px] rounded-[7px] px-[10px]"
      style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)" }}
    >
      <span
        className="flex-none font-mono uppercase"
        style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--fg-locked)" }}
      >
        {inDeck ? topOffCopy.list.illegalInDeck : topOffCopy.list.illegalColour}
      </span>
      <span className="flex-auto min-w-0 text-[13px]" style={{ color: "var(--fg-faint)" }}>
        {name}
      </span>
      <span className="flex-none font-mono text-[10.5px]" style={{ color: "var(--fg-locked)" }}>
        {topOffCopy.list.illegalUntickable}
      </span>
    </div>
  );
}

/** §15. The shipped `MutationError` is a bare line; this surface draws the
 *  refusal as a plate with its own label. Kept local rather than restyling the
 *  shared component, whose other five call sites the design does not rule on. */
export function RefusalPlate({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      data-testid="top-off-refusal"
      // No live role. BuilderShell already owns a polite region, and the commit
      // path speaks the refusal into it; an alert here would say the same thing
      // a second time, louder and out of order.
      className={`flex items-center gap-[9px] rounded-[8px] px-[12px] py-[9px] ${className ?? ""}`}
      style={{
        // The design draws the sunken surface with a faint danger lift. Mixed
        // rather than named as a literal so it follows the theme.
        background: "color-mix(in oklab, var(--danger) 6%, var(--surface-sunken))",
        border: "1px solid var(--danger)",
      }}
    >
      <span
        className="flex-none font-mono uppercase"
        style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--danger)" }}
      >
        {topOffCopy.commit.refusedLabel}
      </span>
      <span className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>
        {message}
      </span>
    </div>
  );
}
