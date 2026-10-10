"use client";
// Unresolved group — the `Couldn't identify` group, pinned last in the decklist.
// §`Couldn't identify` group header, §Unresolved row, §Live note (design table).
//
// A sibling of DecklistGroup rather than a variant of it: the row component,
// the count colour, the desktop right note, the sort key and the Shopping-filter
// behaviour all differ, which is most of the component. Only the header is
// genuinely shared, and it is shared as a component.
//
// It owns which row is expanded — one at a time — and the single polite live
// region that resolve and delete share.

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { deckImportCopy } from "../../lib/copy/deck-import";
import {
  deckCounts,
  isBasicLand,
  unresolvedCardCount,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "../../lib/decks/grouping";
import { labelRolesOf } from "../../lib/decks/label-role-counts";
import { type RecommendedMix, type MixRole } from "../../lib/decks/mix";
import { useLabelRows, useRoleCounter } from "./label-rows-context";
import { useIsDesktop } from "../ui/use-is-desktop";
import { DecklistGroupHeader } from "./decklist-group-header";
import { UnresolvedRow } from "./unresolved-row";

const copy = deckImportCopy.unresolved;
const resolveCopy = deckImportCopy.resolve;

interface UnresolvedGroupProps {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import: the targets are per-commander now, and a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  deckId: string;
  rows: DeckUnresolvedRow[];
  /** The deck's cards, for the figures the live note quotes. */
  cards?: DeckDetailCard[];
  /**
   * The COMMITTED claim set, for the resolution row's self-exclusion —
   * deliberately not derived from `cards`, which is the optimistic list. The
   * question `selfExcluded` answers is whether the server's availability read
   * dropped a claim of ours, and a card added seconds ago is not yet in it.
   */
  deckOracleIds: string[];
  /** Resolving a line to the commander answers it without adding to the 99. */
  commanderOracleId?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

export function UnresolvedGroup({
  mix,
  deckId,
  rows,
  cards = [],
  deckOracleIds,
  commanderOracleId,
  onExpandedChange,
}: UnresolvedGroupProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [note, setNote] = useState<{
    kind: "resolve" | "delete";
    text: string;
  } | null>(null);
  const isDesktop = useIsDesktop();
  const countRoles = useRoleCounter();
  const labelRows = useLabelRows();
  const noteRef = useRef<HTMLParagraphElement>(null);

  // Resolving or deleting unmounts the row that held focus, and the last one
  // unmounts every row there is, so focus would land on <body> and a keyboard
  // user would restart from the top of the document. The note is the one thing
  // that outlives the action, so it takes focus and becomes the place to
  // continue from.
  useEffect(() => {
    if (note) noteRef.current?.focus();
  }, [note]);

  // The group can go without any row collapsing — the Shopping filter empties
  // it outright — and the phone hides its quick-add bar for as long as this
  // reads true. Without the unmount edge it stayed true forever and the bar
  // never came back.
  // Held in a ref so the cleanup runs on unmount only. Keyed on the prop
  // itself, an inline callback would re-run it every render and slam the
  // expansion shut as fast as a row could open it.
  const expandedChangeRef = useRef(onExpandedChange);
  useEffect(() => {
    expandedChangeRef.current = onExpandedChange;
  });
  useEffect(() => {
    return () => expandedChangeRef.current?.(false);
  }, []);

  // Not `rows.length === 0` alone: the final resolution empties the list, and
  // unmounting here would take the live region down with it — the one action
  // most worth announcing would be the only silent one.
  if (rows.length === 0 && note === null) return null;

  // Import order, not alphabetical: the player is looking for the line they can
  // see in the list they pasted.
  const ordered = rows.slice().sort((a, b) => a.sourceLine - b.sourceLine);
  const expanded =
    expandedRowId !== null && ordered.some((r) => r.id === expandedRowId);

  function setExpanded(id: string | null) {
    setExpandedRowId(id);
    onExpandedChange?.(id !== null);
  }

  // Both sentences are composed from the list as it stands before the mutation
  // plus the edit itself: the optimistic state is not readable synchronously
  // here, and reading it a render later would narrate the previous action.
  function announceResolved(row: DeckUnresolvedRow, result: SearchResult) {
    // What the deck actually gains, which is nothing at all twice over: the
    // commander is already in the deck and the server refuses to put it in the
    // 99 as well, and a non-basic already in the list is a singleton the server
    // leaves alone. Basics are the one thing that stacks.
    const added =
      result.oracleId === commanderOracleId
        ? 0
        : isBasicLand(result.typeLine)
          ? row.quantity
          : cards.some((c) => c.oracleId === result.oracleId)
            ? 0
            : 1;
    const built = deckCounts(cards).built + added;
    const remaining = rows.length - 1;
    const resultRows = labelRows?.[result.oracleId];
    const roleOfResult = !countRoles.byLabel || result.role === "land" || !resultRows
      ? result.role // a land, or a card the page's label read does not cover (a search result)
      : labelRolesOf(resultRows)[0];
    const cell = mix.cells[roleOfResult as MixRole] as
      RecommendedMix["cells"][MixRole] | undefined;
    const role = cell
      ? resolveCopy.roleClause(
          cell.label,
          countRoles(cards)[roleOfResult as MixRole] + added,
          cell.target,
        )
      : undefined;

    const text = isDesktop
      ? result.owned
        ? resolveCopy.resolved(result.name, String(built), remaining, role)
        : resolveCopy.resolvedUnowned(
            result.name,
            String(built),
            remaining,
            role,
          )
      : result.owned
        ? resolveCopy.resolvedMobile(result.name, String(built))
        : resolveCopy.resolvedUnownedMobile(result.name);
    setNote({ kind: "resolve", text });
  }

  function announceDeleted(row: DeckUnresolvedRow) {
    const priorTotal = deckCounts(cards, unresolvedCardCount(rows)).total;
    const total = priorTotal - row.quantity;
    setNote({
      kind: "delete",
      text: isDesktop
        ? resolveCopy.deleted(row.rawName, String(total), String(priorTotal))
        : resolveCopy.deletedMobile(row.rawName, String(total)),
    });
  }

  return (
    // The id is the unresolved banner's scroll target.
    <section
      id="unresolved-group"
      className="mb-[16px] md:mb-[20px]"
      // The header goes with the last row, so the id it carries goes too, and
      // a name pointing at nothing is worse than no name at all.
      aria-labelledby={ordered.length > 0 ? "unresolved-h" : undefined}
    >
      {/* Everything but the note goes when the last line does — the group has
          nothing left to head, and a "· 0" count over no rows is a heading for
          an absence. */}
      {ordered.length > 0 && (
        <>
          <DecklistGroupHeader
            label={copy.groupLabel}
            // Lines, not copies. The banner above counts lines, and this group's own
            // footnote below says "All N lines" — a copy count here made one screen
            // show two different numbers for the same thing. The card nuance is what
            // `groupNote` and the footnote are for.
            count={ordered.length}
            countColor="var(--warning)"
            note={copy.groupNote}
            headingId="unresolved-h"
          />

          {/* The expander is full width, so the desktop group drops to one column
          while a row is open rather than boxing it into half the width. */}
          <div
            className={`flex flex-col gap-[3px] md:gap-y-[4px] md:gap-x-[20px] ${expanded ? "" : "md:grid"}`}
            // `minmax(0, 1fr)`, as the deck's own groups: an unresolved line is raw pasted text, and a
            // bare `1fr` track grows to its whole unbroken width and pushes the page sideways.
            style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
          >
            {ordered.map((row) => (
              <UnresolvedRow
                key={row.id}
                deckId={deckId}
                row={row}
                deckOracleIds={deckOracleIds}
                commanderOracleId={commanderOracleId}
                expanded={row.id === expandedRowId}
                onToggle={() => setExpanded(row.id)}
                onCollapse={() => setExpanded(null)}
                onResolved={(r, result) => {
                  announceResolved(r, result);
                  setExpanded(null);
                }}
                onDeleted={(r) => {
                  announceDeleted(r);
                  setExpanded(null);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* One region, shared by resolve and delete. It replaces its own text, it
          never stacks, and it is not a toast. Mounted from the first render
          rather than with the first note: a live region that arrives carrying
          its message is not reliably announced. */}
      <p
        ref={noteRef}
        aria-live="polite"
        tabIndex={-1}
        className={
          note
            ? "flex items-center gap-[9px] md:gap-[11px] rounded-[8px] md:rounded-[9px] px-[12px] py-[10px] md:px-[14px] md:py-[12px] mt-[16px] text-[12.5px] md:text-[13.5px]"
            : "sr-only"
        }
        style={
          note
            ? {
                background: "var(--surface-rail)",
                border: "1px solid var(--border)",
                color: "var(--fg-body)",
              }
            : undefined
        }
      >
        {note && (
          <span
            aria-hidden
            className={
              note.kind === "resolve"
                ? "flex-none text-[12px] md:text-[14px]"
                : "flex-none font-mono text-[12px] md:text-[13px]"
            }
            style={{ color: note.kind === "resolve" ? "var(--success)" : "var(--fg-faint)" }}
          >
            {note.kind === "resolve" ? "✓" : "−"}
          </span>
        )}
        <span className="flex-1">{note?.text ?? ""}</span>
      </p>

      {ordered.length > 0 && (
        <p
          className="text-[12px] leading-[1.55] mt-[10px] md:text-[12.5px] md:leading-[1.6] md:mt-[12px]"
          style={{ color: "var(--fg-faint)" }}
        >
          <span className="md:hidden">
            {copy.footnoteMobile} {copy.footnoteMobileResolve}
          </span>
          <span className="hidden md:inline">
            {copy.footnote(ordered.length)}
          </span>
        </p>
      )}
    </section>
  );
}
