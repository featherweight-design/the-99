"use client";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { Bracket } from "../../lib/profile/types";
import { bracketShift } from "../../lib/tuning/bracket-shift";
import type { LineItem, V2Ask } from "../../lib/tuning/state";
import { reachesAim } from "../../lib/tuning/v2/bracket-aim";
import { OwnershipDot } from "../ui/ownership-dot";
import { BracketChip } from "./bracket-chip";
import { addMarkOf, CiteChips, Name, Thumb } from "./suggestion-line";

const copy = suggestedChangesV2Copy.results;
const cardCopy = deckTuningCopy.card;

/**
 * One line of a Suggested changes v2 run (the handoff's Results boards): the shipped two-list line (sign, card, ownership
 * dot, name, reason, citation chips) with Add and Reject replaced by one Pick toggle, `Pick` then `✓ Picked`. A line in an
 * applied set reads `✓ Added` or `✓ Cut` in the toggle's place; there is no per-row undo and no Reject.
 *
 * `off` greys an unpicked Pick: its side is at N (unpick one to swap), or the run is read-only. `fresh` is the wait's
 * `new` mark, for a beat after the line lands.
 */
export function SuggestedChangesPickLine({
  item, permits, newestPriceAsOf, picked, off, onToggle, fresh = false, aim, readOnly = false, ownedFromOtherDecks = false,
}: {
  /** The run offered copies held in the player's other decks (Small items 4, item 2): a held addition is marked, never
   *  tagged to buy, since the player asked for cards they own. */
  ownedFromOtherDecks?: boolean;
  /** A run the deck has moved past (a commit since, or a History view of it): no Pick, and an open line reads
   *  `Not picked` (History C). */
  readOnly?: boolean;
  item: LineItem;
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  picked: boolean;
  off: boolean;
  onToggle: () => void;
  fresh?: boolean;
  aim: V2Ask["bracket"];
}) {
  const isAdd = item.side === "add";
  const applied = item.verdict === "accepted";
  const addMark = addMarkOf(item, newestPriceAsOf, { ownedFromOtherDecks });
  const shift = bracketShift(permits, item.bracketAfter);
  const asked = aim !== null && reachesAim(aim, item.side, item.bracketAfter);
  const on = picked && !applied;
  // A row whose side is full (or that cannot apply) dims whole (Wait `.ln2.off`), never a picked or answered one.
  const dim = off && !on && !applied && !readOnly;
  const toggle = applied ? (
    <span
      data-sc-applied=""
      className="ml-auto flex h-[44px] flex-none items-center gap-[8px] px-[4px] text-[13px] font-semibold md:h-[32px]"
      style={{ color: "var(--success)" }}
    >
      <span
        aria-hidden
        className="flex size-[20px] items-center justify-center rounded-[5px] text-[13px] font-bold"
        style={{ border: "1.5px solid var(--success)", background: "color-mix(in oklab, var(--success) 16%, transparent)" }}
      >
        {"✓"}
      </span>
      {isAdd ? copy.added : copy.cut}
    </span>
  ) : readOnly ? (
    <span data-sc-not-picked="" className="ml-auto flex-none font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
      {copy.notPicked}
    </span>
  ) : (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={(off && !on) || undefined}
      aria-label={`${on ? copy.picked : copy.pick} ${item.cardName}`}
      onClick={() => { if (!off || on) onToggle(); }}
      data-sc-pick=""
      className={`ml-auto flex h-[44px] min-w-[88px] flex-none items-center justify-center gap-[6px] rounded-[7px] px-[12px] text-[12.5px] font-semibold md:h-[32px] md:min-w-[78px] transition-colors ${
        on
          ? "bg-[color:var(--accent)] text-[color:var(--bg)] [border:1px_solid_var(--accent)]"
          : off
            ? "cursor-default text-[color:var(--fg-disabled)] [border:1px_solid_var(--border)]"
            : "text-[color:var(--accent-text)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
      }`}
    >
      {on ? null : <span aria-hidden className="size-[13px] rounded-[3px]" style={{ border: "1.5px solid currentColor" }} />}
      {on ? copy.picked : copy.pick}
    </button>
  );

  return (
    <article
      aria-label={item.cardName}
      data-sc-line={item.side}
      data-sc-picked={on || undefined}
      data-sc-off={dim || undefined}
      className="relative flex flex-col gap-[9px] rounded-[9px] p-[12px] md:gap-[7px] md:px-[12px] md:py-[10px]"
      style={{
        background: on
          ? "color-mix(in oklab, var(--accent) 7%, var(--surface))"
          : applied ? "var(--surface-rail)" : "var(--surface)",
        border: `1px solid ${on ? "var(--accent-shadow)" : "var(--border)"}`,
        boxShadow: on ? "inset 3px 0 0 var(--accent)" : undefined,
        opacity: dim ? 0.78 : undefined,
      }}
    >
      {fresh ? (
        <span
          data-sc-new=""
          className="absolute -top-[7px] right-[12px] rounded-[3px] px-[5px] py-[1px] font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em]"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {suggestedChangesV2Copy.wait.newMark}
        </span>
      ) : null}
      <div className="flex items-center gap-[9px]">
        <span
          aria-hidden
          className="w-[12px] flex-none text-center font-mono text-[14px] font-semibold"
          style={{ color: isAdd ? "var(--accent-text)" : "var(--fg-faint)" }}
        >
          {isAdd ? "+" : "−"}
        </span>
        <Thumb item={item} />
        {isAdd ? <OwnershipDot owned={item.owned} size={8} /> : null}
        <span className="flex min-w-0 flex-wrap items-center gap-[8px]">
          {/* Only a cut that is made strikes its name (Wait `.ln2.apd .nm.c`); a pending cut reads plain. */}
          <Name item={item} strike={applied} />
          {addMark ? <span className="hidden md:inline-flex">{addMark}</span> : null}
        </span>
        {toggle}
      </div>
      {addMark ? <div className="flex items-center gap-[8px] md:hidden">{addMark}</div> : null}
      <p className="max-w-[980px] text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        {item.rationale}
      </p>
      {shift && item.bracketAfter ? (
        <div data-testid="bracket-flag" className="flex flex-wrap items-center gap-[8px]">
          <span className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>
            {shift === "raises" ? cardCopy.bracketRaises : shift === "lowers" ? cardCopy.bracketLowers : cardCopy.bracketChanges}
          </span>
          <BracketChip permits={item.bracketAfter as Bracket[]} />
          {asked ? (
            <span data-sc-asked-flag="" className="ml-[6px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              {copy.flagAsked}
            </span>
          ) : null}
        </div>
      ) : null}
      <CiteChips item={item} />
    </article>
  );
}
