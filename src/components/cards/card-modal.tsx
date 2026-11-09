"use client";
// Card detail modal per property table §Card Detail Modal.
// - Mobile: full-screen sheet, art up top with color-identity gradient fallback
// - Desktop: 820px centered overlay, two-column (320px art + content), Prev/Next
// - Focus trap (READINESS #5): queries focusable children, wraps Tab/Shift+Tab
// - Escape closes; focus returns to the previously-focused element on close

import { ArtLayer } from "../ui/art-layer";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import type { BrowseCard, Finish, PreferredPrinting, BrowsePrinting } from "../../lib/collection/browse";
import {
  cssUrl,
  printedNameOf,
  printingCaption,
  matchesPreference,
  resolvedPrinting,
  cardArt,
  faceFilm,
  type CardArt,
} from "../../lib/collection/browse";
import { identityGradient } from "../../lib/cards/gradients";
import { printingPickerCopy } from "../../lib/copy/collection";
import { clearCardArtPreference, setCardArtPreference } from "../../app/collection/actions";
import type { CardCombo } from "../../lib/combos/near-combos";
import { PrintingRegion, printingKey } from "./printing-region";
import { PriceTag } from "./price-tag";
import { cheapestLiveCents, priceFor, priceKeyFor } from "../../lib/cards/price-lookup";
import { formatCents, priceOf, priceState } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../lib/a11y/inert-page";
import { HELP_STOP_ID, helpStop, useCardDetailsOpen, useCardDetailsUp } from "../../lib/a11y/help-over-dialog";
import { faceNames, isTwoFaced } from "../../lib/cards/faces";
import { cardZoomCopy, twoFacedCopy } from "../../lib/copy/card-surfaces";
import { manapoolCardUrl } from "../../lib/manapool/links";
import { useTargets } from "../discovery/targets-provider";
import { cardLinkOutCopy } from "../../lib/copy/collection-browse";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";
import { SHEET, SWIPE, useCardSheetGestures, type SheetSnap } from "./card-sheet-gesture";
import { dropTilt, liftTilt, tiltsOnHover } from "./card-tilt";
import type { SheetFooterLayout, SiblingCard, ViewFinish } from "./card-detail-provider";
import { useMinWidth } from "../ui/use-min-width";
import { ProxyControl } from "../decks/proxy-control";
import { CardWishlist } from "../wishlist/card-wishlist";
import { TokenCardLine } from "../decks/token-card-line";
import { TokenDeckBox } from "../decks/token-deck-box";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";
import { STACK_DROP_EASE, STACK_DROP_MS } from "./card-modal-shared";
import { FitsDoor } from "./fits-door";
import { CardModalSheet } from "./card-modal-sheet";
import { CardModalArtSide, SiblingFilm, siblingGround } from "./card-modal-art-side";
import { ArrivalOrder } from "../ui/arrival-queue";
import { FoilFilm } from "../ui/foil-film";
import { CardFaces, FlipControl, Glare } from "./card-turn";

const pickerCopy = printingPickerCopy.printing;

/**
 * The door's rows in the desktop art column, added to the stack's reservation so the art gives
 * them room: 8 above the block, the stack's 6 gap, a 16px limit line, 8 between, and a 21px link.
 */
const DOOR_HEIGHT = 8 + 6 + 16 + 8 + 21;

/**
 * A desktop neighbor plate (handoff decision 2): the whole card, scaled down, on the backdrop
 * 24px off the modal, with the name under it in 12.5px `--fg`. 168x235 at 63/88 — the
 * card ratio exactly, which is also how the ~1252px threshold was derived (decision 4).
 *
 * Art first, then identity, then a bare plate (handoff "Notes for engineering" §2): a sibling
 * carrying only an id draws no text at all, since there is none to draw.
 */
// The dialog's own fixed desktop geometry (`md:w-[820px]`) and the 24px gap decision 2 draws
// between it and a plate, from which `NEIGHBOR_MIN_WIDTH` computes the plates' threshold. The
// half-width is exported for `card-modal-geometry.test.ts`, which pins the dialog's class to it.
export const DIALOG_HALF_WIDTH = 410;
const PLATE_GAP = 24;
const PLATE_WIDTH = 168;
/**
 * The neighbor plates' threshold (handoff decision 4, ledger 2): the dialog, plus a plate, its gap
 * off the dialog and 24px clear of the viewport edge on each side. 1252 today, and COMPUTED, so a
 * move of the dialog's width moves it too; `card-modal-geometry.test.ts` pins the dialog's
 * `md:w-[…]` class to `DIALOG_HALF_WIDTH`, the half a Tailwind literal cannot read.
 */
export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);

const NeighborPlate = React.forwardRef<
  HTMLButtonElement,
  { sibling: SiblingCard; direction: "previous" | "next"; onPress: () => void }
>(function NeighborPlate({ sibling, direction, onPress }, ref) {
  const art = siblingGround(sibling);
  // Anchored from the BACKDROP's own center rather than carried as a flex sibling of the
  // centered dialog (pre-open review, round 1): a flex sibling present on only one side
  // shifts the dialog itself by its width-plus-gap, which moved the dialog and its footer
  // controls under the reader on every page to a list's first or last card.
  const left = direction === "previous"
    ? `calc(50% - ${DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH}px)`
    : `calc(50% + ${DIALOG_HALF_WIDTH + PLATE_GAP}px)`;
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onPress(); }}
      aria-label={cardCarouselCopy.neighborAria(direction, sibling.name)}
      // `DesktopModal.dc.html` D1, with the plate OPAQUE (Hugh, 2026-10-12: at .55 the grid cards behind the
      // dialog showed through and clashed). Keyboard focus rings the plate in `--accent` 3px out. The ring
      // is the plate's, not the button's, so the browser's own ring around both is turned off.
      className="group absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-[10px] cursor-pointer bg-transparent border-0 p-0 outline-none"
      style={{ left }}
    >
      <span
        aria-hidden="true"
        className="relative block overflow-hidden rounded-[9px] group-focus-visible:outline-2 group-focus-visible:outline-offset-[3px] group-focus-visible:outline-[color:var(--accent)] group-focus-visible:[outline-style:solid]"
        style={{
          width: PLATE_WIDTH,
          height: 235,
          ...art,
          boxShadow: "0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
        }}
      >
        {/* The inset ring rides on the layer too: a host's inset shadow paints under its children. */}
        {sibling.imageUri ? <ArtLayer src={sibling.imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} /> : null}
        <SiblingFilm sibling={sibling} />
      </span>
      {sibling.name ? (
        // `--fg`, not the handoff's `--fg-muted` (ledger 1, measured in build on every backdrop
        // pixel behind the name, six themes): `--fg-muted` put 39% to 78% of them under AA's 4.5:1
        // for 12.5px text, and `--fg-body` still up to 6%; `--fg` holds 5.5:1 at its worst pixel.
        // No hover state: the plate is already opaque (Hugh, 2026-10-12) and the name has no brighter ink
        // left; the pointer cursor and keyboard focus ring mark it as a control.
        <span className="flex gap-[6px] max-w-[168px] text-[12.5px] whitespace-nowrap text-[color:var(--fg)]">
          <span aria-hidden="true">{direction === "previous" ? "‹" : "›"}</span>
          <span className="truncate">{sibling.name}</span>
        </span>
      ) : null}
    </button>
  );
});

/** The narrowest card the phone's teaser may leave room for; below it the sheet opens full. */
const MIN_TEASER_CARD_WIDTH = 120;

/**
 * The holds on an element's transitions that `useOwnHeight` has taken and not yet let go. Counted,
 * because two measurements share one element (the door strip's and the dialog's own both hold the
 * dialog), and one letting go must not release the other before its height is committed.
 */
const settling = new WeakMap<HTMLElement, number>();

/**
 * An element's own height, kept current as it changes. Zero while `active` is false or the element
 * has no layout, which is every element below a `display: none` ancestor.
 *
 * A height this settles moves the phone's geometry (the sheet's top, the band, the card sized from
 * it), and a settle is not a move, so it is applied with `still`'s transitions held off. The case
 * that needs it is every page: the modal remounts per card, its first measurement reads layout with
 * the height still 0, and without the hold the sheet eased up from there on every swipe, the card
 * shrinking with it (`[data-settling]`, `globals.css`).
 */
function useOwnHeight(ref: React.RefObject<HTMLElement | null>, active: boolean, still: React.RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  const last = useRef(0);
  // The element this instance holds, until its height is committed.
  const holding = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const settle = (next: number) => {
      if (next === last.current) return;
      last.current = next;
      const el = still.current;
      if (el && holding.current === null) {
        holding.current = el;
        settling.set(el, (settling.get(el) ?? 0) + 1);
        el.setAttribute("data-settling", "");
      }
      setHeight(next);
    };
    const el = ref.current;
    if (!active || !el) {
      settle(0);
      return;
    }
    const measure = () => settle(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active, still]);
  // The new height is committed: lay it out while the hold is on, so the browser takes it as where
  // things already were, and only then let go. Not before it is committed: on mount this runs
  // straight after the measurement, with the height still the 0 it rendered with.
  useLayoutEffect(() => {
    const el = holding.current;
    if (el === null || height !== last.current) return;
    holding.current = null;
    void el.offsetHeight;
    const left = (settling.get(el) ?? 1) - 1;
    if (left > 0) settling.set(el, left);
    else {
      settling.delete(el);
      el.removeAttribute("data-settling");
    }
  }, [height]);
  return height;
}

/** The deck a modal picks a printing for: its current pick (held, or null) and the write. */
export type DeckPrintingScope = {
  pick: PreferredPrinting | null;
  /**
   * Resolves true once the deck's pick is stored, false on any refusal. Absent on a surface that
   * shows the deck's printing but must not offer the pick (the review screen and the update diff,
   * E9): the art follows the deck and the Set field is the plain one.
   */
  save?: (p: PreferredPrinting) => Promise<boolean>;
};

