"use client";
// The search result row's interior, shared by the quick-add bar and the
// row-scoped resolution search. The design table calls the resolution row the
// bar's row "verbatim"; the only differences it draws are the column widths and
// what sits in the right-hand slot, so those are the only two props.

import { hasFrontFaceCost } from "../../lib/cards/faces";
import { CostPips } from "../ui/cost-pips";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { AvailabilityMarker } from "../ui/availability-marker";
import { availabilityState } from "../../lib/decks/availability";
import { ComboClause } from "../cards/combo-clause";
import { ComboGlyph } from "../cards/combo-glyph";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import type { CardFact } from "../../lib/copy/card-mark";

// The matched run in accent, so a list of eight near-identical names says which
// part of each one the query actually caught. Case-insensitive and literal:
// the query is a user string, so it is located with indexOf rather than
// compiled into a RegExp, where a stray `(` would throw on every keystroke.
export function HighlightedName({
  name,
  query,
  dim,
}: {
  name: string;
  query: string;
  dim: boolean;
}) {
  const at = query ? name.toLowerCase().indexOf(query.trim().toLowerCase()) : -1;
  if (at < 0 || dim) return <>{name}</>;
  const end = at + query.trim().length;
  return (
    <>
      {name.slice(0, at)}
      <span style={{ color: "var(--accent)" }}>{name.slice(at, end)}</span>
      {name.slice(end)}
    </>
  );
}

interface CardSearchRowBodyProps {
  result: SearchResult;
  query: string;
  /** The ownership phrase, composed by the caller from its own copy block. */
  ownership: string;
  /** Already in the deck: greyed rather than hidden. */
  dim: boolean;
  nameClassName: string;
  trailing: React.ReactNode;
  /**
   * This deck already claims the row's card, so the figures behind the marker
   * were read from a vantage that excluded that claim. Both kinds of claim
   * count: a `deck_cards` row, and the commander, which is none but is still
   * dropped by the read (availability-query.ts:25).
   * Unclaimed rows must NOT set it: `free === 0` there is a genuine hard claim
   * by some other committed deck, and self-exclusion would silence it (5.6).
   */
  selfExcluded?: boolean;
  /** The colour behind the marker, for the over glyph's seam. */
  seam?: string;
  /**
   * The card already in the deck that this result would complete a two-card combo with, or
   * null. Only the quick-add bar passes it; the resolution search answers "what was this
   * line?", where a combo is not the question.
   *
   * THE PLACEMENT IS HUGH'S RULING OF 2026-09-22, NOT MATRIX 4's. Matrix 4 has the clause
   * REPLACE the meta line, which on a phone is the only place the type line and the owned
   * count are drawn — and dropping the type line at phone width is the shortcut this row was
   * fixed for once already (see the comment above the name cell). So:
   *   - phone (option E): the partner JOINS the meta line as glyph + name, no verb. The glyph
   *     is the verb; the spoken name carries the words.
   *   - desktop (option G): the full clause goes on a second line in the name cell, which the
   *     52px row already has room for, and the type column is left alone.
   */
  comboPartner?: { name: string } | null;
  /** The ownership phrase's short form, drawn on the phone meta line only beside a partner. */
  ownershipShort?: string;
  /**
   * The card's standing facts, drawn inline after the name — `STATES-push-line.md` §C2's rule
   * for a card row, the one the top-off row follows. Only the quick-add bar passes them: the
   * resolution search answers "what was this line?", where the bracket rules are not the
   * question, which is the same reason it passes no combo partner. `silent`, because the
   * option's own `aria-label` speaks them.
   */
  marks?: readonly CardFact[];
}

