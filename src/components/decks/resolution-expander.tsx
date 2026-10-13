"use client";
// Resolution expander — state 16 (and state 17, "Nothing found") of the deck
// import flow. §15/§16 of the design table.
//
// A disclosure, not a dialog: one construct at both widths, no focus trap, no
// sheet, no grabber. Esc collapses it and hands focus back to the row that
// opened it. The combobox is a row-scoped instance of the quick-add bar's, with
// two differences that matter — Enter resolves this line instead of adding a
// card, and the search runs unfiltered.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { deleteUnresolvedRow, resolveUnresolvedRow } from "../../app/decks/import-actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { isBasicLand, type DeckUnresolvedRow } from "../../lib/decks/grouping";
import {
  DECK_ADD_FALLBACK_MESSAGE,
  DECK_REMOVE_FALLBACK_MESSAGE,
} from "../../lib/decks/mutation-result";
import { SearchField } from "../ui/text-field";
import { markerAria } from "../ui/availability-marker";
import { CardSearchRowBody } from "./card-search-row";
import { MutationError } from "./mutation-error";
import { useDeleteOptimisticRow, useResolveOptimisticRow } from "./optimistic-deck";
import { useCardSearch } from "./use-card-search";
import { useDeckMutation } from "./use-deck-mutation";
import { Chevron } from "../ui/chevron";

const copy = deckImportCopy.resolve;

interface ResolutionExpanderProps {
  id: string;
  deckId: string;
  row: DeckUnresolvedRow;
  /** This deck's stored claims, which the availability read excluded. */
  deckOracleIds: string[];
  commanderOracleId?: string;
  /** Collapses the expander and returns focus to the row. */
  onCollapse: () => void;
  onResolved: (result: SearchResult) => void;
  onDeleted: () => void;
}

