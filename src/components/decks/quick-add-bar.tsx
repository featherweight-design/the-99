"use client";
// QuickAddBar — retrieval, per §Quick add in the Add Panel handoff.
//
// A combobox, not a dialog. DOM focus never leaves the input: the arrows move
// `aria-activedescendant` over the options and the input keeps the caret, so a
// user can keep typing to narrow while a row is active. That rules out a focus
// trap, a scroll lock and `useDialogA11y` — all three exist to manage focus
// somewhere else, and there is nowhere else.
//
// Replaced search-pane.tsx and search-result-row.tsx, both now deleted.

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { addCardToDeck } from "../../app/decks/actions";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { colorLabel } from "../../lib/decks/format";
import { isBasicLand } from "../../lib/decks/grouping";
import { SearchField } from "../ui/text-field";
import { markerAria } from "../ui/availability-marker";
import { CardSearchRowBody } from "./card-search-row";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useCardSearch } from "./use-card-search";
import { useDeckMutation } from "./use-deck-mutation";

interface QuickAddBarProps {
  deckId: string;
  commanderIdentity: string[];
  /** The committed server list, deliberately — see builder-shell.tsx. */
  deckOracleIds: string[];
  /** Required: the empty state interpolates it, and "in ’s colours" is worse
   *  than a type error at the one call site that supplies it. */
  commanderShortName: string;
  /**
   * The commander is not a `deck_cards` row (availability-query.ts:25), so it
   * is absent from `deckOracleIds` while the availability query still counted
   * its claim. Searching your own commander would otherwise read as another
   * deck's hard claim on it.
   */
  commanderOracleId: string;
}

