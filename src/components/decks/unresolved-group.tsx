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
import {
  computeRoleCounts,
  RECOMMENDED_MIX,
  type MixRole,
} from "../../lib/decks/mix";
import { useIsDesktop } from "../ui/use-is-desktop";
import { DecklistGroupHeader } from "./decklist-group-header";
import { UnresolvedRow } from "./unresolved-row";

const copy = deckImportCopy.unresolved;
const resolveCopy = deckImportCopy.resolve;

interface UnresolvedGroupProps {
  deckId: string;
  rows: DeckUnresolvedRow[];
  /** The deck's cards, for the figures the live note quotes. */
  cards?: DeckDetailCard[];
  /** Resolving a line to the commander answers it without adding to the 99. */
  commanderOracleId?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

export function UnresolvedGroup({
  deckId,
  rows,
  cards = [],
  commanderOracleId,
  onExpandedChange,
}: UnresolvedGroupProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [note, setNote] = useState<{
    kind: "resolve" | "delete";
    text: string;
  } | null>(null);
  const isDesktop = useIsDesktop();
  const noteRef = useRef<HTMLParagraphElement>(null);

  // Resolving or deleting unmounts the row that held focus, and the last one
  // unmounts every row there is, so focus would land on <body> and a keyboard
  // user would restart from the top of the document. The note is the one thing
  // that outlives the action, so it takes focus and becomes the place to
  // continue from.
  useEffect(() => {
    if (note) noteRef.current?.focus();
  }, [note]);

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
    // The commander is already in the deck, so answering a line with it adds
    // nothing to the 99 — the server skips the insert and the count must agree.
    const added =
      result.oracleId === commanderOracleId
        ? 0
        : isBasicLand(result.typeLine)
          ? row.quantity
          : 1;
    const built = deckCounts(cards).built + added;
    const remaining = rows.length - 1;
    const mix = RECOMMENDED_MIX[result.role as MixRole] as
      (typeof RECOMMENDED_MIX)[MixRole] | undefined;
    const role = mix
      ? resolveCopy.roleClause(
          mix.label,
          computeRoleCounts(cards)[result.role as MixRole] + added,
          mix.target,
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
      aria-labelledby="unresolved-h"
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
            countColor="#E0913C"
            note={copy.groupNote}
            headingId="unresolved-h"
          />

          {/* The expander is full width, so the desktop group drops to one column
          while a row is open rather than boxing it into half the width. */}
          <div
            className={`flex flex-col gap-[3px] md:gap-y-[4px] md:gap-x-[20px] ${expanded ? "" : "md:grid"}`}
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            {ordered.map((row) => (
              <UnresolvedRow
                key={row.id}
                deckId={deckId}
                row={row}
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
                background: "#1A160F",
                border: "1px solid #2A241D",
                color: "#C6B79A",
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
            style={{ color: note.kind === "resolve" ? "#6FA368" : "#8E8269" }}
          >
            {note.kind === "resolve" ? "✓" : "−"}
          </span>
        )}
        <span className="flex-1">{note?.text ?? ""}</span>
      </p>

      {ordered.length > 0 && (
        <p
          className="text-[12px] leading-[1.55] mt-[10px] md:text-[12.5px] md:leading-[1.6] md:mt-[12px]"
          style={{ color: "#8E8269" }}
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