export function ResolutionExpander({
  id,
  deckId,
  row,
  deckOracleIds,
  commanderOracleId,
  onCollapse,
  onResolved,
  onDeleted,
}: ResolutionExpanderProps) {
  const [query, setQuery] = useState(row.rawName);
  // Off, against the global on-by-default the quick-add bar uses. Matching ran
  // against all of Scryfall rather than the player's collection, so a card they
  // don't own is a valid answer to "what was this line?" — inheriting the global
  // `true` would hide the right answer and read as a broken search. The caption
  // under the toggle is what stops it looking like a malfunction. Per row, and
  // it resets on collapse: this component unmounts with the row's expansion.
  const [ownedOnly, setOwnedOnly] = useState(false);
  const hintId = useId();
  const listId = `${id}-list`;
  const fieldRef = useRef<HTMLInputElement>(null);

  const { trimmed, results, stale, open, noResults, activeIndex, setActiveIndex, move } =
    useCardSearch({ query, colorIdentity: null, ownedOnly, deckId });

  // `useCardSearch` passes `deckId`, so every figure comes back with this
  // deck's own claim already subtracted. `selfExcluded` may therefore be set
  // wherever this deck held a claim the query dropped — and only there, or a
  // genuine hard claim by another committed deck resolves to silence.
  //
  // A resolution row can absolutely land on a card this deck already holds: a
  // duplicate import line, a basic, or the commander, which is no `deck_cards`
  // row and so is absent from `deckOracleIds`. The same predicate the quick-add
  // bar builds, for the same reason.
  const selfClaims = useCallback(
    (r: SearchResult) =>
      deckOracleIds.includes(r.oracleId) || r.oracleId === commanderOracleId,
    [deckOracleIds, commanderOracleId],
  );

  // Seeded and selected, so the first keystroke replaces the raw line rather
  // than appending to it.
  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, []);

  const {
    applied: resolveApplied,
    isPending: resolvePending,
    error: resolveError,
    run: runResolve,
  } = useDeckMutation(false, DECK_ADD_FALLBACK_MESSAGE);
  const { error: deleteError, run: runDelete } = useDeckMutation(
    false,
    DECK_REMOVE_FALLBACK_MESSAGE,
  );
  const resolveOptimisticRow = useResolveOptimisticRow();
  const deleteOptimisticRow = useDeleteOptimisticRow();

  // One line, one answer. Resolve and delete hold separate `useDeckMutation`
  // latches, so each stops itself repeating but neither sees the other — and
  // the two answers contradict: whichever DELETE reaches the row first claims
  // it, and the loser comes back "unresolved row not found" as an error on a
  // row that is already gone.
  const answeredRef = useRef(false);

  function resolve(result: SearchResult) {
    if (resolveApplied || answeredRef.current) return;
    answeredRef.current = true;
    // The parent is told from inside the optimistic callback rather than before
    // `run`. `run` latches on a ref, so a second activation in the same tick is
    // dropped — and a notification outside that latch would collapse the row and
    // narrate a card the server was never sent.
    runResolve(
      () => resolveUnresolvedRow(deckId, row.id, result.oracleId),
      () => {
        onResolved(result);
        // Mirrors the server, which answers the line but refuses to put the
        // commander in the 99 as well. Predicting a card the server will not
        // write shows a `built` it never reaches.
        if (result.oracleId === commanderOracleId) {
          deleteOptimisticRow(row.id);
          return;
        }
        resolveOptimisticRow(row.id, {
          oracleId: result.oracleId,
          name: result.name,
          typeLine: result.typeLine,
          cardTypeGroup: result.cardTypeGroup,
          role: result.role,
          cmc: result.cmc,
          owned: result.owned,
          // Mirrors the server: a "3 Rhystic Study" line resolves to one copy,
          // and only a basic land carries the line's own quantity over.
          quantity: isBasicLand(result.typeLine) ? row.quantity : 1,
          auto: false,
          // Null on an optimistic row: the search result carries the oracle
          // name only, and this row exists for the beat before the server
          // answers. The revalidate supplies the printed name; until then the
          // row reads exactly as it does today.
          printedName: null,
          printedSetCode: null,
          printedCollectorNumber: null,
          manaCost: result.manaCost,
          imageUri: result.imageUri,
        });
      },
    );
  }

  function remove() {
    if (answeredRef.current) return;
    answeredRef.current = true;
    runDelete(
      () => deleteUnresolvedRow(deckId, row.id),
      () => {
        onDeleted();
        deleteOptimisticRow(row.id);
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      // Typing past the rows on screen must not resolve the line to whatever
      // the previous query matched.
      if (stale) return;
      const active = results[activeIndex];
      if (active) resolve(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCollapse();
    }
  }

  const optionId = (i: number) => `${id}-opt-${i}`;

  return (
    <div
      id={id}
      className="anim-quickadd-in rounded-[9px] px-[14px] pt-[13px] pb-[16px] md:px-[16px] md:py-[14px] mb-[16px] md:mb-0"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-strong)",
        borderLeft: "2px solid var(--warning)",
      }}
    >
      <div className="flex items-center gap-[9px] md:gap-[10px] mb-[10px] md:mb-[12px]">
        <span aria-hidden className="text-[11px] md:text-[12px]" style={{ color: "var(--warning)" }}>
          ?
        </span>
        <span className="font-mono text-[12px] md:text-[13px]" style={{ color: "var(--fg)" }}>
          {row.rawName}
        </span>
        <span
          className="hidden md:inline text-[13px]"
          style={{ color: "var(--fg-muted)" }}
        >
          — {copy.prompt}
        </span>
        <button
          type="button"
          onClick={onCollapse}
          className="flex-none font-mono text-[10.5px] md:text-[11px] ml-auto cursor-pointer bg-transparent border-none p-0 text-[color:var(--fg-faint)] hover:text-[color:var(--accent)] transition-colors"
        >
          {copy.collapse} <Chevron open />
        </button>
      </div>

      <h4
        className="md:hidden font-display font-semibold text-[16px] m-0"
        style={{ color: "var(--fg)" }}
      >
        {copy.headingMobile}
      </h4>
      <p
        className="md:hidden text-[12.5px] leading-[1.55] mt-[5px]"
        style={{ color: "var(--fg-body)" }}
      >
        {copy.promptMobile(row.rawName)}
      </p>

      <div className="md:flex md:gap-[20px] md:items-start">
        <div className="md:flex-1 md:min-w-0">
          <SearchField
            ref={fieldRef}
            containerClassName="mt-[14px] md:mt-0 gap-[10px] px-[13px] py-[11px] rounded-[8px] bg-[color:var(--bg)] border-[color:var(--accent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]"
            // 16px at phone width so Safari does not zoom the page on focus.
            className="text-[16px] md:text-[14.5px]"
            iconClassName="font-mono text-[15px]"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open ? optionId(activeIndex) : undefined}
            // The hint node goes with the results row, so on no-results this would
            // name an element that is not there. Same guard as `aria-controls`
            // above, and as every other conditional target in the decks tree.
            aria-describedby={noResults ? undefined : hintId}
            aria-autocomplete="list"
            aria-label={copy.searchAria(row.rawName)}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />

          {!noResults && (
            <>
              <div className="flex items-center justify-between md:justify-start gap-[10px] md:gap-[14px] mt-[11px]">
                <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
                  {open ? copy.resultsCount(results.length) : ""}
                </span>

                <span
                  id={hintId}
                  className="sr-only md:not-sr-only md:font-mono md:text-[10.5px]"
                  style={{ color: "var(--fg-locked)" }}
                >
                  {copy.keyboardHint}
                </span>

                <label className="flex items-center gap-[7px] text-[11.5px] md:text-[12px] md:ml-auto cursor-pointer select-none"
                  style={{ color: "var(--fg-muted)" }}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={ownedOnly}
                    onChange={(e) => setOwnedOnly(e.target.checked)}
                    aria-label={copy.ownedToggleLabel}
                  />
                  <span
                    className="relative inline-block rounded-[999px] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--accent)]"
                    style={{ width: 30, height: 17 }}
                    aria-hidden
                  >
                    <span
                      className="transition-colors motion-reduce:transition-none"
                      style={{
                        display: "block",
                        width: 30,
                        height: 17,
                        borderRadius: 999,
                        background: ownedOnly ? "var(--accent)" : "var(--elevated)",
                      }}
                    />
                    <span
                      className="transition-[transform,background-color] motion-reduce:transition-none"
                      style={{
                        position: "absolute",
                        top: 2,
                        left: 2,
                        // The knob slides on transform, not `left`: a layout property animates on the main thread.
                        transform: ownedOnly ? "translateX(13px)" : "none",
                        width: 13,
                        height: 13,
                        borderRadius: 999,
                        background: ownedOnly ? "var(--bg)" : "var(--fg-faint)",
                      }}
                    />
                  </span>
                  {copy.ownedToggleLabel}
                </label>
              </div>

              <p
                className="font-mono text-[10px] md:text-[10.5px] leading-[1.5] mt-[5px] md:mt-[6px]"
                style={{ color: "var(--fg-locked)" }}
              >
                <span className="md:hidden">{copy.filterCaptionMobile}</span>
                <span className="hidden md:inline">{copy.filterCaption}</span>
              </p>
            </>
          )}

          {open && (
            <ul
              id={listId}
              role="listbox"
              aria-label={copy.searchAria(row.rawName)}
              className="list-none m-0 p-0 flex flex-col gap-[6px] mt-[10px]"
            >
              {results.map((r, i) => (
                <ResultRow
                  key={r.oracleId}
                  id={optionId(i)}
                  result={r}
                  query={trimmed}
                  active={i === activeIndex}
                  pending={resolvePending}
                  selfClaimed={selfClaims(r)}
                  onActivate={() => setActiveIndex(i)}
                  onUse={() => resolve(r)}
                />
              ))}
            </ul>
          )}

          {noResults && (
            // The expander's own dead end, not the shared NoResults component:
            // that one's crown belongs to browsing a collection you own, and
            // this search deliberately looks outside it.
            <div className="text-center pt-[30px] px-[8px] pb-[8px] md:pt-[26px] md:px-0 md:pb-[6px]">
              <span
                aria-hidden
                className="flex items-center justify-center mx-auto w-[34px] h-[34px] mb-[14px] md:mb-[12px] text-[15px]"
                style={{ borderRadius: 999, border: "1px dashed var(--border-dashed)", color: "var(--fg-faint)" }}
              >
                ?
              </span>
              <p
                className="font-display font-bold text-[17px] md:text-[18px] m-0"
                style={{ color: "var(--fg)" }}
              >
                {copy.noResultsHeading}
              </p>
              <p
                className="text-[13px] leading-[1.55] md:text-[13.5px] md:leading-[1.6] md:max-w-[400px] mx-auto mt-[8px]"
                style={{ color: "var(--fg-body)" }}
              >
                {copy.noResultsBody}
              </p>
            </div>
          )}
        </div>

        {/* The raw line, and the two ways out of it. One rail at both widths:
            a second Delete button drawn for the other breakpoint would be a
            second button in the accessibility tree at both. */}
        <div className="md:w-[220px] md:flex-none">
          <p
            className="hidden md:block font-mono text-[10px] uppercase tracking-[0.14em] mb-[8px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {copy.rawLabel}
          </p>
          <p
            className="md:hidden font-mono text-[10px] leading-[1.5] mt-[9px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {copy.rawLine(row.quantity, row.rawName)} · {copy.rawLineNumber(row.sourceLine)}
          </p>
          <div
            className="hidden md:block rounded-[8px] px-[13px] py-[11px] font-mono text-[12px] leading-[1.6]"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-body)" }}
          >
            {copy.rawLine(row.quantity, row.rawName)}
            <span
              className="block font-mono text-[10.5px] mt-[5px]"
              style={{ color: "var(--fg-locked)" }}
            >
              {copy.rawLineNumber(row.sourceLine)}
            </span>
          </div>

          <div
            className={`flex gap-[9px] mt-[14px] md:mt-[12px] md:block ${noResults ? "flex-col mt-[16px]" : ""}`}
          >
            <button
              type="button"
              onClick={remove}
              className="flex-1 md:w-full font-semibold text-[13px] md:text-[13px] rounded-[8px] py-[12px] md:py-[10px] min-h-[44px] md:min-h-0 cursor-pointer bg-transparent border border-[color:var(--border-strong)] text-[color:var(--fg)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-hover)] transition-colors"
            >
              {copy.delete}
            </button>
            <button
              type="button"
              onClick={onCollapse}
              className="md:hidden flex-1 font-semibold text-[13px] rounded-[8px] py-[12px] min-h-[44px] cursor-pointer bg-transparent border border-[color:var(--border-strong)] text-[color:var(--fg)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-hover)] transition-colors"
            >
              {copy.dismiss}
            </button>
          </div>

          <p
            className="hidden md:block text-[11.5px] leading-[1.55] mt-[10px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {copy.deleteNote}
          </p>
        </div>
      </div>

      {(resolveError || deleteError) && (
        <MutationError message={resolveError ?? deleteError ?? ""} />
      )}
    </div>
  );
}

