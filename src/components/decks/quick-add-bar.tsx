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
import { useSearchDismiss } from "../../lib/ui/search-dismiss";
import { markerAria } from "../ui/availability-marker";
import { comboClauseSpoken } from "../cards/combo-clause";
import { CardSearchRowBody } from "./card-search-row";
import { CardNote, cardNoteSpoken } from "./card-note";
import { factsFromCandidate } from "../../lib/bracket/facts";
import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import { cardFactName } from "../../lib/copy/card-mark";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { type CardSearchInput, useCardSearch } from "./use-card-search";
import { type DeckComboMap, useDeckComboMap } from "./use-deck-combo-map";
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
  /**
   * The query the bar opens with, and the search behind it. Both default to
   * what every real mounting wants — an empty field and the server action.
   *
   * `/about` supplies them together so its figure can draw the panel WITH
   * RESULTS: the bar's rows come from `useCardSearch`, which needs two
   * characters before it asks anything, so a figure taking the defaults draws
   * a search field and an empty list — which is the one thing that entry is
   * not about.
   */
  initialQuery?: string;
  /**
   * Whether the owned-only toggle starts on. True everywhere a player opens
   * the bar — most adds come from the collection. `/about` passes false: its
   * figure lists a card the player does not own, and a panel showing a `not
   * owned` row under an enabled `Owned only` toggle is a state the real search
   * cannot produce.
   */
  initialOwnedOnly?: boolean;
  search?: CardSearchInput["search"];
  /** The combo map's read. Defaults to the server action; see `useDeckComboMap`. */
  loadComboMap?: (deckId: string) => Promise<DeckComboMap>;
  /**
   * The deck's LIVE declaration, for the card note. Required, like the two hosts that already
   * draw the note: null is a real answer (unanswered) and a default would let a mount site
   * forget the prop and draw every note as though nothing had been declared.
   */
  declaredBracket: Bracket | null;
  /** What the deck's list already holds of each kind — the note's ordinals. */
  noteCounts: NoteCounts;
}

