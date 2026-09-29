"use client";

// TopOffList — the list behind the strip's door (#360 scope 1).
//
// One component at both widths. The row's atoms are mounted once and rearranged
// with `md:contents` plus `order-*`: at phone they sit in two lines, at desktop
// they become direct children of one flex row under the column header. Only the
// cost track is mounted twice, and only because its cap and track width are
// props rather than styles — see the comment at CostTrack.
//
// Selection state does NOT live here. Ticks and declines survive the list being
// closed (design state 9), and this component unmounts on close, so both are
// held by LastSlotsStrip and passed down.

import { hasFrontFaceCost } from "../../lib/cards/faces";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { commitTopOff } from "../../app/decks/actions";
import { bulkConcession } from "../../lib/decks/bulk-concession";
import { bulkFillOptions } from "../../app/decks/actions";
import type { FillShortfall } from "../../lib/decks/fill";
import { canSeed, type TopOffCandidateWithFacts } from "../../lib/decks/last-slots";

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
type RowCandidate = TopOffCandidateWithFacts;
import { ComboClause, comboClauseSpoken } from "../cards/combo-clause";
import { CardNote, cardNoteSpoken } from "./card-note";
import { AddSurfaceMarkKey } from "./add-surface-mark-key";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { factsFromCandidate } from "../../lib/bracket/facts";
import { cardFactName } from "../../lib/copy/card-mark";
import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import {
  formatCents,
  summarisePrices,
  priceOf,
  priceState,
  type PriceFact,
} from "../../lib/decks/price";
import { availabilityState } from "../../lib/decks/availability";
import { FACET_TYPE_LABEL } from "../../lib/cards/facet";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { AvailabilityMarker } from "../ui/availability-marker";
import { BuyTag } from "./buy-tag";
import { GhostButton } from "../ui/button";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";
import { useIsDesktop } from "../ui/use-is-desktop";

/** How long ticking settles before one message is announced. Thirty fast taps
 *  is one message, which is the shipped selection rule from the Add panel. */
const ANNOUNCE_SETTLE_MS = 600;

/** The type column, desktop only, as one figure the header and the rows share.
 *
 *  90px rather than the synergy panel's 150: that panel prints a real type line
 *  under a single facet, and this list has no facet filter, so every row here is
 *  the panel's own "all" case — the bucket word, of which `Enchantment` is the
 *  longest at about 76px. The name column is `flex-auto` and pays for it. */
const TYPE_COL = "90px";

export interface TopOffListProps {
  deckId: string;
  listId: string;
  /** The body size minus the built count, live: quick-add can move it while the
      list is open. */
  openSlots: number;
  /** The ceiling every figure here is stated against — 99, or 98 for a pair. */
  bodySize: number;
  /** The whole ranked pool, live. It is frozen inside for the life of one
      opening — see the comment at `frozen` — and the live value is read only to
      tell which of the frozen rows the route is still offering. */
  candidates: RowCandidate[];
  /** Oracle ids currently in the deck, used to name why a row went illegal. */
  deckOracleIds: Set<string>;
  ticked: Set<string>;
  onTickedChange: (next: Set<string>) => void;
  declined: Set<string>;
  onDeclinedChange: (next: Set<string>) => void;
  newestAsOf: Date | null;
  /**
   * The card note's two deck-level inputs — the deck's live declaration and what its list
   * already holds of each note-bearing kind.
   *
   * REQUIRED, and threaded rather than defaulted, for the reason `newestAsOf` beside it is:
   * a row that receives no counts draws every ordinal from zero and says `your 1st game
   * changer` about a deck holding four. A wrong figure rather than a missing prop, and
   * silent — the failure that comment records having shipped once already.
   */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
  onAnnounce: (message: string) => void;
  onInflight: (inflight: boolean) => void;
  /** A pass has landed. The selection survives a cancel, and every refusal, but
      not this: what the strip holds is an uncommitted selection, and once it is
      committed there is nothing left to hold. */
  onCommitted: () => void;
  /** Cancel, and the settled commit. Returns focus to the door. One handler for
      both, and no reason argument: the strip moves focus the same way either
      way. */
  onClose: () => void;
  /** The pinned commit bar's measured height, published so the page foot can
      reserve it. The bar is `fixed` and the quick-add dock it displaces is
      `sticky`, so while the list is open nothing in flow stands in for either
      and the tail of the DECKLIST — which is far below this component — is what
      ends up underneath. Reserving it here would only pad the strip. */
  onBarHeight: (height: number) => void;
}

