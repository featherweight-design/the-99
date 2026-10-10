"use client";

// Decklist Row — single card row with ownership dot, name, buy tag, remove button.
// §Decklist Row (design table), §3 #179 and §4 #185 (add-panel addendum table).

import { hasFrontFaceCost } from "../../lib/cards/faces";
import { useId } from "react";
import { removeCardFromDeck } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker } from "../ui/availability-marker";
import {
  COST_PIP_CAP,
  COST_PIP_SIZE,
  COST_TRACK,
  CostPips,
} from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { ROW_SHELL as SHARED_ROW_SHELL } from "../ui/row-shell";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { isBasicLand } from "../../lib/decks/grouping";
import { isSpokenFor } from "../../lib/decks/shopping";
import { AutoTag } from "./auto-tag";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger, useCardDetail, useCardIntent, type Sibling } from "../cards/card-detail-provider";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { usePreviewRow } from "./hover-preview";
import { MutationError } from "./mutation-error";
import {
  useMarkSlotSpent,
  useRemoveOptimisticCard,
  useReportRemoveFailure,
} from "./optimistic-deck";
import { usePassMark } from "./pass-mark";
import { usePendingChange } from "./pending-change";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { topOffCopy } from "../../lib/copy/top-off";
import { useDeckMutation } from "./use-deck-mutation";
import { useSpentSlotUndo } from "./spent-slot-undo";
import { ProxyTag } from "./proxy-tag";
import { deckRowTag } from "../../lib/decks/row-tag";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { useSwapTools } from "../../lib/swaps/context";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { useLockCards } from "./lock-cards";
import { useGotIt } from "./got-it";
import { LockMark } from "./lock-mark";

// Both rows are the same slot at both widths: phone 44px with the ✕'s own hit
// box making up the vertical padding, desktop 34px with real padding.
// Exception: a row carrying a meta line under the name grows to 52px on the
// phone. Desktop is 34px flat either way — there the meta line's contents sit
// inline with the name instead — with one exception of its own: a Shopping row
// keeps the phone's two lines up to lg (Hugh, 2026-09-26), because between md and
// lg the two-column grid squeezed its names to nothing beside a price, a figure
// and a pip track.
const ROW_PADDING = "pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]";

const ROW_SHELL = `${SHARED_ROW_SHELL} ${ROW_PADDING} min-h-[44px] md:min-h-[34px]`;

const ROW_SHELL_META = `${SHARED_ROW_SHELL} ${ROW_PADDING} min-h-[52px] md:min-h-[34px]`;

const ROW_SHELL_SHOPPING = `${SHARED_ROW_SHELL} ${ROW_PADDING} min-h-[52px] lg:min-h-[34px]`;

/** Phone pips ride the meta line at their own size, plain and uncapped — there
 *  the line is theirs alone and has the width to spend. Desktop takes the shared
 *  `COST_*` metrics: the track never widens, because a variable track would put
 *  the pips of adjacent rows on different vertical lines. */
const PIP_SIZE_PHONE = 13;

interface DecklistRowProps {
  deckId: string;
  card: DeckDetailCard;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: readonly Sibling[];
  /**
   * The decklist says this card's slot is spent, so the row draws its undo
   * receipt instead. Decklist state rather than row state: the row unmounts
   * with the card, and a receipt that lived here would not survive a tab
   * switch to Consider and back.
   */
  spent?: boolean;
  /**
   * EDHREC inclusion % for the Shopping view's meta line (addendum A2).
   * `undefined` — All view; no figure is rendered. Since #350 the row may
   *               still carry a meta line, for the cost.
   * `null`      — Shopping view; card has no EDHREC figure → prints rowNoFigure.
   * `number`    — Shopping view; prints rowFigure(pct). Never 0 as a stand-in for absent.
   */
  shoppingFigure?: number | null;
  /**
   * The Shopping list is drawing this row. Separate from `shoppingFigure`
   * because that answers a different question: with EDHREC unreachable every
   * figure is `undefined`, which is also the All view's value, and a row that
   * inferred the view from it would drop the plate from exactly the rows
   * amendment 5 adds — at the moment the list is least explicable.
   */
  inShopping?: boolean;
  /**
   * The newest `as_of` in the price table, for measuring a row's liveness.
   *
   * REQUIRED, with no default. A component that does not receive it reads every
   * live price as `absent` and draws a bare `buy` with no figure — a wrong price
   * rather than a missing prop, and silent. That shipped once: the commander
   * page threaded it to one of two synergy panels and every desktop row lost its
   * figure, while the phone was correct and every component test passed.
   *
   * Pass `null` explicitly where there is no price feed to measure against. The
   * point is that the caller states it.
   */
  newestAsOf: Date | null;
}

