"use client";

// Decklist Row — single card row with ownership dot, name, buy tag, remove button.
// §Decklist Row (design table), §3 #179 and §4 #185 (add-panel addendum table).

import { formatPriceFigure, priceState } from "../../lib/decks/price";
import { hasFrontFaceCost } from "../../lib/cards/faces";
import { TOUCH_HIT, TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { useId, useState } from "react";
import { removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { printedNameOf } from "../../lib/collection/browse";
import { deckRowName } from "../../lib/decks/row-name";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
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
import { CountStepper } from "../ui/count-stepper";
import { useBasicCount } from "./use-basic-count";
import { isSpokenFor } from "../../lib/decks/shopping";
import { AutoTag } from "./auto-tag";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger, useCardDetail, useCardIntent, type Sibling } from "../cards/card-detail-provider";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { ComboMark } from "../cards/combo-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { cardMarkCopy, type CardFact } from "../../lib/copy/card-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
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
import { gotItCopy } from "../../lib/copy/i-got-it";
import { OtherWaysPress } from "../social/spare-markers";
import { useSwapTools } from "../../lib/swaps/context";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { foilMarkCopy } from "../../lib/copy/foil-mark";
import { FoilGlint } from "../cards/foil-mark";
import { useLockCards } from "./lock-cards";
import { useGotIt } from "./got-it";
import { LockMark } from "./lock-mark";

// One 34px line at every width (the one-line row, card rows addendum L1, extended to the phone by Hugh, 2026-10-16: the
// boards draw the tight tier at 340px on one line, and a phone row is about 358px). The row folds its marks by its own
// width (`@container`, below), so a phone is simply a narrow row. The presses keep a 44px hit on a coarse pointer
// (`TOUCH_HIT`), drawn past their box rather than grown into it, so the line stays 34px.
const ROW_PADDING = "px-[9px] py-[7px]";

const ROW_SHELL = `${SHARED_ROW_SHELL} ${ROW_PADDING} min-h-[34px]`;


/**
 * A Shopping row's slots: the one line every card row is, with the buy tag in its own 84px column (a minimum: a qualified
 * price such as `$12.50 etched` is wider, and grows leftward rather than over its neighbour) and the ✕ after it (the card rows
 * addendum, L2 and L6): the marker and the press flow left of them. Option B's two lines below `md` retired when the row
 * became one line at every width (Hugh, 2026-10-16).
 */
type LineSlots = {
  remove: string;
  swap: string;
  buyStack: string;
  buy: string;
};
const SHOPPING_SLOTS: LineSlots = {
  remove: "order-2",
  // The press keeps its 26px box and takes 3px off each side of the line, so a row holding it stays 34px (L8).
  swap: "-my-[3px]",
  buyStack: "order-1 min-w-[84px]",
  buy: "flex order-1 min-w-[84px] flex-none items-center justify-end",
};

/**
 * The marks fold by the ROW's own width (the card rows addendum, L3), a container query on `DecklistRow`'s wrapper rather than a
 * viewport width: a two-column grid at 900px and a one-column page at 1300px give a row the same width. Wide is 480px and up
 * (the boards' `max-width: 479px` is inclusive, Tailwind's `@max-[480px]` is not), middle 360 to 479, tight under 360. Folded marks go `sr-only`, never `display: none`, so a screen reader keeps hearing them;
 * the `+N` spans are aria-hidden, one per tier, each drawn only in its own. At every width: a phone row is a tight one.
 * Every class spelled whole so Tailwind sees it.
 */
const FOLD = {
  // All: the 5th mark and beyond at every width, every mark after the second at the middle tier, every mark after the first in
  // the tight one. One more than Shopping's rhythm at each tier: an All row draws a bare `$` where it drew a price (Hugh,
  // 2026-10-16), and the room that frees goes to the marks.
  all: {
    fifth: "sr-only",
    afterSecond: "@max-[480px]:sr-only",
    afterFirst: "@max-[360px]:sr-only",
    plusWide: "hidden @min-[480px]:inline",
    plusMid: "hidden @min-[360px]:@max-[480px]:inline",
    plusTight: "hidden @max-[360px]:inline",
  },
  // Shopping: every mark at the middle tier, and the `+N` stands in for them there AND in the tight one (d9, 2026-10-16: a
  // phone Shopping row is a tight one, and dropping the `+N` there left its marks no way onto the screen).
  shopping: {
    all: "@max-[480px]:sr-only",
    plus: "hidden @max-[480px]:inline",
  },
} as const;
/**
 * The availability marker's word drops to its glyph (and its count) at the middle tier, in All and Shopping alike (d9, 2026-10-16:
 * All kept it to the tight tier, and at 900 a row reading `1 in a draft` cut a 20-character name); the wide tier keeps it.
 */
const WORD_FOLD = { all: "@max-[480px]:hidden", shopping: "@max-[480px]:hidden" } as const;


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
   * I got it bought this card and it left the Shopping list: the row's slot holds as the
   * spent-slot shape, `Name · in your collection`, until the list is next read (call 8). Decklist
   * state, from the provider's `held`, so it survives the revalidation that drops the card.
   */
  held?: boolean;
  /**
   * An undo brought this row back where its held slot was: it fades in from its first frame. The
   * decklist derives it at render (held, slot drawn, billed again), so there is no effect to wait on.
   */
  cameBack?: boolean;
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
  /**
   * A list the reader cannot edit (a precon's): no buy tag, no remove, no auto tag; the right slot
   * carries the card's printing (`printedSetCode printedCollectorNumber`) instead. Card details on
   * press and the hover preview stay.
   */
  readOnly?: boolean;
}