export function QuickAddBar({
  deckId,
  commanderIdentity,
  deckOracleIds,
  commanderShortName,
  commanderOracleId,
  initialQuery = "",
  initialOwnedOnly = true,
  search,
  loadComboMap,
  declaredBracket,
  noteCounts,
}: QuickAddBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [ownedOnly, setOwnedOnly] = useState(initialOwnedOnly);
  const listId = useId();
  // Escape, or a press outside the bar and its results, clears the query, which closes the list
  // with it (one rule for every pick-from-a-list field, `useSearchDismiss`).
  const { ref: rootRef, onEscape } = useSearchDismiss<HTMLDivElement>(query.length > 0, () => setQuery(""));

  const { trimmed, results, stale, open, noResults, activeIndex, setActiveIndex, move } =
    useCardSearch({ query, colorIdentity: commanderIdentity, ownedOnly, dismissed: false, deckId, search });

  // Keyed on the COMMITTED list, which is what this prop is (see its doc): the re-read after an
  // add must see the deck the add produced, and the optimistic list moves before that exists.
  const { map: comboMap, start: startComboMap } = useDeckComboMap(
    deckId,
    deckOracleIds.join(","),
    loadComboMap,
  );

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
  // carve-out drew a false `none free` on the last Forest a player owns.
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
    } else onEscape(e);
  }

  // The row owns the mutation hook, so Enter reaches it through a ref rather
  // than the bar duplicating the add path. Stable, or the active row's
  // registration effect would re-run on every keystroke.
  const addRef = useRef<((r: SearchResult) => void) | null>(null);
  const registerAdd = useCallback((fn: (r: SearchResult) => void) => {
    addRef.current = fn;
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col">
      <div className="flex items-center gap-[14px] flex-wrap">
        <SearchField
          // 44px at phone width is the handoff's tap-target floor. The fill and
          // the idle border come from FIELD_CHROME and are deliberately not
          // overridden: pinning the border to accent here made the field look
          // focused at rest, so SearchField's focus-within accent had nothing
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
          aria-label={addPanelCopy.quickAdd.fieldAria(identity)}
          placeholder={addPanelCopy.quickAdd.placeholder(identity)}
          autoComplete="off"
          spellCheck={false}
          value={query}
          // Focus is the earliest honest signal that a search is coming; the change handler
          // starts it too, for a value that arrives without a focus event.
          onFocus={startComboMap}
          onChange={(e) => {
            startComboMap();
            setQuery(e.target.value);
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
                className="flex-none w-[20px] h-[20px] rounded-full text-[10px] cursor-pointer bg-[color:var(--elevated)] text-[color:var(--fg-faint)] border-none"
              >
                ✕
              </button>
            ) : null
          }
        />

        <label
          className="flex items-center gap-[7px] text-[12px] cursor-pointer select-none"
          style={{ color: "var(--fg-muted)" }}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
            aria-label={addPanelCopy.quickAdd.ownedToggleAria}
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
          {addPanelCopy.quickAdd.ownedToggle}
        </label>

        {/* The count is the status for the search itself, so a screen reader
            hears how many matches landed without moving off the field. */}
        <span
          role="status"
          className="font-mono text-[10.5px] ml-auto"
          style={{ color: "var(--fg-locked)" }}
        >
          {/* Empty while idle, and the element stays mounted: a live region has
              to be in the document before it updates, or the first count it
              carries is never announced. Idle used to draw the identity note,
              which the placeholder now carries — a standing line in a live
              region also meant a screen reader heard the identity again every
              time the search emptied. */}
          {open || noResults
            ? ownedOnly
              ? addPanelCopy.quickAdd.resultCountWithIdentity(results.length, identity)
              : unownedShown > 0
                ? addPanelCopy.quickAdd.ownedFilterOffNote(unownedShown)
                : addPanelCopy.quickAdd.resultCountWithIdentity(results.length, identity)
            : ""}
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
          // `overscroll-contain` (Hugh, 2026-10-03): stops a scroll of these results at
          // either end from chaining into the page behind, when this dock sits under a
          // scroll-locked dialog.
          className="order-first -mx-[16px] md:-mx-[30px] -mt-[10px] md:-mt-[11px] mb-[10px] md:mb-[11px] px-[16px] md:px-[30px] py-[12px] max-h-[290px] md:max-h-[400px] overflow-y-auto overscroll-contain"
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
                comboPartner={comboMap?.[r.oracleId] ?? null}
                query={trimmed}
                deckId={deckId}
                inDeck={inDeck(r)}
                selfClaimed={selfClaims(r)}
                declaredBracket={declaredBracket}
                noteCounts={noteCounts}
                active={i === activeIndex}
                onActivate={() => setActiveIndex(i)}
                registerAdd={i === activeIndex ? registerAdd : undefined}
                onAdded={() => setQuery("")}
              />
            ))}
          </ul>
          <p className="font-mono text-[10px] mt-[8px]" style={{ color: "var(--fg-locked)" }}>
            {addPanelCopy.quickAdd.keyboardHint}
          </p>
        </>
      )}

      {noResults && (
        // Centred, and the same shape as the app's other empty states: this is
        // a dead end rather than a row of the list, so it is not left-aligned
        // against results that are not there.
        <div className="flex flex-col items-center text-center py-[26px] px-[30px]">
          <p className="font-display font-bold text-[17px] m-0" style={{ color: "var(--fg)" }}>
            {addPanelCopy.quickAddEmpty.heading}
          </p>
          <p
            className="text-[13.5px] leading-[1.55] mt-[8px] max-w-[420px]"
            style={{ color: "var(--fg-muted)" }}
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
              className="mt-[12px] text-[12.5px] font-semibold underline cursor-pointer text-[color:var(--accent)] bg-transparent border-none"
              style={{ padding: 0 }}
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
  /** Null for a card with no combo, and for a map that has not landed. */
  comboPartner: { oracleId: string; name: string } | null;
  query: string;
  deckId: string;
  inDeck: boolean;
  /** This deck holds a claim the availability read excluded. See QuickAddBar. */
  selfClaimed: boolean;
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
  active: boolean;
  onActivate: () => void;
  registerAdd?: (fn: (r: SearchResult) => void) => void;
  /** The add landed: the bar clears its query for the next search. Not on a refusal, which this
   *  row reports, so it has to stay on screen to say it. */
  onAdded: () => void;
}

function QuickAddRow({
  id,
  result,
  comboPartner: comboHit,
  query,
  deckId,
  inDeck,
  selfClaimed,
  declaredBracket,
  noteCounts,
  active,
  onActivate,
  registerAdd,
  onAdded,
}: QuickAddRowProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();
  const ownership = result.owned
    ? addPanelCopy.quickAdd.rowOwned(result.ownedQty)
    : addPanelCopy.quickAdd.rowNotOwned;
  // Matrix 4, "the partner itself": a card in the deck carries no mark. `applied` covers both
  // a card that was in the deck already and one added from this row a moment ago — which is
  // the one clause an add can falsify, so this line is also the instant half of the refresh.
  const comboPartner = applied ? null : comboHit;
  const ownershipShort = result.owned ? addPanelCopy.quickAdd.rowOwnedShort(result.ownedQty) : undefined;
  // THE CARD NOTE, the third host after the Consider tile and the top-off row. The ordinal
  // keys on `inDeck` — the COMMITTED list — never on `applied`, which also turns true the
  // instant this row is pressed. The deck's counts move only when the add lands and the page
  // revalidates, so gating on `applied` counts the card twice for that beat: the Consider
  // tile's note did exactly that, "your 4th" dropping to "your 3rd" under the press.
  const note = {
    facts: result.facts,
    declared: declaredBracket,
    counts: noteCounts,
    density: "row" as const,
    inDeck,
  };
  const marks = factsFromCandidate(result.facts) ?? [];

  // The guard lives here rather than on the click handler alone: Enter reaches
  // the row through registerAdd, which would otherwise re-fire the mutation
  // while the optimistic row is showing but deckOracleIds has not caught up.
  const handleAdd = useCallback(() => {
    if (applied) return;
    run(
      async () => {
        const outcome = await addCardToDeck(deckId, result.oracleId);
        if (!outcome || outcome.ok) onAdded();
        return outcome;
      },
      () =>
        addOptimisticCard({
          oracleId: result.oracleId,
          name: result.name,
          typeLine: result.typeLine,
          cardTypeGroup: result.cardTypeGroup,
          role: result.role,
          owned: result.owned,
          quantity: 1,
          auto: false,
          // Carried, not left absent: the optimistic row draws before the
          // revalidate lands, and a row whose pips appear a beat after the rest
          // of it reads as the list correcting itself.
          // Null on an optimistic row: the search result carries the oracle
          // name only, and this row exists for the beat before the server
          // answers. The revalidate supplies the printed name; until then the
          // row reads exactly as it does today.
          printedName: null,
          printedSetCode: null,
          printedCollectorNumber: null,
          manaCost: result.manaCost,
          cmc: result.cmc,
          imageUri: result.imageUri,
        }),
    );
  }, [applied, run, deckId, result, addOptimisticCard, onAdded]);

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
        result.flavorName
          ? `${addPanelCopy.quickAdd.rowFlavorNamePrefix}${result.flavorName}`
          : null,
        result.owned ? addPanelCopy.quickAdd.rowOwned(result.ownedQty) : null,
        // The words the phone row replaces with a glyph, so the ear gets the whole sentence.
        comboPartner ? comboClauseSpoken(comboPartner.name, "completes") : null,
        applied ? addPanelCopy.quickAdd.rowInDeck : null,
        // The marks, then the note that elaborates them — the top-off row's order, and the
        // order they are drawn in. Both are drawn aria-hidden, so this is where they are heard.
        marks.length > 0 ? marks.map(cardFactName).join(", ") : null,
        cardNoteSpoken(note) || null,
      ]
        .filter(Boolean)
        .join(", ")}
      onMouseEnter={onActivate}
      // Keeps focus in the field, so the next search can be typed straight after the add.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleAdd}
      // An in-deck row is not actionable, so it must not offer a pointer.
      className={`flex flex-col rounded-[9px] min-h-[56px] md:min-h-[52px] px-[10px] md:px-[12px] py-[8px] ${applied ? "cursor-default" : "cursor-pointer"}`}
      style={{
        background: "var(--surface)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <CardSearchRowBody
        result={result}
        query={query}
        ownership={ownership}
        dim={applied}
        selfExcluded={selfClaimed}
        seam="var(--surface)"
        comboPartner={comboPartner}
        ownershipShort={ownershipShort}
        marks={marks}
        nameClassName="flex-1 min-w-0 md:flex-none md:w-[210px] flex flex-col"
        trailing={
          applied ? (
            // Label as well as greyscale, and aria-disabled on the option above.
            <span
              className="flex-none font-sans text-[12.5px] font-semibold text-right md:w-[56px]"
              style={{ color: "var(--success)" }}
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
              style={{ opacity: isPending ? 0.5 : undefined, color: "var(--accent)" }}
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
                color: "var(--accent)",
                background: "transparent",
                border: "1px solid var(--border-strong)",
                borderRadius: 7,
              }}
            >
              {addPanelCopy.quickAdd.rowAdd}
            </span>
          )
        }
      />

      {/* Below the row's line, inside its box — §C's host matrix for this row, and NOT indented.
          The matrix gives the name-column indent to the TOP-OFF row alone and says "atom
          unchanged" for this one, and the canvas's quick-add artboard (§1c) draws the note flush
          with the row's own content edge. The top-off row indents because its tick column sits
          under the note's natural start; this row leads with the card's crop instead, and the
          note runs the row's full width beneath it. `probe:card-note` asserts the flush edge. */}
      <CardNote {...note} spokenElsewhere />

      {error && <MutationError message={error} />}
    </li>
  );
}
