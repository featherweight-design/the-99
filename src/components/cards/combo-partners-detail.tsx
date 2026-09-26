"use client";

import { useState } from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { orderModalPartners, summariseByState } from "../../lib/combos/modal-block";
import { ComboGlyph } from "./combo-glyph";

const STATE_INK: Record<string, string> = {
  inDeck: "var(--success)",
  owned: "var(--fg-muted)",
  notOwned: "var(--fg-locked)",
};

/**
 * The card modal's `Two-card combos` block.
 *
 * SECOND IN THE ORACLE COLUMN'S STACK — directly after `Bracket facts`, before
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
 * THE SCOPE LINE AND `in this deck` need the deck the modal was opened from, which the
 * card-detail fetch now carries (dependency 5); without one the block draws the two states
 * that have a referent and omits the scope line, which is the `/collection` face the design
 * specifies. The partner's name opens that partner in place (ledger 14).
 */
export function ComboPartnersDetail({
  card,
  /** The deck the modal was opened from, if any — what makes the scope line sayable. */
  deckName = null,
  /** Opens a partner's own modal, replacing this one. */
  onSelectPartner,
  /** Starts open. The About figure's caller: its key names the source marker, drawn only open. */
  initiallyExpanded = false,
}: {
  card: BrowseCard;
  deckName?: string | null;
  onSelectPartner?: (oracleId: string) => void;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [boundOpen, setBoundOpen] = useState(false);
  const partners = card.comboPartners ?? [];
  if (partners.length === 0) return null;

  const summary = summariseByState(partners);
  const boundId = `combo-bound-${card.oracleId}`;
  const listId = `combo-list-${card.oracleId}`;
  // The accessible name is the label plus the counts AS WORDS, so a reader who cannot see the
  // row still learns what opening it would show.
  const spokenSummary = summary
    .map((row) => comboAwarenessCopy.modal.summary[row.state](row.count))
    .join(comboAwarenessCopy.modal.summary.join);

  return (
    <div
      data-testid="combo-partners-block"
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center">
        {/* THE HEADING WRAPS THE BUTTON, which is the accordion pattern and the only valid
            nesting of the two: `<button>` takes phrasing content, so an `<h3>` inside it is
            invalid, while a heading around it keeps this block in the modal's heading outline
            beside `Bracket facts`. */}
        <h3 className="flex-auto min-w-0 m-0">
          {/* THE WHOLE ROW IS THE TARGET, not the chevron — 52px, one row, at both widths. A
              reader reaching for a disclosure reaches for the thing that says what it hides. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-describedby={expanded ? boundId : undefined}
            aria-label={comboAwarenessCopy.modal.toggleAria(spokenSummary)}
            className="flex w-full items-center gap-[10px] min-h-[52px] p-0 bg-transparent border-none cursor-pointer text-left font-normal"
          >
            <ComboGlyph />
            {/* At 390px the label and the counts STACK inside the same 52px row rather than
                competing for it; above that they sit on one line. */}
            <span className="flex flex-auto min-w-0 flex-col sm:flex-row sm:items-center sm:gap-[10px]">
              <span
                className="font-mono text-[10px] uppercase tracking-[0.1em]"
                style={{ color: "var(--fg-faint)" }}
              >
                {comboAwarenessCopy.modal.heading}
              </span>
              {/* THE SCOPE LINE TAKES OVER FROM THE COUNTS when the block opens, on the
                  header itself — so the block gains no chrome by opening, and the one thing
                  that varies by route is visible instead of looking like an inconsistency.
                  Absent without a deck, which is the `/collection` face. */}
              {expanded && deckName ? (
                <span
                  className="font-mono text-[10px] sm:text-[10.5px] truncate"
                  style={{ color: "var(--fg-locked)" }}
                >
                  {comboAwarenessCopy.modal.scope(deckName)}
                </span>
              ) : expanded ? null : (
              <span
                className="font-mono text-[10px] sm:text-[10.5px] truncate"
                style={{ color: "var(--fg-muted)" }}
              >
                {summary.map((row, i2) => (
                  <span
                    key={row.state}
                    style={row.state === "inDeck" ? { color: "var(--success)" } : undefined}
                  >
                    {i2 > 0 ? comboAwarenessCopy.modal.summary.join : ""}
                    {comboAwarenessCopy.modal.summary[row.state](row.count)}
                  </span>
                ))}
              </span>
              )}
            </span>
            <span
              aria-hidden
              className="flex-none font-mono text-[12px]"
              style={{ color: "var(--fg-faint)" }}
            >
              ▾
            </span>
          </button>
        </h3>
        {/* THE `*` IS A SIBLING OF THE ROW, never nested inside it: a control inside a native
            `<button>` is invalid nesting and announces two controls as one. NOT DRAWN WHILE
            CLOSED — a closed block is not making a claim yet. */}
        {expanded && (
          <button
            type="button"
            onClick={() => setBoundOpen((v) => !v)}
            aria-expanded={boundOpen}
            aria-label={comboAwarenessCopy.modal.boundMarkerAria}
            className="flex flex-none items-center justify-center min-w-[44px] min-h-[52px] p-0 bg-transparent border-none cursor-pointer font-mono text-[11px] text-accent hover:text-accent-hover"
          >
            *
          </button>
        )}
      </div>
      {/* THE BOUND, rendered with the open state so `aria-describedby` never dangles. It is
          the ONE place this feature states its own limits. */}
      {expanded && (
        <p
          id={boundId}
          className={`font-mono text-[11px] leading-[1.45] mt-[8px] ${
            boundOpen ? "" : "sr-only"
          }`}
          style={{ color: "var(--fg-muted)" }}
        >
          {comboAwarenessCopy.modal.qualifier}
        </p>
      )}
      {/* IT GROWS IN PLACE, downward. Not an accordion — no sibling closes — and the scroll
          position does not move. */}
      {expanded && (
      <ul id={listId} className="flex flex-col gap-[8px] mt-[10px]">
        {orderModalPartners(partners).map((p) => (
          /* AT 390px THE STATE STACKS UNDER THE NAME, not under the glyph. `flex-wrap` with a
             full-width state put it at the `<li>`'s left edge, beneath the lemniscate, where
             it read as a second line of the row rather than as this partner's state — so the
             name and the state share a nested column and the glyph stays beside it. */
          <li key={p.oracleId} className="flex items-center gap-[10px]">
            <ComboGlyph />
            {/* TWO WEIGHTS, one sentence. The addendum sets the app's words at `--fg-body`
                and the partner's NAME at 600 in `--fg`: the name is the half a reader is
                looking for, and it is also the half that is pressable.
                13px, not the 13.5/15 the block above this one uses. */}
            <span className="flex flex-auto min-w-0 flex-col sm:flex-row sm:items-center sm:gap-[10px]">
              {/* THE TRUNCATION IS ON EACH HALF, not on this wrapper. `truncate` sets
                  `overflow: hidden`, so a wrapper carrying it CLIPS the partner button's
                  44px touch area — the padding that buys the height sits outside the line
                  box. Each half clips itself instead, and the row can hold a taller child. */}
              <span
                className="flex min-w-0 items-center text-[13px] sm:flex-auto"
                style={{ color: "var(--fg-body)" }}
              >
                {/* `whitespace-pre`, or the space is lost: `with ` is a flex item of its own,
                    and a trailing space at the end of a box's line is collapsed — the line
                    read `withApproach of the Second Sun` on staging. */}
                <span className="flex-none whitespace-pre">
                  {comboAwarenessCopy.modal.lineLead}
                </span>
                {/* THE ONLY TARGET IN THE BLOCK. A pair fact read from one end wants the
                    other end, and the name is the half a reader is looking for — it REPLACES
                    this modal rather than stacking on it, which the addendum refuses by name.

                    WHAT IT DOES NOT DO YET is return: `load` replaces the provider's card and
                    keeps no history, so closing from a partner closes the modal rather than
                    going back to the card you followed it from. The addendum asks for that
                    return, and giving it one means deciding what CLOSE means on a partner —
                    back, or shut — which is a design call rather than an omission. Flagged
                    rather than invented. */}
                {onSelectPartner ? (
                  <button
                    type="button"
                    onClick={() => onSelectPartner(p.oracleId)}
                    // A REAL 44px TARGET ON TOUCH, which the addendum asks for by name. An
                    // `inline` button keeps only the text's intrinsic height — about 13px —
                    // so the link was operable with a pointer and effectively not with a
                    // thumb. `inline-block` with vertical padding and a negative margin buys
                    // the height without moving the line it sits on.
                    className="flex min-w-0 min-h-[44px] sm:min-h-0 items-center truncate p-0 bg-transparent border-none cursor-pointer font-semibold text-left underline decoration-[color:var(--accent-shadow)] underline-offset-[3px] text-[color:var(--fg)]"
                  >
                    {p.name}
                  </button>
                ) : (
                  <span className="min-w-0 truncate font-semibold" style={{ color: "var(--fg)" }}>
                    {p.name}
                  </span>
                )}
              </span>
              <span
                className="flex-none font-mono text-[10px] sm:text-right"
                style={{ color: STATE_INK[p.state] }}
              >
                {comboAwarenessCopy.modal.state[p.state]}
              </span>
            </span>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
