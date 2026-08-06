"use client";
// The search result row's interior, shared by the quick-add bar and the
// row-scoped resolution search. The design table calls the resolution row the
// bar's row "verbatim"; the only differences it draws are the column widths and
// what sits in the right-hand slot, so those are the only two props.

import { CostPips } from "./suggestion-tile";
import type { SearchResult } from "../../app/decks/[id]/search-action";

// The matched run in brass, so a list of eight near-identical names says which
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
      <span style={{ color: "#C9A24B" }}>{name.slice(at, end)}</span>
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
}

export function CardSearchRowBody({
  result,
  query,
  ownership,
  dim,
  nameClassName,
  trailing,
}: CardSearchRowBodyProps) {
  return (
    <div className="flex items-center gap-[10px] md:gap-[12px]">
      {/* A crop settles which "Study" this is faster than the type line does —
          a deliberate divergence from Archidekt, which ships no thumbnail. */}
      <span
        aria-hidden
        className="flex-none rounded-[5px] overflow-hidden w-[32px] h-[45px] md:w-[30px] md:h-[42px]"
        style={{
          background: "#241F19",
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
          style={{ color: dim ? "#A89B84" : "#EDE6D8" }}
        >
          <HighlightedName name={result.name} query={query} dim={dim} />
        </span>
        <span className="md:hidden font-mono text-[10px] truncate" style={{ color: "#8E8269" }}>
          {result.typeLine} · {ownership}
        </span>
      </span>

      <span
        className="hidden md:block flex-1 min-w-0 font-mono text-[11px] truncate"
        style={{ color: dim ? "#6A6152" : "#8E8269" }}
      >
        {result.typeLine}
      </span>

      {/* A fixed slot whether or not the card has a cost, so the ownership
          column stays on one vertical line down the list. */}
      <span aria-hidden className="hidden md:flex flex-none w-[34px] justify-start">
        {result.manaCost && <CostPips cost={result.manaCost} className="flex gap-[3px]" />}
      </span>

      {/* Ownership as a word and a figure. Never colour alone. */}
      <span
        className="hidden md:block flex-none w-[80px] font-mono text-[11px] text-right"
        style={{ color: result.owned ? "#8E8269" : "#E0913C" }}
      >
        {ownership}
      </span>

      {trailing}
    </div>
  );
}