interface ResultRowProps {
  id: string;
  result: SearchResult;
  query: string;
  active: boolean;
  pending: boolean;
  /** This deck already claims this card, so the excluded read dropped it. */
  selfClaimed: boolean;
  onActivate: () => void;
  onUse: () => void;
}

function ResultRow({
  id, result, query, active, pending, selfClaimed, onActivate, onUse,
}: ResultRowProps) {
  // The bar's own ownership phrasing — the design table calls this row the
  // bar's row verbatim, so it says the same words about the same field.
  const ownership = result.owned
    ? addPanelCopy.quickAdd.rowOwned(result.ownedQty)
    : addPanelCopy.quickAdd.rowNotOwned;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      aria-label={[
        addPanelCopy.quickAdd.rowAria(
          result.name,
          result.typeLine,
          result.owned,
          result.availability
            ? markerAria(result.availability, { selfExcluded: selfClaimed })
            : null,
        ),
        result.flavorName
          ? `${addPanelCopy.quickAdd.rowFlavorNamePrefix}${result.flavorName}`
          : null,
        result.owned ? addPanelCopy.quickAdd.rowOwned(result.ownedQty) : null,
      ]
        .filter(Boolean)
        .join(", ")}
      onMouseEnter={onActivate}
      onClick={onUse}
      className="flex flex-col rounded-[9px] min-h-[56px] md:min-h-[52px] px-[10px] md:px-[12px] py-[8px] cursor-pointer"
      style={{ background: "var(--surface)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
    >
      <CardSearchRowBody
        result={result}
        query={query}
        ownership={ownership}
        dim={false}
        selfExcluded={selfClaimed}
        seam="var(--surface)"
        nameClassName="flex-1 min-w-0 md:flex-none md:w-[230px] flex flex-col"
        trailing={
          active ? (
            // A caption, not a control: the option itself is what acts, and a
            // real button inside role="option" would be a second interactive
            // thing inside the listbox.
            <span
              aria-hidden
              className="flex-none font-mono text-[10px] md:text-[11px] text-right md:w-[96px]"
              style={{ opacity: pending ? 0.5 : undefined, color: "var(--accent)" }}
            >
              <span className="md:hidden">↵</span>
              <span className="hidden md:inline">{copy.activeRowHint}</span>
            </span>
          ) : (
            <span
              aria-hidden
              className="flex-none font-semibold text-[13px] md:text-[12.5px] flex items-center justify-center w-[96px] h-[40px] md:h-auto md:py-[6px] rounded-[7px]"
              style={{
                opacity: pending ? 0.5 : undefined,
                color: "var(--accent)",
                background: "transparent",
                border: "1px solid var(--border-strong)",
              }}
            >
              <span className="md:hidden">{copy.useShort}</span>
              <span className="hidden md:inline">{copy.use}</span>
            </span>
          )
        }
      />
    </li>
  );
}
