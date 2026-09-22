"use client";

import { useState } from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { capModalPartners } from "../../lib/combos/modal-block";
import { useIsDesktop } from "../ui/use-is-desktop";
import { ComboGlyph } from "./combo-glyph";

const STATE_INK: Record<string, string> = {
  inDeck: "var(--success)",
  owned: "var(--fg-muted)",
  notOwned: "var(--fg-locked)",
};

/**
 * The card modal's `Two-card combos` block.
 *
 * SECOND IN THE ORACLE COLUMN'S STACK — directly after `In the bracket rules`, before
 * `In your collection`. Card fact, then PAIR fact, then copy facts: this block is the hinge
 * where the reader crosses from what the card is to what they have, which is exactly what a
 * pair fact is.
 *
 * Chrome is `BracketFactsDetail`'s verbatim, and ABSENT ENTIRELY when nothing is detected —
 * no heading, no empty state, no reserved height. A drawn absence would read as a cleared
 * check, and detection here is bounded by design.
 *
 * THE THREE STATES AND NOTHING ELSE. No price, no copy count, no availability marker: those
 * are facts about YOUR COPIES OF THE CARD YOU OPENED, and the modal already has two blocks
 * for them. A second money figure about a card you are not looking at reads as a basket.
 *
 * NOT YET DRAWN, and both are the handoff's own dependencies rather than omissions:
 *   · the SCOPE LINE and the `in this deck` state, which need the deck the modal was opened
 *     from — `fetchCard` takes an oracle id alone (dependency 5);
 *   · the PRESSABLE PARTNER NAME, which replaces the modal with the partner's (ledger 14).
 * Unscoped, the block draws the two states that have a referent, which is the `/collection`
 * face the design already specifies.
 */
export function ComboPartnersDetail({ card }: { card: BrowseCard }) {
  const [expanded, setExpanded] = useState(false);
  const [boundOpen, setBoundOpen] = useState(false);
  const desktop = useIsDesktop();
  const partners = card.comboPartners ?? [];
  if (partners.length === 0) return null;

  const { shown, hidden } = capModalPartners(partners, { desktop, expanded });
  const boundId = `combo-bound-${card.oracleId}`;

  return (
    <div
      data-testid="combo-partners-block"
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-[6px] mb-[10px]">
        {/* ON THE HEADING, not on the wrapper. The bound describes the LIST, and a reader
            navigating by heading is the one who needs it — a relation hung on a generic
            container is not reliably announced with the `h3` inside it. */}
        {/* `AvailabilityDetail`'s heading verbatim, which is what the addendum names — mono
            10px at 0.1em. The first version copied `BracketFactsDetail`'s instead
            (9.5/10px at 0.14em), which is the block above this one and a different spec. */}
        <h3
          aria-describedby={boundId}
          className="font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-faint)" }}
        >
          {comboAwarenessCopy.modal.heading}
        </h3>
        {/* THE BOUND IS A MARKER, NOT A LINE UNDER EVERY BLOCK. It is a property of the whole
            list — what is missing from it — rather than of any partner in it, so it sits on
            the heading and `aria-describedby` ties the sentence to the block.

            A REAL TARGET at 44px, and the sentence opens IN PLACE below rather than in a
            tooltip. Round 1 could refuse a tap route because the key and the modal carried
            the words; here the modal IS the last surface, so it cannot. */}
        <button
          type="button"
          onClick={() => setBoundOpen((v) => !v)}
          aria-expanded={boundOpen}
          aria-label={comboAwarenessCopy.modal.boundMarkerAria}
          // Colour through a utility rather than inline: an inline value outranks the
          // `hover:` variant and kills the hover state silently.
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -my-[14px] p-0 bg-transparent border-none cursor-pointer font-mono text-[11px] text-accent hover:text-accent-hover"
        >
          *
        </button>
      </div>
      {/* Rendered whether or not it is open, so `aria-describedby` always resolves: a screen
          reader hears the bound with the heading, where a sighted reader presses for it. */}
      <p
        id={boundId}
        className={`font-mono text-[11px] leading-[1.45] mb-[10px] ${boundOpen ? "" : "sr-only"}`}
        style={{ color: "var(--fg-muted)" }}
      >
        {comboAwarenessCopy.modal.qualifier}
      </p>
      <ul className="flex flex-col gap-[8px]">
        {shown.map((p) => (
          /* AT 390px THE STATE WRAPS UNDER THE NAME rather than truncating it — the app's
             words move before the card's name does, which is this feature's rule everywhere.
             `flex-wrap` with a full-width state below `sm` is what delivers it. */
          <li key={p.oracleId} className="flex flex-wrap sm:flex-nowrap items-center gap-[10px]">
            <ComboGlyph />
            {/* TWO WEIGHTS, one sentence. The addendum sets the app's words at `--fg-body`
                and the partner's NAME at 600 in `--fg`: the name is the half a reader is
                looking for, and it is also what will become pressable when ledger 14 lands.
                13px, not the 13.5/15 the block above this one uses. */}
            <span
              className="flex-auto min-w-0 truncate text-[13px]"
              style={{ color: "var(--fg-body)" }}
            >
              {comboAwarenessCopy.modal.lineLead}
              <span className="font-semibold" style={{ color: "var(--fg)" }}>
                {p.name}
              </span>
            </span>
            <span
              className="w-full sm:w-auto flex-none font-mono text-[10px] sm:text-right"
              style={{ color: STATE_INK[p.state] }}
            >
              {comboAwarenessCopy.modal.state[p.state]}
            </span>
          </li>
        ))}
      </ul>
      {/* THE SHIPPED DISCLOSURE, and the block GROWS IN PLACE — it does not scroll inside
          itself and it does not open a second surface. `+N more` is legal where a count in
          the heading is not: it describes what is HIDDEN rather than what exists. */}
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded ? undefined : comboAwarenessCopy.modal.showAllAria(partners.length)
          }
          className="mt-[10px] p-0 font-mono text-[11px] cursor-pointer border-none bg-transparent text-accent hover:text-accent-hover"
        >
          {/* EXPANDED, IT SAYS WHAT PRESSING IT DOES. The first version kept `Show all N` on
              an already-expanded control, so its label and its `aria-expanded` state
              contradicted each other. `Show fewer` is the shipped disclosure's own collapse
              word, which is the atom this reuses. */}
          {expanded
            ? comboAwarenessCopy.modal.collapse
            : desktop
              ? comboAwarenessCopy.modal.more(hidden)
              : comboAwarenessCopy.modal.showAll(partners.length)}
        </button>
      )}
    </div>
  );
}
