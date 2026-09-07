"use client";
// The search result row's interior, shared by the quick-add bar and the
// row-scoped resolution search. The design table calls the resolution row the
// bar's row "verbatim"; the only differences it draws are the column widths and
// what sits in the right-hand slot, so those are the only two props.

import { CostPips } from "../ui/cost-pips";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { AvailabilityMarker } from "../ui/availability-marker";
import { availabilityState } from "../../lib/decks/availability";

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
   * by some other finished deck, and self-exclusion would silence it (5.6).
   */
  selfExcluded?: boolean;
  /** The colour behind the marker, for the over glyph's seam. */
  seam?: string;
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
      <AvailabilityMarker availability={a} seam={seam} selfExcluded={selfExcluded} />
    ) : null;
  // Design 3.2: the separator between the shipped meta and the marker is the
  // border colour, not the text colour — it must not read as another word.
  const joiner = (
    <span aria-hidden className="flex-none whitespace-pre text-[color:var(--border-strong)]">
      {" · "}
    </span>
  );

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
        <span
          className="text-[14px] font-semibold truncate"
          style={{ color: dim ? "var(--fg-muted)" : "var(--fg)" }}
        >
          <HighlightedName name={result.name} query={query} dim={dim} />
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
          <span className="truncate min-w-0">
            {result.typeLine} · {ownership}
          </span>
          {marker && joiner}
          {marker}
        </span>
      </span>

      <span
        className="hidden md:block flex-1 min-w-0 font-mono text-[11px] truncate"
        style={{ color: dim ? "var(--fg-locked)" : "var(--fg-faint)" }}
      >
        {result.typeLine}
      </span>

      {/* A fixed slot whether or not the card has a cost, so the ownership
          column stays on one vertical line down the list. */}
      <span aria-hidden className="hidden md:flex flex-none w-[34px] justify-start">
        {result.manaCost && <CostPips cost={result.manaCost} className="flex gap-[3px]" />}
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