export function DecklistRow({
  deckId,
  card,
  siblings,
  spent = false,
  shoppingFigure,
  inShopping = false,
  newestAsOf,
}: DecklistRowProps) {
  const { open } = useCardDetail();

  // The name is a flex item of its own block, not of the row: `flex-auto` on
  // the trigger itself would grow the trigger's box past its text and strand a
  // count rendered after it at the far right of the row.
  const nameTextClass =
    "min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[12.5px] md:text-[13.5px]";

  // `flex-auto`, not `flex-1`, and the difference is the whole bug. `flex-1` is
  // basis-0: the name gets only what the marker has not already claimed as its
  // own intrinsic width, so a 390px over-committed row renders
  // `A ◆◆ short 1 — also in Atraxa Superfriends` and the card it describes is
  // gone. `flex-auto` bases the name on its own text, so a row too narrow for
  // both shrinks the two halves in proportion instead of starving one. Where
  // there is room to spare the two are identical — grow still takes the slack.
  const nameBlockClass = "flex-auto min-w-0 flex items-center gap-[6px]";

  // The draft changed this card (#389, surface 1), and the move that changed it.
  // Read this high because the count glyph below depends on it: a row whose
  // count merely moved prints `1 → 2` in the name's place, and `×2` beside that
  // is the second figure saying the same thing.
  const pendingChange = usePendingChange();
  const pendingMove = pendingChange?.moves.get(card.oracleId);
  const isPendingChange = pendingMove !== undefined;
  // A move out of a count the version already held, as against a card it did
  // not hold at all. Only the former has a pair to print, and it prints the same
  // pair whichever way the count went.
  const recounted = pendingMove && pendingMove.from > 0 && pendingMove.to > 0 ? pendingMove : null;

  // The standing bracket facts, inline after the count. `flex-none` in a name block that is
  // already `flex-auto min-w-0` with ellipsis, so the name shrinks and the marks never do —
  // and the row does not grow, because the glow is a filter and sits outside the box model.
  //
  // Not aria-hidden, unlike the count beside it: nothing else on this row speaks the fact,
  // and the row's accessible name is the trigger's own rather than a composed string, so
  // each mark carries its name and the reader hears it once.
  const factMarks = (card.facts ?? []).map((fact) => (
    <FactTooltip key={fact} fact={fact}>
      <CardFactMark fact={fact} />
    </FactTooltip>
  ));

  // Multi-copy count (addendum C5): one row per card, the count inline after
  // the name. aria-hidden because the ✕ beside it already speaks the same
  // figure in prose — a reader that voiced both would say the number twice.
  const quantityGlyph = card.quantity > 1 && !recounted && (
    <span
      aria-hidden
      className="flex-none font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]"
    >
      {addPanelCopy.row.quantity(card.quantity)}
    </span>
  );

  // Addendum A2: Shopping rows carry an EDHREC figure on a meta line below the
  // name. shoppingFigure is only threaded for unowned deck cards shown in the
  // Shopping filter. undefined = All view. null or number = Shopping view.
  // It says whether the FIGURE is drawn, and no longer whether the line is:
  // since #350 the cost rides that same line, so an All-view row can carry a
  // meta line with no figure on it.
  // Basic lands are never in Shopping (the fill guarantees it), but guard anyway.
  const hasShoppingMeta = !isBasicLand(card.typeLine) && shoppingFigure !== undefined;
  // The cost joins that same line on the phone, so a row can now carry one
  // without being in Shopping at all.
  const cost = hasFrontFaceCost(card.manaCost) ? card.manaCost : null;
  // Keyed on the GROUP, not on this row's own cost. Most costless cards are
  // lands, and lands are their own group under both groupings — but a handful
  // of spells have no printed cost either (Ancestral Vision, Restore Balance),
  // and a row that asked its own `cost` would put a 44px row in the middle of a
  // column of 52px ones. Ragged is the failure the group boundary exists to
  // avoid; a little more space under one name is not.
  const inLandsGroup = card.cardTypeGroup === "Lands";
  // Over the deck's Shopping limit (swap tools): the buy tag gains a ring and an `over $X`, stacked
  // on it below `lg` and beside it from `lg`. Shopping only, and only where the tools are on
  // (`swapTools` is null otherwise).
  //
  // Never on a COMMANDER's Shopping row (H28): the stand-ins exist to cut the card, and a deck
  // cannot cut its commander from a buying list, so neither the ring, the ⇄ nor the door draws.
  const commanderRow = card.commander === true;
  const swapTools = useSwapTools();
  const overLimit = swapTools !== null && inShopping && !commanderRow && isOverLimit(card.price, newestAsOf, swapTools.limitCents);
  // From a Shopping row with the swap tools on, the card draws the door to its stand-ins (audit F17).
  const opensDoor = swapTools !== null && inShopping && !commanderRow;
  const overText = overLimit ? swapToolsCopy.row.over(formatLimit(swapTools!.limitCents)) : null;
  // I got it (both switches on, mounted by the deck page): a Shopping row's tag is the button that
  // opens the confirm, on body and commander rows alike. Null with either switch off: main's row.
  const gotIt = useGotIt();
  // `over $X` never rides the meta line (it stacks on the buy tag), so being over the limit is no
  // reason to draw one.
  const hasMetaLine = hasShoppingMeta || !inLandsGroup;
  const rowShell = hasMetaLine ? (inShopping ? ROW_SHELL_SHOPPING : ROW_SHELL_META) : ROW_SHELL;
  // Phone: prefixed "edhrec 24%" because the figure sits on a detached meta
  // line and needs context. Desktop: bare "24%" because it is inline with the
  // name. Absence: phone gets the full sentence; desktop gets "—" which reads
  // fine beside the name but would be cryptic alone on a dedicated line.
  const figureTextPhone = Number.isFinite(shoppingFigure)
    ? recommendationsCopy.shopping.rowFigure(String(shoppingFigure as number))
    : recommendationsCopy.shopping.rowNoFigure;
  const figureTextDesktop = Number.isFinite(shoppingFigure)
    ? recommendationsCopy.shopping.rowFigureDesktop(String(shoppingFigure as number))
    : recommendationsCopy.shopping.rowNoFigureDesktop;
  // The whole row is the preview's trigger (#351), so the handlers go on the
  // shell rather than on the name — the name is the modal's trigger, and a
  // preview that only opened over it would be a second, smaller target for a
  // gesture the reader is already making across the row.
  const previewHandlers = usePreviewRow(card.imageUri);
  // The row body opens the card too, so resting on it prefetches the card as the name does.
  const intent = useCardIntent(card.oracleId, card.imageUri);
  // Two strings, because they answer different questions. The visible one is a
  // front face and may clip; the accessible one is whole and never does. The
  // modal — one tap away on this very name — is the recovery path for the clip.
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);
  // What the row prints. A recounted row carries its pair inline with the name,
  // because the brass rule says only "the draft touched this" and a reader
  // looking at `Sol Ring` cannot tell 1 → 2 from a card that was not there.
  // The accessible name stays `fullName`: the pair is about the deck's count,
  // not about which card this is.
  const rowLabel = recounted
    ? deckImportCopy.update.diff.recountedItem(
        displayName,
        String(recounted.from),
        String(recounted.to),
      )
    : displayName;
  const { isPending, error, run } = useDeckMutation(false, DECK_REMOVE_FALLBACK_MESSAGE);
  const removeOptimisticCard = useRemoveOptimisticCard();
  const markSlotSpent = useMarkSlotSpent();
  const reportRemoveFailure = useReportRemoveFailure();
  // A last-copy failure is the shell's to report: the row survives it now (the
  // spent slot keeps it mounted), so drawing its own message too would say the
  // same thing twice. A decremented stack, and a row with no shell above it,
  // still speak for themselves.
  const shellReportsFailure = reportRemoveFailure !== null && card.quantity <= 1;
  // `selfExcluded` unconditionally: every card on this list is claimed by this
  // deck, and the figures came from a query given this deck's id. Addendum 2 §6.
  // A missing read (null) is the free rendering — see DeckDetailCard.
  const availState = card.availability
    ? availabilityState(card.availability, { selfExcluded: true })
    : "free";
  // A card the Shopping list holds because its copies are spoken for, rather
  // than because the player does not own it (amendment 5, #281). Only in
  // Shopping: in the All view an over-committed row is not a purchase.
  // Basics are excluded for the filter's own reason, not the meta line's: the
  // fill never buys them, so an owned basic is never a purchase.
  const spokenFor = inShopping && isSpokenFor(card);
  // One answer, one slot — see `deckRowTag`.
  const tag = deckRowTag(card, spokenFor);
  const pressable = gotIt !== null && inShopping && tag === "buy";
  const confirmOpen = pressable && gotIt.openFor === card.oracleId;
  const passMark = usePassMark();
  const markLabel = passMark?.oracleIds.has(card.oracleId) ? passMark.label : null;
  const marked = markLabel !== null;
  // Referenced by both name triggers rather than being left to sit beside them.
  // Visually-hidden text alone is browse-mode only, and a reader moving through
  // the decklist by Tab never leaves focus mode — so the pass that placed the
  // card would go unspoken to exactly the reader the mark is drawn for.
  const markDescriptionId = useId();
  // The draft's own id rather than a share of the pass mark's (#389, surface 1):
  // a row can be both a pending add and the marked pass's card, and
  // `aria-describedby` takes both ids in reading order where one string could
  // only replace the other.
  const pendingDescriptionId = useId();
  // §Errata: the dot is decorative and the word it used to carry belongs to the
  // row. Said through the name's description rather than as the dot's own label
  // so the two facts about the card — which card, and whether it is owned —
  // arrive as one announcement instead of a stray word before the name.
  // `proxied` is excluded from BOTH halves, drawn and spoken. `owned` is a fact
  // about the collection and `proxied` a fact about this deck's slot, and
  // `grouping.ts` rules that the two are meant to disagree out loud — *not in
  // your collection · this deck's slot is filled*. A filled dot beside a `P`
  // says the opposite, and the word said it twice: this line fed the row's own
  // description, so a reader who cannot see the dot was TOLD the deck owns a
  // card it is printing.
  //
  // Read off the row's OWN `tag` rather than `card.proxied`, so the dot and the
  // mark beside it cannot disagree about what a proxied row is. `deckRowTag`
  // answers `proxy` first, before the ownership test, so this is the same
  // question the slot already asked.
  const proxied = tag === "proxy";
  const availabilityWord = card.owned && !proxied ? "Owned" : "Not owned";
  const availabilityDescriptionId = useId();
  // Locked (PR 4a). `null` with the switch off, and then nothing below draws a lock: the row is the
  // row it was. `locked` is the drawn answer, a press on this visit included (`useCardLocks`).
  const lockCards = useLockCards();
  const locked = lockCards !== null && card.locked === true;
  // The mode never runs under Shopping (switching to it ends the mode), so a Shopping row keeps
  // its ✕ whatever the flag says.
  const lockMode = lockCards?.mode === true && !inShopping;
  const lockError = lockCards?.errors.get(card.oracleId) ?? null;
  const lockDescriptionId = useId();
  const describedBy =
    [
      availabilityDescriptionId,
      // Right after the availability word (handoff copy, `mark.a11y`): which card, whether it is
      // owned, that it is locked, then what the deck has done with it.
      locked ? lockDescriptionId : null,
      marked ? markDescriptionId : null,
      isPendingChange ? pendingDescriptionId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  // The mark is an inset edge for the same reason the over tint is an inset
  // ring: 3px of real border would shunt one row's contents sideways.
  const rowEdges: string[] = [];
  if (marked) rowEdges.push("inset 3px 0 0 0 var(--accent)");
  // 2px, the Component notes table's width, and behind the pass mark's 3px when
  // a row carries both — the first shadow listed paints on top, and the wider
  // rule is the one that would otherwise show a seam under the narrower.
  if (isPendingChange) rowEdges.push("inset 2px 0 0 0 var(--accent)");
  if (availState === "over") rowEdges.push("inset 0 0 0 1px var(--avail-over-border)");

  function handleRemove() {
    // Outside `run`: the slot and its announcement are ordinary state, which
    // React holds for the length of an async transition. Inside, they would
    // land only once the server answered — after the window they exist for.
    const generation = markSlotSpent(card);
    // Dispatched into the deck-wide list as well as this row's own state, or
    // the row vanishes while the header, the tab counts, the role strip and the
    // group heading all keep claiming it for the length of the round-trip.
    run(
      async () => {
        try {
          await removeCardFromDeck(deckId, card.oracleId);
        } catch (cause) {
          // Only when this was the last copy, because only then has the
          // prediction unmounted the row and left `run`'s message with nothing
          // to draw on. A decremented stack still has its own line to say it.
          if (shellReportsFailure) reportRemoveFailure(card.oracleId, displayName, generation);
          throw cause;
        }
      },
      () => removeOptimisticCard(card),
    );
  }

  // The decklist's spent slot is the sole trigger for the receipt, and the
  // decklist's optimistic removal is what makes the row disappear. Reading this
  // row's own mutation state as well would key the receipt to something that
  // outlives what it describes — that state never returns to false, so once a
  // card had been removed and put back, React reusing the row under the same
  // key would draw the receipt over a card that is in the deck.
  // `rowShell` carries the same meta-line height this row would have drawn
  // live (H29: a receipt that is always 44px shrinks the slot of any card
  // that would have shown a meta line, and several stacked compound the
  // drift) — the one thing a bare `<UndoRow>` cannot know on its own.
  if (spent) return <UndoRow deckId={deckId} card={card} rowShell={rowShell} />;

  /**
   * The whole row opens the card, not only its name — which is how `/collection`'s rows have
   * always behaved, and a row with a 40px name and 500px of space beside it taught nobody
   * that the name was the only live part of it.
   *
   * A handler on the container rather than a `<button>` around the row: the row carries its
   * own controls — remove, undo, the buy link — and a button cannot contain them. So the
   * name keeps the real trigger, which is what the keyboard and the accessibility tree see,
   * and this adds the pointer target the rest of the row already looked like.
   */
  function openFromRow(event: React.MouseEvent<HTMLDivElement>) {
    // Anything with its own job keeps it. `closest` rather than a target check, because the
    // press usually lands on a glyph or a label inside the control rather than on it.
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea, [role='button']")) return;
    // Nor a drag over THIS row's own text: a reader selecting a card name has not asked for a
    // modal over the thing they were reading. Scoped to the row, and to a selection that is
    // actually a range — a page-wide check leaves every row inert after a selection anywhere
    // on the page, including one made in a row the reader has since scrolled past, and a
    // collapsed selection is just a caret.
    const selection = window.getSelection();
    const selectedHere = selection !== null
      && !selection.isCollapsed
      && selection.toString().length > 0
      && (event.currentTarget.contains(selection.anchorNode)
        || event.currentTarget.contains(selection.focusNode));
    if (selectedHere) return;
    // The row body opens the same modal as the name, so it hands over the art the same way.
    open(card.oracleId, siblings, undefined, { door: opensDoor, art: card.imageUri });
  }

  // The buy tag, drawn alone or under `over $X` in the md-to-lg group. `reserveSlot` is the
  // figure's own flag, not `inShopping`: the reserved slot exists to align the tag with the meta
  // line, so with no meta line to align to there is nothing to reserve. From lg only, since below
  // it the row is two lines and the figure hugs the word.
  const buyTag = (
    <BuyTag
      variant="row"
      // The plate says `buy` on both kinds of row — the act is the same
      // act, and on a contested row the `Spoken for` heading above and the
      // `short N` marker beside it already say which kind it is. The
      // sentence is still worth spending: a reader who arrives at the row
      // without the heading in earshot hears `buy` on a card they own.
      label={spokenFor ? recommendationsCopy.shopping.rowSecondCopyTagAria : undefined}
      price={card.price}
      newestAsOf={newestAsOf}
      reserveSlot={hasShoppingMeta ? "lg" : false}
      overLimit={overLimit}
      // `inShopping`, not the figure: Shopping is the list being paid
      // from, and the figure is `undefined` there too whenever EDHREC is
      // unreachable. The All tab is being scanned, so the tag collapses
      // to `$` — and still speaks the word and the price in full.
      density={inShopping ? "full" : "collapsed"}
      press={pressable ? {
        onPress: () => gotIt.open(card, fullName, newestAsOf),
        state: confirmOpen ? (gotIt.pending ? "pending" : "open") : "rest",
        cardName: fullName,
        // Below lg the stack flips to `buy` over `over $X` with the feature on (finding 5).
        under: overText,
      } : undefined}
    />
  );

  return (
    // Wrapper keeps the row and any error message as a single grid item.
    <div>
      {/* Row container */}
      {/* --row-bg exists so the over glyph's seam tracks the hover swap; a fixed
          seam string reads as a hairline through the glyph on hover.
          The over tint (design 4.5/4.10) is an inset ring rather than a border:
          a real border would add 2px to one row's height and shunt the list. */}
      <div
        {...previewHandlers}
        {...intent}
        // Named so a probe can address a decklist row without matching a
        // composed class list, which is the caller's and changes with it.
        data-decklist-row
        onClick={openFromRow}
        className={`group ${rowShell} cursor-pointer ${confirmOpen
          // The row keeps its hover ground while its confirm is up (A7).
          ? "bg-[color:var(--elevated-hover)] [--row-bg:var(--elevated-hover)]"
          : `bg-[color:var(--surface-rail)] md:hover:bg-[color:var(--elevated-hover)]
          [--row-bg:var(--surface-rail)] md:hover:[--row-bg:var(--elevated-hover)]`}`}
        style={rowEdges.length > 0 ? { boxShadow: rowEdges.join(", ") } : undefined}
      >
        {/* Ownership dot: solid green (owned) vs dashed hollow (unowned).
            No label — unlabelled it marks itself aria-hidden, which is the
            §Errata ruling: the word is the row's, said below. */}
        <OwnershipDot
          owned={card.owned && !proxied}
          className="w-[7px] h-[7px] md:w-[8px] md:h-[8px]"
        />

        {/* The word the dot used to carry. Ahead of the pass mark and the draft
            mark in `describedBy`, so a reader hears the card, then whether they
            own it, then what the deck has done with it. */}
        <span id={availabilityDescriptionId} className="sr-only">
          {availabilityWord}
        </span>
        {locked && (
          <span id={lockDescriptionId} className="sr-only">
            {lockedCardsCopy.mark.a11y}
          </span>
        )}

        {/* Card name — the click target for the detail modal (#127).
            Any row with a meta line — a Shopping row, or since #350 any row
            outside the Lands group: phone = two lines (name, then the cost and
            the prefixed figure below); desktop = single line (name, cost and
            bare figure inline). The `edhrec` prefix exists only on phone
            because the figure is detached from the name there and needs
            context; inline on desktop it reads fine without it. */}
        {hasMetaLine ? (
          // One trigger at both widths — the layout changes, the card does not.
          // Only the figure's wording differs, so only the figure is drawn twice.
          // `justify-center` is the column's vertical centring, and it has to be
          // undone on the row: on desktop this block turns horizontal, where the
          // same declaration centres the name in a `flex-auto` box wider than its
          // text and every name in the list floats off the left rail.
          // A SHOPPING row keeps this column, the phone's form, up to lg rather than md (Hugh,
          // 2026-09-26): the pips ride the meta line under the name there too, as they do on the
          // phone, so the name has the row's width. Tailwind reads whole class strings, so the two
          // breakpoints are spelled out rather than built.
          <div className={inShopping
            ? "flex-auto min-w-0 flex flex-col justify-center lg:flex-row lg:justify-start lg:items-center lg:gap-x-[6px] lg:gap-y-0"
            : "flex-auto min-w-0 flex flex-col justify-center md:flex-row md:justify-start md:items-center md:gap-x-[6px] md:gap-y-0"}>
            {/* Name and count share a line so the count stays inline after the
                name at both widths — on phone the meta line below is its own
                line, and a count that flowed down with it would read as part
                of it. */}
            <div className="min-w-0 flex items-center gap-[6px]">
              <CardDetailTrigger
                oracleId={card.oracleId}
                name={fullName}
                siblings={siblings}
                door={opensDoor}
                imageUri={card.imageUri}
                className={nameTextClass}
                describedBy={describedBy}
                style={{ color: "var(--fg)", background: "transparent", border: "none", padding: 0 }}
              >
                {rowLabel}
              </CardDetailTrigger>
              <TwoFacedMark layout={card.layout} />
              {quantityGlyph}
              {factMarks}
            </div>
            {/* The phone meta line, and the only things that ever ride it: the
                cost, then the EDHREC figure. Nothing else joins it; `over $X`
                stacks on the buy tag instead. */}
            <span className={`${inShopping ? "lg:hidden" : "md:hidden"} flex items-center gap-[5px] min-w-0`}>
              {cost ? <CostPips cost={cost} size={PIP_SIZE_PHONE} spoken /> : null}
              {cost && hasShoppingMeta ? (
                <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>
              ) : null}
              {hasShoppingMeta ? (
                <span
                  className="font-mono text-[10px] tabular-nums truncate"
                  style={{
                    color: Number.isFinite(shoppingFigure)
                      ? "var(--fg-faint)"
                      : "var(--fg-locked)",
                  }}
                >
                  {figureTextPhone}
                </span>
              ) : null}
            </span>
            {hasShoppingMeta ? (
              <span
                // `hasShoppingMeta` is Shopping only, so this reads the Shopping row's breakpoint.
                className="hidden lg:inline flex-none font-mono text-[10px] tabular-nums"
                style={{
                  color: Number.isFinite(shoppingFigure)
                    ? "var(--fg-faint)"
                    : "var(--fg-locked)",
                }}
              >
                {figureTextDesktop}
              </span>
            ) : null}
            {overText ? (
              // The block's 6px gap sits before this item; the design's figure-to-`·` gap is 5px, the
              // one-pixel pull that makes the two read as one group. With no figure there is no `·`,
              // and the name keeps the block's own gap.
              <span className={`hidden lg:inline-flex flex-none items-center gap-[5px] ${hasShoppingMeta ? "lg:-ml-px" : ""} font-mono text-[10px] whitespace-nowrap`}>
                {hasShoppingMeta ? <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span> : null}
                <span style={{ color: "var(--warning)" }}>{overText}</span>
              </span>
            ) : null}
          </div>
        ) : (
          <div className={nameBlockClass}>
            <CardDetailTrigger
              oracleId={card.oracleId}
              name={fullName}
              siblings={siblings}
              door={opensDoor}
              imageUri={card.imageUri}
              className={nameTextClass}
              describedBy={describedBy}
              style={{ color: "var(--fg)" }}
            >
              {rowLabel}
            </CardDetailTrigger>
            <TwoFacedMark layout={card.layout} />
            {quantityGlyph}
            {factMarks}
            {overText ? (
              // A row with no meta line (a land with no EDHREC figure) still owes its `over $X` from
              // `lg`, where the stack on the buy tag is hidden. No figure, so no `·`.
              <span className="hidden lg:inline flex-none font-mono text-[10px] whitespace-nowrap" style={{ color: "var(--warning)" }}>
                {overText}
              </span>
            ) : null}
          </div>
        )}

        {/* Desktop's fixed pip track, between the name block and the
            availability slot. Its own element rather than a share of the meta
            line's: on desktop that line is inline with the name, and pips laid
            out with the name would ride the name's variable width and lose the
            vertical line the fixed track exists to hold.
            `hidden` is display:none, so exactly one of the two runs is in the
            accessibility tree at any width and the cost is spoken once. */}
        {cost ? (
          <span className={`hidden ${inShopping ? "lg:flex" : "md:flex"} flex-none items-center`}>
            <CostPips
              cost={cost}
              size={COST_PIP_SIZE}
              track={COST_TRACK}
              cap={COST_PIP_CAP}
              spoken
            />
          </span>
        ) : null}

        {/* Availability marker — suppressed on a printed row, as the card tile
            suppresses its chip for the same state. Printing IS the slot's
            answer, so a chip describing the copies competing for it contradicts
            the mark beside it, and the two views would disagree about one card
            one toggle apart. */}
        {card.availability && tag !== "proxy" && (
          <AvailabilityMarker bareOne
            availability={card.availability}
            seam="var(--row-bg)"
            selfExcluded
            // Nothing above this row carries an aria-label to hoist the prose
            // into — the name is its own button — so the marker speaks for
            // itself. Design 17.5 is written for this surface specifically.
            spoken
            // Count-only in BOTH views (#354). A bare `short` (or `short N` above one copy), never
            // `short, also in Atraxa`. The clause's prefix is ~120px and
            // never truncates by contract, but the name after it does: this row
            // also carries the EDHREC figure, the tag and a 44px ✕, so at 390px
            // and inside the 2-up desktop grid the name loses its tail and
            // `also in HD Tune - Prism…` teaches nothing.
            //
            // The name is not withheld, it moved. The card modal's allocation
            // receipt (#353) names every claiming deck and links each one, which
            // is a better answer than one truncated name and is why this stopped
            // being Shopping-only.
            nameless
            // The component sets no size or family of its own (design 3.4: the
            // label inherits the meta line's mono size), and this row has no
            // meta line to inherit — it would otherwise render in the page's
            // sans base and grow a 34px row. The caller supplies both, a step
            // below the card name so the marker stays the quieter half.
            //
            // `shrink-0` because the marker no longer has a flexible half to
            // give up (#354). It used to carry `shrink-[4]`, which expressed
            // Design's ruling that the card name is the more useful half as an
            // order of yielding: the deck name truncated to a 6ch floor before
            // the card name lost a character. Count-only, the whole marker is
            // one `flex-none` run of about 50px, so a shrink budget it cannot
            // absorb would overflow the box rather than clip inside it. The
            // ruling cost almost nothing to give up: what the marker used to
            // yield was the deck name, and there is no deck name left to yield.
            className="shrink-0 font-mono text-[11px] md:text-[11.5px]"
          />
        )}

        {/* Buy tag — a card you don't own, or one the Shopping list is showing
            because your copies are already sleeved elsewhere. One plate for
            both: the act is the same act, and which kind of row it is is
            already carried by the marker a few pixels to the left. */}
        {/* THE SLOT IS ONE SLOT. `deckRowTag` decides which mark lands in it and
            the two can never co-occur: a row saying at once that the player is
            printing this card and that they must buy it is the one state in this
            feature nobody has drawn. */}
        {tag === "proxy" && <ProxyTag variant="row" />}
        {/* Below lg, `over $X` and the buy tag are ONE group, the limit stacked above the tag
            (Hugh, 2026-09-26, from md; extended to the phone 2026-09-28, "particularly on mobile"):
            the name keeps the row's width, and the limit stays beside the price it is about. From
            lg it sits inline after the figure, so this copy is drawn only below that. */}
        {pressable ? buyTag : overText ? (
          <span className="flex flex-none flex-col items-end gap-[2px]">
            <span className="block lg:hidden font-mono text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--warning)" }}>
              {overText}
            </span>
            {tag === "buy" ? buyTag : null}
          </span>
        ) : tag === "buy" ? buyTag : null}

        {/* Auto tag — one per stack. Not in Shopping (Hugh, 2026-09-28): where a card came from is
            nothing a buying trip needs, and that row is the busiest in the app. */}
        {card.auto && !inShopping && <AutoTag deckId={deckId} oracleId={card.oracleId} name={card.name} />}

        {/* The ledger is marking this pass. Additive to the card's own button
            name rather than a replacement for it: the row has no aria-label to
            extend. It follows the name and the auto tag rather than leading the
            row, so a reader hears which card before hearing which pass placed
            it — the same order the eye takes, and the order aria-describedby
            reads it in too. */}
        {markLabel && (
          <span id={markDescriptionId} className="sr-only">
            {topOffCopy.ledger.markedRow(markLabel)}
          </span>
        )}

        {/* The pending change's whole visible treatment is the brass rule, which a
            screen reader cannot see. The word rides the name's accessible
            description instead — never rendered visually, because the
            card-rows floor makes name width the binding constraint and a chip
            would spend ~86px of it on every added row. A recounted row's pair
            rides this description too, because the name's accessible label is
            the printed name and the visible `1 → 2` is not part of it. */}
        {isPendingChange && (
          <span id={pendingDescriptionId} className="sr-only">
            {recounted
              ? recounted.to > recounted.from
                ? deckVersioningCopy.pending.addMarkRecountedA11y(
                    recounted.from,
                    recounted.to,
                  )
                : deckVersioningCopy.pending.cutMarkRecountedA11y(
                    recounted.from,
                    recounted.to,
                  )
              : deckVersioningCopy.pending.addMarkA11y}
          </span>
        )}

        {/* The ⇄ (swap tools, R2): on an over-limit Shopping row only, opening its cheaper
            stand-ins. A row under the limit keeps an empty 22px slot on desktop so every ✕ stays
            in one column; the phone gives those 44px back to the name. */}
        {/* A LOCKED row's ⇄ is absent with its slot kept (STATES, Shopping): the stand-ins sheet
            exists to cut this card, and the player said it is never cut. */}
        {swapTools && inShopping ? (
          overLimit && !locked ? (
            <button
              type="button"
              aria-label={swapToolsCopy.row.swapOverAria(displayName, formatLimit(swapTools.limitCents))}
              onClick={() => swapTools.openStandIns(card)}
              className="flex flex-none items-center justify-center w-[44px] h-[44px] -mr-[9px] md:mr-0 md:w-[22px] md:h-[20px] rounded-[6px] font-mono text-[13px] leading-none bg-transparent border-0 p-0 cursor-pointer text-[color:var(--warning)]"
            >
              ⇄
            </button>
          ) : (
            <span aria-hidden="true" className="hidden md:block flex-none w-[22px]" />
          )
        ) : null}

        {/* THE LOCK MARK (Locked), left of the ✕, on a LOCKED row only and outside the mode. It is a
            mark, not a control: Lock cards mode is the one way to set or clear a lock (Hugh, staging
            walk 2026-09-25, overruling R2's decision 2, the desktop hover shortcut and the 22px slot it
            reserved on every row). An unlocked row reserves nothing at either width. That slot also
            widened every row's min-content, which is what pushed Shopping past the frame. */}
        {locked && !lockMode && (
          <span className="flex flex-none w-[14px] items-center justify-center" data-testid="row-lock-mark">
            <LockMark title={lockedCardsCopy.mark.title} />
          </span>
        )}

        {/* In the mode the ✕ is a lock toggle: `aria-pressed` carries the state, and the name
            names the card. 26×22 on desktop; a 36px box in a 44px hit on the phone. Unlocked, an
            open lock on a `--border-strong` box; locked, the closed lock in `--accent` on an accent
            box with a 14% fill, the ink of the toolbar's `Done`. The ✕ returns on `Done`. */}
        {lockCards && lockMode ? (
          <button
            type="button"
            aria-pressed={locked}
            aria-label={lockedCardsCopy.mode.toggleAria(displayName)}
            aria-busy={lockCards.pending.has(card.oracleId)}
            onClick={() => lockCards.toggle(card)}
            data-testid="row-lock-toggle"
            // `md:-my-[1px]`: the drawn box stays 26×22, but a desktop row's content box is 20px
            // tall, so without it every row grew 2px the moment the mode began (Hugh, 2026-09-26).
            // The phone's 44px hit is the row's own 44, and needs nothing.
            className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-[26px] md:h-[22px] md:-my-[1px] bg-transparent border-0 p-0 cursor-pointer"
          >
            <span
              className={`flex items-center justify-center w-[36px] h-[36px] md:w-[26px] md:h-[22px] rounded-[6px] border ${
                locked
                  ? "border-accent bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)]"
                  : "border-border-strong"
              }`}
            >
              <LockMark open={!locked} tone="mode" />
            </span>
          </button>
        ) : commanderRow ? (
        /* A commander's row has no ✕ (H28): the commander is not a list card, and removing it is
            Change commander's job. The glyph is kept, invisible and out of the accessibility tree,
            so the buy tag stays in the column every other row's ✕ holds it in. */
        <span
          aria-hidden="true"
          className="invisible flex-none flex items-center justify-center w-[44px] h-[44px] md:w-auto md:h-auto text-[13px] leading-none"
        >
          {addPanelCopy.row.remove}
        </span>
        ) : (
        /* Remove ✕ — at both widths now. The glyph stays 13px at both: the
            phone target is the padding around it. */
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-auto md:h-auto
            rounded-[6px] bg-transparent border-none text-[13px] leading-none text-[color:var(--border-dashed)]
            active:bg-[color:var(--elevated)] active:text-[color:var(--fg-body)] md:active:bg-transparent
            md:group-hover:text-[color:var(--fg-body)] cursor-pointer disabled:opacity-50 disabled:cursor-default"
          aria-label={
            card.quantity > 1
              ? addPanelCopy.row.removeCopyAria(displayName, card.quantity)
              : addPanelCopy.row.removeAria(displayName)
          }
        >
          {addPanelCopy.row.remove}
        </button>
        )}
      </div>
      {error && !shellReportsFailure && <MutationError message={error} />}
      {/* A refused lock reverts and says why here, under its row (STATES, pending / refused). */}
      {lockError && <MutationError message={lockError} />}
    </div>
  );
}