export function CardSearchRowBody({
  result,
  query,
  ownership,
  dim,
  nameClassName,
  trailing,
  selfExcluded = false,
  seam,
  comboPartner = null,
  ownershipShort,
  marks = [],
}: CardSearchRowBodyProps) {
  // The state, not the element: the rollup returns figures for every owned card,
  // free ones included, and the marker declines to draw those. Gating the joiner
  // on a truthy element that renders null leaves a separator with nothing after
  // it on the commonest row there is.
  //
  // Both widths draw the same marker; only the slot it rides in differs, so it
  // is built once here rather than twice below.
  const a = result.availability;
  const marker =
    a && availabilityState(a, { selfExcluded }) !== "free" ? (
      <AvailabilityMarker bareOne availability={a} seam={seam} selfExcluded={selfExcluded} />
    ) : null;
  // Design 3.2: the separator between the shipped meta and the marker is the
  // border colour, not the text colour — it must not read as another word.
  const joiner = (
    <span aria-hidden className="flex-none whitespace-pre text-[color:var(--border-strong)]">
      {" · "}
    </span>
  );
  // Leads the meta line at both widths: it is the reason this row is on screen, so it
  // must survive the truncation the type line and ownership can afford to lose (#467).
  // Only set when the title does not itself hold the query — see SearchResult.flavorName.
  const flavor = result.flavorName ? (
    <>
      {addPanelCopy.quickAdd.rowFlavorNamePrefix}
      <HighlightedName name={result.flavorName} query={query} dim={dim} />
      {" · "}
    </>
  ) : null;

  return (
    <div className="flex items-center gap-[10px] md:gap-[12px]">
      {/* A crop settles which "Study" this is faster than the type line does —
          a deliberate divergence from Archidekt, which ships no thumbnail. */}
      <span
        aria-hidden
        className="flex-none rounded-[5px] overflow-hidden w-[32px] h-[45px] md:w-[30px] md:h-[42px]"
        style={{
          background: "var(--surface-raised)",
          opacity: dim ? 0.5 : 1,
          filter: dim ? "grayscale(0.6)" : undefined,
        }}
      >
        {result.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUri} alt="" className="w-full h-full object-cover" />
        )}
      </span>

      {/* The two widths are different compositions, not one scaled. Desktop
          lays name, type, pips and ownership out as columns; the phone row
          has no room for four, so type and ownership fold into a single mono
          meta line under the name. Both are drawn — hiding the type line at
          phone width was the shortcut, and it dropped the one field that
          separates two cards with the same name. */}
      <span className={nameClassName}>
        {/* THE NAME AND ITS MARKS ARE ONE LINE, and the name does not grow. "Inline after the
            name" is about the TEXT: the top-off row put a mark after a name that grew to fill
            its cell and it landed 535px past the end of the word. Here the name keeps its own
            width and truncates only when the marks need the room. */}
        <span className="flex items-center gap-[7px] min-w-0">
          <span
            // Named for `probe:card-note`, which measures the marks' gap against this TEXT's
            // own end rather than against a class string or a constant.
            data-testid="search-row-name"
            className="min-w-0 text-[14px] font-semibold truncate"
            style={{ color: dim ? "var(--fg-muted)" : "var(--fg)" }}
          >
            <HighlightedName name={result.name} query={query} dim={dim} />
          </span>
          {marks.length > 0 && (
            <span
              aria-hidden
              data-testid="search-row-marks"
              className="flex-none flex items-center gap-[4px]"
            >
              {marks.map((fact) => (
                <FactTooltip key={fact} fact={fact}>
                  <CardFactMark fact={fact} silent />
                </FactTooltip>
              ))}
            </span>
          )}
        </span>
        {/* The marker joins the existing meta line rather than taking a line of
            its own — design 3.1: no column, no extra row height. */}
        <span
          className="md:hidden flex items-center min-w-0 font-mono text-[10px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {/* The shipped meta is the half that yields. `truncate` already
              resolves this item's automatic minimum size to zero via its
              overflow; spelling `min-w-0` out keeps the choice here rather than
              leaving it to which item the browser picks. */}
          {/* Beside a partner the type line takes only the room LEFT OVER — no base size,
              growing up to its own full width — because the type and count are what the modal
              restores and the partner's name is what nothing on this row can reconstruct. See
              the partner below for why a shrink weight is not enough. */}
          <span className={`truncate min-w-0 ${comboPartner ? "basis-0 grow max-w-max" : ""}`}>
            {flavor}
            {result.typeLine} · {comboPartner ? (ownershipShort ?? ownership) : ownership}
          </span>
          {marker && joiner}
          {marker}
          {/* WHY THE TYPE LINE HAS NO BASE SIZE, rather than a shrink weight. A weight (999
              against 1) only makes it give way first approximately: flex divides the deficit in
              proportion, so the partner still takes a fraction of a pixel, and a fraction is
              enough for `text-overflow` to fire and delete two whole letters — measured on the
              real row at 390, the partner at 90 of 90px and drawn `Exquisite Blo…`. With the
              type at basis 0 the partner and the marker get their full width FIRST and nothing
              shrinks at all while they fit; only when they alone overflow does this group
              shrink, with the type already at zero. A cap on the partner instead was tried and
              is wrong: it cannot see the availability marker, which keeps a floor of its own,
              so the two overflowed the cell together. The joiner travels inside the group. */}
          {comboPartner && (
            <span
              data-testid="combo-partner-inline"
              className="inline-flex items-center gap-[4px] min-w-0"
            >
              {joiner}
              {/* The same hover as the clause's glyph, for a narrow window with a mouse. */}
              <FactTooltip sentence={comboAwarenessCopy.markerTooltip.completes(comboPartner.name)}>
                <ComboGlyph />
              </FactTooltip>
              <span className="truncate min-w-0" style={{ color: "var(--fg-body)" }}>
                {comboPartner.name}
              </span>
            </span>
          )}
        </span>
        {/* Desktop only: its own line under the name, so the type column keeps the type. */}
        {comboPartner && (
          <span className="hidden md:flex min-w-0">
            <ComboClause partnerName={comboPartner.name} state="completes" />
          </span>
        )}
      </span>

      <span
        className="hidden md:block flex-1 min-w-0 font-mono text-[11px] truncate"
        style={{ color: dim ? "var(--fg-locked)" : "var(--fg-faint)" }}
      >
        {flavor}
        {result.typeLine}
      </span>

      {/* A fixed slot whether or not the card has a cost, so the ownership
          column stays on one vertical line down the list. */}
      <span aria-hidden className="hidden md:flex flex-none w-[34px] justify-start">
        {hasFrontFaceCost(result.manaCost) && (
          <CostPips cost={result.manaCost} className="flex gap-[3px]" />
        )}
      </span>

      {/* Ownership as a word and a figure. Never colour alone.
          `min-w-` rather than `w-`: the marker shares this cell (design 3.1
          forbids a new column) and `none free — in Atraxa` does not fit 80px. The
          flex-1 type-line cell above absorbs the difference, so the ownership
          figures still line up down a list where nothing is marked. */}
      <span
        className="hidden md:flex flex-none min-w-[80px] items-center justify-end gap-0 font-mono text-[11px] text-right"
        style={{ color: result.owned ? "var(--fg-faint)" : "var(--warning)" }}
      >
        {ownership}
        {marker && joiner}
        {marker}
      </span>

      {trailing}
    </div>
  );
}
