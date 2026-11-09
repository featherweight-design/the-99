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

import type { ComponentProps } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { TopOffFrame, sameSelection } from "./top-off-frame";
import { commitTopOff } from "../../app/decks/actions";
import { bulkConcession } from "../../lib/decks/bulk-concession";
import { bulkFillOptions } from "../../app/decks/actions";
import type { FillShortfall } from "../../lib/decks/fill";
import { canSeed } from "../../lib/decks/last-slots";

import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import { formatCents, summarisePrices } from "../../lib/decks/price";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";
import { useIsDesktop } from "../ui/use-is-desktop";
import { CardDetailTrigger, type Sibling } from "../cards/card-detail-provider";
import { useRowOpen } from "./update-diff-row";
import { useDockClearance } from "../shell/dock-clearance";
import { useDeckFootClearance } from "./deck-toast-stack";
import { useMergedRef } from "../ui/use-merged-ref";
import {
  CandidateRowView,
  DeclinedRow,
  IllegalRow,
  RefusalPlate,
  type RowCandidate,
} from "./top-off-rows";

// The rows are drawn in `top-off-rows.tsx` from props alone (landing demo split 5g). This file
// keeps the list: the read, the selection, the actions, and the two providers' hooks.
export { RefusalPlate };

/** How long ticking settles before one message is announced. Thirty fast taps
 *  is one message, which is the shipped selection rule from the Add panel. */
const ANNOUNCE_SETTLE_MS = 600;


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

/** One pool's answer: what a press would select, and what that fill gave up. */
type BulkPlan = {
  oracleIds: string[];
  shortfalls: FillShortfall[];
  measuredTypes: boolean;
};


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
  const siblingIds = pool.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri }));
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

  // WHAT THE COLLECTION CONTROL MAY TICK: an ALLOW-LIST intersected against the fill plan's answer
  // (`wouldSelect`). The plan can leave a slot open rather than spend it on a card no floor wants,
  // so what a press ticks can be fewer than this list holds, down to none. The control's figure is
  // therefore the count the press will tick, taken from the plan, never from this list: a figure
  // counted here read `Select 6 from my collection` over a plan that ticked nothing (Hugh,
  // 2026-09-28). The COLLECTION control reaches for what the SEED reaches for: `canSeed` decides what is
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

  // WHAT EACH PRESS TICKS, computed once and read by the label, the accessible name, the notes and
  // the press alike, so the figure a control names and the rows it ticks cannot disagree.
  const collectionSelection = bulkOptions ? wouldSelect(bulkOptions.collection.oracleIds, "collection") : [];
  const bestSelectionIds = bulkOptions ? wouldSelect(bulkOptions.best.oracleIds, "best") : [];
  const applyBulk = (ids: readonly string[]) => onTickedChange(new Set(ids));

  // b9 · a control whose press would tick nothing is absent, not a live button that does nothing:
  // the collection control at zero sleevable, or where its plan chose none of them. The remaining
  // control keeps its own label: renaming it `Select 12` would hide that every one of them is a
  // purchase.
  const bulkShowsCollection = collectionSelection.length > 0;
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
    bestSelectionIds.length > 0 &&
    !sameSelection(collectionSelection, bestSelectionIds);

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
  const bestSelection = new Set(bestSelectionIds);
  const bestBuying = pool.filter((c) => bestSelection.has(c.oracleId) && !c.owned);
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

  const capLineId = `${listId}-cap`;
  // The cap line has two homes and one id, and two elements cannot share one —
  // so the width picks which of them mounts it. A `hidden md:block` pair would
  // leave every inert tick box describing a `display: none` element at one of
  // the two widths, which screen readers do not reliably announce. The list
  // only ever mounts on a click, so this is never read during hydration and the
  // first paint is already at the real width.
  const isDesktop = useIsDesktop();

  // The height the page foot has to reserve for the pinned bar.
  const barRef = useRef<HTMLDivElement>(null);
  useDockClearance(barRef);
  // On a phone the bar stands in for the quick-add dock at the page's foot, so the deck toasts stand above it too
  // (small items 3, item 8). Static from md, where it publishes nothing.
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
  useDeckFootClearance(barEl);
  const barRefs = useMergedRef<HTMLDivElement>(barRef, setBarEl);
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

  // The frame is drawn in `top-off-frame.tsx` from these figures and presses (landing demo split 5h).
  // The pair's two controls are handed down only when they are shown, with the same label,
  // accessible name and note the drawing used when it lived here.
  const bulk = {
    collection:
      bulkOptions && bulkShowsCollection
        ? {
            label: topOffCopy.bulk.collection(String(collectionSelection.length)),
            ariaLabel: topOffCopy.bulk.collectionAria(
              String(collectionSelection.length),
              bulkNote(bulkOptions.collection, !bulkShowsBest),
            ),
            note: bulkNote(bulkOptions.collection, !bulkShowsBest),
            onPress: () => applyBulk(collectionSelection),
          }
        : null,
    best:
      bulkOptions && bulkShowsBest
        ? {
            label: topOffCopy.bulk.best(String(bestSelectionIds.length)),
            ariaLabel: topOffCopy.bulk.bestAria(String(bestSelectionIds.length), bulkBuyNote),
            note: bulkBuyNote,
            onPress: () => applyBulk(bestSelectionIds),
          }
        : null,
  };

  // Emptied by choosing is not empty, and it is not state 13 either: every candidate is still
  // there wearing its own way back. The other two variants describe a list that arrived
  // ticked, which by now is a moment that has passed.
  const emptyNote =
    tickedCount !== 0
      ? null
      : allDeclined
        ? topOffCopy.commit.nothingTickedAllDeclined(String(pool.length))
        : ownedIds.length === 0
          ? topOffCopy.commit.nothingTickedUnowned(String(pool.length))
          : topOffCopy.commit.nothingTicked;

  return (
    <TopOffFrame
      listId={listId}
      capLineId={capLineId}
      isDesktop={isDesktop}
      openSlots={openSlots}
      bodySize={bodySize}
      poolSize={pool.length}
      untouched={untouched}
      tickedCount={tickedCount}
      declinedHere={declinedHere}
      atCap={atCap}
      inflight={inflight}
      bulk={bulk}
      onClearTicks={() => onTickedChange(new Set())}
      onRestoreAll={restoreAll}
      wrapRows={(group) => <HoverPreviewProvider>{group}</HoverPreviewProvider>}
      emptyNote={emptyNote}
      buyCount={buyCount}
      buyTotal={buyMoney.pricedCopies > 0 ? formatCents(buyMoney.totalCents) : null}
      barRef={barRefs}
      onCommit={commit}
      onCancel={onClose}
      // The COMMIT's refusal wins when both are set: it is about something the player
      // just pressed, while the pair's is about a background read.
      errorMessage={error ?? bulkError}
    >
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
    </TopOffFrame>
  );
}