export function CardModal({
  card,
  position,
  total,
  onClose,
  onPrev,
  onNext,
  onPrevPeek = null,
  onNextPeek = null,
  onAtStart,
  onAtEnd,
  prevSibling = null,
  nextSibling = null,
  enterFrom = null,
  enterOffset = 0,
  enterProgress = 0,
  enterLeftFace = null,
  startMinimized = false,
  openCombo = false,
  onOpenCombo = null,
  onMinimizedChange,
  onArtChange,
  openAtPrinting = null,
  deckId = null,
  deckName = null,
  deckPage = false,
  deckHolds = false,
  onShowTokens = null,
  deckPrinting,
  onProxyWrite,
  onWishlistWrite,
  onSelectCard,
  stacked = false,
  backLabel,
  phoneBackLabel,
  footer = null,
  onFindDeck = null,
  onEditCopies = null,
  receiptLink = null,
  fitsOpen = false,
  fitsReading = false,
  view = null,
  door = null,
  covered = false,
  dropped = false,
  rise = false,
  dropping = false,
  returnFocusRef,
}: {
  card: BrowseCard;
  /**
   * The swap tools' door (addendum §2): drawn under the price tag in the desktop art column, and as
   * a 44px strip under the phone's art header. Passed only for a card opened from a Shopping row
   * (audit F17), and never for a stand-in stacked over the sheet.
   */
  door?: ((layout: "art" | "strip") => ReactNode) | null;
  /**
   * A sheet is open OVER this card (the door's stand-ins sheet). The card stays mounted with its
   * scroll, under the sheet: below it in the stacking order, inert, and deaf to Escape, which peels
   * the layer on top instead.
   */
  covered?: boolean;
  /** Drawn 80px lower on desktop: a stand-in over a sheet over its original, so the original's head shows. */
  dropped?: boolean;
  /**
   * The phone's motion over a sheet (stacked sheets R1): `rise` as a card a sheet opened arrives
   * (`.anim-stack-rise`; desktop and reduced motion draw none), and `dropping` while it leaves (the
   * provider only sets it on the phone with motion allowed).
   */
  rise?: boolean;
  dropping?: boolean;
  /** Where focus goes when this card closes: the control that opened it, when the provider knows it. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /**
   * A sheet is open UNDER this one — the Analysis tab's receipt, whose addendum ruling is that
   * a card opened from it stacks rather than replaces.
   *
   * On the phone (stacked sheets R1, call 1) it REPLACES the sheet: the same full-height geometry as
   * any card, so the card keeps its 320, with the sheet underneath kept mounted and hidden, and the
   * way back is the `← {backLabel}` pill in the ✕'s slot. On desktop the backdrop is not drawn: the
   * sheet has already dimmed the page, and the card sits over it with its own pill.
   */
  stacked?: boolean;
  /**
   * The sheet underneath, by name. When `stacked` with one, the desktop close becomes a
   * `← {backLabel}` pill in the same slot and plate (Analysis tab handoff §3), and on the phone the ✕
   * becomes the same pill on the wash (stacked sheets R1, call 2): the reader sees where a dismissal
   * lands before making it.
   */
  backLabel?: string;
  /** The phone pill's label where the sheet names itself differently there (stacked sheets R1, s2). */
  phoneBackLabel?: string;
  /**
   * The sheet underneath's own footer for this card (swap tools: a stand-in's Take). It replaces the
   * Mana Pool link in the desktop nav row beside Prev/Next. On the phone (stacked sheets R1, call 9)
   * it shares the teaser's foot row with All details, its note taking one of the oracle's lines,
   * and in the full sheet it pins to the foot. Drawn per layout (`SheetFooterLayout`).
   */
  footer?: ((layout: SheetFooterLayout, priced?: boolean) => ReactNode) | null;
  /**
   * Fits your decks (swap tools, R2): the footer's `Find a deck for it →` door, under the Mana Pool
   * link. Null draws none, which is every card that is not Commander-legal, every reader with no deck,
   * and every card whose footer is a sheet's own (a stand-in's Take).
   */
  onFindDeck?: (() => void) | null;
  /**
   * Collection edit R2 §C: the receipt's `Edit copies` link (or `Add to collection` for a card the
   * reader does not own). Passed only by a provider mounted by `/collection`, so decks, Shopping,
   * search and History keep the receipt read-only. Null draws no link and no receipt that was not
   * already drawn.
   */
  onEditCopies?: (() => void) | null;
  /**
   * I got it's `Bought this card?` (A11), for a card a Shopping row opened: drawn right-aligned on
   * the receipt's label line, in Edit copies' slot, and the receipt draws even with nothing in it.
   * The provider never passes both.
   */
  receiptLink?: ReactNode;
  /** The picker the door opened is up, so its close hands focus back to the door. */
  fitsOpen?: boolean;
  /**
   * Find a deck's view (handoff R2, following swap tools): drawn inside this dialog in place of
   * the details pane, over everything right of the desktop art column and over the whole phone
   * sheet. Under it the details stay mounted and inert, with their scroll kept; Prev/Next, the
   * neighbors and the swipe stand down, and Escape goes back to the details.
   */
  view?: { node: ReactNode; onBack: () => void } | null;
  /** A Find a deck read for this card is running: the door carries `reading your decks…`. */
  fitsReading?: boolean;
  /** The deck this card was opened from, which scopes the proxy control. Null
   *  everywhere but the deck page — see `CardDetailProvider.deckId`. */
  deckId?: string | null;
  deckName?: string | null;
  /** Opened on `/decks/[id]` or its `/changes`, where a one-copy shortfall reads a bare `short`
   *  (Hugh, 2026-09-28). Everywhere else it reads `short 1`. */
  deckPage?: boolean;
  /** Whether that deck holds THIS card. The provider wraps surfaces that open
   *  cards the deck does not hold — Consider, search — and the control refuses
   *  every one of them, so it must not be drawn for them. */
  deckHolds?: boolean;
  /** Close to the deck and land on its Tokens group (`Tokens ›` in the deck box). Null where the sheet is stacked. */
  onShowTokens?: (() => void) | null;
  /**
   * Deck printings: opened from a deck that holds this card. The picker then
   * picks for THAT deck: it starts from the deck's own pick, writes through `save`, and the art
   * falls back to the Collection's printing when the deck has none. Absent everywhere else, which
   * is today's collection-scoped picker.
   */
  deckPrinting?: DeckPrintingScope;
  /** Invalidates this card in the provider's cache after a proxy or wishlist write, so the
   *  receipt beside the control stops describing the state before the tap. */
  onProxyWrite?: () => void;
  /** The Wishlist section wrote: the list that owns the provider refreshes (the Wishlist tab). */
  onWishlistWrite?: () => void;
  /**
   * Opens another card IN PLACE of this one — the combo block's partner name is its only
   * caller, and it REPLACES rather than stacks, which the addendum refuses by name.
   *
   * A prop rather than reaching for the provider's context: this component is rendered BY
   * that provider and does not consume it, and the first version of this wiring wrote
   * `open(id)`, which resolved to `window.open` — it typechecked, every test passed, and it
   * would have navigated the browser instead of changing the card.
   */
  onSelectCard?: (oracleId: string) => void;
  position: number;
  total: number;
  onClose: () => void;
  /** Called with the phone band's offset when a swipe paged (carousel R2), and with nothing for
   *  every other way of paging, so the next card enters from wherever the reader let go. */
  /** `leftFace`: the face the card being left was showing (see `enterLeftFace`). */
  onPrev: ((offset?: number, progress?: number, leftFace?: string | null) => void) | null;
  onNext: ((offset?: number, progress?: number, leftFace?: string | null) => void) | null;
  /** The neighbor plate's own press (handoff decision 2), separate from `onPrev`/`onNext` so the
   *  provider can tell a peek from the footer button or an arrow key and restore focus to the
   *  same role across the remount (handoff "Notes for engineering" §3). Null exactly when
   *  `onPrev`/`onNext` is: the plate draws nothing at an end either. */
  onPrevPeek?: ((leftFace?: string | null) => void) | null;
  onNextPeek?: ((leftFace?: string | null) => void) | null;
  /** An arrow key pressed at the start or end of the list (decision 8): announced, nothing else
   *  moves. Undefined where there is no carousel to have an end (a list of zero or one). */
  onAtStart?: () => void;
  onAtEnd?: () => void;
  /** The cards either side of this one, carrying whatever art and identity their opener had
   *  (H23 carousel PR 1/1b). Null at a list's end, or with no list at all. */
  prevSibling?: SiblingCard | null;
  nextSibling?: SiblingCard | null;
  /** Which control led to THIS mount, captured once at construction (the carousel's own
   *  README "Notes for engineering" §1/§3): which side the art slides in from, and which
   *  control gets focus in place of the usual opening ✕. Null on a fresh open, and on any
   *  card change that is not a page. */
  enterFrom?: "prev" | "next" | "prevPeek" | "nextPeek" | null;
  /** Where the phone's card band stood when the swipe that led here committed, in px (0 for any
   *  other page). Captured once at construction, like `enterFrom`. */
  enterOffset?: number;
  /** How far that swipe had carried the swap, 0 to 1 (0 for any other page): the card enters at the
   *  size and opacity the finger left it, and the card left behind shrinks on from where it was. */
  enterProgress?: number;
  /** The face the card left behind was showing (a turned back, the printing it was opened at): it keeps
   *  that face while it shrinks into its peek, which then rests on its own art (m8). */
  enterLeftFace?: string | null;
  /** The phone's sheet opens at its min snap: the reader minimized it on the card before this one
   *  and paged here. Captured once at construction, like `enterOffset`. */
  startMinimized?: boolean;
  /** Opened FOR the combo (a feed item's See the combo): the combo block starts open, and on the phone the sheet opens full so
   *  the block is on screen. Read once at construction; the provider names it for this card alone. */
  openCombo?: boolean;
  /**
   * Opens a combo line's combo over this card (combos one piece away UI-3), from the combo block's
   * near-combos face. The provider's, like `onSelectCard`, and null on a stacked card: nothing in a
   * stacked card opens a further layer.
   */
  /** A combo line's press, with the card as this modal SHOWS it (its printing, name and art: `preview`). */
  onOpenCombo?: ((combo: CardCombo, shown: BrowseCard) => void) | null;
  /** Told whenever the phone's sheet reaches or leaves its min snap, so paging can carry it. */
  onMinimizedChange?: (minimized: boolean) => void;
  /**
   * Called when the art pick is written, so a caller holding a copy of this card can
   * drop it. The write changes what the card says about itself, and a stale copy would
   * show the reader the printing they just replaced. Called twice per write, on purpose:
   * once as the write starts, and once when it lands. A card re-read during the overlap
   * answers with the preference the write has not replaced yet, so dropping the entry
   * only up front would let that pre-write answer be filed as the current one.
   *
   * It carries the art the card should now draw, resolved through the same tiers the
   * server uses, so a list behind the modal can patch its own copy rather than refetch a
   * payload measured in megabytes. Null when the card names no printing to resolve — a
   * caller that only wants the nudge ignores the argument, as the set grid does.
   *
   * `settled` says which of the two calls this is. The optimistic one is a nudge about a
   * write that has not started; only the settled one can say the server holds anything, so
   * a caller that re-READS on this signal must wait for it or spend a round trip fetching
   * the state the write is about to replace.
   */
  onArtChange?: (art: CardArt | null, settled: boolean) => void;
  /**
   * The printing this card was opened AT, when the surface that opened it was showing one
   * in particular. The set grid's cells each ARE a printing, so clicking the dashed #239
   * has to show #239 — not whichever printing the resolver would pick for the card.
   *
   * A VIEW, never a pick. It decides the art, the caption and the shown-now badge, and it
   * does not touch `pick`: the picker still marks the reader's own preference where it is,
   * and nothing is written by looking. The moment the reader picks something in this modal,
   * their choice takes over.
   */
  openAtPrinting?: (PreferredPrinting & {
    imageUri?: string | null;
    /** The target printing's own back face. Both faces travel together or a flip on a cell
     *  opened at an unowned printing draws this printing's front against the oracle row's
     *  back — the mismatch `printings.back_image_uri` exists to close. */
    backImageUri?: string | null;
    scryfallId?: string;
    /** The finish the opener's list holds it in (a precon box's): the face's film, whatever the reader owns. */
    finish?: Finish;
  } | ViewFinish) | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // The page behind is inert while this card is the live layer; a card covered by another is inert as a whole already.
  const inertHost = useInertWhileOpen(!(covered || dropping));
  // Stable, so the host state is not detached and re-set on every render.
  const backdropAndInertRef = useCallback((el: HTMLDivElement | null) => { backdropRef.current = el; inertHost(el); }, [inertHost]);
  // The fixed backdrop — the one ancestor the dialog and the desktop neighbor plates share.
  // The arrow-key listener below attaches here rather than to `dialogRef`, since a peek press
  // can move focus onto a plate, which sits outside the dialog.
  const backdropRef = useRef<HTMLDivElement>(null);
  // Two card modals are up at once while a card is stacked over a sheet over a card, so the
  // covered one takes its own title id: shared, the top dialog would be named by the held card's
  // heading. The top card keeps the canonical id every other reader of the modal looks for.
  const titleId = covered ? "card-modal-title-held" : "card-modal-title";
  // A card dropping off a sheet is leaving (#1268): nothing in it answers a key, a swipe or a press,
  // or Escape-then-ArrowRight could page a new card in while the timer closes it.
  const locked = covered || dropping;
  const viewOpen = view !== null;
  // One trigger per breakpoint tree; only one has layout at a time, and focus() on the
  // display:none one is a no-op, so Escape hands focus to whichever is actually on screen.
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  // The zoom is a layer inside this dialog, never a dialog of its own (table §3.1).
  const [zoomed, setZoomed] = useState(false);
  // The neighbor plates' own threshold: see `NEIGHBOR_MIN_WIDTH`.
  const wideEnoughForNeighbors = useMinWidth(`(min-width: ${NEIGHBOR_MIN_WIDTH}px)`);
  // The phone's peeks, mounted only below `md` as the desktop plates are only above 1252: a
  // hidden duplicate of a control is still a second control to every query that finds it.
  const narrow = !useMinWidth("(min-width: 768px)");
  // Where focus goes back to on close: the art that opened it, at whichever width
  // is actually on screen.
  const zoomTriggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomFlipRef = useRef<HTMLButtonElement>(null);
  // The layer turns its own copy. `flipped` belongs to the art behind it, which the
  // reader may have turned for their own reasons.
  const [zoomFlipped, setZoomFlipped] = useState(false);
  // THE TILT (foil R2): a turn pins its hosts flat (`data-turning`) from the press to the settle, and only where the turn
  // animates: under reduced motion no transition would end it (G4).
  const desktopTiltRef = useRef<HTMLDivElement | null>(null);
  const phoneTiltRef = useRef<HTMLDivElement | null>(null);
  const zoomTiltRef = useRef<HTMLDivElement | null>(null);
  const [turning, setTurning] = useState(false);
  const [zoomTurning, setZoomTurning] = useState(false);
  // Crossing the 768px line mid-turn hides the tree that was turning, which cancels its transition, and the tree that
  // shows sends no transitionend: end the turn when the width changes, during render, or both hosts stay pinned flat.
  const [turnNarrow, setTurnNarrow] = useState(narrow);
  if (turnNarrow !== narrow) {
    setTurnNarrow(narrow);
    setTurning(false);
  }
  // The zoom tilts on a press that moves past the swipe's slop; its release must not also close the layer.
  const zoomPress = useRef<{ id: number; x: number; y: number; tilting: boolean } | null>(null);
  const zoomDragged = useRef(false);
  /**
   * A face the art landed on while the zoom covered it, waiting for the zoom to
   * close. A ref rather than state: nothing renders from it, and holding it in
   * state would re-render the whole modal to record a sentence nobody can hear
   * yet.
   */
  const heldArtFace = useRef<string | null>(null);
  // The two shipped ✕ buttons, one per breakpoint tree.
  const closeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Captured ONCE, at this instance's own construction: `enterFrom` is the provider's state and
  // is cleared back to null the moment the arrival is announced (card-detail-provider.tsx), so
  // reading the prop reactively would hand this already-mounted instance's slide and focus back
  // to a fresh open partway through. `CardModal` is keyed on oracle id, so a new value here only
  // ever arrives with a new instance.
  const [enteredFrom] = useState(enterFrom);
  const [enteredOffset] = useState(enterOffset);
  const [enteredProgress] = useState(enterProgress);
  const [enteredLeftFace] = useState(enterLeftFace);
  // The face this card shows when turned, for the arrow keys' listener, which is attached before it is known.
  const leftFaceRef = useRef<string | null>(null);
  /**
   * The phone's sheet (carousel R2): the teaser on every open and every page, which a remount
   * per card gives by construction, or the full details column. Set only by the phone's own
   * controls and gestures; everything else reads `sheetOpen`, which is false at desktop widths.
   */
  // A Find a deck landing that waits (R3 addendum, item 12) has the phone open the next card with a Fits door at the full
  // sheet, where the door draws; read once at construction and spent in the effect below (render stays pure).
  const targets = useTargets();
  const [landsFull] = useState(() => narrow && onFindDeck !== null && targets?.wantsFull("find-a-deck") === true);
  useEffect(() => {
    if (landsFull) targets?.takeFull("find-a-deck");
  }, [landsFull, targets]);
  // A combo open has the phone's sheet at the full details column, where the combo block draws.
  const [startsFull] = useState(() => narrow && openCombo);
  const [snap, setSnapState] = useState<SheetSnap>(landsFull || startsFull ? "full" : startMinimized ? "min" : "teaser");
  // A card mounts at the snap it was handed, and says so: a remount that is not a page (a step back
  // from a partner, say) starts at the teaser, and the provider must not go on carrying a min the
  // reader can no longer see into the next page.
  const reportedMount = useRef(false);
  useEffect(() => {
    if (reportedMount.current) return;
    reportedMount.current = true;
    // A pending landing opens the card full even when the reader carried a minimized sheet here: report what is drawn.
    onMinimizedChange?.(startMinimized && !landsFull && !startsFull);
  }, [onMinimizedChange, startMinimized, landsFull, startsFull]);
  // Whether the sheet's last move reached or left the min snap: those moves are gentle (the motion
  // rule's beat and ease-in-out), and teaser to full keeps the quick snap (`--motion-quick`).
  const [gentle, setGentle] = useState(false);
  const sheetFull = snap === "full";
  const setSnap = (next: SheetSnap) => {
    setGentle(next === "min" || snap === "min");
    setSnapState(next);
    if ((next === "min") !== (snap === "min")) onMinimizedChange?.(next === "min");
  };

  // THE TEASER'S HEIGHT, which places the sheet and sizes the card band above it. A fixed 280
  // (README R2 "States"), plus the stand-ins door's strip at the sheet's head where a card carries
  // one, MEASURED: a renderer can draw nothing for a card (the door does for a locked one), and a
  // figure assumed from the prop would leave a blank gap in the teaser. A stacked stand-in's Take
  // adds nothing: it shares the teaser's own foot row (stacked sheets R1, call 9).
  const doorStrip = door ? door("strip") : null;
  const doorRef = useRef<HTMLDivElement | null>(null);
  const doorHeight = useOwnHeight(doorRef, doorStrip !== null, dialogRef);
  const teaserHeight = SHEET.teaserHeight + doorHeight;

  // A TEASER THAT WOULD CRUSH THE CARD IS NOT OFFERED. A short screen (or a teaser grown by a
  // door strip) can leave the band so little room that the card would
  // draw tens of pixels wide; there the sheet opens full and stays full, the way the stacked
  // sheet drew its details before R2, and Escape closes it. 120 keeps the card at least the
  // size of a readable thumbnail. Stacked sheets' own spec check is the carousel's PR 4.
  const dialogHeight = useOwnHeight(dialogRef, narrow, dialogRef);
  const cramped = dialogHeight > 0 && (dialogHeight - teaserHeight - 85) * 0.7159 < MIN_TEASER_CARD_WIDTH;
  // What the sheet DRAWS: full when the reader raised it, or when the teaser is not offered.
  const full = sheetFull || cramped;
  // What Escape and the arrow keys read. Phone width only: a window widened with the sheet up
  // must not leave the desktop's keys answering to a sheet nobody can see. And a cramped sheet
  // has no teaser to step down to, so its Escape closes.
  const sheetOpen = narrow && sheetFull && !cramped;
  // THE MIN SNAP (Hugh, 2026-10-13): the shelf shrinks to its title row and the card grows to fill
  // the band, much like the retired zoom. Phone width only, and never where the teaser itself is
  // not offered.
  const min = narrow && snap === "min" && !cramped;
  // THE DROP (stacked sheets R1, motion): from wherever the card is, so a dismissal during the
  // rise (a beat, then `--motion-duration`) reverses it rather than snapping the card to the top first (#1268). The rise class
  // stays on, still running, and this animation, being script-made, composites over it.
  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!dropping || !el || typeof el.animate !== "function") return;
    const from = getComputedStyle(el).transform;
    const drop = el.animate(
      [{ transform: from === "none" ? "translateY(0)" : from }, { transform: "translateY(100%)" }],
      { duration: STACK_DROP_MS, easing: STACK_DROP_EASE, fill: "forwards" },
    );
    return () => drop.cancel();
  }, [dropping]);
  const bandRef = useRef<HTMLDivElement | null>(null);
  /** The box that sizes the phone card; a drag writes its size there as it moves. */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  // The sheet's scrolling body: a pull down from its top returns the full sheet to the teaser.
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  const gripRef = useRef<HTMLButtonElement | null>(null);
  const prevPhonePeekRef = useRef<HTMLButtonElement | null>(null);
  const nextPhonePeekRef = useRef<HTMLButtonElement | null>(null);
  const prevButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevPeekRef = useRef<HTMLButtonElement | null>(null);
  const nextPeekRef = useRef<HTMLButtonElement | null>(null);
  // THE NAME BLOCK'S RESERVE follows whatever sits in the close slot. The ✕ is 34px, and 46px
  // clears it; a back pill is as wide as its label, which runs from `Game changers` to `How we
  // determined bracket 4`, so it is measured rather than assumed (readiness finding 10).
  const back = stacked && backLabel ? backLabel : null;
  const phoneBack = stacked ? (phoneBackLabel ?? backLabel ?? null) : null;
  const backRef = useRef<HTMLButtonElement | null>(null);
  const [closeReserve, setCloseReserve] = useState(46);
  useLayoutEffect(() => {
    const el = backRef.current;
    if (!back || !el) {
      setCloseReserve(46);
      return;
    }
    // The ✕ is 34 wide and the name keeps 46, so the reserve is the control's width plus 12.
    // Observed rather than read once: the pill is `display: none` below `md`, so a modal opened
    // on a narrow window measures 0 until the window widens.
    const measure = () => setCloseReserve(el.offsetWidth + 12);
    measure();
    // Guarded, as `use-head-collapse.ts` guards its own: an unconditional constructor throws on
    // mount in any engine without the API. The `measure()` above has already sized the reserve.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [back]);
  /**
   * Where the dialog puts focus when it opens: the ✕ that has layout.
   *
   * Named explicitly rather than left to DOM order, because the art is now a button
   * and sits before the content column — so without this the first thing a keyboard
   * reader lands on would have become "Look at … up close", which is neither where
   * focus used to go nor the same at both widths.
   *
   * A PAGED mount (`enteredFrom` non-null) focuses the same-role control instead (handoff
   * "Notes for engineering" §3): the footer button or the peek that led here, so the remount
   * this component is built around does not drop focus to the ✕ on every press. Falls back to
   * the ✕ if that control did not land — this width's footer is hidden at the peek's, say.
   */
  const initialFocusRef = useMemo(
    () => ({
      get current() {
        // A peek exists at each width (the desktop plate, the phone's card band), and only the
        // one on screen has layout.
        const candidates = enteredFrom === "prev" ? [prevButtonRef.current]
          : enteredFrom === "next" ? [nextButtonRef.current]
          : enteredFrom === "prevPeek" ? [prevPeekRef.current, prevPhonePeekRef.current]
          : enteredFrom === "nextPeek" ? [nextPeekRef.current, nextPhonePeekRef.current]
          : [];
        const paged = candidates.find((el) => el && el.getClientRects().length > 0);
        if (paged) return paged;
        const mounted = closeRefs.current.filter((el): el is HTMLButtonElement => el !== null);
        return mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0] ?? null;
      },
    }),
    [enteredFrom],
  );
  const [announcement, setAnnouncement] = useState("");
  // No reset on card change: the provider keys this component on oracleId, so
  // Prev/Next remounts and a new card starts on its front face by construction.
  const [flipped, setFlipped] = useState(false);
  const [writing, startWrite] = useTransition();

  // The pick the user just made, before the server action's revalidate lands. Seeding it from
  // the card is only correct because the caller keys this component on oracleId — paging
  // Prev/Next remounts rather than reusing the state of the card you just left.
  // In deck scope the pick is the DECK's, and the Collection's preference is only the fallback
  // the art takes when the deck has none (`effective` below).
  const deckScope = deckPrinting !== undefined;
  const seedPick = deckScope ? deckPrinting.pick : card.preferredPrinting;
  const [pick, setPick] = useState<PreferredPrinting | null>(seedPick);
  const [saveFailed, setSaveFailed] = useState(false);
  // Whether the reader has chosen a printing in THIS modal. Until they do, a card opened at
  // a particular printing shows that one; afterwards their choice wins.
  const [picked, setPicked] = useState(false);

  // A caller can hand this component a re-read of the same card, so the seed above is not
  // the last word: without this, a preference that moved on the server would be ignored for
  // as long as the modal stayed open, and the art, caption and selected tile would all keep
  // showing the printing it replaced.
  //
  // Every arriving read reconciles, not only one that reports a different printing. A write
  // can be refused — `setCardArtPreference` returns without writing when the chosen printing
  // is no longer one the reader owns — and a refusal reads back exactly the preference that
  // was already there. Reconciling on the value alone would take that for "nothing changed"
  // and leave the refused pick on screen as though it had taken.
  //
  // A write of the reader's own is the exception: its optimistic pick is the thing this state
  // exists to hold, and it is held until the write settles either way.
  const [seeded, setSeeded] = useState(card);
  if (!writing && seeded !== card) {
    setSeeded(card);
    if (!deckScope) setPick(card.preferredPrinting);
  }
  // The deck's pick re-read (the deck page refreshes after a write), reconciled the same way.
  const [seededDeckPick, setSeededDeckPick] = useState(deckPrinting?.pick ?? null);
  if (deckScope && !writing && seededDeckPick !== deckPrinting.pick) {
    setSeededDeckPick(deckPrinting.pick);
    setPick(deckPrinting.pick);
  }

  // The read the write's own eviction starts can answer before the write does, and the card
  // it brings back predates the write. Holding it while the write runs is not enough: the
  // write's second eviction starts the read that supersedes it, and nothing waits for that
  // read, so the transition ends first and the stale card reconciles a moment later — the
  // reader watches their pick revert to the printing they replaced. Marking such a card as
  // seeded on the way out of the write retires it without reconciling, so the pick stands
  // until the read taken after the write answers.
  const arrived = useRef(card);

  // What the server is known to hold, and the only safe thing to put back when a write does
  // not take. The card on screen is not that: a write's own re-read can fail, leaving the
  // reader looking at a card older than a pick the server accepted, and rolling a later
  // refusal back to it would revert past a choice that landed.
  const serverPick = useRef<PreferredPrinting | null>(seedPick);
  const writes = useRef(0);
  const settled = useRef(0);
  /**
   * The pick currently on screen, for the art reported to `onArtChange`.
   *
   * A ref rather than `pick` read through a closure: a write settles in a callback created
   * when it STARTED, so a reader who picked again while it ran would have the older render's
   * pick reported as current and watch the list revert to a printing they had replaced.
   */
  const livePick = useRef<PreferredPrinting | null>(seedPick);

  useEffect(() => {
    arrived.current = card;
    // A read taken while a write is outstanding predates it, so its preference is not what
    // the server holds — only the write can say that, and it does so when it settles.
    if (writes.current === settled.current) serverPick.current = deckScope ? deckPrinting.pick : card.preferredPrinting;
  }, [card, deckScope, deckPrinting?.pick]);

  /** The preference the art resolves through: the deck's pick, else the Collection's (deck scope). */
  const effective = useCallback(
    (next: PreferredPrinting | null): PreferredPrinting | null => (deckScope ? next ?? card.preferredPrinting : next),
    [deckScope, card.preferredPrinting],
  );

  // Everything the modal shows about the current printing — art, caption, shown-now badge —
  // reads from this one object, so an optimistic pick moves all three together or none.
  const preview = useMemo<BrowseCard>(() => {
    const at = picked ? null : openAtPrinting;
    // A finish with no printing (a list card its holder owns none of): the reader's own printing, in the list's finish.
    if (at && at.setCode === undefined) {
      const next = { ...card, preferredPrinting: effective(pick), printings: card.printings.map((p) => ({ ...p, viewedFinish: at.finish })) };
      // A deck's own pick names a printing the server did not name the card for, as the plain branch below works out.
      if (!(deckScope && pick)) return next;
      const shown = resolvedPrinting(next);
      return { ...next, printedName: shown ? cardArt(card.name, shown).printedName : null };
    }
    if (!at) {
      const next = { ...card, preferredPrinting: effective(pick) };
      // Only once the reader has actually picked. `card.printedName` is the server's
      // answer and is right until then — recomputing it unconditionally would resolve a
      // different printing than `aggregateCollection` did and rename cards nobody touched.
      // After a pick it is stale by construction: it was resolved for the preference the
      // pick just replaced, so the art and caption moved while both headings did not.
      // A deck's own pick is a different printing from the one the server named the card for, so
      // its printed name is worked out here too, as it is after a pick in this modal.
      if (!picked && !(deckScope && pick)) return next;
      const shown = resolvedPrinting(next);
      return { ...next, printedName: shown ? cardArt(card.name, shown).printedName : null };
    }
    // For an OWNED card `card.printings` is what the reader owns, and a holding matched by
    // name carries no collector number — so the printing the caller is showing is often
    // absent and the resolver would fall back to an unrelated set. Injected at quantity 0
    // so it resolves; the picker reads `card.printings`, not this, and never sees it.
    // A row matching by set and collector number is not necessarily carrying that
    // printing's art: `collection_items.scryfall_id` is nullable, and `aggregateCollection`
    // falls back to the set representative when the exact join is missing — so a Moxfield
    // or Archidekt holding can match here and still hold another printing's image. When the
    // caller handed over the exact art, it wins over that fallback.
    // Identity is the caller's id where it gave one, and the (set, collector number)
    // pair where it did not. The distinction matters because the pair is not unique:
    // `printings` puts no constraint on it, so a fetched row can share the pair and
    // still BE a different printing. Stamping the caller's id onto that row would put
    // one printing's price under another's art — so a row whose own id disagrees does
    // not count as the printing being opened, and the exact one is injected below.
    // A row that names no id is taken as the printing being opened only where the
    // pair names ONE catalog printing. Where the catalog gives it to two — which the
    // price snapshot has already worked out, and is the only place that knows — an
    // id-less holding could be either sibling, and stamping the caller's id onto it
    // would put the opened printing's figure under a picture that may be the other
    // one's. There the exact row is injected instead.
    const pairAmbiguous = card.prices?.ambiguousKeys.includes(priceKeyFor(at)) ?? false;
    const isTarget = (p: BrowsePrinting) =>
      at.scryfallId
        ? p.scryfallId === at.scryfallId
          || (!pairAmbiguous && p.scryfallId === undefined && matchesPreference(p, at))
        // With no id from the caller either, an ambiguous pair identifies nothing at
        // all: rewriting an owned row's art here would leave that row's id — and so
        // its price — under a picture that may belong to its sibling. The caller's
        // printing is injected instead, and prices itself or nothing.
        : !pairAmbiguous && matchesPreference(p, at);
    const known = card.printings.some(isTarget);
    // The row the caller's id names, first — whether it was already owned or has just been
    // injected. Resolution matches a preference on the (set, collector number) PAIR, and the
    // pair is not unique, so a sibling that happens to sort first wins it and the modal
    // draws, prices and turns that sibling under the identity the reader clicked. An id is
    // the one thing that settles which row is meant; without one there is nothing to put in
    // front, and the ambiguous cases below are deliberate about preferring the owned row.
    const idFirst = (rows: BrowsePrinting[]) =>
      at.scryfallId === undefined
        ? rows
        : [...rows].sort((x, y) =>
          Number(y.scryfallId === at.scryfallId) - Number(x.scryfallId === at.scryfallId));
    const printings = known
      ? idFirst(card.printings.map((p) => {
          if (!isTarget(p)) return p;
          // The caller's id names the printing exactly, and travels whether or not it
          // also handed over art: the row's own id may be absent, or dropped because
          // two holdings disagreed about it, and the price is looked up by it.
          const withId = at.scryfallId ? { ...p, scryfallId: at.scryfallId } : p;
          if (!at.imageUri) return withId;
          // The flavour name goes with the art it described — but only when the art
          // actually changes. `aggregateCollection` fills the name from the set
          // REPRESENTATIVE when a holding has no `scryfall_id`, and it is that fallback
          // the exact art replaces; where the two URLs already agree, the row is the
          // printing and its name is the right one. Clearing unconditionally took the
          // name off an owned Secret Lair whose art was never in question.
          return {
            ...withId,
            imageUri: at.imageUri,
            // The caller's exact art IS this printing's own (the same provenance the back carries below), so a foil
            // holding opened from its own set-grid cell draws its film (foil R2, `faceFilm`).
            hasOwnArt: true,
            // The back moves with the front, on the same condition: this row is being
            // repointed at the printing the caller named, and half a repointing is the
            // two-printing pairing the column exists to prevent.
            //
            // A NULL FROM THE CALLER IS NOT AN OVERRIDE. Every printing row carries null
            // there until the catalog is re-seeded against the new column, and this row's
            // own back has already fallen through the tiers to the oracle-level image —
            // so writing the null over it would take the second face off a card that has
            // one, on exactly the printings the column has not reached yet.
            ...(at.backImageUri
              // Provenance travels WITH the override, never on its own: the caller handed
              // this row's own back art, so it is this printing's. Left alone where the
              // override is absent, so the loader's answer stands.
              ? { backImageUri: at.backImageUri, hasOwnBack: true }
              : {}),
            flavorName: at.imageUri === p.imageUri ? p.flavorName : null,
            ...(at.finish ? { viewedFinish: at.finish } : {}),
          };
        }))
      : (() => {
        const injected = {
      setCode: at.setCode,
      setName: at.setCode,
      scryfallId: at.scryfallId,
      collectorNumber: at.collectorNumber,
      releasedAt: null,
      quantity: 0,
      finishes: {},
      // Only over the opener's own art: the fallback below is the oracle's, which no finish belongs to.
      ...(at.finish && at.imageUri ? { viewedFinish: at.finish } : {}),
      // `resolveImageUri`'s card-level fallback, not a hard null: a set cell whose
      // full-size art the catalog does not hold would otherwise open on the identity
      // gradient, where the modal used to show the card's own image.
      imageUri: at.imageUri ?? card.imageUri,
      backImageUri: at.backImageUri ?? card.backImageUri ?? null,
      // TRUE ONLY FOR THE CALLER'S OWN BACK, never for the card-level fallback beside it.
      // A reversible printing opened from a set page reaches the modal through here, so
      // without this the turn control is absent on exactly the path the feature was built
      // for — and the fallback's image belongs to whatever printing seeded the oracle row,
      // which is the conflation `hasOwnBack` exists to end. Raised by review.
      hasOwnBack: at.backImageUri != null,
      // The card-level back is the same fallback `imageUri` takes above, and the same one a
      // printing ingested before the column existed falls to. What it must not do is stay
      // absent: an injected row with no back reads as "this printing has no second face",
      // and `resolved?.backImageUri ?? card.backImageUri` would then pair this printing's
      // front with the oracle row's back without either of them saying so.
      flavorName: null,
        };
        // ORDER DECIDES WHICH ROW RESOLUTION FINDS, because a preference matches on the
        // (set, collector number) PAIR and the pair is not unique — which is the very case
        // this row is injected for. An owned sibling sharing the pair matches too, and
        // `find` returns whichever comes first.
        //
        // It goes first only when the caller named the printing BOTH ways — an id and its
        // art. Then this row is the one being shown and must win the pair match, or the
        // sibling that happens to sort first is drawn under the clicked cell's identity.
        //
        // With either half missing it is appended and loses, deliberately. No id and the
        // art could be the sibling's; no art and there is nothing to draw with. In both
        // cases the owned row keeps the picture, and its price, name and back stay with it
        // — one printing named by all four — which is what the ambiguous-pair cases in
        // `card-modal-price.test.tsx` pin.
        // Same rule as the owned branch, with one extra condition: this row has no art of
        // its own unless the caller sent some, and a row with no picture cannot be the one
        // being shown. With either half missing it goes last and loses, deliberately — no
        // id and the art could be the sibling's, no art and there is nothing to draw with.
        // Both are pinned by the ambiguous-pair cases in `card-modal-price.test.tsx`.
        return at.imageUri && at.scryfallId
          ? idFirst([injected, ...card.printings])
          : [...card.printings, injected];
      })();
    // The title follows the art. `printedName` is a CARD-level field, set from whichever
    // printing the collection resolved to — so left alone it would print the owned
    // holding's flavour name over the printing the cell actually opened at, which is the
    // pairing `BrowseCard` documents and this whole branch exists to keep. Derived from the
    // row the preview resolves to: the injected row carries no flavour name, so an
    // unowned target falls back to the oracle name, which is the honest answer for a
    // printing the reader has no copy of.
    const row = printings.find((p) => matchesPreference(p, at));
    // The same exact-equality rule `aggregateCollection` applies, verbatim: a printing whose
    // flavour name IS the oracle name has renamed nothing, and copying it here would print
    // the name twice and add an oracle-name line under it that says the same thing.
    // Only off a printing the reader OWNS. `catalogCard` fills `printings` with the whole
    // catalog at quantity 0 for a card nobody owns, so a renamed catalog row would put a
    // printed name on a card with no copy of it — which locked decision 2 forbids
    // (`card-detail.ts`): there is no printing in hand to print one.
    const renamed =
      row !== undefined && row.quantity > 0
      && row.flavorName != null && row.flavorName !== card.name
        ? row.flavorName
        : null;
    return { ...card, printings, preferredPrinting: at, printedName: renamed };
  }, [card, pick, picked, openAtPrinting, effective, deckScope]);
  const resolved = resolvedPrinting(preview);
  /**
   * The art a list behind this modal should draw once `next` is the card's preference.
   *
   * Resolved through `resolvedPrinting` rather than off the picked tile directly, because a
   * cleared pick falls back through the same tiers the server does — and because the pick
   * wins even when its own image is null, which only that resolver knows.
   */
  const artFor = useCallback(
    (next: PreferredPrinting | null): CardArt | null => {
      const shown = resolvedPrinting({ ...card, preferredPrinting: effective(next) });
      return shown ? cardArt(card.name, shown) : null;
    },
    [card, effective],
  );
  // The picker is about the printings you OWN — every string it renders says so, and picking
  // one only decides which of your copies represents the card. `card.printings` is not that
  // list for an unowned card: `catalogCard` fills it with the whole catalog at quantity 0, so
  // the modal offered a pick between sixteen printings of a card the user owns none of, under
  // the heading "16 printings you own". For an owned card every row already has copies, so
  // this filter changes nothing.
  const ownedPrintings = useMemo(
    () => card.printings.filter((p) => p.quantity > 0),
    [card.printings],
  );
  // A token's details (`loadTokenDetail`) draw only what a token has: no rarity, identity or owned
  // count, and a buy link only to the Mana Pool product its price is for (none when it lists none).
  const isToken = card.kind === "token";
  // A token has no Collection-wide printing preference to write, so its picker is the DECK's alone (token
  // printings TP2): drawn only where a deck can save the pick.
  const hasPicker = ownedPrintings.length > 1
    && (isToken ? deckPrinting?.save !== undefined : deckPrinting === undefined || deckPrinting.save !== undefined);
  const buyUrl = isToken ? card.tokenBuyUrl ?? null : manapoolCardUrl(card.name);
  const buyLabel = isToken ? cardLinkOutCopy.token : cardLinkOutCopy.card;
  // M8 (discovery R1): Find a deck's moment is for a card the reader owns and no deck uses, read off this card's own
  // claims (`fitsDoor` decides only that the door is drawn). A card with no availability read is not counted as unused.
  const fitsMoment = card.quantity > 0 && !deckHolds && card.availability != null
    && card.availability.hard === 0 && card.availability.soft === 0;

  /**
   * Closing unmounts the layer.
   *
   * IT USED TO PLAY OUT over 160ms, per the motion table's exit row, and that one
   * animation cost five rounds of review: a layer that is mounted but leaving has to
   * answer Escape without restarting its own timer, ignore a keyboard press that
   * `pointer-events-none` does not stop, not steal focus back from whatever the next
   * Escape stage claimed, and not let a stale timer unmount a zoom the reader has
   * reopened. Every one of those was a real defect, and all of them were the exit's.
   *
   * The enter animation is what makes the zoom feel picked up rather than pasted in;
   * the exit was a 160ms fade nobody is waiting for. Dropping it was a deviation from
   * row 5.2 as Design drew it; Hugh ruled it on 2026-09-13 and that row now reads "no
   * exit, the layer unmounts", with E13 kept as the record of what changed.
   */
  const closeZoom = useCallback(() => {
    setZoomed(false);
    setZoomTurning(false);
    // The layer unmounts with any press still down (Escape mid-drag), so its release never arrives: drop the press
    // here, or a later open would read plain mouse movement as that press and tilt with no button held.
    zoomPress.current = null;
    zoomDragged.current = false;
    // The layer's own announcements go with it. Reopening shows the front, and a live
    // region still reading "Showing <back face>" would describe a card that is no
    // longer there.
    //
    // Unless the ART landed on a face while the layer covered it — that face is
    // what the reader is now looking at, and it has not been said yet. It REPLACES
    // the clear rather than preceding it: two `setAnnouncement` calls in one
    // handler are one render, and the last one wins.
    const held = heldArtFace.current;
    heldArtFace.current = null;
    setAnnouncement(held ?? "");
  }, []);
  const openZoom = useCallback(() => {
    // A zoom is a look, not a setting (table row 4.10): it always opens on the front,
    // whatever the last one was turned to. Its own face rather than the art's, so
    // closing the layer never reaches out and turns the card behind it back.
    setZoomFlipped(false);
    // Whatever the art behind announced belongs to the art behind. The zoom opens on
    // the front, and a region still reading "Showing <back face>" would describe it
    // wrongly from the first frame.
    setAnnouncement("");
    setZoomTurning(false);
    setZoomed(true);
  }, []);

  // Four rungs: the zoom, the phone's full sheet, the printing region (returning focus to
  // the Set field), then the dialog. The region's shipped two-stage shape with rungs added
  // on top rather than a new shape to learn (§3.11).
  const onEscape = useCallback(() => {
    if (locked) return;
    if (zoomed) {
      closeZoom();
      return;
    }
    // Find a deck's view goes back to the details, one layer (handoff R2, D2).
    if (view) {
      view.onBack();
      return;
    }
    // The phone's sheet (README R2 "Escape": full, then teaser, then close). The min snap steps
    // up to the teaser too, as a tap on it does.
    if (sheetOpen || min) {
      setSnap("teaser");
      return;
    }
    // In the phone's teaser the printing region is out of sight with the rest of the full
    // column, so an Escape that collapsed it would change nothing a reader can see: it closes.
    if (!expanded || narrow) {
      onClose();
      return;
    }
    setExpanded(false);
    // Collapsing by Escape has to empty the live region for the same reason toggleExpanded
    // does: reopening writes the identical open string, and a live region whose text did not
    // change is silent in most screen readers.
    setAnnouncement("");
    for (const ref of [mobileTriggerRef, desktopTriggerRef]) {
      if (ref.current && ref.current.getClientRects().length > 0) {
        ref.current.focus();
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `setSnap` reads `snap`, which `min` and `sheetOpen` track
  }, [closeZoom, locked, expanded, narrow, onClose, sheetOpen, min, zoomed, view]);

  // Focus trap + Escape + focus-return — shared hook, shared with the export dialog.
  // The ? lifted over the backdrop at 1280 is one more stop in the cycle, and only while this card is in front.
  useDialogA11y(dialogRef, onEscape, { initialFocusRef, returnFocusRef, extraStop: locked ? undefined : helpStop });
  useCardDetailsUp(!locked);
  // Open, in front or not: covered by a sheet or picker it opened, it has not closed (a ? sheet under it keeps waiting).
  useCardDetailsOpen(!dropping);


  const gestures = useCardSheetGestures({
    bandRef,
    sheetRef,
    stageRef,
    full,
    min,
    canMinimize: !cramped,
    teaserHeight,
    canPrev: onPrev !== null && !viewOpen,
    canNext: onNext !== null && !viewOpen,
    onPage: (dir, offset, progress) => (dir === "next" ? onNext?.(offset, progress, leftFace) : onPrev?.(offset, progress, leftFace)),
    onSnap: setSnap,
    bodyRef: sheetBodyRef,
    // Every card that has a teaser, stacked or not: since stacked sheets R1 a card opened from a sheet
    // draws at the unstacked geometry, so the old stacked exception (a squeezed card, grip-only) left
    // only a set of surfaces without the pull, Change Commander's candidates among them.
    canCollapse: !cramped,
    disabled: locked,
    tiltRef: phoneTiltRef,
  });

  // Focus follows the sheet when the control that moved it is gone: `All details` unmounts as the
  // sheet opens, and the whole full column is hidden as it closes. The grip is the one control
  // standing in both states, and it is the same toggle.
  const wasFull = useRef(false);
  useEffect(() => {
    if (wasFull.current === sheetFull) return;
    wasFull.current = sheetFull;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement
      && active !== document.body
      && dialogRef.current?.contains(active)
      && active.getClientRects().length > 0
    ) return;
    gripRef.current?.focus();
  }, [sheetFull]);

  // Focus follows the layer. In: to the flip control when the card has a back face,
  // otherwise to the close (row 3.12). Out: to the art that opened it, at whichever
  // width has layout (row 3.10).
  const wasZoomed = useRef(false);
  useEffect(() => {
    // Transitions only. Without this the effect's first run — on mount, with the
    // layer closed — would take focus off whatever the dialog's own trap had just
    // given it and park it on the art.
    if (wasZoomed.current === zoomed) return;
    wasZoomed.current = zoomed;
    if (zoomed) {
      // The turn where there is a face to turn to, the close otherwise — row 3.12,
      // now that the layer has both.
      (zoomFlipRef.current ?? zoomCloseRef.current)?.focus();
      return;
    }
    // Only when nothing else has claimed focus. A close leaves focus on the button
    // that is being unmounted, so the document falls back to `body` and this runs;
    // anything else already sitting on a control inside the dialog got there on
    // purpose — the printing region's own Escape stage is the one that does — and
    // taking it back would undo that.
    const active = document.activeElement;
    if (active && active !== document.body && dialogRef.current?.contains(active)) return;
    const mounted = zoomTriggerRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    // The visible one where the environment reports layout, and the first mounted one
    // where it does not — jsdom gives every element a zero rect, so a strict
    // visibility filter would hand focus to nobody in tests while looking correct.
    const target = mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0];
    target?.focus();
  }, [zoomed]);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    setAnnouncement(next ? pickerCopy.announceOpen(ownedPrintings.length) : "");
  }

  // A write the server refused and a write that never reached it leave the same thing on
  // screen: a printing the reader chose and the server does not hold.
  //
  // Only the newest write may roll anything back. Nothing stops the reader picking again while
  // a write is still running, so an older write can settle with a newer pick already painted,
  // and rolling back blindly would erase the choice the reader made last.
  function settleWrite(generation: number, wrote: boolean, written: PreferredPrinting | null) {
    settled.current++;
    setSeeded(arrived.current);
    if (wrote) serverPick.current = written;
    else if (generation === writes.current) {
      setPick(serverPick.current);
      livePick.current = serverPick.current;
    }
    // Whatever stands now, which for an older write settling under a newer pick is that
    // newer pick — untouched by this settlement and still the thing on screen.
    onArtChange?.(artFor(livePick.current), true);
  }

  function onPick(p: { setCode: string; collectorNumber: string }) {
    const written = { setCode: p.setCode, collectorNumber: p.collectorNumber };
    setPick(written);
    livePick.current = written;
    setPicked(true);
    setSaveFailed(false);
    onArtChange?.(artFor(written), false);
    const generation = ++writes.current;
    startWrite(async () => {
      let wrote = false;
      try {
        wrote = deckPrinting
          ? (await deckPrinting.save?.(written)) ?? false
          : await setCardArtPreference(card.oracleId, p.setCode, p.collectorNumber);
      } catch {
        wrote = false;
      }
      settleWrite(generation, wrote, written);
      // The region announced the pick; a refusal is said in the region, where the tiles reverted.
      if (deckPrinting && generation === writes.current) setSaveFailed(!wrote);
    });
  }

  function onClearPick() {
    setPick(null);
    livePick.current = null;
    setPicked(true);
    onArtChange?.(artFor(null), false);
    const generation = ++writes.current;
    startWrite(async () => {
      let wrote = false;
      try {
        await clearCardArtPreference(card.oracleId);
        wrote = true;
      } catch {
        wrote = false;
      }
      settleWrite(generation, wrote, null);
    });
  }

  // Announced here rather than in the region: the string names the printing that becomes
  // current once the pick is gone, and only the resolver knows which one that is.
  function onReset() {
    onClearPick();
    const fallback = resolvedPrinting({ ...card, preferredPrinting: null });
    if (fallback) setAnnouncement(pickerCopy.announceReset(fallback.setName ?? fallback.setCode));
  }

  // The base resolves off `preview`, so it names the printing actually on screen; the count
  // is of what the reader OWNS, so an injected row is art and not a holding.
  const caption = printingCaption(preview, ownedPrintings);
  // A token's details show no card, so the button names the token; in a deck the pick is the deck's.
  const triggerAria = deckScope
    ? deckPrintingsCopy.picker.triggerAria(ownedPrintings.length, caption, isToken ? card.name : undefined)
    : pickerCopy.triggerAria(ownedPrintings.length, caption);
  // A token whose printing read failed has no set to name, and so no meta block at all.
  const tokenNoSet = card.kind === "token" && caption === "";

  // The mobile and desktop meta blocks are parallel trees with one hidden by CSS, so the
  // region is instantiated twice and each instance needs its own id for aria-controls.
  const keyOf = (p: BrowsePrinting | undefined) => (p === undefined ? null : printingKey(p));
  const renderRegion = (id: string) => hasPicker && expanded ? (
    <PrintingRegion
      id={id}
      printings={ownedPrintings}
      preferred={pick}
      // In deck scope `Shown now` names what the deck falls back to without its pick: the
      // Collection's printing (handoff R3, plan call 6), not the art on screen.
      // Once the deck has a pick, no tile is `Shown now` (STATES, "Picked, open"): the badge marks
      // what the deck falls back to, and only while it is falling back.
      resolvedKey={keyOf(deckScope ? (pick === null ? resolvedPrinting(card) : undefined) : resolved)}
      scope={deckScope ? "deck" : "collection"}
      notice={deckScope && saveFailed ? deckPrintingsCopy.picker.failed : null}
      cardName={card.name}
      colorIdentity={card.colorIdentity}
      onPick={onPick}
      onReset={onReset}
      onForget={onClearPick}
      onAnnounce={setAnnouncement}
    />
  ) : null;

  const ZOOM_REGION = "card-zoom";

  // Arrow-key paging (handoff decision 4): anywhere in the dialog except the printing search
  // input, the printing radiogroup, and the zoom — "a look, not a browser", decision 1. A list
  // of one or two behaves exactly as the buttons do: the missing side is simply absent.
  //
  // SCOPED TO THE BACKDROP, not the dialog (pre-open review, round 1). A peek press moves
  // focus to the pressed plate via `initialFocusRef` on the REMOUNTED instance, and a neighbor
  // plate is a sibling of `dialogRef`'s element, outside it — a listener on the dialog alone
  // never sees a key pressed while focus sits on a plate, which stalled paging dead after the
  // first peek. The backdrop is the one ancestor both the dialog and the plates share.
  //
  // The listener itself sits ON THE DOCUMENT, taking a key whose target is the backdrop's
  // subtree OR the body. A click on plain text in the dialog (a rules line, a label) focuses
  // nothing, so focus falls to <body>, and a listener on the backdrop never heard the key: paging
  // went dead until the reader clicked something focusable. The body case is ours while this
  // modal is open; a card held under a sheet (`covered`) attaches no listener at all.
  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop || total <= 1 || locked || viewOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented) return;
      const target = e.target;
      if (target !== document.body && !(target instanceof Node && backdrop.contains(target))) return;
      // A modified arrow is somebody else's shortcut — Alt+Left/Right is browser history,
      // Cmd/Ctrl+Left/Right is a text-editing jump in some inputs (pre-open review, round 2).
      // Plain Left/Right only, or the carousel silently eats a navigation the reader meant.
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Paging is withheld while the phone's sheet is full (STATES h3); the counter stays.
      if (narrow && full) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        if (active.tagName === "INPUT") return;
        if (active.closest('[role="radiogroup"]')) return;
        if (active.closest(`#${ZOOM_REGION}`)) return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (onPrev) onPrev(undefined, undefined, leftFaceRef.current); else onAtStart?.();
      } else {
        e.preventDefault();
        if (onNext) onNext(undefined, undefined, leftFaceRef.current); else onAtEnd?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [total, onPrev, onNext, onAtStart, onAtEnd, narrow, full, locked, viewOpen]);

  // A back face to turn to, or none (#363). The image is the second condition and
  // not an afterthought: a `transform` row seeded before the back-face column
  // existed carries the layout and no art, and a control that turns to a
  // colour-identity gradient is the lie the layout gate exists to prevent.
  const backImage = resolved?.backImageUri ?? card.backImageUri ?? null;
  // TWO SIDES BY LAYOUT, OR BY THIS PRINTING'S OWN BACK ART.
  //
  // `card.layout` is ORACLE-level, and that is the wrong scope for a reversible
  // printing: `sld/2214` prints Teferi's Ageless Insight on both sides, while the
  // oracle row's layout comes from its M21 printing and says `normal`. So the art
  // was ingested (#811), stored, and unreachable — 81 printings carry their own
  // back image under a one-sided oracle layout, all of them reversibles.
  //
  // A printing's own back image is POSITIVE EVIDENCE of two-sided stock, and stronger
  // than the layout word, which describes the card in general.
  //
  // `hasOwnBack` RATHER THAN `backImageUri`, and the difference is the whole guard:
  // `resolveBackImageUri` hands a printing with no back of its own the ORACLE's image,
  // so the resolved string cannot say whose back it is. Reading it here put a turn on a
  // one-sided printing whose back belongs to another printing entirely — and the first
  // version of this gate did exactly that while passing its own test, because the
  // fixture built props by hand rather than through the loader. Raised by review.
  //
  // What excludes an ordinary split or adventure printing is its own null back art,
  // NOT the layout word: Scryfall gives those layouts one image between both halves,
  // so `card_faces[1]` carries no `image_uris` and the transform stores null. A
  // reversible printing OF an adventure card is a different thing and turns over
  // correctly — `tdm/381` prints Bloomvine Regent and Claim Territory on two sides,
  // and each side has its own art.
  const twoFaced = Boolean(backImage)
    && (isTwoFaced(card.layout) || Boolean(resolved?.hasOwnBack));
  // A pick that takes the back away mid-turn unmounts the turn box, so its transitionend never comes: end the turn
  // here, during render, or a later pick that brings a back would find the host still pinned and refuse every tilt.
  if (!twoFaced && (turning || zoomTurning)) {
    setTurning(false);
    setZoomTurning(false);
  }
  // CLAMPED TO WHAT EXISTS, not to what the reader last asked for.
  //
  // `flipped` survives a printing pick by design — only a card change remounts this —
  // and since the turn began taking a PRINTING's own back art as its signal, a pick
  // can take that art away underneath a turned card. Turn `sld/2214` over, pick the
  // M21 printing, and `backImage` goes null: the art fell back to the colour-identity
  // gradient and `turningArt` returned nothing, so there was no control left to turn
  // back with. Exactly the lie the gate's own comment above says it prevents, reached
  // from a direction that did not exist before — a `transform` oracle always carries
  // `cards.back_image_uri` as a fallback, so `backImage` could not go null under a pick.
  //
  // The reader's intent stays in `flipped`; every drawn decision reads this instead.
  const showingBack = twoFaced && flipped;
  // The faces of the name on screen, which is the printed one when the copy in
  // hand carries a printed name. The title above and this announcement must
  // name the same card.
  const faces = faceNames(printedNameOf(preview));
  // A reversible card's two sides carry ONE name, so `faceNames` hands back the same
  // string twice and every label built from it would name the card already on screen.
  // The side is what is left to say. See `twoFacedCopy.flipToSideAria`.
  const oneName = faces.front === faces.back;
  const flipLabel = (toBack: boolean) => (oneName
    ? twoFacedCopy.flipToSideAria(toBack ? "back" : "front")
    : twoFacedCopy.flipToAria(toBack ? faces.back : faces.front));
  const shownLabel = (onBack: boolean) => (oneName
    ? twoFacedCopy.flippedSideAria(onBack ? "back" : "front")
    : twoFacedCopy.flippedAria(onBack ? faces.back : faces.front));

  function onZoomFlip() {
    const next = !zoomFlipped;
    setZoomFlipped(next);
    dropTilt(zoomTiltRef.current);
    // Announced when the card has LANDED, not when the press happened: a reader who
    // presses twice quickly would otherwise be told about a face the card never
    // rested on. `onTransitionEnd` below carries the animated path; where there is no
    // transition to wait for — a reader who asked for less motion — the press is the
    // landing.
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setAnnouncement(shownLabel(next));
    else setZoomTurning(true);
  }

  function onTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    // Only the box's own turn, not a transition bubbling from something inside it.
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setZoomTurning(false);
    setAnnouncement(shownLabel(zoomFlipped));
  }

  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    // The inline tilt values come off, or they would beat the turn's flat centre (G4).
    dropTilt(desktopTiltRef.current);
    dropTilt(phoneTiltRef.current);
    // Same rule as the zoom's turn, for the same reason, now that the art in the
    // modal turns rather than swapping: announced when the card has LANDED. The
    // reduced-motion path has no transition to wait for, so the press is the
    // landing there.
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setAnnouncement(shownLabel(next));
    else setTurning(true);
  }

  function onArtTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setTurning(false);
    const face = shownLabel(showingBack);
    // NOT while the zoom is up. A reader who turns the art and opens the zoom
    // inside the 320ms turn leaves this transition still running underneath a
    // layer that deliberately opens on the FRONT — and `openZoom` clears the
    // region for exactly that reason. Announcing here would write the art's back
    // face into it while the front is on screen.
    //
    // HELD, not dropped: when the zoom closes, that back face is what the reader
    // is looking at, and a turn nobody ever announced is a face they were never
    // told about. `closeZoom` flushes this.
    if (zoomed) {
      heldArtFace.current = face;
      return;
    }
    setAnnouncement(face);
  }

  // Art follows the resolved printing, not the card-level image: they are the same value
  // today, but an optimistic pick updates `resolved` a revalidate earlier.
  //
  // The back face follows it, through `printings.back_image_uri`. Both faces come off one
  // printing or a flip turns to another printing's back — which is what it used to do, the
  // column having been oracle-level. A printing ingested before that column existed carries
  // null and falls back to the card's, which is where every flip stood before.
  // The two faces are drawn from their own images rather than from `faceImage`,
  // which follows `flipped`: a turning card shows both at once, and a box whose
  // background swapped mid-turn would be the swap this amendment exists to replace.
  const frontStyle: React.CSSProperties = resolved?.imageUri
    ? { backgroundImage: cssUrl(resolved.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const backStyle: React.CSSProperties = backImage
    ? { backgroundImage: cssUrl(backImage), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  // THE FILM (foil handoff R2) reads the printing these faces are drawn from, never `preview.foil`, which a pick
  // does not recompute (audit G9). Each face takes its own, so a back drawn from the oracle's art carries none.
  // Drawn as a span INSIDE each face, armed by its own preload (`FoilFilm`): the face itself is never marked.
  const frontFilm = { finish: faceFilm(resolved, "front"), src: resolved?.imageUri };
  const backFilm = { finish: faceFilm(resolved, "back"), src: backImage };
  // A one-faced card's art box IS its face, and draws the front.
  const oneFaceFilm = twoFaced ? null : <><FoilFilm {...frontFilm} size="large" /><Glare /></>;
  // The desktop's hover tilt (G12: a mouse or a pen only), on the host round the art alone.
  const tiltHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tiltsOnHover(e.pointerType)) liftTilt(e.currentTarget, e.clientX, e.clientY);
  };
  const tiltLeave = (e: React.PointerEvent<HTMLDivElement>) => dropTilt(e.currentTarget);
  const endZoomPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = zoomPress.current;
    if (!p || p.id !== e.pointerId) return;
    zoomPress.current = null;
    if (!p.tilting) return;
    dropTilt(e.currentTarget);
    zoomDragged.current = true;
    // This release's click only, never the next tap's.
    setTimeout(() => { zoomDragged.current = false; }, 0);
  };
  // A turn pins the host flat, but only while the art can turn: a pick that takes the back away mid-turn ends it.
  const turningAttr = turning && twoFaced ? "" : undefined;

  // `set · code · collector number`, and the field AND its separator go when the
  // holding carries no number — never "no number" (the printing picker's ruling).
  const zoomCaption = resolved
    ? `${cardZoomCopy.printing(
        resolved.setName ?? resolved.setCode,
        resolved.setCode,
        resolved.collectorNumber,
      )}${zoomFlipped ? cardZoomCopy.backSuffix : ""}`
    // A card with no printings at all names nothing, and ` · ` is not a caption.
    // The zoom draws the card and no line rather than a line with nothing in it.
    : null;

  const faceImage = showingBack ? backImage : resolved?.imageUri;
  // Handed to the page, so the card being left keeps the face it shows (a turned back, a printing it
  // was opened at) while it shrinks into its peek, whatever art the peek then rests on.
  const leftFace = faceImage ?? null;
  useEffect(() => {
    leftFaceRef.current = leftFace;
  });
  const artStyleOf = (image: string | null | undefined): React.CSSProperties => image
    ? { backgroundImage: cssUrl(image), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const artStyle = artStyleOf(faceImage);
  // THE ZOOM'S WASH follows the face the zoom shows, which can differ from the art behind it: the
  // zoom opens on the front and turns on its own (table row 4.10).
  const zoomWashStyle = artStyleOf(zoomFlipped ? backImage : resolved?.imageUri);

  // The figure belongs to the printing on screen, so it is resolved from the same
  // object the art and the `Set` caption read — a pick moves four things together
  // or none of them (card-detail R2, §1). `null` means draw nothing at all: either
  // no price read reached us, or the holding names no printing to ask about.
  // `{ fact: null }` is the other silence-adjacent state and is NOT silence — the
  // store answered, and the answer was that it has never carried this printing.
  const price = priceFor(card.prices, resolved);
  const priceTag = price ? (
    <PriceTag fact={price.fact} newestAsOf={card.prices?.newestAsOf ?? null} standalone />
  ) : null;

  // The other question, answered beside the first rather than instead of it.
  //
  // `/commanders/[slug]` quotes a card's CHEAPEST printing and this modal quotes
  // the printing on screen, so a reader who follows a $2.34 synergy row into a
  // $4.39 modal reads two correct figures for one card with nothing saying why.
  // The tag keeps belonging to the art; this names where the card starts.
  //
  // Drawn only where the cheapest is genuinely LOWER than what is on screen — and
  // where this printing carries no figure at all, which is the same reader with
  // the same question and no number to hold it against. Equal figures say
  // nothing: on the cheapest printing itself `from $2.34` beside `$2.34` is the
  // same number twice.
  //
  // THE COMPARISON IS AGAINST THE DRAWN FIGURE, whatever finish supplied it, and
  // the cheapest is non-foil only — so the two sides can name different finishes.
  // That asymmetry is the rule rather than a gap in it: what this line must never
  // do is sit beside a smaller number claiming the card starts higher. A foil-only
  // $1.20 with a $4.39 non-foil sibling therefore says nothing, which is silence
  // and not a false claim; a foil-only $9.80 with the same sibling says
  // `from $4.39`, which is true and is the reason a reader would look.
  const shownState = price?.fact
    ? priceState(price.fact, card.prices?.newestAsOf ?? null)
    : null;
  const shownCents =
    price?.fact && shownState ? priceOf(price.fact, shownState) : null;
  const cheapestCents = cheapestLiveCents(card.prices);
  const fromCents =
    cheapestCents !== null && (shownCents === null || cheapestCents < shownCents)
      ? cheapestCents
      : null;
  // Whether the price line carries a FIGURE: a read that answered `no stock`, with no `from`
  // beside it, names no amount, so a phone footer keeps its own (stacked sheets R1, round 2).
  const figured = price !== null && (shownCents !== null || fromCents !== null);
  // The same split `PriceTag` makes, and for the reason recorded there: an
  // `aria-label` on a bare span lands on the generic role and is dropped, so the
  // visible words go `aria-hidden` and an `sr-only` sibling carries the sentence.
  // A COMPANION to the tag, never a replacement for it. Where `priceFor` returns
  // null the modal draws nothing at all — the holding names no printing, so the
  // store was never asked — and a cheapest figure alone there would answer a
  // question about a card under a picture of a printing nobody identified. The
  // stack keeps its silence; this line only ever qualifies a figure that is
  // already on screen.
  const fromLine = (phone: boolean) =>
    fromCents === null ? null : (
      <span
        className="flex items-center"
        data-testid={phone ? "modal-price-from-mobile" : "modal-price-from-desktop"}
      >
        <span aria-hidden="true" className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
          {priceCopy.cheapest.from(formatCents(fromCents))}
        </span>
        <span className="sr-only">{priceCopy.cheapest.aria(formatCents(fromCents))}</span>
      </span>
    );

  /**
   * The art in the modal ITSELF turns now (#2). It used to swap one background
   * for another with no motion, so the only place a two-faced card behaved like
   * one object was inside the zoom — two treatments for one act, and the quieter
   * one was the surface the reader meets first.
   *
   * Both faces are drawn, both hide their own back, and this box rotates: the
   * zoom's own construction, moved to a helper so the two cannot drift. It is an
   * INNER box rather than the art element itself, because the zoom trigger is
   * stretched over the art and must not ride the rotation — on the back face it
   * would be mirrored and pointing the wrong way, which is the bug the zoom's
   * own flip control was lifted out of the turning box to avoid.
   *
   * `perspective` belongs to the art element that contains this, not here.
   */
  const turningArt = (radius: string) =>
    twoFaced ? (
      <div
        aria-hidden
        data-testid="modal-art-turn"
        data-face={showingBack ? "back" : "front"}
        className={`absolute inset-0 ${radius} anim-card-turn`}
        onTransitionEnd={onArtTurnSettled}
        style={{
          transformStyle: "preserve-3d",
          transform: showingBack ? "rotateY(180deg)" : undefined,
        }}
      >
        <CardFaces
          front={frontStyle}
          back={backStyle}
          frontFilm={frontFilm}
          backFilm={backFilm}
          radius={radius}
          seam="inset 0 0 0 1px rgba(0,0,0,0.3)"
          testIdPrefix="modal-art"
        />
      </div>
    ) : null;

  /**
   * What sits under the desktop card (#3, #4): the zoom hint, then the turn
   * control, then the price. The phone's stack retired with its art header and
   * its zoom (carousel R2): the turn plate sits at the card's bottom centre there, and
   * the price on the sheet's second line.
   *
   * The ⤢ plate that used to sit in the art's bottom-left corner is gone, and
   * the turn control has come off the art with it. A glyph on the picture had to
   * be decoded; a line of words under it does not, and the two controls no
   * longer sit on top of the thing they are about.
   *
   * The hint is `aria-hidden` rather than spoken: the art's own button is
   * already named "Look at {card} up close", and a second voice saying "Click to
   * zoom" beside it would be the same instruction twice.
   */
  /**
   * How much room the stack under the art needs, in px, at DESKTOP — the width
   * whose column has a fixed height to fit inside. 10px clears the art, the hint
   * is a 15px line, and each further row is a 6px gap plus its own height: 32 for
   * the turn control, and **21** for the tag.
   *
   * 21, not 18: the tag is 10px text at the inherited 1.5 line-height, 2px of
   * padding each side and a 1px border — measured in Chromium, and the same 21px
   * the plate fix in `price-tag.tsx` was measured against. An 18px guess put the
   * reservation 3px short, which is a clipped row on a short window and nothing at
   * all on a tall one.
   *
   * A number rather than a measurement: it feeds a CSS `calc` that sizes the art,
   * and measuring the stack to size the box the stack is positioned against is a
   * loop. These are the same figures the markup below sets.
   *
   * THE TAG'S ROW IS RESERVED WHETHER OR NOT THERE IS A TAG. Row 1.14: a pick that
   * turns an absent figure into a priced one must move nothing above it — and if
   * the reservation followed `priceTag`, the art would change width under the
   * reader at the moment the tag appeared, which is the same defect one level up.
   */
  const underCardHeight = 10 + 15 + (twoFaced ? 38 : 0) + 27 + (door ? DOOR_HEIGHT : 0);

  const underCard = (
    <>
      <p
        aria-hidden
        data-testid="modal-zoom-hint"
        className="m-0 whitespace-nowrap font-mono text-[10px]"
        style={{ color: "var(--fg-locked)" }}
      >
        {cardZoomCopy.hintDesktop}
      </p>
      {twoFaced && (
        <FlipControl
          flipAria={flipLabel(!showingBack)}
          onFlip={onFlip}
          // 32 on the desktop, where the column below the art is 97px tall at the
          // drawn dialog height and this stack has to fit three rows inside it.
          size={32}
        />
      )}
      {priceTag && (
        <div data-testid="modal-price-desktop">
          {/* One ROW, not one more row: the stack's height is reserved by
              `underCardHeight` and a second line under the tag would need that
              figure moved — and would put the art's width under the reader at
              the moment a pick made the line appear, which is the defect row
              1.14 already forbids one level up. */}
          <span className="inline-flex items-center gap-[6px]">
            <span data-testid="modal-price-tag-desktop">{priceTag}</span>
            {fromLine(false)}
          </span>
        </div>
      )}
    </>
  );

  return (
    // One reading order for the neighbors' art, plates and peeks alike (`ArrivalOrder`): a pair fades in together.
    <ArrivalOrder>
    {/* Fixed backdrop wrapper — §Backdrop at 0.72, mixed against the canvas so the
        dim tracks the theme; blurred collection behind is decorative and out-of-scope */}
    <div
      ref={backdropAndInertRef}
      className={
        "fixed inset-0 flex items-center justify-center"
        + (covered ? " z-[49]" : " z-50")
      }
      inert={locked}
      role="presentation"
      onClick={locked ? undefined : onClose}
      style={{
        // A stand-in over a sheet over its original draws its own lighter scrim (addendum §3), so the
        // two layers under it read as two steps down; any other stacked card leaves the sheet's.
        background: dropped
          ? "color-mix(in oklab, var(--bg) 60%, transparent)"
          : stacked ? "transparent" : "color-mix(in oklab, var(--bg) 72%, transparent)",
      }}
      data-stacked={stacked || undefined}
      data-stack-dropping={dropping || undefined}
    >
      {/* Positioned OFF the centering flex row, not beside it (pre-open review, round 1): a
          plate sized as a flex sibling shifts the centered dialog by its own width-plus-gap
          whenever only one side has a neighbor (a list's first or last card), moving the
          dialog and footer controls under the reader mid-page. Anchored instead from the
          backdrop's own center, by the same 820px dialog half-width and 24px gap the 1252px
          threshold is built from — so the dialog never moves, with a neighbor on one side,
          both, or neither. Hidden while the zoom is open (decision 1: "a look, not a
          browser" — a visible, clickable plate behind the zoom could still page past it). */}
      {wideEnoughForNeighbors && prevSibling && !zoomed && !viewOpen ? (
        <NeighborPlate ref={prevPeekRef} sibling={prevSibling} direction="previous" onPress={() => onPrevPeek?.()} />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // The ? lifted over the backdrop (R2·9) belongs to this modal's accessibility tree; absent, the id names nothing.
        aria-owns={locked ? undefined : HELP_STOP_ID}
        onClick={(e) => e.stopPropagation()}
        // A swipe that began on a peek, the grip or the turn plate ends in that control's click;
        // a drag that locked an axis is not a press, so the gestures swallow it here.
        onClickCapture={gestures.onClickCapture}
        // Mobile: full-screen sheet (§Mobile: Full-Screen Sheet Container: bg var(--surface-sunken))
        // Desktop: 820px centered, bg --surface-rail, border 1px --border-strong, radius 16px, shadow --modal-shadow
        // Desktop height is fixed rather than h-auto: oracle text runs from one
        // line to twelve, and paging Prev/Next through the collection resized
        // the dialog under the cursor on every step. The content column scrolls
        // instead.
        // `relative` is load-bearing, not decoration: the zoom layer is absolute and
        // takes its box from the nearest positioned ancestor. Without it that ancestor
        // is the fixed backdrop, so the layer would cover the viewport — a second
        // full-screen thing over a dialog over a backdrop, and clicks outside the
        // dialog would dismiss the zoom instead of reaching the backdrop.
        className={""
          // 80px down, or as far as the room under a centred card allows on a short window.
          + (dropped ? "md:translate-y-[min(80px,calc((100dvh-min(620px,85dvh))/2-8px))] " : "")
          + (rise ? "anim-stack-rise " : "")
          + "relative flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85dvh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]"}
        style={{
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <CardModalArtSide
          artStyle={artStyle} preview={preview} oneFaceFilm={oneFaceFilm} turningArt={turningArt} turningAttr={turningAttr}
          twoFaced={twoFaced} showingBack={showingBack} flipLabel={flipLabel} onFlip={onFlip}
          underCard={underCard} underCardHeight={underCardHeight} door={door}
          narrow={narrow} min={min} full={full} zoomed={zoomed} viewOpen={viewOpen} teaserHeight={teaserHeight}
          bandRef={bandRef} stageRef={stageRef} onBandPointerDown={gestures.onBandPointerDown}
          prevSibling={prevSibling} nextSibling={nextSibling} onPrevPeek={onPrevPeek} onNextPeek={onNextPeek}
          prevPhonePeekRef={prevPhonePeekRef} nextPhonePeekRef={nextPhonePeekRef}
          leftFace={leftFace} enteredLeftFace={enteredLeftFace} enteredFrom={enteredFrom}
          enteredOffset={enteredOffset} enteredProgress={enteredProgress} phoneTiltRef={phoneTiltRef}
          total={total} position={position} phoneBack={phoneBack} registerCloseRef={(slot, el) => { closeRefs.current[slot] = el; }} onClose={onClose}
          desktopTiltRef={desktopTiltRef} tiltHover={tiltHover} tiltLeave={tiltLeave}
          registerZoomTriggerRef={(slot, el) => { zoomTriggerRefs.current[slot] = el; }} openZoom={openZoom} zoomRegion={ZOOM_REGION}
        />

        {/* Content column — desktop: padding 30px 32px, a flex stack whose body scrolls while
            the Prev/Next row stays bottom-aligned whatever the oracle text length.

            ON THE PHONE IT IS THE SHEET (carousel R2): risen over the card band, at the teaser's
            top or at y 64, in `--surface-rail` with an 18px top radius. One element at both widths
            rather than a second copy of the details for the phone, so nothing in it is drawn
            twice; the phone-only rows inside are `md:hidden`. A drag writes `--sheet-drag-top`
            over the snap until the release, and the top transitions to whichever snap it chose. */}
        <CardModalSheet
          card={card} preview={preview} resolved={resolved} titleId={titleId} caption={caption} ownedPrintings={ownedPrintings}
          hasPicker={hasPicker} isToken={isToken} tokenNoSet={tokenNoSet} pick={pick} deckScope={deckScope} total={total} position={position}
          deckPage={deckPage} deckName={deckName} buyUrl={buyUrl} buyLabel={buyLabel}
          min={min} full={full} zoomed={zoomed} viewOpen={viewOpen} cramped={cramped} gentle={gentle} sheetFull={sheetFull}
          teaserHeight={teaserHeight} closeReserve={closeReserve} back={back}
          onSheetPointerDown={narrow ? gestures.onSheetPointerDown : undefined} setSnap={setSnap}
          priceTag={priceTag} fromLine={fromLine} doorStrip={doorStrip} footer={footer} figured={figured}
          printingRegion={renderRegion}
          wishlistBox={card.wishlist ? (
            <CardWishlist
              key={card.oracleId}
              oracleId={card.oracleId}
              want={card.wishlist.want}
              owned={card.quantity}
              onWrite={() => { onProxyWrite?.(); onWishlistWrite?.(); }}
            />
          ) : null}
          proxyBox={deckId && deckHolds ? (
            <ProxyControl
              deckId={deckId}
              deckName={deckName ?? ""}
              oracleId={card.oracleId}
              cardName={card.name}
              proxied={(card.proxiedBy ?? []).some((d) => d.id === deckId)}
              known={card.proxiedBy !== null && card.proxiedBy !== undefined}
              onSaved={onProxyWrite}
              footer={<TokenCardLine oracleId={card.oracleId} onShowTokens={onShowTokens} />}
            />
          ) : null}
          tokenDeckBox={deckId && isToken ? <TokenDeckBox oracleId={card.oracleId} onSelectCard={onSelectCard} /> : null}
          openCombo={openCombo} onOpenCombo={onOpenCombo} onSelectCard={onSelectCard}
          expanded={expanded} triggerAria={triggerAria} onToggleExpanded={toggleExpanded}
          fitsDoor={onFindDeck ? (layout) => (
            <FitsDoor cardName={card.name} onPress={onFindDeck} pickerOpen={fitsOpen} moment={fitsMoment} layout={layout} reading={fitsReading} />
          ) : null}
          onEditCopies={onEditCopies} receiptLink={receiptLink} onPrev={onPrev} onNext={onNext}
          sheetRef={sheetRef} gripRef={gripRef} doorRef={doorRef} sheetBodyRef={sheetBodyRef}
          mobileTriggerRef={mobileTriggerRef} desktopTriggerRef={desktopTriggerRef}
          prevButtonRef={prevButtonRef} nextButtonRef={nextButtonRef}
          registerCloseRef={(el) => { closeRefs.current[1] = el; }}
          registerBackRef={(el) => { closeRefs.current[1] = el; backRef.current = el; }}
          onClose={onClose}
        />
        {/* The modal's one live region (handoff §Accessibility). Do not add a second.
            A direct child of the dialog rather than of the content column, because the
            zoom marks that column `inert` — and an inert subtree is out of the
            accessibility tree, so every announcement the layer makes would have been
            written where nothing could read it. */}
        <div aria-live="polite" className="sr-only">{announcement}</div>

        {view ? (
          // Inert under the zoom, as the details are: the zoom covers the whole dialog, and the view's controls
          // must leave the focus trap with it.
          <div data-testid="card-modal-view" inert={zoomed} className="absolute inset-0 z-10 flex flex-col md:left-[320px]">
            {view.node}
          </div>
        ) : null}

        {/* THE ZOOM LAYER — a region inside this dialog, never a dialog of its own and
            never the viewport (table §3.1). `absolute inset-0` against the dialog
            element, so the backdrop's click-to-close survives underneath and no second
            focus trap or live region is introduced. */}
        {zoomed && (
          <div
            id={ZOOM_REGION}
            role="region"
            aria-label={cardZoomCopy.layerAria(printedNameOf(preview))}
            data-testid="card-zoom"
            // `inset-0` is the dialog's padding box, and above `md` the dialog also
            // draws a 1px border outside it. The layer cannot cover that strip: the
            // dialog is `overflow-hidden`, so a negative inset paints nothing and
            // receives nothing. A click on the hairline therefore hits the dialog and
            // does nothing at all — which is the right failure for a 1px target that
            // was never a dismissal path, and better than pretending otherwise.
            // THE ZOOM MATCHES THE VIEW BEHIND IT, AT EACH WIDTH (H22, Hugh's walk). Below
            // `md` that view is the phone's art header, so the zoom takes its ground and its
            // wash (below), opaque, and nothing of the page shows through. From `md` the
            // dialog draws no wash, so the zoom keeps the handoff's 94% scrim and its
            // backdrop blur (README:256). The blur needs no prefix: the utility emits the
            // WebKit declaration beside the standard one.
            className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden anim-zoom-in bg-[color:var(--surface-sunken)] md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] md:backdrop-blur-[10px]"
            onClick={() => {
              // A press that tilted the card is not a tap on the layer.
              if (zoomDragged.current) {
                zoomDragged.current = false;
                return;
              }
              closeZoom();
            }}
            style={{
              // Shallow enough to be a turn rather than a lens (table row 4.2).
              perspective: "1400px",
            }}
          >
            {/* THE WASH, the phone header's own treatment (`mobile-art-wash`): the zoomed
                face's art, blurred, dimmed and scaled past its own edges so the blur has
                no transparent rim. The layer clips the overscale. Phone only, as that
                header is. */}
            <div
              aria-hidden
              data-testid="card-zoom-wash"
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{
                ...zoomWashStyle,
                filter: "blur(22px)",
                transform: "scale(1.2)",
                opacity: 0.45,
              }}
            />
            {/* The whole card, at the largest 63/88 the rect allows — 372x520 desktop,
                318x444 phone. Clicking it closes too: three doors, one stage. */}
            <div className="relative flex flex-col items-center" data-testid="card-zoom-stage">
            {/* THE TILT HOST round the zoom card, which turns itself (desktop only, G5). A mouse or a pen tilts it on hover,
                as details does (README R2 "Desktop"); touch, which has no hover, tilts on a press that moves past the
                swipe's slop and closes nothing. Its own transform flattens, so it carries the perspective. */}
            <div
              ref={zoomTiltRef}
              data-testid="card-zoom-tilt"
              data-tilt="zoom"
              data-turning={zoomTurning && twoFaced ? "" : undefined}
              className="relative rounded-[13px] md:rounded-[14px]"
              style={{ perspective: "1400px" }}
              onPointerEnter={tiltHover}
              // A hovering pointer's leave only: a touch's tilt is ended by its own release (`endZoomPress`, by pointer
              // id), so a second finger leaving cannot drop the first finger's tilt.
              onPointerLeave={(e) => { if (tiltsOnHover(e.pointerType)) tiltLeave(e); }}
              onPointerDown={(e) => {
                // A hovering pointer is already tilting the card, and its click closes the zoom as any click does.
                if (tiltsOnHover(e.pointerType)) return;
                // One press at a time, as the sheet gesture does: a second finger would overwrite the first, whose
                // release or cancel is then ignored and leaves the card tilted with no gesture behind it.
                if (zoomPress.current) return;
                zoomPress.current = { id: e.pointerId, x: e.clientX, y: e.clientY, tilting: false };
                try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* already released */ }
              }}
              onPointerMove={(e) => {
                if (tiltsOnHover(e.pointerType)) { tiltHover(e); return; }
                const p = zoomPress.current;
                if (!p || p.id !== e.pointerId) return;
                if (!p.tilting && Math.hypot(e.clientX - p.x, e.clientY - p.y) < SWIPE.lockPx) return;
                p.tilting = true;
                liftTilt(e.currentTarget, e.clientX, e.clientY);
              }}
              onPointerUp={(e) => endZoomPress(e)}
              onPointerCancel={(e) => endZoomPress(e)}
            >
            <div
              data-testid="card-zoom-card"
              className={`relative rounded-[13px] md:rounded-[14px] w-[var(--zoom-w)] md:w-[var(--zoom-w-md)] ${
                twoFaced ? "anim-card-turn" : ""
              }`}
              data-face={twoFaced ? (zoomFlipped ? "back" : "front") : undefined}
              onTransitionEnd={twoFaced ? onTurnSettled : undefined}
              style={{
                // ONE dimension is set and the ratio derives the other, because a
                // definite width AND a height cap is how an `aspect-ratio` box gets
                // squashed: once the cap bites, the width does not follow and the card
                // is drawn out of proportion. So the width is the smallest of the drawn
                // figure, what the viewport's width allows, and what its height allows
                // — 63/88 is 0.7159 — and the height is always the ratio's answer.
                //
                // The subtracted room is the caption, the ✕'s slot and the layer's own
                // breathing space; the desktop dialog is `min(620px, 85dvh)` tall, which
                // is what a landscape laptop can make shorter than the card.
                // The turn control sits UNDER the card now rather than on it, so a
                // two-faced card has to give back its 44px and the 12px above it.
                "--zoom-w": twoFaced
                  ? "min(318px, calc(100vw - 32px), calc((100vh - 196px) * 0.7159))"
                  : "min(318px, calc(100vw - 32px), calc((100vh - 140px) * 0.7159))",
                "--zoom-w-md": twoFaced
                  ? "min(372px, calc((min(620px, 85dvh) - 128px) * 0.7159))"
                  : "min(372px, calc((min(620px, 85dvh) - 72px) * 0.7159))",
                aspectRatio: "63/88",
                // A one-faced card is its own picture; a two-faced one draws both faces
                // inside and this box only turns them.
                ...(twoFaced ? null : artStyle),
                transformStyle: twoFaced ? "preserve-3d" : undefined,
                transform: twoFaced && zoomFlipped ? "rotateY(180deg)" : undefined,
                // The seam only: the drop shadow is the tilt host's, from the stylesheet (G3).
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
              } as React.CSSProperties}
            >
              {/* Two faces on one piece of card stock. Both are drawn, both hide their
                  own back, and the card turns — so neither face is ever seen mirrored
                  and the reader watches one object move rather than one picture being
                  replaced by another. */}
              {twoFaced && (
                <CardFaces
                  front={frontStyle}
                  back={backStyle}
                  frontFilm={frontFilm}
                  backFilm={backFilm}
                  radius="rounded-[13px] md:rounded-[14px]"
                  // A shade darker than the art column's, because the shadow it
                  // paints over is darker: `0 24px 60px rgba(0,0,0,.6)` against the
                  // column's `.55`/`.5`.
                  seam="inset 0 0 0 1px rgba(0,0,0,0.35)"
                  testIdPrefix="card-zoom"
                />
              )}
              {oneFaceFilm}
            </div>
            </div>
            {/* OUTSIDE the box that turns. Inside it, the control rode the rotation:
                on the back face its corner became the opposite one and its glyph was
                drawn from behind, mirrored. It belongs to the zoom, not to either
                face. The press stops here too — the layer dismisses on click, and a
                control that turns the card is not one of the three doors out.

                UNDER the card rather than on it, matching the modal behind it: one
                placement for one control, and a card at hand size should not have a
                button printed across its bottom edge. */}
            {twoFaced && (
              <span
                onClick={(e) => e.stopPropagation()}
                className="mt-[12px] flex justify-center"
              >
                <FlipControl
                  controlRef={zoomFlipRef}
                  flipAria={flipLabel(!zoomFlipped)}
                  onFlip={onZoomFlip}
                  size={44}
                />
              </span>
            )}
            </div>
            {/* One mono line: which printing you are holding. Never the price — a card
                in your hand has none printed on it, and the tag is one dismissal away. */}
            {zoomCaption && (
              <p
                // One line, and one line's worth of room: a long set name on a narrow
                // phone would otherwise wrap under the card or run past the layer. The
                // end ellipsis is the same treatment every truncated name in this app
                // gets — the set code and number are the half that identifies the
                // printing, and they sit at the end where the ellipsis never eats them
                // first.
                // `relative` puts it over the wash, an absolute sibling that would otherwise
                // paint on top of an in-flow line. ON THE PLATE below `md`, where the wash
                // is, as the art-wash ratification defines it (the phone's price stack above):
                // over the wash a bare 11px line has nothing to be legible against, and a light
                // art read it at about 1.5:1. From `md` the scrim is its ground, as before.
                className="relative font-mono text-[11px] mt-[14px] m-0 max-w-[calc(100%-32px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[7px] px-[8px] py-[3px] bg-[color:var(--bg)] border border-[color:var(--border-strong)] md:rounded-none md:p-0 md:bg-transparent md:border-0"
                style={{ color: "var(--fg-muted)" }}
              >
                {zoomCaption}
              </p>
            )}
            <button
              type="button"
              ref={zoomCloseRef}
              onClick={(e) => { e.stopPropagation(); closeZoom(); }}
              aria-label={cardZoomCopy.close}
              // The modal's shipped X in its shipped slot at both widths, gaining a
              // plate so it clears the scrim. Its label changes, its position does not.
              // The plate is what clears the scrim; the rest is the shipped ✕'s own
              // slot and size at each width.
              className="absolute flex items-center justify-center rounded-full top-[22px] right-[18px] md:right-[24px] w-[32px] md:w-[34px] h-[32px] md:h-[34px] text-[16px] md:text-[15px] bg-[color:var(--elevated)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      {wideEnoughForNeighbors && nextSibling && !zoomed && !viewOpen ? (
        <NeighborPlate ref={nextPeekRef} sibling={nextSibling} direction="next" onPress={() => onNextPeek?.()} />
      ) : null}
    </div>
    </ArrivalOrder>
  );
}