export function QuickAddBar({
  deckId,
  commanderIdentity,
  deckOracleIds,
  commanderShortName,
  commanderOracleId,
}: QuickAddBarProps) {
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(true);
  // Escape dismisses before it clears, so the list can be closed without losing
  // a query the user is still editing.
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();

  const { trimmed, results, stale, open, noResults, searching, activeIndex, setActiveIndex, move } =
    useCardSearch({ query, colorIdentity: commanderIdentity, ownedOnly, dismissed, deckId });

  // The commander counts, though it is no `deck_cards` row: `addCardToDeck`
  // refuses it (`validateCardForDeck` returns `is-commander`), so a row left
  // actionable here is a button that fails every time it is pressed.
  const inDeck = useCallback(
    (r: SearchResult) =>
      r.oracleId === commanderOracleId ||
      (deckOracleIds.includes(r.oracleId) && !isBasicLand(r.typeLine)),
    [deckOracleIds, commanderOracleId],
  );
  // Distinct from `inDeck`, which drives the "In deck" label and the add guard:
  // this one answers "did the excluded query drop a claim of ours on this
  // card", which is the only thing `selfExcluded` is allowed to mean.
  //
  // So it deliberately does NOT reuse `inDeck`, whose basic-land carve-out
  // exists to keep a second Forest addable. A Forest already on the list is
  // still a `deck_cards` row and the read still dropped it, and inheriting that
  // carve-out drew a false `0 free` on the last Forest a player owns.
  const selfClaims = useCallback(
    (r: SearchResult) =>
      deckOracleIds.includes(r.oracleId) || r.oracleId === commanderOracleId,
    [deckOracleIds, commanderOracleId],
  );

  // The same formatter the deck header uses. `BG-legal` and `Golgari` were two
  // names for one constraint, thirty pixels apart on the no-results state.
  const identity = colorLabel(commanderIdentity);
  const unownedShown = results.filter((r) => !r.owned).length;

  function optionId(i: number) {
    return `${listId}-opt-${i}`;
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
      // Typing past the rows on screen and hitting Enter must not add whatever
      // the previous query matched.
      if (stale) return;
      const active = results[activeIndex];
      if (active && !inDeck(active)) addRef.current?.(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // A search still in flight is something to dismiss. Without it the first
      // Escape means two different things depending on whether the debounce has
      // fired — list gone for a slow typist, query gone for a fast one.
      if (!dismissed && (open || noResults || searching)) setDismissed(true);
      else setQuery("");
    }
  }

  // The row owns the mutation hook, so Enter reaches it through a ref rather
  // than the bar duplicating the add path. Stable, or the active row's
  // registration effect would re-run on every keystroke.
  const addRef = useRef<((r: SearchResult) => void) | null>(null);
  const registerAdd = useCallback((fn: (r: SearchResult) => void) => {
    addRef.current = fn;
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-[14px] flex-wrap">
        <SearchField
          // 44px at phone width is the handoff's tap-target floor. The fill and
          // the idle border come from FIELD_CHROME and are deliberately not
          // overridden: pinning the border to brass here made the field look
          // focused at rest, so SearchField's focus-within brass had nothing
          // left to say.
          containerClassName="flex-1 min-w-[220px] max-w-[520px] h-[44px] md:h-[38px] py-0"
          // 16px on mobile so Safari does not zoom the page on focus.
          className="text-[16px] md:text-[14px]"
          role="combobox"
          aria-expanded={open}
          // Only while the listbox is mounted: a reference to an element that is
          // not in the DOM is one an assistive tech cannot follow.
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-label={addPanelCopy.quickAdd.fieldAria}
          placeholder={addPanelCopy.quickAdd.placeholder}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDismissed(false);
          }}
          onKeyDown={handleKeyDown}
          trailing={
            query.length > 0 ? (
              <button
                type="button"
                tabIndex={-1}
                // Focus never leaves the field, and a pointer press on a
                // <button> would take it without this.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery("")}
                aria-label={addPanelCopy.quickAdd.clear}
                className="flex-none w-[20px] h-[20px] rounded-full text-[10px] cursor-pointer"
                style={{ background: "#2A241D", color: "#8E8269", border: "none" }}
              >
                ✕
              </button>
            ) : null
          }
        />

        <label
          className="flex items-center gap-[7px] text-[12px] cursor-pointer select-none"
          style={{ color: "#A89B84" }}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={ownedOnly}
            onChange={(e) => {
              setOwnedOnly(e.target.checked);
              // Widening the search is a request to see results, so it undoes an
              // earlier Escape rather than re-searching into a closed list.
              setDismissed(false);
            }}
            aria-label={addPanelCopy.quickAdd.ownedToggleAria}
          />
          <span
            className="relative inline-block rounded-[999px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C9A24B]"
            style={{ width: 30, height: 17 }}
            aria-hidden
          >
            <span
              style={{
                display: "block",
                width: 30,
                height: 17,
                borderRadius: 999,
                background: ownedOnly ? "#C9A24B" : "#2A241D",
                transition: "background 0.15s",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: 2,
                left: ownedOnly ? 15 : 2,
                width: 13,
                height: 13,
                borderRadius: 999,
                background: ownedOnly ? "#14110E" : "#8E8269",
                transition: "left 0.15s",
              }}
            />
          </span>
          {addPanelCopy.quickAdd.ownedToggle}
        </label>

        {/* The count is the status for the search itself, so a screen reader
            hears how many matches landed without moving off the field. */}
        <span
          role="status"
          className="font-mono text-[10.5px] ml-auto"
          style={{ color: "#6A6152" }}
        >
          {/* noResults is a landed search too, and "0 matches" is the one thing
              a screen reader most needs to hear — falling back to the identity
              note there would announce nothing had changed. */}
          {open || noResults
            ? ownedOnly
              ? addPanelCopy.quickAdd.resultCountWithIdentity(results.length, identity)
              : unownedShown > 0
                ? addPanelCopy.quickAdd.ownedFilterOffNote(unownedShown)
                : addPanelCopy.quickAdd.resultCountWithIdentity(results.length, identity)
            : addPanelCopy.quickAdd.identityNote(identity)}
        </span>
      </div>

      {/* §Results panel — "rises off the bar", per the handoff's upward shadow.
          `order-first` lifts it above the field visually while leaving the DOM
          in combobox-then-listbox order, which is what a screen reader wants and
          what `aria-activedescendant` describes. Rendered in flow below the
          field instead, it grew off the bottom of the phone viewport and put the
          no-results escape hatch under the tab bar, unreachable. The negative
          margins bleed it to the edges of the sticky container it sits in. */}
      {(open || noResults) && (
        <div
          className="order-first -mx-[16px] md:-mx-[30px] -mt-[10px] md:-mt-[11px] mb-[10px] md:mb-[11px] px-[16px] md:px-[30px] py-[12px] max-h-[290px] md:max-h-[400px] overflow-y-auto"
          style={{
            background: "var(--bg)",
            borderTop: "1px solid var(--border-strong)",
            boxShadow: "0 -16px 40px rgba(0,0,0,0.5)",
          }}
        >
      {open && (
        <>
          <ul
            id={listId}
            role="listbox"
            aria-label={addPanelCopy.quickAdd.resultsAria}
            className="anim-quickadd-in list-none m-0 p-0 flex flex-col gap-[6px]"
          >
            {results.map((r, i) => (
              <QuickAddRow
                key={r.oracleId}
                id={optionId(i)}
                result={r}
                query={trimmed}
                deckId={deckId}
                inDeck={inDeck(r)}
                selfClaimed={selfClaims(r)}
                active={i === activeIndex}
                onActivate={() => setActiveIndex(i)}
                registerAdd={i === activeIndex ? registerAdd : undefined}
              />
            ))}
          </ul>
          <p className="font-mono text-[10px] mt-[8px]" style={{ color: "#6A6152" }}>
            {addPanelCopy.quickAdd.keyboardHint}
          </p>
        </>
      )}

      {noResults && (
        // Centred, and the same shape as the app's other empty states: this is
        // a dead end rather than a row of the list, so it is not left-aligned
        // against results that are not there.
        <div className="flex flex-col items-center text-center py-[26px] px-[30px]">
          <p className="font-display font-bold text-[17px] m-0" style={{ color: "#EDE6D8" }}>
            {addPanelCopy.quickAddEmpty.heading}
          </p>
          <p
            className="text-[13.5px] leading-[1.55] mt-[8px] max-w-[420px]"
            style={{ color: "#A89B84" }}
          >
            {ownedOnly
              ? addPanelCopy.quickAddEmpty.body(trimmed, commanderShortName)
              : addPanelCopy.quickAddEmpty.bodyAllCards(trimmed, identity)}
          </p>
          {/* The one honest escape, and only while the filter is what is
              standing in the way. With it already off, this really is a miss. */}
          {ownedOnly && (
            <button
              type="button"
              onClick={() => setOwnedOnly(false)}
              className="mt-[12px] text-[12.5px] font-semibold underline cursor-pointer"
              style={{ color: "#C9A24B", background: "transparent", border: "none", padding: 0 }}
            >
              {addPanelCopy.quickAddEmpty.dropFilter}
            </button>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}

interface QuickAddRowProps {
  id: string;
  result: SearchResult;
  query: string;
  deckId: string;
  inDeck: boolean;
  /** This deck holds a claim the availability read excluded. See QuickAddBar. */
  selfClaimed: boolean;
  active: boolean;
  onActivate: () => void;
  registerAdd?: (fn: (r: SearchResult) => void) => void;
}

function QuickAddRow({
  id,
  result,
  query,
  deckId,
  inDeck,
  selfClaimed,
  active,
  onActivate,
  registerAdd,
}: QuickAddRowProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();
  const ownership = result.owned
    ? addPanelCopy.quickAdd.rowOwned(result.ownedQty)
    : addPanelCopy.quickAdd.rowNotOwned;

  // The guard lives here rather than on the click handler alone: Enter reaches
  // the row through registerAdd, which would otherwise re-fire the mutation
  // while the optimistic row is showing but deckOracleIds has not caught up.
  const handleAdd = useCallback(() => {
    if (applied) return;
    run(
      () => addCardToDeck(deckId, result.oracleId),
      () =>
        addOptimisticCard({
          oracleId: result.oracleId,
          name: result.name,
          typeLine: result.typeLine,
          cardTypeGroup: result.cardTypeGroup,
          role: result.role,
          owned: result.owned,
          quantity: 1,
        }),
    );
  }, [applied, run, deckId, result, addOptimisticCard]);

  // The bar's Enter handler adds through whichever row is active. Layout rather
  // than passive: a passive effect runs after paint, leaving a window in which
  // the row is on screen and Enter still reaches the previous row's handler.
  useLayoutEffect(() => {
    if (registerAdd) registerAdd(() => handleAdd());
  }, [registerAdd, handleAdd]);

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={applied || undefined}
      // The label has to carry everything the row draws, or a screen reader
      // hears less than the screen shows: the owned figure and the in-deck
      // state both change whether the row is worth acting on. Composed from the
      // shipped strings rather than a new one.
      aria-label={[
        addPanelCopy.quickAdd.rowAria(
          result.name,
          result.typeLine,
          result.owned,
          // `selfClaimed`, not `applied`: `applied` also covers a row the player
          // has just added in this session, whose availability figures were read
          // before the add and are not self-excluded for it.
          result.availability
            ? markerAria(result.availability, { selfExcluded: selfClaimed })
            : null,
        ),
        result.owned ? addPanelCopy.quickAdd.rowOwned(result.ownedQty) : null,
        applied ? addPanelCopy.quickAdd.rowInDeck : null,
      ]
        .filter(Boolean)
        .join(", ")}
      onMouseEnter={onActivate}
      onClick={handleAdd}
      // An in-deck row is not actionable, so it must not offer a pointer.
      className={`flex flex-col rounded-[9px] min-h-[56px] md:min-h-[52px] px-[10px] md:px-[12px] py-[8px] ${applied ? "cursor-default" : "cursor-pointer"}`}
      style={{
        background: "#1E1A15",
        border: `1px solid ${active ? "#C9A24B" : "#2A241D"}`,
      }}
    >
      <CardSearchRowBody
        result={result}
        query={query}
        ownership={ownership}
        dim={applied}
        selfExcluded={selfClaimed}
        seam="var(--surface)"
        nameClassName="flex-1 min-w-0 md:flex-none md:w-[210px] flex flex-col"
        trailing={
          applied ? (
            // Label as well as greyscale, and aria-disabled on the option above.
            <span
              className="flex-none font-sans text-[12.5px] font-semibold text-right md:w-[56px]"
              style={{ color: "#6FA368" }}
            >
              {addPanelCopy.quickAdd.rowInDeck}
            </span>
          ) : active ? (
            // The active row states the key that acts on it, so it is a caption
            // rather than a control: boxing it draws a second button beside the
            // one the keyboard is already pointed at.
            <span
              aria-hidden
              className="flex-none font-mono text-[10px] md:text-[11px] text-right md:w-[56px]"
              style={{ opacity: isPending ? 0.5 : undefined, color: "#C9A24B" }}
            >
              {/* The phone row's meta line has already used the width the words
                  would need, so it keeps the glyph alone. */}
              <span className="md:hidden">↵</span>
              <span className="hidden md:inline">{addPanelCopy.quickAdd.rowAddActive}</span>
            </span>
          ) : (
            // Drawn as a control, but not one: a real <button> inside a
            // role="option" gives a screen reader a second interactive thing
            // inside a listbox option, and the option itself already adds on
            // click and on Enter. So the affordance the handoff draws stays and
            // the duplicate semantics go.
            <span
              aria-hidden
              className="flex-none font-sans text-[13px] md:text-[12.5px] font-semibold flex items-center justify-center w-[56px] h-[44px] md:h-[36px]"
              style={{
                opacity: isPending ? 0.5 : undefined,
                color: "#C9A24B",
                background: "transparent",
                border: "1px solid #3A3229",
                borderRadius: 7,
              }}
            >
              {addPanelCopy.quickAdd.rowAdd}
            </span>
          )
        }
      />

      {error && <MutationError message={error} />}
    </li>
  );
}