export function DecklistRow({
  deckId,
  card,
  siblings,
  spent = false,
  held = false,
  cameBack = false,
  shoppingFigure,
  inShopping = false,
  newestAsOf,
  readOnly = false,
}: DecklistRowProps) {
  const { open } = useCardDetail();

  // The name is a flex item of its own block, not of the row: `flex-auto` on
  // the trigger itself would grow the trigger's box past its text and strand a
  // count rendered after it at the far right of the row.
  const nameTextClass =
    "min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[13.5px]";

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

  // THE BASICS STEPPER (handoff `design_handoff_the99_basic_lands_stepper`, R2): on a basic land's row,
  // `− count +` takes the ✕'s place and the `×N`'s. Not on a commander (H28), a read-only precon list, or
  // Shopping (no basic is ever there), and it yields to the lock toggle in Lock cards mode, as the ✕ does.
  const basicRow = isBasicLand(card.typeLine) && !readOnly && card.commander !== true && !inShopping;
  const lockModeOn = useLockCards()?.mode === true;
  const stepperOn = basicRow && !lockModeOn;
  const [settledLine, setSettledLine] = useState("");
  const basic = useBasicCount({
    deckId,
    oracleId: card.oracleId,
    quantity: card.quantity,
    onSettled: (n) => setSettledLine(addPanelCopy.basicStepper.settled(deckRowName(card), n)),
  });
  // `from N`: the committed figure, when the count on screen is not it. The stepper prints the new count, so the
  // shipped `6 → 8` pair keeps only its left half (STATES rule 7). A card the version did not hold (`from` 0)
  // has no pair to print and keeps the add mark alone. With no version there is nothing to compare against.
  const committedCount = !stepperOn
    ? null
    : recounted
      ? recounted.from
      : pendingChange && !pendingMove
        ? basic.base
        : null;
  const fromMarker = committedCount !== null && basic.count !== committedCount ? committedCount : null;
  // A stepper row speaks its recount from the committed count and the count ON SCREEN, in place of the draft's
  // pending description, which describes the last SAVED move and goes stale the moment a press moves the count
  // (the shipped recount strings, up or down). Back at the committed figure it says nothing, as it draws nothing.
  // A basic new to the deck (`from` 0) has no committed count, and keeps the shipped add description.
  const stepperSpeaks = committedCount !== null;
  const fromDescriptionId = useId();
  const fromSpoken =
    fromMarker !== null
      ? basic.count > fromMarker
        ? deckVersioningCopy.pending.addMarkRecountedA11y(fromMarker, basic.count)
        : deckVersioningCopy.pending.cutMarkRecountedA11y(fromMarker, basic.count)
      : null;

  // The standing bracket facts, inline after the count. `flex-none` in a name block that is
  // already `flex-auto min-w-0` with ellipsis, so the name shrinks and the marks never do —
  // and the row does not grow, because the glow is a filter and sits outside the box model.
  //
  // Not aria-hidden, unlike the count beside it: nothing else on this row speaks the fact,
  // and the row's accessible name is the trigger's own rather than a composed string, so
  // each mark carries its name and the reader hears it once.
  //
  // From `md` the marks fold by the row's own width (`FOLD`): a folded mark goes sr-only, never display:none, so a screen
  // reader keeps it, and the `+N` beside them (aria-hidden, one per tier) says how many a sighted reader no longer sees. The
  // order is the shipped one (CARD_FACTS), so what folds first is the last.
  //
  // THE COMBO MARK (single-line row PR 2) is the last mark, after the facts: this card's two-card combo partner in this
  // deck. Its glyph is silent; the row's description speaks the same sentence its tooltip shows.
  const combo = card.comboPartner ?? null;
  const comboSentence = combo
    ? card.comboOtherPartners
      ? comboAwarenessCopy.deckTooltip.inDeckMore(combo.name, card.comboOtherPartners)
      : comboAwarenessCopy.deckTooltip.inDeck(combo.name)
    : null;
  const marks: ({ kind: "fact"; fact: CardFact } | { kind: "combo"; sentence: string })[] = [
    ...(card.facts ?? []).map((fact) => ({ kind: "fact" as const, fact })),
    ...(comboSentence ? [{ kind: "combo" as const, sentence: comboSentence }] : []),
  ];
  const markFold = (i: number): string =>
    inShopping ? FOLD.shopping.all : i >= 4 ? FOLD.all.fifth : i >= 2 ? FOLD.all.afterSecond : i >= 1 ? FOLD.all.afterFirst : "";
  // The whole row is the preview's trigger (#351), so the handlers go on the
  // shell rather than on the name — the name is the modal's trigger, and a
  // preview that only opened over it would be a second, smaller target for a
  // gesture the reader is already making across the row.
  const previewHandlers = usePreviewRow(card.imageUri, card.foil);
  // THE +N SUPPRESSES THE ROW'S PREVIEW while the pointer is on it (d9, 2026-10-16): its tooltip lists the folded marks, and the
  // 252x352 card would cover the rows under it. Entering the chip closes the preview, its moves never reach the row's, and leaving
  // it (back to the name) opens it again; leaving the row from the chip closes it after, on the row's own leave. The chip takes
  // no focus (aria-hidden, no hit area), and the preview is a pointer gesture only, so there is no focus half.
  const plusPointer = {
    onMouseEnter: () => previewHandlers.onMouseLeave?.(),
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => e.stopPropagation(),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => previewHandlers.onMouseEnter?.(e),
  };
  const plusN = (fromIndex: number, className: string) => {
    const folded = marks.slice(fromIndex);
    if (folded.length === 0) return null;
    return (
      // The tier's visibility sits on the OUTER span, outside the tooltip's own wrapper (a fine pointer adds an inline-flex
      // item around its child): an inactive tier is then no flex item at all, and takes none of the name block's gap.
      <span key={className} className={`${className} flex-none font-mono text-[11px] leading-none`} {...plusPointer}>
        {/* On touch a tap opens the bubble (`tapOnTouch`), the one way the folded marks reach a phone screen, and the tap
            stops there rather than opening card details. Its 44px-tall hit is drawn past the figure (`TOUCH_HIT_INLINE`), never over its neighbours. */}
        <FactTooltip
          tapOnTouch
          lines={folded.map((m) =>
            m.kind === "fact" ? (
              <>
                <CardFactMark fact={m.fact} />
                {cardMarkCopy[m.fact]}
              </>
            ) : (
              <>
                <ComboGlyph />
                {m.sentence}
              </>
            ),
          )}
        >
          <span aria-hidden="true" className={TOUCH_HIT_INLINE} style={{ color: "var(--fact)" }}>
            +{folded.length}
          </span>
        </FactTooltip>
      </span>
    );
  };
  const factMarks = [
    ...marks.map((m, i) => (
      <span key={m.kind === "fact" ? m.fact : "combo"} className={`inline-flex flex-none ${markFold(i)}`}>
        {m.kind === "fact" ? (
          <FactTooltip fact={m.fact}>
            <CardFactMark fact={m.fact} />
          </FactTooltip>
        ) : (
          <ComboMark partnerName={combo!.name} otherPartners={card.comboOtherPartners} scope="deck" />
        )}
      </span>
    )),
    ...(inShopping
      ? [plusN(0, FOLD.shopping.plus)]
      : [plusN(4, FOLD.all.plusWide), plusN(2, FOLD.all.plusMid), plusN(1, FOLD.all.plusTight)]),
  ];

  // Multi-copy count (addendum C5): one row per card, the count inline after
  // the name. aria-hidden because the ✕ beside it already speaks the same
  // figure in prose — a reader that voiced both would say the number twice.
  const quantityGlyph = card.quantity > 1 && !recounted && !stepperOn && (
    <span
      aria-hidden
      className="flex-none font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]"
    >
      {addPanelCopy.row.quantity(card.quantity)}
    </span>
  );
  // The stepper row's `from N`. aria-hidden: the name's description keeps the shipped recount strings.
  const fromGlyph = fromMarker !== null && (
    <span aria-hidden className="flex-none font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]">
      {addPanelCopy.basicStepper.from(fromMarker)}
    </span>
  );
  // With no ✕ (a read-only row), nothing else speaks the count, so the row says it once, through
  // the name's description as the other row facts are, so a reader on the focused name hears it.
  const quantityDescriptionId = useId();
  const speaksQuantity = readOnly && card.quantity > 1;
  const quantitySpoken = speaksQuantity && (
    <span id={quantityDescriptionId} className="sr-only">{addPanelCopy.row.quantitySpoken(card.quantity)}</span>
  );

  // The printed cost, for All's fixed pip track. Shopping draws no pips (L2).
  const cost = hasFrontFaceCost(card.manaCost) ? card.manaCost : null;
  // Over the deck's Shopping limit (swap tools): the buy tag gains an outline, and the words `over $X` ride its
  // description and the key's item, never beside the price. Shopping only, and only where the tools are on
  // (`swapTools` is null otherwise).
  //
  // Never on a COMMANDER's Shopping row (H28): the stand-ins exist to cut the card, and a deck
  // cannot cut its commander from a buying list, so neither the ring, the ⇄ nor the door draws.
  const commanderRow = card.commander === true;
  const swapTools = useSwapTools();
  // A Shopping row's slots (`SHOPPING_SLOTS`): the buy tag's 84px column and the ✕ after it. Outside Shopping none is spelled.
  const shopSlots = inShopping && !readOnly;
  // One slot's classes for this row, with the leading space, or nothing when the row takes no Shopping slots.
  const withAt = (k: keyof LineSlots) => (shopSlots ? ` ${SHOPPING_SLOTS[k]}` : "");
  // An All row's pip track and the ✕ are its fixed right-hand columns (L6): the pip track and the ✕ sit last by `order`, so the
  // marker, the price, the auto tag and the lock mark all flow left of them. A basic land's stepper row and a read-only precon row
  // keep the order they had.
  const allFixedCols = !shopSlots && !readOnly && !basicRow;
  const endCol = allFixedCols ? " order-2" : "";
  // The finish the glint says, by the film's own rule (only over art). Said in words in the row's description, never twice.
  const foilFinish = card.imageUri ? card.foil : undefined;
  const foilDescriptionId = useId();
  const comboDescriptionId = useId();
  const overLimit = swapTools !== null && inShopping && !commanderRow && isOverLimit(card.price, newestAsOf, swapTools.limitCents);
  const overText = overLimit ? swapToolsCopy.row.over(formatLimit(swapTools!.limitCents)) : null;
  // I got it (both switches on, mounted by the deck page): a Shopping row's tag is the button that
  // opens the confirm, on body and commander rows alike. Null with either switch off: main's row.
  const gotIt = useGotIt();
  // The card opened from a Shopping row draws what is registered for that: the door to its stand-ins
  // with the swap tools on (audit F17; never a commander's, H28), and with I got it on the receipt's
  // `Bought this card?` (A11), commander rows too. Each registration finds its own rows.
  const opensDoor = inShopping && ((swapTools !== null && !commanderRow) || gotIt !== null);
  const rowShell = ROW_SHELL;
  // The row body opens the card too, so resting on it prefetches the card as the name does.
  const intent = useCardIntent(card.oracleId, card.imageUri);
  // Two strings, because they answer different questions. The visible one is a
  // front face and may clip; the accessible one is whole and never does. The
  // modal — one tap away on this very name — is the recovery path for the clip.
  // The front face of a two-faced card, beside the `//` mark the row draws for it (d9, 2026-10-16): the whole oracle string
  // and the mark said the back face twice, and cost the row half its name. The full name is the trigger's accessible name.
  const fullName = printedNameOf(card);
  const displayName = deckRowName(card);
  // What the row prints. A recounted row carries its pair inline with the name,
  // because the brass rule says only "the draft touched this" and a reader
  // looking at `Sol Ring` cannot tell 1 → 2 from a card that was not there.
  // The accessible name stays `fullName`: the pair is about the deck's count,
  // not about which card this is.
  const rowLabel = recounted && !stepperOn
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
  // M7 (discovery R1): the marker is Card assignments' moment while it draws `short`, a copy another deck holds; never
  // `none free`, which no commit can answer (audit resolution 1).
  const assignMoment = useMomentAnchor("card-assignments", {
    eligible: availState === "over" && tag !== "proxy",
    copy: momentsCopy.cardAssignments,
  });
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
  // The marker's own spoken sentence, count-only as the row draws it: a glyph-only marker's tooltip says it.
  const markerSentence = card.availability
    ? markerAria(card.availability, { selfExcluded: true, nameless: true, bareOne: true })
    : null;
  // Where the glint takes the dot's place from `md` (L5): the dot would be filled, and the row is not a stepper or a read-only list.
  const glintForDot = foilFinish !== undefined && card.owned && !proxied && !basicRow && !readOnly;
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
      foilFinish ? foilDescriptionId : null,
      comboSentence ? comboDescriptionId : null,
      speaksQuantity ? quantityDescriptionId : null,
      // Right after the availability word (handoff copy, `mark.a11y`): which card, whether it is
      // owned, that it is locked, then what the deck has done with it.
      locked ? lockDescriptionId : null,
      marked ? markDescriptionId : null,
      isPendingChange && !stepperSpeaks ? pendingDescriptionId : null,
      fromSpoken ? fromDescriptionId : null,
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
  if (isPendingChange || fromMarker !== null) rowEdges.push("inset 2px 0 0 0 var(--accent)");
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
          // A − still settling: the burst's save is cancelled and the row goes by an absolute 0, so the
          // order the two land in cannot leave a copy behind.
          const taken = stepperOn ? basic.takeOver() : null;
          if (taken) {
            // A refusal (another writer moved the row) is a failed removal, said as one: the row is still there.
            const outcome = await setBasicQuantity(deckId, card.oracleId, 0, await taken);
            if (!outcome.ok) throw new Error(outcome.reason);
          } else await removeCardFromDeck(deckId, card.oracleId);
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
  // `rowShell` is the live row's own 34px shell, so a receipt holds exactly
  // the height of the row it replaces (H29).
  const slotShell = rowShell;
  if (spent) return <UndoRow deckId={deckId} card={card} rowShell={slotShell} />;
  if (held) return <HeldSlot card={card} rowShell={slotShell} />;

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

  // The buy tag. `reserveSlot` is the figure's own flag, not `inShopping`: a Shopping row with an EDHREC figure reserves
  // the figure's slot so the column aligns, and a basic land (never in Shopping) has none to align.
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
      reserveSlot={!isBasicLand(card.typeLine) && shoppingFigure !== undefined}
      overLimit={overLimit}
      foldOver={inShopping}
      // `inShopping`, not the figure: Shopping is the list being paid
      // from, and the figure is `undefined` there too whenever EDHREC is
      // unreachable. The All tab draws the bare `$` (Hugh, 2026-10-16: the price is Shopping's) and still speaks the word
      // and the price in full; the tooltip below puts the figure one hover or tap away.
      density={inShopping ? "full" : "glyph"}
      press={pressable ? {
        onPress: (trigger) => gotIt.open(card, fullName, newestAsOf, trigger),
        // Disabled while an undo for this card is in flight (A9): a second write would go stale.
        state: confirmOpen ? (gotIt.pending ? "pending" : "open") : gotIt.undoing.has(card.oracleId) ? "disabled" : "rest",
        cardName: fullName,
        // The words `over $X`, spoken in the tag's description (the outline is the sighted reader's form).
        under: overText,
      } : undefined}
    />
  );
  const glyphFigure = card.price ? formatPriceFigure(card.price, priceState(card.price, newestAsOf)) : null;
  const rowBuyTag = inShopping ? buyTag : (
    <FactTooltip tapOnTouch sentence={addPanelCopy.unowned.glyphTip(glyphFigure)}>
      {/* As on the `+N`, the pointer on the `$` holds the row's card preview off, so the bubble is not covered. */}
      <span className={`inline-flex ${TOUCH_HIT_INLINE}`} {...plusPointer}>{buyTag}</span>
    </FactTooltip>
  );

  // The ✕. Its own slot on every other row; on a basic row it is the stepper's − slot at 1, so the press that
  // removes the row looks like removal (STATES rule 3) and leaves #185's receipt as it always has.
  const removeButton = (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className={`flex-none flex items-center justify-center ${stepperOn ? "w-[22px] h-[20px] pointer-coarse:w-[44px]" : "w-[26px] self-stretch"} ${TOUCH_HIT}${withAt("remove")}${endCol}
        rounded-[6px] bg-transparent border-none text-[13px] leading-none text-[color:var(--border-dashed)]
        active:text-[color:var(--fg-body)] pointer-coarse:active:bg-[color:var(--elevated)]
        group-hover:text-[color:var(--fg-body)] cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors`}
      aria-label={
        (stepperOn ? basic.count : card.quantity) > 1
          ? addPanelCopy.row.removeCopyAria(displayName, card.quantity)
          : addPanelCopy.row.removeAria(displayName)
      }
    >
      {addPanelCopy.row.remove}
    </button>
  );

  return (
    // Wrapper keeps the row and any error message as a single grid item. A row an undo brought
    // back fades in where its held slot was (C3).
    // `@container`: the marks fold by this row's own width (`FOLD`), so the About figures that draw a row fold the same way.
    <div className={`@container${cameBack ? " anim-slot-in" : ""}`}>
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
          : `bg-[color:var(--surface-rail)] hover:bg-[color:var(--elevated-hover)]
          [--row-bg:var(--surface-rail)] hover:[--row-bg:var(--elevated-hover)]`}`}
        style={{
          ...(rowEdges.length > 0 ? { boxShadow: rowEdges.join(", ") } : {}),
          // The row dims while its I got it write is in flight (A8).
          ...(confirmOpen && gotIt.pending ? { opacity: 0.6 } : {}),
        }}
      >
        {/* Ownership dot: solid green (owned) vs dashed hollow (unowned).
            No label — unlabelled it marks itself aria-hidden, which is the
            §Errata ruling: the word is the row's, said below. */}
        <OwnershipDot
          owned={card.owned && !proxied}
          className={`w-[8px] h-[8px]${glintForDot ? " hidden" : ""}`}
        />
        {/* The glint takes the filled dot's place on a one-line row (L5, direction 3a): centred on the 8px slot, so the name keeps
            its x. Only where the dot would be filled; a dashed or proxied row draws none here.
            Silent: the row's description says the finish. */}
        {glintForDot ? (
          <span className="flex flex-none w-[8px] h-[8px] items-center justify-center">
            <FoilGlint finish={foilFinish} />
          </span>
        ) : null}
        {/* A precon's printed list row: the glint in place of the printed `· foil`, right after the dot (foil addendum
            M4): `● ✦ … MSC 4`. These rows stay one line, and the box's copies need no art to be foil here. Not silent: the printed `· foil` was
            text, and the row has no description to carry the finish instead. */}
        {readOnly && card.printedFoil ? <FoilGlint finish="foil" silent={false} precon={{ quantity: card.quantity }} /> : null}

        {/* The word the dot used to carry. Ahead of the pass mark and the draft
            mark in `describedBy`, so a reader hears the card, then whether they
            own it, then what the deck has done with it. */}
        <span id={availabilityDescriptionId} className="sr-only">
          {availabilityWord}
        </span>
        {foilFinish && (
          <span id={foilDescriptionId} className="sr-only">
            {foilMarkCopy.name[foilFinish]}
          </span>
        )}
        {comboSentence && (
          <span id={comboDescriptionId} className="sr-only">
            {comboSentence}
          </span>
        )}
        {locked && (
          <span id={lockDescriptionId} className="sr-only">
            {lockedCardsCopy.mark.a11y}
          </span>
        )}

        {/* Card name — the click target for the detail modal (#127). One line at every width: the name, its marks and the
            count; the pips sit in All's fixed track and Shopping draws none (L2). */}
        <div className={nameBlockClass}>
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
          {fromGlyph}
          {quantitySpoken}
          {factMarks}
        </div>

        {/* All's fixed pip track, between the name block and the availability slot, at every width: pips laid out with the
            name would ride its variable width and lose the vertical line the fixed track exists to hold. */}
        {!cost && allFixedCols ? (
          // A costless card (a land, Ancestral Vision) keeps the 72px track empty, so its price and marker sit where a costed
          // row's do and the columns line up down the list (L6).
          <span aria-hidden="true" className="block flex-none w-[72px] order-1" />
        ) : null}
        {cost && !shopSlots ? (
          <span className={`flex flex-none items-center${allFixedCols ? " order-1" : ""}`}>
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
        {card.availability && availState !== "free" && tag !== "proxy" && (
          <span
            {...assignMoment}
            // The marker takes no focus of its own, so while its moment shows it joins the tab order: Tab reaches it,
            // then the bubble's Dismiss, and Esc or Dismiss hands focus back here. No tab stop otherwise.
            tabIndex={assignMoment["aria-describedby"] ? 0 : undefined}
            className="inline-flex flex-none rounded-[3px] focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
          >
          {/* The word folds to the glyph and its count at a narrow row (L3), and a glyph alone is a tooltip's job: the marker's
              own spoken sentence, so the words stay one thing. On touch a tap opens it, as on the `+N` (d9, 2026-10-16), and the
              tap goes no further; its 44px hit is drawn past the marker. */}
          <FactTooltip tapOnTouch holdMoments sentence={markerSentence ?? undefined}>
          <AvailabilityMarker bareOne
            foldWord={inShopping ? WORD_FOLD.shopping : WORD_FOLD.all}
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
            className={`shrink-0 font-mono text-[11.5px] ${TOUCH_HIT_INLINE}`}
          />
          </FactTooltip>
          </span>
        )}

        {/* Buy tag — a card you don't own, or one the Shopping list is showing
            because your copies are already sleeved elsewhere. One plate for
            both: the act is the same act, and which kind of row it is is
            already carried by the marker a few pixels to the left. */}
        {/* THE SLOT IS ONE SLOT. `deckRowTag` decides which mark lands in it and
            the two can never co-occur: a row saying at once that the player is
            printing this card and that they must buy it is the one state in this
            feature nobody has drawn. */}
        {/* The other-ways press (#1875, Social R2 PR A): ⇄ on an over-limit Shopping row, opening its cheaper
            stand-ins, and the spare glyph on any row the deck is buying that a friend holds a spare of. One press
            holds whichever apply, and neither draws nothing, with no slot kept. A LOCKED row has no ⇄ (STATES,
            Shopping: the stand-ins sheet exists to cut this card, and the player said it is never cut), and its spare opens
            the spares-only modal for the same reason. Shopping only (L2: All carries no other-ways press at any width,
            Hugh 2026-10-16). Drawn BEFORE the tag in DOM order, so it sits before the tag at every width. */}
        {tag === "buy" && !readOnly && inShopping ? (
          <OtherWaysPress
            card={card}
            openStandIns={swapTools && !locked ? () => swapTools.openStandIns(card) : undefined}
            standIn={overLimit && !locked}
            standInAria={swapTools ? swapToolsCopy.row.swapOverAria(displayName, formatLimit(swapTools.limitCents)) : ""}
            limitFigure={swapTools ? formatLimit(swapTools.limitCents) : ""}
            className={withAt("swap")}
            oneLine
          />
        ) : null}

        {tag === "proxy" && (shopSlots ? <span className={SHOPPING_SLOTS.buy}><ProxyTag variant="row" /></span> : <ProxyTag variant="row" />)}
        {/* `over $X` folds into the buy tag's outline at every width (L9), and its words stay in the tag's description and in
            the key's item, so the limit is never drawn beside the price. */}
        {readOnly ? (
          card.printedSetCode && card.printedCollectorNumber ? (
            <span className="flex-none whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">
              {card.printedSetCode.toUpperCase()} {card.printedCollectorNumber}
            </span>
          ) : null
        ) : pressable ? (
          // `over $N` is not drawn under the tag; it folds into the outlined tag (the key says so), and the words stay in
          // the tag's description for a reader who cannot see the outline.
          shopSlots ? <span className={SHOPPING_SLOTS.buy}>{buyTag}</span> : rowBuyTag
        ) : overText ? (
          <span className={`flex flex-none flex-col items-end gap-[2px]${withAt("buyStack")}`}>
            <span className="sr-only font-mono text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--warning)" }}>
              {overText}
            </span>
            {tag === "buy" ? rowBuyTag : null}
          </span>
        ) : tag === "buy" ? (shopSlots ? <span className={SHOPPING_SLOTS.buy}>{buyTag}</span> : rowBuyTag) : null}

        {/* Auto tag — one per stack. Not in Shopping (Hugh, 2026-09-28): where a card came from is
            nothing a buying trip needs, and that row is the busiest in the app. */}
        {card.auto && !inShopping && !readOnly && (
          // From md the row is wrapped by `order`, and an unordered item would jump ahead of the name: the tag takes the
          // name's own order, after it in the DOM, so it sits between the name and the ✕ as it always did.
          <span className="contents">
            <AutoTag deckId={deckId} oracleId={card.oracleId} name={card.name} />
          </span>
        )}

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
            // `-my-[1px]`: the drawn box stays 26×22, but a row's content box is 20px tall, so without it every
            // row grew 2px the moment the mode began (Hugh, 2026-09-26). A coarse pointer's 44px hit is drawn past
            // the box (`TOUCH_HIT`), so the row stays 34px there too.
            className={`flex-none flex items-center justify-center w-[26px] h-[22px] -my-[1px] bg-transparent border-0 p-0 cursor-pointer ${TOUCH_HIT}${withAt("remove")}${endCol}`}
          >
            <span
              className={`flex items-center justify-center w-[26px] h-[22px] rounded-[6px] border ${
                locked
                  ? "border-accent bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)]"
                  : "border-border-strong"
              }`}
            >
              <LockMark open={!locked} tone="mode" />
            </span>
          </button>
        ) : readOnly ? null : commanderRow ? (
        /* A commander's row has no ✕ (H28): the commander is not a list card, and removing it is
            Change commander's job. The glyph is kept, invisible and out of the accessibility tree,
            so the buy tag stays in the column every other row's ✕ holds it in. */
        <span
          aria-hidden="true"
          className={`invisible flex-none flex items-center justify-center w-[26px] self-stretch text-[13px] leading-none${withAt("remove")}${endCol}`}
        >
          {addPanelCopy.row.remove}
        </span>
        ) : stepperOn ? (
        <CountStepper
          layout="row"
          count={basic.count}
          fewerLabel={addPanelCopy.basicStepper.fewerAria(displayName, basic.count - 1)}
          moreLabel={addPanelCopy.basicStepper.moreAria(displayName, basic.count + 1)}
          countLabel={addPanelCopy.basicStepper.countAria(displayName)}
          onStep={basic.step}
          onType={basic.type}
          // A bare button in the −’s own place, so React keeps the focused node from 2 to 1; it takes the −’s 22px
          // on desktop (the ✕ elsewhere shrinks to its glyph) so nothing moves at 1.
          atOne={removeButton}
        />
        ) : (
        removeButton
        )}
      </div>
      {basic.error && <MutationError message={basic.error} />}
      {stepperOn && (
        <span className="sr-only" role="status" aria-live="polite">{settledLine}</span>
      )}
      {fromSpoken && <span id={fromDescriptionId} className="sr-only">{fromSpoken}</span>}
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
/**
 * The slot a row bought through I got it leaves (call 8, C9): the spent slot's shape in the row's
 * own shell, so 52px or 34px by construction and nothing above or below moves. Not a control: no
 * Undo (the toast and History hold that), nothing in the tab order, no live region. It arrives as
 * a 150ms opacity fade, which reduced motion turns into a swap (`anim-slot-in`).
 */
function HeldSlot({ card, rowShell }: { card: DeckDetailCard; rowShell: string }) {
  return (
    <div className="anim-slot-in">
      <div data-decklist-row data-held-slot className={`${rowShell} bg-surface-sunken border border-dashed border-border-strong`}>
        <span className="flex-none w-[8px] h-[8px]" aria-hidden />
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[12px] text-fg-locked">
          {gotItCopy.slot.held(deckRowName(card))}
        </span>
      </div>
    </div>
  );
}

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
        <span className="flex-none w-[8px] h-[8px]" aria-hidden />
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[12px] text-fg-locked">
          {/* The name the reader's own copy prints, exactly as the row this
              receipt replaces does — and as the list's own order does. A
              receipt calling a renamed printing by its oracle name sits in the
              list by one name and announces itself by another. */}
          {addPanelCopy.undo.removed(deckRowName(card))}
        </span>
        {/* Absent once the undo has been refused: the message below tells the
            player where to go instead. */}
        {!error && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={isPending}
            className={`flex-none flex items-center px-0 ${TOUCH_HIT}
              bg-transparent border-0 border-b border-b-accent-shadow border-accent-shadow
              text-[12.5px] font-semibold leading-[1.4]
              text-accent-text hover:text-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors`}
            aria-label={addPanelCopy.undo.actionAria(deckRowName(card))}
          >
            {addPanelCopy.undo.action}
          </button>
        )}
      </div>
      {error && <MutationError message={error} />}
    </div>
  );
}