/**
 * The receipt a spent slot leaves behind. No toast and no timer: #185 exists
 * because the optimistic path makes the row vanish faster than a mis-click is
 * noticed, and a five-second toast that also vanishes fixes half of that.
 *
 * Undo is a re-add rather than a rollback — the same `addCardToDeck` the
 * suggestion tile calls. No new server action and no new server state.
 *
 * Optimistic (Hugh, 2026-09-28): the card is back the moment Undo is pressed,
 * and this row unmounts under it. A refusal is held by the shell and read back
 * here when the reverted prediction draws the receipt again; see
 * `useSpentSlotUndo`.
 *
 * `rowShell` is the caller's own, already-computed shell for the card this
 * receipt replaces (H29) — a receipt that is always the plain 44px shell
 * shrinks the slot of any removed card that would have drawn a meta line,
 * and several stacked receipts compound that into a visible drift.
 */
function UndoRow({
  deckId,
  card,
  rowShell,
}: {
  deckId: string;
  card: DeckDetailCard;
  rowShell: string;
}) {
  const { isPending, error, undo: handleUndo } = useSpentSlotUndo(deckId, card);

  return (
    <div>
      <div
        // Same marker a live row carries, for the same reason: a probe can
        // address a receipt without matching a composed class list (H29).
        data-decklist-row
        className={`${rowShell} bg-surface-sunken border border-dashed border-border-strong`}
      >
        {/* No dot on a spent slot — the spacer keeps the name aligned with the
            live rows above and below it. */}
        <span className="flex-none w-[7px] h-[7px] md:w-[8px] md:h-[8px]" aria-hidden />
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[11.5px] md:text-[12px] text-fg-locked">
          {/* The name the reader's own copy prints, exactly as the row this
              receipt replaces does — and as the list's own order does. A
              receipt calling a renamed printing by its oracle name sits in the
              list by one name and announces itself by another. */}
          {addPanelCopy.undo.removed(printedFaceName(card))}
        </span>
        {/* Absent once the undo has been refused: the message below tells the
            player where to go instead. */}
        {!error && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={isPending}
            className="flex-none flex items-center h-[44px] px-[12px] md:h-auto md:px-0
              bg-transparent border-0 md:border-b md:border-b-accent-shadow md:border-accent-shadow
              text-[13px] md:text-[12.5px] font-semibold md:leading-[1.4]
              text-accent md:hover:text-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-default"
            aria-label={addPanelCopy.undo.actionAria(printedFaceName(card))}
          >
            {addPanelCopy.undo.action}
          </button>
        )}
      </div>
      {error && <MutationError message={error} />}
    </div>
  );
}