/** One candidate row. The two provider hooks live here, so the drawing in `top-off-rows.tsx`
 *  stays free of them: the press that opens the card and the hover preview's pointer events
 *  are built from the card-detail and preview providers and handed down, and so is the
 *  name's trigger. */
function CandidateRow({
  siblings,
  ...rest
}: Omit<ComponentProps<typeof CandidateRowView>, "nameTrigger" | "rowHandlers"> & {
  /** The pool, so the modal pages through the list the reader is in. */
  siblings: readonly Sibling[];
}) {
  const c = rest.candidate;
  // The decklist's own preview, borrowed rather than redrawn: one instance for
  // the whole list owns the image, the geometry and the two delays, and the row
  // only reports that a pointer arrived. A null `imageUri` is a no-op inside it,
  // so a card the catalog has no picture for draws nothing rather than a frame.
  const previewHandlers = usePreviewRow(c.imageUri);
  // A PRESS ON THE ROW OPENS THE CARD; `useRowOpen` leaves a press on the box, the name's
  // trigger and the decline to those controls.
  const rowOpen = useRowOpen(c, siblings, true);
  return (
    <CandidateRowView
      {...rest}
      rowHandlers={{ ...rowOpen, ...previewHandlers }}
      nameTrigger={(className) => (
        <CardDetailTrigger
          oracleId={c.oracleId}
          name={c.name}
          siblings={siblings}
          title={c.name}
          testId="top-off-name"
          className={className}
        >
          {c.name}
        </CardDetailTrigger>
      )}
    />
  );
}
