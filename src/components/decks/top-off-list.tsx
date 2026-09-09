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

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { commitTopOff } from "../../app/decks/actions";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import {
  formatCents,
  summarisePrices,
  priceOf,
  priceState,
  type PriceFact,
} from "../../lib/decks/price";
import { availabilityState } from "../../lib/decks/availability";
import { CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { AvailabilityMarker } from "../ui/availability-marker";
import { BuyTag } from "./buy-tag";
import { GhostButton } from "../ui/button";
import { useIsDesktop } from "../ui/use-is-desktop";

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
  candidates: TopOffCandidate[];
  /** Oracle ids currently in the deck, used to name why a row went illegal. */
  deckOracleIds: Set<string>;
  ticked: Set<string>;
  onTickedChange: (next: Set<string>) => void;
  declined: Set<string>;
  onDeclinedChange: (next: Set<string>) => void;
  newestAsOf: Date | null;
  onAnnounce: (message: string) => void;
  onInflight: (inflight: boolean) => void;
  /** Cancel, and the settled commit. Returns focus to the door. One handler for
      both, and no reason argument: the strip does the same thing either way,
      because the selection survives a cancel exactly as it survives a commit. */
  onClose: () => void;
  /** The pinned commit bar's measured height, published so the page foot can
      reserve it. The bar is `fixed` and the quick-add dock it displaces is
      `sticky`, so while the list is open nothing in flow stands in for either
      and the tail of the DECKLIST — which is far below this component — is what
      ends up underneath. Reserving it here would only pad the strip. */
  onBarHeight: (height: number) => void;
}

