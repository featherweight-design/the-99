"use client";

// The cart's phone Filters sheet (handoff Controls B1, R1b; plan A6, PR 9): the compact chassis's one filter surface,
// opened by the 36px Filters pill. The Friend group is Any friend across the row, then the friends as equal-width pills
// two to a row, each with its face and how many of the cart's cards they hold; Owned is a segmented control. Filters
// apply as they are pressed, so the primary press only closes the sheet and Escape or a swipe lose nothing.

import { useEffect, useId, useRef, useState } from "react";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { chassisCopy } from "../../../lib/copy/filter-chassis";
import { collectionChassisCopy } from "../../../lib/copy/collection";
import { OWNED_FILTERS, type FriendFilter, type OwnedFilter } from "../../../lib/decks/cart-sort";
import type { SpareFriend } from "../../../lib/social/spares";
import { Face } from "../../social/face";
import { onSegmentKeys } from "../../ui/segment-keys";
import { Sheet } from "../../ui/sheet";

/** A friend the Friend filter offers: one with a spare of a selected line, and how many of the drawn cards they hold. */
export type FriendOption = { friend: SpareFriend; count: number };

/** What the Friend dimension can offer now: its friends, a read still out, or nothing (none has a spare, or it failed). */
export type FriendOffer = { kind: "friends"; any: number; friends: readonly FriendOption[] } | { kind: "reading" } | { kind: "none" };

export type CartFilterSheetProps = {
  open: boolean;
  onDismiss: () => void;
  /** The lines every filter and the search leave, and the selected lines they are counted against. */
  shown: number;
  of: number;
  offer: FriendOffer;
  friend: FriendFilter;
  onFriend: (code: string) => void;
  owned: OwnedFilter;
  onOwned: (next: OwnedFilter) => void;
  onClearAll: () => void;
};

const OWNED_LABEL: Record<OwnedFilter, string> = {
  any: copy.filters.ownedAny,
  some: copy.filters.ownedSome,
  none: copy.filters.ownedNone,
};

// Controls B1's `.gh`: mono 10, .12em, uppercase, faint, and 6px nearer the group it heads than the sheet's 14px gap
// (14 - 6 = 8). A block fieldset: a rendered legend is never a flex item, so a flex gap would not reach it.
const HEADING = "m-0 mb-[8px] p-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]";
const GROUP = "m-0 min-w-0 border-none p-0";

/** Absent rather than hidden, so its focus trap, scroll lock and live region exist only while it is open. */
export function CartFilterSheet({ open, ...rest }: CartFilterSheetProps) {
  return open ? <SheetBody open={open} {...rest} /> : null;
}

