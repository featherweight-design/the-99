"use client";
// QuickAddBar — retrieval, per §Quick add in the Add Panel handoff.
//
// A combobox, not a dialog. DOM focus never leaves the input: the arrows move
// `aria-activedescendant` over the options and the input keeps the caret, so a
// user can keep typing to narrow while a row is active. That rules out a focus
// trap, a scroll lock and `useDialogA11y` — all three exist to manage focus
// somewhere else, and there is nowhere else.
//
// Replaces search-pane.tsx and search-result-row.tsx, which PR 6 deletes once
// nothing mounts them.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { searchCards } from "../../app/decks/[id]/search-action";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { addCardToDeck } from "../../app/decks/actions";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { identityLabel } from "../../lib/decks/indeck";
import { isBasicLand } from "../../lib/decks/grouping";
import { SearchField } from "../ui/text-field";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

interface QuickAddBarProps {
  deckId: string;
  commanderIdentity: string[];
  /** The committed server list, deliberately — see builder-shell.tsx. */
  deckOracleIds: string[];
  /** Required: the empty state interpolates it, and "in ’s colours" is worse
   *  than a type error at the one call site that supplies it. */
  commanderShortName: string;
}

export function QuickAddBar({
  deckId,
  commanderIdentity,
  deckOracleIds,
  commanderShortName,
}: QuickAddBarProps) {
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(true);
  // Rows carry the request that produced them. They stay on screen through the
  // next debounce — a list that blanks on every keystroke is worse than one that
  // lags by 150ms — but `stale` below stops Enter acting on them, so the bar can
  // show the previous matches without ever adding one the user has typed past.
  const [rows, setRows] = useState<{ for: string; items: SearchResult[] } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Escape dismisses before it clears, so the list can be closed without losing
  // a query the user is still editing.
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const queryActive = trimmed.length >= 2 && trimmed.length <= 100;
  // The filter is part of the request, so flipping it makes the rows on screen
  // as stale as retyping does.
  const requestKey = `${ownedOnly ? "owned" : "all"} ${trimmed}`;

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (!queryActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(null);
      return;
    }

    let cancelled = false;
    timerRef.current = setTimeout(() => {
      searchCards(trimmed, commanderIdentity, ownedOnly)
        .then((found) => {
          if (cancelled) return;
          setRows({ for: requestKey, items: found });
          setActiveIndex(0);
        })
        .catch((err) => {
          // Outside the `cancelled` guard on purpose. Nothing here aborts the
          // request, so a rejection means searchCards genuinely threw, and the
          // user typing another character is no reason to stop saying so — a
          // guarded log would hide a wholly broken action behind fast typing.
          console.error(err);
          // Back to "no search has happened", never to "no results". An empty
          // list renders "Nothing in the pile by that name", which is a claim
          // about the collection that a failed request has not earned. The
          // handoff draws no failure state for this bar, so rather than invent
          // one the list simply does not open — tracked for Design.
          if (!cancelled) setRows(null);
        });
    }, 150);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [trimmed, queryActive, ownedOnly, commanderIdentity, requestKey]);

  const inDeck = useCallback(
    (r: SearchResult) => deckOracleIds.includes(r.oracleId) && !isBasicLand(r.typeLine),
    [deckOracleIds],
  );

  const results = rows?.items ?? [];
  const stale = rows !== null && rows.for !== requestKey;
  const open = !dismissed && queryActive && rows !== null && results.length > 0;
  // "Nothing in the pile" is only honest about the query that produced it, so a
  // stale empty list holds its tongue until the current one lands.
  const noResults = !dismissed && queryActive && !stale && rows !== null && results.length === 0;
  // Results for the query in the field have not landed yet: either none at all,
  // or the ones on screen answer an older query.
  const searching = queryActive && (rows === null || stale);
  const identity = identityLabel(commanderIdentity);
  const unownedShown = results.filter((r) => !r.owned).length;

  function move(delta: number) {
    if (!open) return;
    setActiveIndex((i) => (i + delta + results.length) % results.length);
  }

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
          containerClassName="flex-1 min-w-[220px] max-w-[520px] h-[38px] bg-[#181410] border-[color:var(--brass)] py-0"
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

      {open && (
        <>
          <ul
            id={listId}
            role="listbox"
            aria-label={addPanelCopy.quickAdd.resultsAria}
            className="anim-quickadd-in list-none m-0 mt-[8px] p-0 flex flex-col gap-[6px]"
          >
            {results.map((r, i) => (
              <QuickAddRow
                key={r.oracleId}
                id={optionId(i)}
                result={r}
                deckId={deckId}
                inDeck={inDeck(r)}
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
        <div className="mt-[12px]">
          <p className="text-[14px] font-semibold m-0" style={{ color: "#EDE6D8" }}>
            {addPanelCopy.quickAddEmpty.heading}
          </p>
          <p className="text-[12.5px] leading-[1.55] mt-[6px]" style={{ color: "#A89B84" }}>
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
              className="mt-[10px] text-[12.5px] font-semibold cursor-pointer"
              style={{ color: "#C9A24B", background: "transparent", border: "none", padding: 0 }}
            >
              {addPanelCopy.quickAddEmpty.dropFilter}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface QuickAddRowProps {
  id: string;
  result: SearchResult;
  deckId: string;
  inDeck: boolean;
  active: boolean;
  onActivate: () => void;
  registerAdd?: (fn: (r: SearchResult) => void) => void;
}

function QuickAddRow({
  id,
  result,
  deckId,
  inDeck,
  active,
  onActivate,
  registerAdd,
}: QuickAddRowProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();

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
        addPanelCopy.quickAdd.rowAria(result.name, result.typeLine, result.owned),
        result.owned ? addPanelCopy.quickAdd.rowOwned(result.ownedQty) : null,
        applied ? addPanelCopy.quickAdd.rowInDeck : null,
      ]
        .filter(Boolean)
        .join(", ")}
      onMouseEnter={onActivate}
      onClick={handleAdd}
      // An in-deck row is not actionable, so it must not offer a pointer.
      className={`flex flex-col rounded-[9px] ${applied ? "cursor-default" : "cursor-pointer"}`}
      style={{
        background: "#1E1A15",
        border: `1px solid ${active ? "#C9A24B" : "#2A241D"}`,
        padding: "8px 12px",
        minHeight: 56,
      }}
    >
      <div className="flex items-center gap-[12px]">
        {/* 30×42, a deliberate divergence from Archidekt: a crop settles which
            "Study" this is faster than the type line does. */}
        <span
          aria-hidden
          className="flex-none rounded-[5px] overflow-hidden"
          style={{
            width: 30,
            height: 42,
            background: "#241F19",
            opacity: applied ? 0.5 : 1,
            filter: applied ? "grayscale(0.6)" : undefined,
          }}
        >
          {result.imageUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.imageUri}
              alt=""
              width={30}
              height={42}
              className="w-full h-full object-cover"
            />
          )}
        </span>

        <span
          className="flex-1 min-w-0 text-[14px] font-semibold truncate"
          style={{ color: applied ? "#A89B84" : "#EDE6D8" }}
        >
          {result.name}
        </span>

        <span
          className="hidden md:block flex-none font-mono text-[11px] truncate max-w-[140px]"
          style={{ color: applied ? "#6A6152" : "#8E8269" }}
        >
          {result.typeLine}
        </span>

        {/* Ownership as a word and a figure. Never colour alone. */}
        <span
          className="flex-none font-mono text-[11px] text-right"
          style={{ color: result.owned ? "#8E8269" : "#E0913C" }}
        >
          {result.owned
            ? addPanelCopy.quickAdd.rowOwned(result.ownedQty)
            : addPanelCopy.quickAdd.rowNotOwned}
        </span>

        {applied ? (
          // Label as well as greyscale, and aria-disabled on the option above.
          <span
            className="flex-none font-sans text-[12.5px] font-semibold text-right"
            style={{ color: "#6FA368", minWidth: 56 }}
          >
            {addPanelCopy.quickAdd.rowInDeck}
          </span>
        ) : (
          // Drawn as a control, but not one: a real <button> inside a
          // role="option" gives a screen reader a second interactive thing
          // inside a listbox option, and the option itself already adds on
          // click and on Enter. So the affordance the handoff draws stays and
          // the duplicate semantics go.
          <span
            aria-hidden
            className="flex-none font-sans text-[12.5px] font-semibold flex items-center justify-center"
            style={{
              opacity: isPending ? 0.5 : undefined,
              color: "#C9A24B",
              background: "transparent",
              border: "1px solid #3A3229",
              borderRadius: 7,
              minWidth: 56,
              minHeight: 44,
            }}
          >
            {active ? addPanelCopy.quickAdd.rowAddActive : addPanelCopy.quickAdd.rowAdd}
          </span>
        )}
      </div>

      {error && <MutationError message={error} />}
    </li>
  );
}