/** The three ownership clauses, matching the three occupancies of §8's slot. */
function ownershipClause(c: TopOffCandidate, newestAsOf: Date | null): string {
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
function rowLabel(c: TopOffCandidate, newestAsOf: Date | null): string {
  const clause = ownershipClause(c, newestAsOf);
  const inclusion =
    c.inclusionPct === null
      ? synergyCopy.figure.inclusionNone
      : synergyCopy.figure.inclusion(String(c.inclusionPct));
  const cost = spokenManaCost(c.manaCost);
  if (c.synergyPts !== null && c.synergyPts >= 0) {
    return `${cost}. ${topOffCopy.list.rowAria(c.name, clause, String(c.synergyPts), inclusion)}`;
  }
  const synergy =
    c.synergyPts === null
      ? synergyCopy.figure.synergyNone
      : synergySignedDisplay(c.synergyPts);
  return `${cost}. ${synergyCopy.figure.rowAria(
    c.name,
    clause.replace(/\.$/, ""),
    synergy,
    inclusion,
  )}`;
}

/** Mounted twice, and only here. The phone track is uncapped and unshingled
 *  while the desktop track caps at five slots inside a fixed 40px column —
 *  both are `cap`/`track` props, which no responsive class can reach. The two
 *  mounts read the same `cost`, so they cannot drift; both are aria-hidden and
 *  the cost is spoken once from the row's own label. */
function CostTrack({ cost }: { cost: string | null }) {
  if (cost === null) return null;
  return (
    <span className="flex-none md:order-3">
      <CostPips cost={cost} size={13} className="flex gap-[3px] md:hidden" />
      <CostPips
        cost={cost}
        size={12}
        cap={5}
        track={40}
        className="hidden md:flex gap-[3px]"
      />
    </span>
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
  onAnnounce,
  onInflight,
  onClose,
  onBarHeight,
}: TopOffListProps) {
  const [inflight, setInflight] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // What the tick-all will actually tick. It replaces the selection wholesale
  // and clamps to the open slots, so a player owning twelve candidates for three
  // slots is offered three — the figure both the face and the accessible name
  // carry, because a button that says twelve and ticks three is lying twice.
  const tickable = Math.min(ownedIds.length, Math.max(openSlots, 0));
  const untouched = pool.length - tickedCount - declinedHere;

  const buying = pool.filter((c) => live.has(c.oracleId) && !c.owned);
  const buyMoney = summarisePrices(
    buying.map((c) => ({ quantity: 1, price: c.price })),
    newestAsOf,
  );
  const buyCount = buying.length;
  const total = bodySize - openSlots + tickedCount;

  const capLineId = `${listId}-cap`;
  // The cap line has two homes and one id, and two elements cannot share one —
  // so the width picks which of them mounts it. A `hidden md:block` pair would
  // leave every inert tick box describing a `display: none` element at one of
  // the two widths, which screen readers do not reliably announce. The list
  // only ever mounts on a click, so this is never read during hydration and the
  // first paint is already at the real width.
  const isDesktop = useIsDesktop();

  const slotsLeft = openSlots - tickedCount;
  const barStatus = isDesktop
    ? slotsLeft > 0
      ? topOffCopy.commit.slotsStayOpen(String(slotsLeft))
      : null
    : atCap
      ? topOffCopy.list.cap
      : slotsLeft > 0
        ? topOffCopy.commit.slotsStayOpen(String(slotsLeft))
        : topOffCopy.dock.retired;

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

  function decline(c: TopOffCandidate) {
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
      onTickedChange(new Set());
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

        <div className="flex flex-wrap gap-[8px] mt-[11px] md:contents">
          <GhostButton
            onClick={() => onTickedChange(new Set(ownedIds.slice(0, tickable)))}
            disabled={inflight || tickable === 0}
            aria-label={topOffCopy.list.tickOwnedAria(String(tickable))}
            className="flex flex-1 items-center justify-center min-h-[44px] md:inline-flex md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
          >
            {topOffCopy.list.tickOwned(String(tickable))}
          </GhostButton>
          <GhostButton
            onClick={() => onTickedChange(new Set())}
            disabled={inflight || tickedCount === 0}
            className="flex flex-1 items-center justify-center min-h-[44px] md:inline-flex md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
          >
            {topOffCopy.list.clearTicks}
          </GhostButton>
          {/* The way back out of every decline at once. It appears at one
              decline rather than at all of them: gating it on the all-declined
              case would hide the general control to serve the extreme one. At
              phone it takes its own full-width row instead of squeezing the two
              fixtures a player did not ask to have narrowed. */}
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

      {/* ── Column header (§3) — desktop only ───────────────────────────── */}
      <div
        aria-hidden
        className="hidden md:flex items-center gap-[10px] pt-[9px] pb-[7px] px-[9px] font-mono uppercase"
        style={{ fontSize: "9.5px", letterSpacing: ".12em", color: "var(--fg-faint)" }}
      >
        <span className="w-[18px] flex-none" />
        <span className="w-[7px] flex-none" />
        <span className="flex-auto min-w-0">{topOffCopy.list.colCard}</span>
        <span className="w-[40px] flex-none text-right">{topOffCopy.list.colCost}</span>
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

      {/* ── The rows (§4) ──────────────────────────────────────────────── */}
      <div
        role="group"
        aria-label={topOffCopy.list.groupAria(
          String(pool.length),
          String(openSlots),
        )}
        className="flex flex-col gap-[6px] md:gap-[5px] mt-[8px]"
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
              onToggle={() => toggle(c.oracleId)}
              onDecline={() => decline(c)}
            />
          );
        })}
      </div>

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

        {error && <RefusalPlate className="order-4 md:order-5 md:w-full" message={error} />}
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
  onToggle,
  onDecline,
}: {
  candidate: TopOffCandidate;
  ticked: boolean;
  inert: boolean;
  inflight: boolean;
  capLineId: string;
  newestAsOf: Date | null;
  onToggle: () => void;
  onDecline: () => void;
}) {
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
      className="flex items-center gap-[9px] md:gap-[10px] rounded-[7px] min-h-[52px] md:min-h-[34px] pl-[8px] pr-[10px] md:px-[9px]"
      style={{
        background: ticked ? "var(--elevated-hover)" : "var(--surface)",
        border: ticked
          ? "1px solid var(--accent-shadow)"
          : "1px solid var(--border)",
        ...(inert ? { opacity: 0.55 } : null),
      }}
    >
      <input
        type="checkbox"
        id={tickId}
        className="sr-only"
        checked={ticked}
        aria-label={rowLabel(c, newestAsOf)}
        aria-disabled={inert || inflight ? true : undefined}
        aria-describedby={inert ? capLineId : undefined}
        onChange={onToggle}
      />
      <label
        htmlFor={tickId}
        aria-hidden
        className="flex-none flex items-center justify-center font-mono w-[26px] h-[26px] md:w-[18px] md:h-[18px] rounded-[6px] md:rounded-[5px] text-[13px] md:text-[11px] cursor-pointer"
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
          <span
            className="flex-auto min-w-0 text-[12.5px] md:text-[13.5px] md:order-2"
            style={{ color: "var(--fg)" }}
          >
            {c.name}
          </span>
          <span
            aria-hidden
            className="flex-none flex items-center justify-end whitespace-nowrap font-mono text-[10px] md:order-4 md:w-[84px]"
          >
            {!c.owned ? (
              <BuyTag
                variant="row"
                price={c.price}
                newestAsOf={newestAsOf}
                density="full"
              />
            ) : c.availability ? (
              <AvailabilityMarker availability={c.availability} nameless />
            ) : null}
          </span>
        </label>

        <span className="flex items-center gap-[8px] font-mono text-[10px] md:contents">
          <label
            htmlFor={tickId}
            className="flex items-center gap-[8px] cursor-pointer md:contents"
          >
            <CostTrack cost={c.manaCost} />
            <span
              aria-hidden
              className="flex-none md:order-5 md:w-[60px] md:text-right md:text-[12px]"
              style={{ color: "var(--accent)" }}
            >
              {c.synergyPts === null
                ? synergyCopy.figure.synergyNone
                : synergySignedDisplay(c.synergyPts)}
            </span>
            <span
              aria-hidden
              className="flex-none md:order-6 md:w-[36px] md:text-right md:text-[11px]"
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
            className="ml-auto md:ml-0 md:order-7 flex-none flex items-center justify-end min-h-[44px] md:min-h-0 md:w-[60px] font-mono text-[10.5px] bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-default [color:var(--fg-faint)] hover:[color:var(--fg-body)]"
          >
            <span className="[border-bottom:1px_dashed_var(--border-dashed)]">
              {topOffCopy.list.decline}
            </span>
          </button>
        </span>
      </span>
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