function SheetBody({ open, onDismiss, shown, of, offer, friend, onFriend, owned, onOwned, onClearAll }: CartFilterSheetProps) {
  const dialog = useRef<HTMLDivElement>(null);
  // The sheet is `aria-modal`, so the chassis's result line behind it goes quiet and this region says the count once a
  // press changes it, debounced as every count here is, so four presses are one number.
  const [said, setSaid] = useState("");
  const last = useRef(shown);
  useEffect(() => {
    if (last.current === shown) return;
    last.current = shown;
    const t = setTimeout(() => setSaid(copy.filters.sheetMatch(shown, of)), 300);
    return () => clearTimeout(t);
  }, [shown, of]);
  useDialogA11y(dialog, onDismiss, { initialFocusRef: dialog });
  const named = Array.isArray(friend) ? friend : [];
  // The Owned segments are one Tab stop with the arrows moving the choice, the shipped segmented controls' keys.
  const uid = useId();
  const segId = (v: OwnedFilter) => `${uid}-owned-${v}`;
  return (
    <Sheet
      open={open}
      onDismiss={onDismiss}
      ariaLabel={collectionChassisCopy.sheet.trigger}
      panelRef={dialog}
      portal
      // Compact is everything under the chassis's 1000px, which `min-[1000px]:hidden` states without a 999px edge a
      // fractional width could fall through.
      frameClassName="fixed inset-0 z-50 flex flex-col justify-end min-[1000px]:hidden bottom-auto top-[var(--vv-top,0px)] h-[var(--vv-h,100%)]"
      // Controls B1: the scrim, the 38x4 grab and the 18px sheet on `--surface-raised`.
      scrimClassName="absolute inset-0 bg-[rgba(8,6,4,0.62)]"
      handleClassName="flex touch-none justify-center pt-[10px] pb-0"
      handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-dashed)]"
      panelClassName="relative z-10 flex max-h-[86dvh] flex-col rounded-t-[18px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
    >
      <div className="flex flex-col gap-[14px] overflow-y-auto px-[18px] pt-[14px] pb-[26px]">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)]">{collectionChassisCopy.sheet.trigger}</h2>
          <small data-sheet-match className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.filters.sheetMatch(shown, of)}</small>
        </div>

        {offer.kind === "none" ? null : (
          <fieldset role="group" aria-label={copy.filters.friendHead} className={GROUP}>
            <legend className={HEADING}>{copy.filters.friendHead}</legend>
            {offer.kind === "reading" ? (
              // Loading A's dashed trigger, as the sheet's group: the friends are not known yet.
              <span
                data-friend-reading
                aria-disabled="true"
                className="flex h-[44px] items-center justify-center rounded-full border border-dashed border-[color:var(--border-strong)] px-[14px] font-sans text-[14px] text-[color:var(--fg-locked)]"
              >
                {copy.filters.friendReading}
              </span>
            ) : (
              // R1b: Any friend spans the row, then the friends two to a row at equal widths.
              <div data-friend-pills className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[8px]">
                <Pill on={friend === "any"} onPress={() => onFriend("any")} label={copy.filters.anyFriend} wide dim={offer.any === 0 && friend !== "any"} />
                {offer.friends.map(({ friend: f, count }) => {
                  const on = named.includes(f.publicId);
                  return (
                    <Pill
                      key={f.publicId}
                      on={on}
                      onPress={() => onFriend(f.publicId)}
                      label={f.displayName}
                      count={count}
                      dim={count === 0 && !on}
                      face={<Face name={f.displayName} commander={f.commander} size={32} />}
                    />
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <fieldset role="radiogroup" aria-label={copy.filters.owned} className={GROUP}>
          <legend className={HEADING}>{copy.filters.owned}</legend>
          {/* Controls B1's `.segx`: a 3px well with 2px between the three 38px segments. */}
          <div className="flex gap-[2px] rounded-[10px] border border-solid border-[color:var(--border-strong)] p-[3px]">
            {OWNED_FILTERS.map((value) => (
              <button
                key={value}
                id={segId(value)}
                type="button"
                role="radio"
                aria-checked={owned === value}
                tabIndex={owned === value ? 0 : -1}
                onClick={() => onOwned(value)}
                onKeyDown={(e) => onSegmentKeys(e, OWNED_FILTERS, segId, onOwned)}
                className={`flex h-[38px] min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[7px] border-0 px-[4px] font-sans text-[13.5px] font-medium whitespace-nowrap ${
                  owned === value ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"
                }`}
              >
                {OWNED_LABEL[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-[4px] flex items-center gap-[14px]">
          <button
            type="button"
            // Dismiss only: every press already applied, so there is nothing pending.
            onClick={onDismiss}
            className="flex h-[44px] flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] border-0 bg-[color:var(--fg)] px-[16px] font-sans text-[14px] font-medium text-[color:var(--bg)]"
          >
            {copy.filters.show(shown)}
          </button>
          <button
            type="button"
            onClick={onClearAll}
            aria-label={chassisCopy.chips.clearAllAria}
            className="flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[13.5px] font-medium text-[color:var(--accent-text)]"
          >
            {chassisCopy.chips.clearAll}
          </button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{said}</span>
    </Sheet>
  );
}

/**
 * Controls B1's `.pill`: 44 tall, round, the face's disc 6px in, the count pushed to the end. Any friend has no face
 * (`.np`, 14px in) and spans both columns, its words centred. A friend with none of the drawn cards dims at .42, as a
 * zero-count row does in the desktop panel.
 */
function Pill({ on, onPress, label, count, face, wide = false, dim = false }: {
  on: boolean;
  onPress: () => void;
  label: string;
  count?: number;
  face?: React.ReactNode;
  wide?: boolean;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={count === undefined ? label : copy.panels.friend.optionAria(label, count)}
      onClick={onPress}
      data-pill={wide ? "any" : "friend"}
      className={[
        "flex h-[44px] min-w-0 cursor-pointer items-center gap-[8px] rounded-full border border-solid font-sans text-[14px]",
        wide ? "col-span-full justify-center px-[14px]" : face ? "pl-[6px] pr-[14px]" : "px-[14px]",
        on
          ? "border-[color:var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
        dim ? "opacity-[0.42]" : "",
      ].join(" ")}
    >
      {face}
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      {count === undefined ? null : (
        <small className="ml-auto flex-none font-mono text-[11px] text-[color:var(--fg-faint)]">{count.toLocaleString("en-US")}</small>
      )}
    </button>
  );
}
