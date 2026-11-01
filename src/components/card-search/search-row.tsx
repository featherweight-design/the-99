"use client";
// One card search result (handoff R2, `R1 - Rows.dc.html`, the phone row; property table
// `docs/superpowers/design-tables/card-search-phone.md` §Result row). The whole row is one option in the field's
// listbox and one press. Ownership is always drawn, so a row is never blank.
//
// Add a card from anywhere (C3, C-D1; READINESS O4) gives it a + at its end, after the bookmark: a 44px pointer target
// (34px from md) that opens Add cards with this card and stops the press there, so the rest of the row still opens card
// details. An option's contents are presentational, so the + stays out of the tree and out of the tab order; the row's
// own name says the add and its keys (⌘↵ / Ctrl ↵), which the field and the row take.

import type { KeyboardEvent, ReactNode } from "react";
import type { CardSearchRow } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { FadingImg } from "../ui/hydrated-art";
import { useAddShortcutLabel } from "./search-desktop";

/**
 * Every run of `query` in `text`, in the accent (table: "every match position as drawn"). Case-insensitive and
 * literal: the query is a reader's string, so it is found with indexOf rather than compiled into a RegExp.
 */
export function Matched({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(q); at >= 0; at = lower.indexOf(q, at + q.length)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <em key={at} className="not-italic text-[color:var(--accent-text)]">
        {text.slice(at, at + q.length)}
      </em>,
    );
    from = at + q.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

/** The bookmark's 16px glyph (option A, approved). */
function Bookmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    </svg>
  );
}

export function SearchRow({
  row,
  query,
  id,
  first,
  active,
  returned,
  added = false,
  onPick,
  onAdd,
  onKey,
  rowRef,
}: {
  row: CardSearchRow;
  /** The query the row answered; empty for a recent card, which draws no match. */
  query: string;
  id: string;
  first: boolean;
  /** The keyboard's place in the list (`aria-activedescendant`). */
  active: boolean;
  /** The row whose card was just closed: the focus ring the reader returns to (H3). */
  returned: boolean;
  /** The ringed row's card just had copies saved from its +: its count reads in --success (C6, C-D3). */
  added?: boolean;
  onPick: (el: HTMLElement) => void;
  /** The + (and the keys the name says). No + where the shell has no Add cards host or off the shell's scope. */
  onAdd?: () => void;
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const [deck, ...moreDecks] = row.decks;
  const addKeys = useAddShortcutLabel();
  const name = cardSearchCopy.row.aria(row.name, row.owned, row.decks, row.wishlist);
  return (
    <div
      ref={rowRef}
      id={id}
      role="option"
      aria-selected={active}
      aria-label={onAdd ? `${name}, ${cardSearchCopy.row.addAria(addKeys.spoken)}` : name}
      aria-keyshortcuts={onAdd ? addKeys.keys : undefined}
      tabIndex={-1}
      onClick={(e) => onPick(e.currentTarget)}
      onKeyDown={onKey}
      data-card-search-row={row.oracleId}
      className={`flex min-h-[72px] cursor-pointer md:min-h-[58px] items-center gap-3 rounded-[8px] py-2 pr-[10px] pl-4 outline-none md:py-[7px] md:pr-[14px] md:pl-[14px] ${
        first ? "" : "border-t border-solid border-[color:var(--border)]"
      } ${active ? "bg-[color:var(--elevated)]" : ""} ${returned ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}
    >
      <span className="h-14 w-10 flex-none overflow-hidden md:h-[42px] md:w-[30px] rounded-[4px] md:rounded-[3px] bg-[color:var(--surface-sunken)] shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.35)]">
        {row.imageUri ? <FadingImg src={row.imageUri} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 md:line-clamp-1 text-[15px] leading-[1.3] font-semibold text-[color:var(--fg)] md:text-[14px]">
          <Matched text={row.name} query={query} />
        </span>
        {row.flavorName ? (
          <span className="truncate font-mono text-[11.5px] text-[color:var(--fg-muted)] md:text-[11px]">
            {addPanelCopy.quickAdd.rowFlavorNamePrefix}
            <Matched text={row.flavorName} query={query} />
          </span>
        ) : null}
        <span className="flex min-w-0 font-mono text-[11.5px] whitespace-nowrap md:text-[11px] text-[color:var(--fg-faint)]">
          {row.owned > 0 ? (
            <span className="flex-none">
              <b className={`font-medium ${added ? "text-[color:var(--success)]" : "text-[color:var(--fg-body)]"}`}>×{row.owned}</b>
              {addPanelCopy.quickAdd.rowOwned(row.owned).replace(`×${row.owned}`, "")}
            </span>
          ) : (
            <span className="flex-none">{addPanelCopy.quickAdd.rowNotOwned}</span>
          )}
          {deck ? (
            <>
              <span className="flex-none whitespace-pre text-[color:var(--border-dashed)]">{" · "}</span>
              <span className="min-w-0 truncate text-[color:var(--fg-body)]">{cardSearchCopy.row.inDeck(deck)}</span>
              {moreDecks.length > 0 ? (
                <span className="flex-none text-[color:var(--fg-body)]">{`\u00a0${cardSearchCopy.row.moreDecks(moreDecks.length)}`}</span>
              ) : null}
            </>
          ) : null}
        </span>
      </span>
      {/* The bookmark's `row.wishlistAria` is already the last clause of the row's own name (an option's
          contents are presentational), so the box stays hidden from the tree: a label here would say it twice. */}
      <span
        aria-hidden
        data-card-search-wishlist
        className={`flex h-7 w-7 flex-none items-center justify-center text-[color:var(--accent-text)] ${row.wishlist ? "" : "invisible"}`}
      >
        <Bookmark />
      </span>
      {onAdd ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          data-card-search-add=""
          onClick={(e) => {
            // The row's own press opens card details; this one adds.
            e.stopPropagation();
            onAdd();
          }}
          className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg)] md:h-[34px] md:w-[34px] md:rounded-[8px]"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px] md:h-4 md:w-4"
          >
            <path d="M10 3.6v12.8M3.6 10h12.8" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