/** The three ownership clauses, matching the three occupancies of §8's slot. */
function ownershipClause(c: RowCandidate, newestAsOf: Date | null): string {
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

function moneyOf(price: PriceFact | null, newestAsOf: Date | null): string | null {
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
function rowLabel(
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
  const type = FACET_TYPE_LABEL[c.facet];
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
function CostTrack({ cost }: { cost: string | null }) {
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

/** One pool's answer: what a press would select, and what that fill gave up. */
type BulkPlan = {
  oracleIds: string[];
  shortfalls: FillShortfall[];
  measuredTypes: boolean;
};

/**
 * Whether two plans would select the SAME CARDS.
 *
 * As sets, never by length: two plans of twelve differing by one card are two different
 * answers, and collapsing them would leave a player choosing between controls that are not
 * the same while the surface tells them they are. Order is not a difference — both are
 * applied as a `Set` — so the comparison must not be sensitive to it.
 */
function sameSelection(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const inA = new Set(a);
  return b.every((id) => inA.has(id));
}

/**
 * One control and its concession, as one row.
 *
 * The button is a fixed 232px column on desktop so the notes share a left edge and can be
 * read against each other — 232px is the wider label at its largest reachable figure,
 * `Select the 47 this deck needs`, so nothing in the pair wraps. At phone the button is full
 * width at the 44px minimum and the note is indented to its edge, because side by side each
 * label gets ~175px and the longer one wraps to three lines there.
 *
 * THE CONCESSION IS IN THE ACCESSIBLE NAME and the visible note is `aria-hidden`: a sibling
 * note is read AFTER the choice on a linear pass, and the whole design is that both
 * concessions are legible BEFORE either press. Hidden rather than duplicated, so the figure
 * is not spoken twice.
 */
function BulkControl(props: {
  pool: "collection" | "best";
  label: string;
  ariaLabel: string;
  note: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-[5px] md:flex-row md:items-center md:gap-[14px]">
      <GhostButton
        data-bulk-fill={props.pool}
        onClick={props.onPress}
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        className="flex w-full items-center justify-center min-h-[44px] font-mono text-[12px] md:w-[232px] md:min-h-0 md:h-[30px] md:text-[11px] rounded-[8px] text-[color:var(--fg-body)] disabled:opacity-50"
      >
        {props.label}
      </GhostButton>
      <p
        data-bulk-concession={props.pool}
        aria-hidden
        className="font-mono text-[11px] pl-[2px] md:pl-0"
        style={{ color: "var(--fg-body)" }}
      >
        {props.note}
      </p>
    </div>
  );
}

export function TopOffList({
  deckId,
  listId,
  openSlots,
  bodySize,
  candidates,
  deckOracleIds,
  ticked,
  onTickedChange,
  declined,
  onDeclinedChange,
  newestAsOf,
  declaredBracket,
  noteCounts,
  onAnnounce,
  onInflight,
  onCommitted,
  onClose,
  onBarHeight,
}: TopOffListProps) {
  const [inflight, setInflight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // THE PAIR'S OWN REFUSAL, kept apart from `error`. That one belongs to the COMMIT, which
  // speaks about an action the player just took; clearing it because a background refetch
  // succeeded would take a message off the screen that nothing replaced. They render through
  // the same plate, and the commit's wins when both are set for the same reason.
  const [bulkError, setBulkError] = useState<string | null>(null);

  // The pool is frozen for the life of one opening. The optimistic deck set
  // freezes a quick-added row in the same frame as the click, but the server
  // payload that follows drops that card from `candidates` outright — so a pool
  // read live would let the row vanish from under the cursor one beat later,
  // which is the whole of what state 17 forbids. The frozen rows are drawn from
  // the difference between this pool and the fresh list.
  //
  // State with no setter rather than a ref: the pool is read on every render to
  // decide what to draw, which is exactly what a ref may not be used for.
  const [pool] = useState(candidates);

  /** Every row in this list, so the card modal's Prev and Next page through the
   *  pool the reader is looking at rather than the deck behind it. Declined and
   *  illegal rows are in it on purpose: both are still on screen wearing their
   *  own way back, and a traversal that skipped them would step over rows the
   *  reader can see. */
  const siblingIds = pool.map((c) => c.oracleId);
  const offered = new Set(candidates.map((c) => c.oracleId));

  // A candidate the deck gained while the list was open. Frozen rows keep their
  // slot and say why rather than vanishing from under the cursor (state 17).
  const illegal = new Set(
    pool
      .filter((c) => deckOracleIds.has(c.oracleId) || !offered.has(c.oracleId))
      .map((c) => c.oracleId),
  );

  // Derived during render, never in an effect: an illegal row unticks itself,
  // and correcting that after paint would show the stale count for a frame.
  //
  // Clamped to the cap as well, because `openSlots` is live: quick-adding a card
  // that is not itself a candidate takes a slot without unticking anything, and
  // an unclamped count would then say "2 of 1 ticked" over a cap line claiming
  // the list was full. The survivors are the first `openSlots` in pool order, so
  // the tick a player loses is the lowest-ranked one they made.
  const legal = [...ticked].filter((id) => !illegal.has(id) && !declined.has(id));
  const legalSet = new Set(legal);
  const live = new Set(
    pool
      .map((c) => c.oracleId)
      .filter((id) => legalSet.has(id))
      .slice(0, Math.max(openSlots, 0)),
  );
  const tickedCount = live.size;
  const atCap = tickedCount >= openSlots;

  const ownedIds = pool
    .filter((c) => c.owned && !illegal.has(c.oracleId) && !declined.has(c.oracleId))
    .map((c) => c.oracleId);
  // Only the declines this opening can actually see. The set is the strip's and
  // survives every close, while the pool is refrozen on each open — so a card
  // declined once and gone from the route by the next open would otherwise be
  // subtracted from a pool it is not in, and the head would count rows down to
  // nothing.
  const declinedHere = pool.filter((c) => declined.has(c.oracleId)).length;
  const allDeclined = pool.length > 0 && declinedHere === pool.length;

  // WHAT THE TICK-ALL MAY TICK, which is no longer the same as what it will.
  //
  // This was the selection: a slice of it, clamped to the open slots. It is now an ALLOW-LIST
  // intersected against the action's answer, so the count actually ticked can be lower than
  // `tickable` — the fill leaves a slot open rather than spending it on a card no floor wants.
  // The figure on the face and in the accessible name is still the number of slots, because
  // that is what the button offers to fill; what changed is that offering is not promising.
  // The COLLECTION control reaches for what the SEED reaches for: `canSeed` decides what is
  // eligible, and the server's own fill decides which of those to choose. A card
  // owned with every copy sleeved elsewhere stays in the list and stays tickable by hand; what
  // neither of these does is choose it for the player.
  //
  // It carries `ownedIds`' own exclusions as well, and they are not decoration:
  // a row the player has SET ASIDE, or one that went illegal while the list was
  // open, must not come back ticked because they pressed a bulk control.
  const seedableIds = pool
    .filter((c) => canSeed(c) && !illegal.has(c.oracleId) && !declined.has(c.oracleId))
    .map((c) => c.oracleId);
  const tickable = Math.min(seedableIds.length, Math.max(openSlots, 0));
  // THE ALLOW-LIST IS READ AT PRESS TIME, from render scope, and no ref is needed for it any
  // more. A live handle and a draft generation used to live here because the press itself was
  // asynchronous — it asked the server for a plan and the draft could move in the gap. The
  // pair holds its ids and applies them synchronously, so the allow-list it intersects with is
  // simply the current render's. Both refs and both effects were left write-only by that
  // change and are gone rather than kept as furniture describing a guard that guards nothing.

  const untouched = pool.length - tickedCount - declinedHere;

  // A STABLE KEY FOR THE DECK'S CARDS. `deckOracleIds` is a Set rebuilt by the parent on every
  // render, so it cannot be a dependency; sorted and joined, it changes exactly when the deck's
  // contents do.
  const deckOracleKey = [...deckOracleIds].sort().join(",");

  // ── The bulk pair's figures (§5.2, b1–b11) ─────────────────────────────
  //
  // BOTH PLANS RUN WHEN THE LIST OPENS, because the locked requirement is that a player can
  // compare what each control concedes WITHOUT pressing one to find out. The ids the notes
  // were computed from are the ids a press applies, so the note can never describe a
  // selection the press did not make.
  //
  // Design draws no loading state and this is the one gap in the matrix: the pair MOUNTS when
  // its figures land rather than appearing figureless and filling in. That is the same shape
  // the strip's seed already has — it opens with nothing ticked and the ticks arrive — and it
  // is preferred to the two alternatives the handoff rules out by name: an empty note slot
  // ("a blank beside one control and a figure beside the other reads as a missing figure")
  // and a disabled ghost, which §Component notes reserves for a commit in flight alone.
  const [bulkOptions, setBulkOptions] = useState<
    { collection: BulkPlan; best: BulkPlan } | null
  >(null);
  useEffect(() => {
    let live = true;
    // THE OLD ANSWER GOES BEFORE THE NEW ONE IS ASKED FOR. It was computed for a deck that has
    // since moved, so leaving it on screen would draw two notes about a deck nobody is looking
    // at and — worse — leave their ids PRESSABLE until the new answer lands. The pair is
    // absent for that moment, which is the same state it is in before the first answer.
    //
    // The refusal goes too, or a read that failed once keeps its plate up over every later
    // success. This is the pair's own, never the commit's.
    // CLEARED IN THE CLEANUP, not synchronously here. The old answer has to go — it was
    // computed for a deck that has since moved, and leaving it on screen draws two notes about
    // a deck nobody is looking at while its ids stay PRESSABLE until the new answer lands —
    // but a `setState` in an effect's body cascades a render, so the clear happens as this
    // effect is torn down, which is the same instant from the reader's side. The refusal goes
    // with it, or a read that failed once keeps its plate up over every later success. This is
    // the pair's own refusal, never the commit's.
    void bulkFillOptions(deckId, openSlots)
      .then((r) => {
        if (!live) return;
        if (r.ok) {
          setBulkOptions({ collection: r.collection, best: r.best });
          return;
        }
        // A REFUSAL IS DRAWN AND SPOKEN, not swallowed into an empty slot. The pair is absent
        // without its figures — there is nothing honest for the notes to say — and an absence
        // with no reason beside it is the one thing the surface's own absence rule does not
        // cover: b3 and b9 are absences the copy explains. This is the path the single
        // control it replaces already took, through the same shipped plate.
        setBulkError(r.message);
        onAnnounce(r.message);
      })
      .catch(() => {
        if (!live) return;
        // A rejected call — a deck deleted while the list was open, or a transport failure —
        // is a refusal the player can read rather than an unhandled rejection that leaves two
        // controls missing and says nothing.
        setBulkError(synergyCopy.lastSlots.topUpFailed);
        onAnnounce(synergyCopy.lastSlots.topUpFailed);
      });
    return () => {
      live = false;
      setBulkOptions(null);
      setBulkError(null);
    };
    // THE PLANS ARE FOR THIS DECK'S CARDS, not merely for its slot count.
    //
    // `openSlots` alone is not enough and the difference is reachable: a quick-add and a
    // removal while the list is open leave the count unchanged while the deck underneath it
    // moves, and both notes and both id sets would go on describing the deck as it was. The
    // single control this pair replaces was asked on the press, so it could not be stale by
    // more than a round trip; asking at the open means the answer is live for as long as the
    // list is, and the dependency list is the only thing that retires it.
    //
    // Joined rather than passed as an array: `deckOracleIds` is rebuilt on every render of the
    // parent, so depending on the array itself would re-run two server fills per render.
    //
    // `onAnnounce` is deliberately NOT a dependency. It is the parent's callback and is
    // rebuilt on most of its renders, so listing it would re-run both server plans every time
    // the page around this list re-rendered — two fills per render, for a figure that has not
    // moved. It is only ever CALLED from the failure paths above, never read for its value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, openSlots, deckOracleKey]);

  const buying = pool.filter((c) => live.has(c.oracleId) && !c.owned);
  const buyMoney = summarisePrices(
    buying.map((c) => ({ quantity: 1, price: c.price })),
    newestAsOf,
  );
  const buyCount = buying.length;

  /**
   * WHAT A PRESS WOULD ACTUALLY SELECT.
   *
   * ONE DEFINITION, because three things depend on it and they have to agree: the press, the
   * buy figure beside the best control, and b3's judgement that the two pools chose the same
   * cards. The first version computed each of those from the RAW plan ids, and both of the
   * others were wrong in the same way — a declined or gone-illegal row that the plan named
   * still counted, so the note quoted a card the press would not take and b3 asked its
   * question about a difference that disappears on the press.
   */
  const wouldSelect = (ids: readonly string[], pool_: "collection" | "best") => {
    // THE ALLOW-LIST IS THE CONTROL'S OWN POOL, and the two are genuinely different.
    //
    // The collection control promises cards the player can sleeve TONIGHT, which is `canSeed`
    // — already computed as `seedableIds`, and already carrying the set-aside and gone-illegal
    // exclusions. A card owned with every copy sleeved in another deck stays in the list and
    // stays tickable BY HAND; what no control may do is choose it for the player.
    //
    // The best control's pool is every legal candidate, unfiltered by ownership: this list
    // ticks unowned rows, draws their buy tags and buys them on commit, so narrowing it to
    // `canSeed` would silently drop every purchase the control exists to offer.
    const allowed = new Set(
      pool_ === "collection"
        ? seedableIds
        : pool
            .filter((c) => !illegal.has(c.oracleId) && !declined.has(c.oracleId))
            .map((c) => c.oracleId),
    );
    return ids.filter((id) => allowed.has(id));
  };

  const applyBulk = (ids: readonly string[], pool_: "collection" | "best") =>
    onTickedChange(new Set(wouldSelect(ids, pool_)));

  // b9 · the collection control is absent at zero sleevable, and the remaining control keeps
  // its own label: renaming it `Select 12` would hide that every one of them is a purchase.
  const bulkShowsCollection = tickable > 0;
  // b3 · the two pools produced the same rows, so the second control is absent. Compared as
  // SETS rather than by length: two plans of twelve that differ by one card are two different
  // answers, and the player would be choosing between controls that are not the same while
  // being told they are.
  // COMPARED AFTER EACH POOL'S OWN ALLOW-LIST, never on the raw plans. The two lists are
  // intersected with different sets — the collection control may only choose a card with a
  // free copy — so two plans that differ only by a row neither press can take are the same
  // answer wearing two buttons, which is the #361 defect this rule exists to prevent.
  const bulkShowsBest =
    bulkOptions !== null &&
    !sameSelection(
      wouldSelect(bulkOptions.collection.oracleIds, "collection"),
      wouldSelect(bulkOptions.best.oracleIds, "best"),
    );

  // b11 · at the cap with a hand-made selection in the way, replacing it is the WHOLE of what
  // a press would do, and that outranks the figure. Both notes take it, and the figures return
  // when the selection is cleared or reduced.
  const bulkReplaces =
    atCap && tickedCount > 0
      ? tickedCount === 1
        ? topOffCopy.bulk.replacesOne
        : topOffCopy.bulk.replaces(String(tickedCount))
      : null;

  /**
   * A press APPLIES the ids the note was computed from. No round trip: the plans ran when the
   * list opened, and asking again would re-plan against a deck that may have moved since the
   * figure beside the button was drawn.
   *
   * STILL INTERSECTED, and against the list as it stands rather than as it stood when the
   * plans landed. A row set aside, or one that went illegal while the list was open, must not
   * come back selected because the player pressed a bulk control — the same rule the seed and
   * the old single control both take, and the reason the allow-list is read here rather than
   * captured with the plan.
   *
   * The BEST pool's allow-list is wider than the collection's by design: this list ticks
   * unowned rows, draws their buy tags and buys them on commit, so `canSeed` — which is about
   * a copy free to sleeve tonight — would silently drop every purchase the control exists to
   * offer.
   */

  /** The left-hand note: what filling from the collection gives up on shape. */
  const bulkNote = (plan: BulkPlan, nothingToBuy: boolean) =>
    bulkReplaces ??
    bulkConcession({
      shortfalls: plan.shortfalls,
      measured: plan.measuredTypes,
      nothingToBuy,
    });

  // The right-hand note: what the best fill costs. Computed from the rows the press will
  // ACTUALLY select — the plan's ids intersected with this list — so the figure and the
  // selection cannot disagree. Identical in shape to the shipped `commit.toBuy`, because the
  // bar restates this pair of figures a moment later and two spellings of one fact read as two.
  // FROM THE SELECTION, not from the plan. A declined unowned row still in the best plan would
  // otherwise be counted and priced here and then dropped by the press, so the note would
  // promise `5 to buy · $34.00` where the commit bar says `4 to buy · $14.00` a moment later.
  const bestSelection = bulkOptions ? new Set(wouldSelect(bulkOptions.best.oracleIds, "best")) : null;
  const bestBuying = bestSelection
    ? pool.filter((c) => bestSelection.has(c.oracleId) && !c.owned)
    : [];
  const bestMoney = summarisePrices(
    bestBuying.map((c) => ({ quantity: 1, price: c.price })),
    newestAsOf,
  );
  const bulkBuyNote =
    bulkReplaces ??
    topOffCopy.bulk.buy(
      String(bestBuying.length),
      // A MISSING PRICE DROPS THE FIGURE AND KEEPS THE COUNT — `price.ts`'s shipped rule and
      // the buy tag's own behaviour on the rows below. No dash, no `$0.00`, no
      // "price unavailable". A figure stands as soon as one copy is priced.
      bestMoney.pricedCopies > 0 ? formatCents(bestMoney.totalCents) : null,
    );

  const total = bodySize - openSlots + tickedCount;

  const capLineId = `${listId}-cap`;
  // The cap line has two homes and one id, and two elements cannot share one —
  // so the width picks which of them mounts it. A `hidden md:block` pair would
  // leave every inert tick box describing a `display: none` element at one of
  // the two widths, which screen readers do not reliably announce. The list
  // only ever mounts on a click, so this is never read during hydration and the
  // first paint is already at the real width.
  const isDesktop = useIsDesktop();

  // The bar's one status line. The addendum draws three rungs, but rungs 1 and 2
  // partition the whole space — `atCap` is `slotsLeft <= 0` — so the third, the
  // dock notice, is unreachable behind them. That follows from the priority the
  // addendum itself sets and the reason it gives for setting it: the notice is
  // the only one of the three about a control the player is not currently using,
  // and `Cancel` and `Close` are both on screen and both the answer to it. So it
  // is written as the two rungs that can actually render rather than a branch
  // that never will.
  const slotsLeft = openSlots - tickedCount;
  const barStatus =
    slotsLeft > 0
      ? topOffCopy.commit.slotsStayOpen(String(slotsLeft))
      : isDesktop
        ? null
        : topOffCopy.list.cap;

  // The height the page foot has to reserve for the pinned bar.
  const barRef = useRef<HTMLDivElement>(null);
  // Read through a ref so a caller passing an inline handler does not retear
  // down the observer on every render.
  const publish = useRef(onBarHeight);
  useEffect(() => {
    publish.current = onBarHeight;
  });
  // Layout rather than passive, and measured before it is observed: a passive
  // effect runs after paint, and the observer's own first callback is
  // asynchronous, so either alone leaves one frame with the tail of the list
  // under the bar. Border box, matching create-picker's dock, because the bar's
  // padding and top border are part of what covers the row beneath it.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    publish.current(el.getBoundingClientRect().height);
    if (typeof ResizeObserver === "undefined") return () => publish.current(0);
    const ro = new ResizeObserver(() => publish.current(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => {
      ro.disconnect();
      // The bar goes with this component, so the reservation must go too or the
      // closed page keeps a band of dead space at its foot.
      publish.current(0);
    };
  }, []);

  // One message per settle. The first render is the open announcement, which
  // the strip fires; this only speaks once the player has moved something.
  // A decline that takes a tick with it also speaks for itself, and raises the
  // same flag, so the act arrives once rather than twice 600ms apart.
  const settled = useRef(true);

  function toggle(id: string) {
    if (inflight) return;
    const next = new Set(live);
    if (next.has(id)) next.delete(id);
    else {
      if (atCap) return;
      next.add(id);
    }
    onTickedChange(next);
  }

  function decline(c: RowCandidate) {
    if (inflight) return;
    const nextDeclined = new Set(declined);
    nextDeclined.add(c.oracleId);
    const nextTicked = new Set(live);
    nextTicked.delete(c.oracleId);
    // Only when the row was ticked, because only then does the count move and
    // the settle effect run. Raising it unconditionally would swallow whatever
    // the player did next.
    if (live.has(c.oracleId)) settled.current = true;
    onDeclinedChange(nextDeclined);
    onTickedChange(nextTicked);
    onAnnounce(
      topOffCopy.announce.declined(
        c.name,
        String(nextTicked.size),
        String(openSlots),
      ),
    );
  }

  function restore(id: string) {
    if (inflight) return;
    const next = new Set(declined);
    next.delete(id);
    onDeclinedChange(next);
  }

  // Emptying the set is the whole of it: no action, no server call. The ticks
  // are not restored with the rows, because a decline dropped the tick and a row
  // that comes back ticked would place a card the player set aside.
  function restoreAll() {
    if (inflight) return;
    onDeclinedChange(new Set());
    onAnnounce(
      topOffCopy.announce.restoredAll(
        String(declinedHere),
        String(tickedCount),
        String(openSlots),
      ),
    );
  }

  useEffect(() => {
    if (settled.current) {
      settled.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (atCap) onAnnounce(topOffCopy.announce.capped(String(openSlots)));
      else if (buyCount > 0) {
        onAnnounce(
          topOffCopy.announce.ticked(
            String(tickedCount),
            String(openSlots),
            String(buyCount),
          ),
        );
      } else {
        onAnnounce(
          topOffCopy.announce.tickedNoBuy(String(tickedCount), String(openSlots)),
        );
      }
    }, ANNOUNCE_SETTLE_MS);
    return () => clearTimeout(t);
    // Only the selection settling speaks. The announcement helpers are stable
    // for a render pass and re-running on their identity would speak on every
    // parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickedCount, buyCount, atCap, openSlots]);

  async function commit() {
    if (inflight || tickedCount === 0) return;
    setInflight(true);
    onInflight(true);
    setError(null);
    try {
      const result = await commitTopOff(deckId, [...live]);
      if (!result.ok) {
        // Every tick is preserved: the refusal changed nothing (state 15).
        // The plate is the only thing drawn and the live region is the only
        // thing spoken, so they say the same words: the server's reason, which
        // is more specific than the generic refusal the thrown path falls to.
        setError(result.message);
        onAnnounce(result.message);
        return;
      }
      onCommitted();
      onAnnounce(
        result.boughtDelta > 0
          ? topOffCopy.announce.added(
              String(result.added),
              String(result.total),
              String(result.boughtDelta),
              bodySize,
            )
          : topOffCopy.announce.addedNoBuy(String(result.added), String(result.total), bodySize),
      );
      onClose();
    } catch {
      // A call that never arrived and one that arrived and failed are the same
      // event to the player, and the deck is unchanged either way — including
      // for a reader, who has only the announcement to go on.
      setError(topOffCopy.commit.refused);
      onAnnounce(topOffCopy.commit.refused);
    } finally {
      setInflight(false);
      onInflight(false);
    }
  }

  const primaryLabel = inflight
    ? topOffCopy.commit.inFlight(String(tickedCount))
    : tickedCount === 0
      ? topOffCopy.commit.addEmpty
      : topOffCopy.commit.add(String(tickedCount));

  // An aria-label replaces the visible label rather than adding to it, so it
  // has to track all three of the button's states. Only the last one has a
  // count worth spelling out: at zero the copy file already drops it, and
  // mid-pass the count is in the visible label the aria-label is standing in
  // for. The added total is the fact the drawing puts nowhere else.
  const primaryAria = inflight
    ? primaryLabel
    : tickedCount === 0
      ? topOffCopy.commit.addEmpty
      : topOffCopy.commit.addAria(String(tickedCount), String(total), bodySize);

  const headDesktop = topOffCopy.list.head(
    String(tickedCount),
    String(openSlots),
    String(pool.length),
    String(Math.max(0, untouched)),
  );
  // The head is one of our own strings and its two halves take different ink.
  // Splitting on the separator it was written with is the only seam available;
  // a string without one renders whole, in the live half's ink.
  const [headLive, headStatic] = splitOnce(headDesktop, " · ");

  return (
    <div id={listId}>
      {/* ── Selection head (§2) ─────────────────────────────────────────── */}
      <div className="md:flex md:items-center md:gap-[12px] md:flex-wrap md:pt-[10px] md:pb-[11px] md:[border-bottom:1px_solid_var(--border)]">
        {/* Desktop only. At 390px the ticked count is stated once, in the pinned
            commit bar, where it sits beside the button that acts on it — and the
            strip's own caption takes this slot instead. */}
        <p className="hidden md:block font-mono text-[11px]">
          <span style={{ color: "var(--fg-body)" }}>{headLive}</span>
          {headStatic !== null && (
            <span style={{ color: "var(--fg-locked)" }}>{` · ${headStatic}`}</span>
          )}
        </p>

        {/* The cap's desktop home. The head is the one element always directly
            above the rows, so a player who taps an inert box at row 3 gets an
            answer; the line used to sit below all 38 of them. The divider is a
            rule rather than a middot because this is a different kind of
            statement from the figures beside it. */}
        {isDesktop && atCap && (
          <p
            id={capLineId}
            className="hidden md:block font-mono text-[10.5px] pl-[12px] [border-left:1px_solid_var(--border-strong)]"
            style={{ color: "var(--fg-locked)" }}
          >
            {topOffCopy.list.cap}
          </p>
        )}

        {/* ── The bulk pair (§5.1–§5.4, b1–b11) ──────────────────────────
            TWO GHOSTS OF EQUAL WEIGHT, one fixed column, each with its
            concession on its own line. The locked requirement is COMPARISON:
            two labels of different length push their notes to different x
            positions, and two figures that do not share a left edge are read
            one after the other rather than against each other. So the buttons
            take one fixed 232px column and the notes form a second.

            Neither is primary. The pair exists precisely because the app cannot
            know which concession a player minds, and weight would be an opinion
            it does not have. The brass outline on this surface is spoken for by
            `Add N cards`, the only control here that changes the deck.

            NEITHER TAKES A PRESSED STATE. A player can deselect by hand a moment
            later, and a lit button would claim a selection that no longer
            matches it. Pressing the other swaps the selection wholesale. */}
        <div className="flex flex-col gap-[10px] mt-[11px] md:gap-[7px]">
          {bulkOptions && (bulkShowsCollection || bulkShowsBest) && (
            <>
              {/* b9 · nothing to sleeve. The collection control is ABSENT, not
                  disabled — the surface's standing rule — and the strip's
                  shipped door note already says which of the two zeroes it is. */}
              {/* THE COLLECTION CONTROL NAMES `tickable`, NOT `openSlots`, and this is the one
                  place the build departs from the handoff's copy note.

                  That note says "both labels state the same count — the open slots — because
                  both fills take every one of them". True in b1's own figures (23 sleevable
                  for 12 open, so the two are the same number) and false exactly where they
                  differ: a collection holding four candidates for twelve slots cannot take
                  twelve, and `Select 12 from my collection` would promise eight cards that do
                  not exist.

                  The surface has already ruled on this shape once. The control this pair
                  replaces named `tickable` for the same reason, recorded in its own case as
                  "a button that says two and ticks one is wrong on its face and in its name".
                  Recorded as errata on the handoff rather than settled quietly. */}
              {bulkShowsCollection && (
                <BulkControl
                  pool="collection"
                  label={topOffCopy.bulk.collection(String(tickable))}
                  ariaLabel={topOffCopy.bulk.collectionAria(
                    String(tickable),
                    bulkNote(bulkOptions.collection, !bulkShowsBest),
                  )}
                  note={bulkNote(bulkOptions.collection, !bulkShowsBest)}
                  disabled={inflight}
                  onPress={() => applyBulk(bulkOptions.collection.oracleIds, "collection")}
                />
              )}
              {/* b3 · the two fills are the same set, so the second control is
                  ABSENT and the survivor's note says why. Two controls that do
                  the same thing are the shipped #361 defect in a new costume. */}
              {bulkShowsBest && (
                <BulkControl
                  pool="best"
                  label={topOffCopy.bulk.best(String(openSlots))}
                  ariaLabel={topOffCopy.bulk.bestAria(
                    String(openSlots),
                    bulkBuyNote,
                  )}
                  note={bulkBuyNote}
                  disabled={inflight}
                  onPress={() => applyBulk(bulkOptions.best.oracleIds, "best")}
                />
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-[8px] mt-[11px] md:contents">
          <GhostButton
            onClick={() => onTickedChange(new Set())}
            disabled={inflight || tickedCount === 0}
            className="flex flex-1 items-center justify-center min-h-[44px] md:inline-flex md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
          >
            {topOffCopy.list.clearTicks}
          </GhostButton>
          {declinedHere > 0 && (
            <GhostButton
              onClick={restoreAll}
              disabled={inflight}
              aria-label={topOffCopy.list.restoreAllAria(String(declinedHere))}
              className="flex basis-full items-center justify-center min-h-[44px] md:inline-flex md:basis-auto md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
            >
              {topOffCopy.list.restoreAll(String(declinedHere))}
            </GhostButton>
          )}
        </div>

        <p
          className="hidden md:block font-mono text-[10px] md:ml-auto"
          style={{ color: "var(--fg-locked)" }}
        >
          {topOffCopy.list.ordering}
        </p>
      </div>

      {/* THE KEY, above the rows, so the vocabulary is met before the first glyph. See
          `AddSurfaceMarkKey` for why it is unconditional here and conditional on the
          decklist: this list ranks a pool of 262 candidates for the average commander and
          shows a window on it. */}
      <AddSurfaceMarkKey className="px-[8px] md:px-[9px] pb-[10px]" />

      {/* ── The rows (§4) ──────────────────────────────────────────────── */}
      {/* One preview for the whole list, as the decklist mounts one for its
          ninety-nine: 262 rows each carrying a positioned 252x352 box and a
          timer of its own is the thing this component was written to avoid. No
          padding class — the decklist passes its own row padding here, and this
          list's rows carry theirs. */}
      <HoverPreviewProvider>
      <div
        // Named, so a probe can address THIS list rather than any group under
        // `<main>`. The decklist behind the strip carries a `View details for …`
        // trigger on every one of its rows, so a locator scoped to the page — or
        // to `div[role="group"]` — is satisfied by the decklist and reports this
        // list working when its own trigger is gone. That false pass has now been
        // written twice; the attribute is what stops a third.
        data-top-off-rows
        role="group"
        aria-label={topOffCopy.list.groupAria(
          String(pool.length),
          String(openSlots),
        )}
        // DESKTOP ONLY, and the handoff's own long-list note is why.
        //
        // That note refuses an inner scroller outright, on four grounds, and it
        // is right about every one of them AT 390px: two scroll surfaces a
        // gesture cannot tell apart on a box nearly as wide as the viewport, a
        // hidden bottom, chaining that throws the commit past a reader who is
        // slowing down, and a trapped primary. The phone keeps exactly what it
        // drew — one scroll surface, the commit pinned in the dock's slot.
        //
        // But it costs the decision as "a player scrolls past up to 38 rows",
        // because "the list can never be longer than 99 − built". It can:
        // `listLastSlotsCandidates` returns the whole ranked pool, which is 262
        // cards for the average commander and 423 at the widest, and 3,264 of
        // 3,279 commanders carry more than 100 even after the negative tail is
        // cut. So on desktop the shipped shape is the one option that note
        // refused by name — an unpinned commit at the end of the list — reached
        // by a premise that did not hold.
        //
        // A pointer can address one box of two; a 390px thumb cannot. Bounding
        // it here buys the always-visible primary the note wanted, without the
        // gesture ambiguity it was avoiding.
        //
        // 480px is the synergy panel's own box on `/commanders/[slug]`, which is
        // the other long EDHREC list in this app. `max-h`, so a list shorter than
        // the box is its own height and no reader is given a scrollbar for six
        // rows. Whether the POOL should be this long at all is a question for
        // Design; this is the reading surface, not the ranking.
        className="flex flex-col gap-[6px] md:gap-[5px] mt-[8px] md:max-h-[480px] md:overflow-y-auto"
      >
        {/* ── Column header (§3) — desktop only ───────────────────────────── */}
        {/* INSIDE the scroll box below, and sticky to its top, rather than a
            sibling above it. A classic (non-overlay) scrollbar takes its width out
            of the scroll container's CONTENT box, so a header outside would be
            about 15px wider than the rows and every heading after the flex-auto
            name column would sit that far right of the data it names — the same
            failure this file's own header comment records at 32px, arriving the
            other way. Invisible on overlay scrollbars, which is what macOS draws
            and what the probe measures, so nothing here would have caught it.

            Sticky, because a header that scrolled away with the rows would leave a
            480px box of unlabelled figures. It carries the strip's own background
            so rows pass under it rather than through it. */}
        <div
          aria-hidden
          className="hidden md:flex md:sticky md:top-0 md:z-[1] items-center gap-[10px] pt-[9px] pb-[7px] px-[9px] font-mono uppercase"
          style={{
            fontSize: "9.5px",
            letterSpacing: ".12em",
            color: "var(--fg-faint)",
            background: "var(--surface-rail)",
          }}
        >
          <span className="w-[18px] flex-none" />
          <span className="w-[7px] flex-none" />
          <span className="flex-auto min-w-0">{topOffCopy.list.colCard}</span>
          {/* Type, beside the name as the handoff's own long-list note orders it
              (`box, dot, name, type, buy tag, synergy, inclusion`). It reads the
              synergy panel's heading rather than declaring a second copy of the
              word: two surfaces listing the same EDHREC pool under two different
              headings for one column is the drift a shared string exists to stop. */}
          <span className="flex-none" style={{ width: TYPE_COL }}>{synergyCopy.panel.colType}</span>
          {/* The same shared track the rows draw into, never a literal beside it: the cost
              column widened from 40 to 72 when the pips stopped overlapping, and a header
              carrying its own copy of the old number put this heading and every one after it
              32px left of the data underneath. */}
          <span
            className="flex-none text-right"
            style={{ width: COST_TRACK }}
          >
            {topOffCopy.list.colCost}
          </span>
          <span className="w-[84px] flex-none" />
          {/* Both figures narrow to pay for the decline's 60px slot, measured
              against the string the row actually renders — `+147 pts`, eight
              characters at IBM Plex Mono's 0.6em advance, which is 57.6px at
              12px. 44px is recovered against 42px spent, so the name column
              gains 2px rather than paying anything. */}
          <span className="w-[60px] flex-none text-right">{topOffCopy.list.colSynergy}</span>
          <span className="w-[36px] flex-none text-right">{topOffCopy.list.colDecks}</span>
          <span className="w-[60px] flex-none" />
        </div>

        {pool.map((c) => {
          if (illegal.has(c.oracleId)) {
            return (
              <IllegalRow
                key={c.oracleId}
                name={c.name}
                inDeck={deckOracleIds.has(c.oracleId)}
              />
            );
          }
          if (declined.has(c.oracleId)) {
            return (
              <DeclinedRow
                key={c.oracleId}
                name={c.name}
                onRestore={() => restore(c.oracleId)}
                disabled={inflight}
              />
            );
          }
          const isTicked = live.has(c.oracleId);
          const inert = !isTicked && atCap;
          return (
            <CandidateRow
              key={c.oracleId}
              candidate={c}
              ticked={isTicked}
              inert={inert}
              inflight={inflight}
              capLineId={capLineId}
              newestAsOf={newestAsOf}
              declaredBracket={declaredBracket}
              noteCounts={noteCounts}
              isDesktop={isDesktop}
              siblings={siblingIds}
              onToggle={() => toggle(c.oracleId)}
              onDecline={() => decline(c)}
            />
          );
        })}
      </div>
      </HoverPreviewProvider>

      {tickedCount === 0 && (
        <p className="font-mono text-[10.5px] mt-[9px]" style={{ color: "var(--fg-locked)" }}>
          {/* Emptied by choosing is not empty, and it is not state 13 either:
              every candidate is still there wearing its own way back. The other
              two variants describe a list that arrived ticked, which by now is a
              moment that has passed. */}
          {allDeclined
            ? topOffCopy.commit.nothingTickedAllDeclined(String(pool.length))
            : ownedIds.length === 0
              ? topOffCopy.commit.nothingTickedUnowned(String(pool.length))
              : topOffCopy.commit.nothingTicked}
        </p>
      )}

      {/* ── Commit row (§9) / commit bar (§10) ─────────────────────────── */}
      <div
        ref={barRef}
        className={[
          // Phone: the one pinned element, taking the quick-add dock's slot.
          "fixed left-0 right-0 bottom-[var(--tabbar-h)] z-30 px-[12px] pt-[11px] pb-[13px]",
          "flex flex-col gap-[9px]",
          // Desktop: an ordinary row at the foot of the list, never sticky.
          "md:static md:left-auto md:right-auto md:p-0 md:mt-[14px] md:pt-[14px]",
          "md:flex-row md:items-center md:gap-[14px] md:flex-wrap",
          // The dock's own background, because this takes the dock's slot. A
          // transparent pinned bar lets 191 rows scroll through its text.
          "[background:var(--bg)] md:[background:none]",
          "[border-top:1px_solid_var(--border-strong)] md:[border-top:1px_solid_var(--border)]",
        ].join(" ")}
      >
        {/* The bar's one status line, and one element rather than a pair split
            by CSS, so the sentence is never in the DOM twice. Desktop carries
            only the slots notice: its cap line lives in the head, and the dock
            notice is a phone-only fixture. Phone stacks all three as a single
            ternary so the bar can never grow a second line. Rungs 1 and 2 are
            mutually exclusive by arithmetic — at the cap there are no slots left
            to stay open — and the dock notice is last because it is the only one
            of the three about a control the player is not currently using, and
            `Cancel` and `Close` are both on screen and both the answer to it. */}
        {barStatus && (
          <p
            id={!isDesktop && atCap ? capLineId : undefined}
            className="order-1 md:order-4 md:ml-auto font-mono text-[10px] md:text-[10.5px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {barStatus}
          </p>
        )}

        <div className="order-3 flex gap-[8px] md:contents">
          <button
            type="button"
            onClick={commit}
            disabled={tickedCount === 0 || inflight}
            aria-label={primaryAria}
            className={[
              "md:order-1 flex-auto md:flex-none inline-flex items-center justify-center",
              "min-h-[44px] md:min-h-0 rounded-[8px] px-[18px] md:py-[10px]",
              "bg-transparent font-semibold text-[14px] md:text-[13px] cursor-pointer",
              "disabled:cursor-default",
              inflight
                ? "[border:1px_solid_var(--accent-shadow)] [color:var(--fg-faint)]"
                : tickedCount === 0
                  ? "[border:1px_solid_var(--border)] [color:var(--fg-locked)]"
                  : "[border:1px_solid_var(--accent)] [color:var(--accent)]",
            ].join(" ")}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={inflight}
            className={[
              "md:order-2 flex-none inline-flex items-center justify-center",
              "min-h-[44px] md:min-h-0 rounded-[8px] px-[16px] md:py-[10px]",
              "bg-transparent text-[14px] md:text-[13px] cursor-pointer",
              "[border:1px_solid_var(--border-strong)] [color:var(--fg)]",
              "disabled:opacity-50 disabled:cursor-default",
              "disabled:[border-color:var(--border)] disabled:[color:var(--fg-locked)]",
            ].join(" ")}
          >
            {topOffCopy.commit.cancel}
          </button>
        </div>

        <div className="order-2 md:order-3 flex items-baseline gap-[8px] font-mono text-[10.5px] md:text-[11px] leading-[1.6]">
          <span className="md:hidden" style={{ color: "var(--fg-body)" }}>
            {topOffCopy.list.headMobile(String(tickedCount), String(openSlots))}
          </span>
          {buyCount > 0 && (
            <span className="order-2 md:order-2" style={{ color: "var(--warning)" }}>
              {topOffCopy.commit.toBuy(
                String(buyCount),
                // price-strip.tsx's rule, and the same threshold: a figure
                // stands as soon as one copy is priced, and leaves entirely
                // when none is. Zero priced copies sum to zero cents, which is
                // not a price of nothing.
                buyMoney.pricedCopies > 0 ? formatCents(buyMoney.totalCents) : null,
              )}
            </span>
          )}
          <span className="order-3 md:order-1 ml-auto md:ml-0 text-[color:var(--fg-locked)] md:text-[color:var(--fg-body)]">
            {topOffCopy.commit.consequence(String(total), bodySize)}
          </span>
        </div>

        {(error ?? bulkError) && (
          <RefusalPlate
            className="order-4 md:order-5 md:w-full"
            // The COMMIT's refusal wins when both are set: it is about something the player
            // just pressed, while the pair's is about a background read.
            message={(error ?? bulkError) as string}
          />
        )}
      </div>
    </div>
  );
}

/** First separator only; a string without one keeps its whole self as the head. */
function splitOnce(value: string, sep: string): [string, string | null] {
  const at = value.indexOf(sep);
  if (at === -1) return [value, null];
  return [value.slice(0, at), value.slice(at + sep.length)];
}

// ── Rows ───────────────────────────────────────────────────────────────────

function CandidateRow({
  candidate: c,
  ticked,
  inert,
  inflight,
  capLineId,
  newestAsOf,
  declaredBracket,
  noteCounts,
  isDesktop,
  siblings,
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
  /** Desktop alone opens the card. The phone row is one tap target on purpose —
      the addendum's own rule, and what makes 38 of them tickable one-handed — so
      a button inside it would put "read this card" and "tick this card" on the
      same press. */
  isDesktop: boolean;
  /** The pool's ids, so the modal pages through the list the reader is in. */
  siblings: string[];
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
   * the phone's is a text span inside the tick's label, the desktop's a `CardDetailTrigger`
   * outside it — so "after the name" is two different positions in the tree. Rendered once
   * outside the label, the marks landed on the phone's SECOND line: measured at 73px from the
   * row's left against a name ending at 251px, which is a different line rather than a gap.
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
  // The decklist's own preview, borrowed rather than redrawn: one instance for
  // the whole list owns the image, the geometry and the two delays, and the row
  // only reports that a pointer arrived. A null `imageUri` is a no-op inside it,
  // so a card the catalog has no picture for draws nothing rather than a frame.
  const previewHandlers = usePreviewRow(c.imageUri);
  const committed =
    c.owned && c.availability !== null && availabilityState(c.availability) === "hard";
  const tickId = useId();

  // The row's tappable area is three labels pointing at one box rather than one
  // label wrapping everything, because the decline has to sit inside line 2 at
  // phone and a control nested in a label toggles the tick on every tap of it.
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
      className={[
        "flex flex-col rounded-[7px]",
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
      {...previewHandlers}
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
        className="flex-none flex items-center justify-center font-mono w-[26px] h-[26px] md:w-[18px] md:h-[18px] rounded-[6px] md:rounded-[5px] text-[13px] md:text-[11px] cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--accent)]"
        style={
          ticked
            ? {
                border: "1px solid var(--accent)",
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
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
        <label
          htmlFor={tickId}
          className="flex items-center gap-[7px] cursor-pointer md:contents"
        >
          <OwnershipDot
            owned={c.owned}
            committed={committed}
            size={7}
            className="md:order-1"
          />
          {/* Phone keeps the name as TEXT inside the label. The addendum's rule
              for this row is that the target is the row, not the box — which is
              what makes 38 of them tickable one-handed — so a button here would
              put "read this card" and "tick this card" on one press. Desktop
              takes the trigger instead, below, where a pointer can tell the two
              apart and a hover says which is which. */}
          {!isDesktop && (
            /* THE NAME AND ITS MARKS ARE ONE GROUP, and the wrapper carries the `flex-auto`
               the name used to. "Inline after the name" is about the TEXT: with the name
               growing to fill the cell, a `flex-none` mark after it lands at the far right of
               the column beside the buy tag. Measured before this wrapper existed: the glyph
               sat 87px past the end of `Mu Yanling` at 390 and 535px past it at 1300. */
            <span className="flex-auto min-w-0 flex items-center gap-[7px]">
              <span
                // Named for the probe, for the reason `data-top-off-type` below is: the note
                // indents to THIS column, and recognising it by its type size would pick up
                // whatever else on the row happens to be set at 12.5px.
                data-testid="top-off-name"
                className="min-w-0 text-[12.5px]"
                style={{ color: "var(--fg)" }}
              >
                {c.name}
              </span>
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
        </label>

        {/* Outside the label, deliberately: a control nested in one toggles the
            tick on every press of it — the same trap the decline control is
            placed against, recorded in the addendum. `md:contents` on the parent
            makes this a direct child of the row's flex context, so `order` puts
            it back beside the dot however the DOM is arranged. */}
        {/* THE NAME AND ITS MARKS ARE ONE GROUP, carrying the `md:order-2` and the `flex-auto`
            the trigger used to own — so the shrink competition against the clause below is
            unchanged, and the glyph follows the TEXT rather than the cell. Measured before
            this wrapper existed: 535px past the end of `Mu Yanling` at 1300. */}
        {isDesktop && (
          <span className="md:order-2 flex-auto min-w-0 flex items-center gap-[7px]">
          <CardDetailTrigger
            oracleId={c.oracleId}
            name={c.name}
            siblings={siblings}
            title={c.name}
            // THE CLAUSE ELLIPSES BEFORE THE NAME DOES, which is the design's rule, and the
            // name stays SHRINKABLE, which is how that rule is delivered without breaking
            // the row.
            //
            // `flex-none` is the literal reading and it does not work: it sets
            // `flex-shrink: 0` with `flex-basis: auto`, so the `truncate` beside it can never
            // engage and a long name renders at full max-content width. The clause shrinks to
            // zero first and then nothing on the row can give — the eight fixed columns and
            // their gaps come to 535px — so the row overflows a box that is
            // `md:overflow-y-auto`, which computes overflow-x to `auto`, and the reader gets
            // a horizontal scrollbar with the decline control outside it.
            //
            // Shrink PRIORITY does the same job safely: the clause carries a far larger
            // `flex-shrink`, so it absorbs essentially all of the reduction and the name only
            // begins to give once the clause is spent — at which point the name still
            // truncates rather than overflowing.
            testId="top-off-name"
            // NOT `flex-auto` any more: the GROUP above owns the growing now. Left on the
            // trigger it fills the group and the mark lands at the group's far edge again,
            // which is the 535px this wrapper exists to close — the fix measured as no fix
            // until the grow moved up one level.
            className="min-w-0 text-left truncate text-[13.5px] [color:var(--fg)]"
          >
            {c.name}
          </CardDetailTrigger>
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
            {FACET_TYPE_LABEL[c.facet]}
          </span>
        )}

        <span className="flex items-center gap-[8px] font-mono text-[10px] md:contents">
          <label
            htmlFor={tickId}
            className="flex items-center gap-[8px] cursor-pointer md:contents"
          >
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
              style={{ color: "var(--accent)" }}
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
          </label>

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
            className="ml-auto md:ml-0 md:order-8 flex-none flex items-center justify-end min-h-[44px] md:min-h-0 md:w-[60px] font-mono text-[10.5px] bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-default [color:var(--fg-faint)] hover:[color:var(--fg-body)]"
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

function DeclinedRow({
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

function IllegalRow({ name, inDeck }: { name: string; inDeck: boolean }) {
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
