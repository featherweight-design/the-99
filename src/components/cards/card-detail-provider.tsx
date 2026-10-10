"use client";
// One card-detail modal for the whole builder (#127, #91). Every deck surface — decklist row,
// suggestion, search result, commander thumb — opens through this context, so there is one
// piece of modal state on the page rather than one per row.
//
// The card is fetched on demand because deck surfaces carry only an oracle id; shipping 99
// cards' printings with the page to open one of them is the alternative. "On demand" starts at
// INTENT rather than at the click, on every surface that spreads `useCardIntent` (the shared
// `CardDetailTrigger` and the openers that call `open` themselves): a pointer resting on a trigger
// or keyboard focus arriving prefetches the card, so the click usually finds it already read or
// already reading.
// Two reads, deliberately: a prefetch goes to `GET /api/card-detail`, which queues behind none
// of the reader's actions, and a press goes to the server action, which runs in the page's own
// warm function. See `fetchCard` and `prefetchCard` below.
//
// A PRESS NEVER LEAVES AN ACTION PENDING AFTER THE UI HAS MOVED ON. Measured, not reasoned: an
// earlier build raced the prefetch against the press's own action and showed whichever answered
// first. The prefetch usually won, the modal painted, and the losing action stayed pending — and
// the NEXT server action on the page then ran ~800ms client-side against ~210ms on the server,
// so another card pressed 400ms after closing one took 815ms to open, every run (315ms before).
// With 2.5s between presses the effect vanished. The mechanism inside Next was not pinned down;
// the rule that avoids it is: wait on the prefetch for a bounded time, and if it has not
// answered, send the action and show ONLY the action's answer.

import {
  createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
  type RefObject,
} from "react";
import { twMerge } from "tailwind-merge";
import type { BrowseCard, CardArt, PreferredPrinting } from "../../lib/collection/browse";
import { printedNameOf, resolvedPrinting } from "../../lib/collection/browse";
import { getCardDetail } from "../../app/card-detail-action";
import { fetchCardDetail } from "../../lib/cards/fetch-card-detail";
import { FitsPicker } from "./fits-picker";
import { CardModal, type DeckPrintingScope } from "./card-modal";
import { setDeckPrinting } from "../../app/decks/printing-actions";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";

// Edit copies (collection edit R2 §C) is loaded when first pressed: every deck surface mounts this
// provider, and only /collection ever opens the sheet.
const EditCopiesHost = lazy(() =>
  import("../collection/edit-copies-host").then((m) => ({ default: m.EditCopiesHost })),
);

export const cardDetailCopy = {
  triggerAria: (name: string) => `View details for ${name}`,
  loading: "Loading card details…",
  unavailable: "Card details are unavailable.",
};

type CardDetailContextValue = {
  /**
   * The deck every card opened from this provider belongs to, or null.
   *
   * A PROVIDER-level fact rather than a per-trigger argument, because that is
   * what makes it impossible to get wrong: the deck page mounts its own
   * provider, so every card opened from it carries the deck, and `/collection`
   * and commander detail mount theirs without one — where the proxy control
   * correctly does not render at all, there being no deck for it to be about.
   */
  deckId: string | null;
  /**
   * The oracle ids that deck actually HOLDS — its list plus both commanders.
   *
   * Carried because the provider wraps more than the decklist: the Consider
   * panel and the search results open cards this deck does not hold, and a
   * proxy control on one of those is an affordance that can only ever fail —
   * `setCardProxied` refuses it on the same membership test. The control asks
   * this set before it renders.
   */
  deckOracleIds: ReadonlySet<string>;
  /**
   * Open the modal for `oracleId`. `siblings` is the ordered list the card belongs to (oracle ids,
   * or `SiblingCard`s carrying the art an opener holds), which is what Prev/Next page through; omit it where there is no list (the commander,
   * a suggestion) and the modal renders "1 of 1" with both arrows disabled.
   *
   * `atPrinting` opens the card AT one printing — the set grid's cells each ARE a printing,
   * so clicking the dashed #239 must show #239 rather than whichever printing the resolver
   * would otherwise choose. It is a view, never a pick: nothing is written, and the picker
   * still marks the reader's own preference wherever that is.
   */
  open: (
    oracleId: string,
    siblings?: readonly Sibling[],
    atPrinting?: (PreferredPrinting & { imageUri?: string | null; backImageUri?: string | null; scryfallId?: string }) | null,
    /**
     * `door`: the card was opened from a Shopping row, so the swap tools' door draws in it (audit F17).
     * A deck alone does not say that, since every opener on the deck page passes one. Kept across
     * Prev/Next, which pages the same list, and dropped on close.
     *
     * `art`: the URL the modal will draw, when the opener knows it. Asked for on a cache MISS only,
     * before the details read starts, so the bytes arrive alongside it. A hit needs nothing: the
     * card was drawn when it was cached. That is also what keeps a stale opener safe: after a
     * printing pick the provider re-reads and re-caches the card, so the next press is a hit and the
     * opener's old URL is never fetched.
     */
    opts?: { door?: boolean; art?: string | null; opener?: HTMLElement | null },
  ) => void;
  /** The id whose fetch is in flight, so its trigger can show the click landed. */
  pendingOracleId: string | null;
  /**
   * The id of the card the modal is currently showing, or null when it is closed.
   * A surface that mirrors the open card into the URL reads it from here rather
   * than tracking its own copy, which would drift from the modal on Prev/Next.
   */
  openOracleId: string | null;
  /**
   * True while a card over a sheet drops on the phone (stacked sheets R1, motion). The card is still
   * up and still the dialog, so a sheet under it stays out of the accessibility tree and takes no
   * presses (`openOracleId` is still set); this only says it may be DRAWN again, fading back in.
   */
  revealing: boolean;
  /**
   * Replace the ordered list (ids or `SiblingCard`s) Prev/Next pages through, without touching the open
   * card. A surface whose list is a live filter of something larger re-files it
   * here when that filter moves; otherwise the modal keeps paging the order that
   * happened to be on screen at the moment it was opened.
   */
  setSiblings: (list: readonly Sibling[]) => void;
  /**
   * Drop `oracleId` from the cache, so the next open has nothing to paint before its
   * fetch answers. A surface that writes something the card carries — the art pick is
   * the one that exists — calls this, or the reader reopens the card and is shown the
   * change they just made being undone before the re-read corrects it.
   */
  evict: (oracleId: string) => void;
  /** Close the modal, and abandon any fetch still in flight for it. */
  close: () => void;
  /**
   * Read `oracleId` ahead of an open, on a sign the reader is about to press it. Files the
   * card in the cache, so the press paints at once; a press landing while the read is still
   * running waits on it for up to `PREFETCH_WAIT_MS` before reading for itself. A guess, so it yields: it never starts
   * while any read is in flight, a prefetch or an open's. Surfaces call it through
   * `useCardIntent`, never directly. `art` is the opener's art hint, asked for alongside the
   * read exactly as `open` asks for it.
   */
  /** Resolves with the read when one starts, so a caller can chain a second one after it. */
  prefetch: (oracleId: string, art?: string | null) => Promise<unknown> | undefined;
  /**
   * Declare a sheet that stays open UNDER the card modal, and get back the call that
   * withdraws it.
   *
   * Every `ModalChrome` sheet registers: the verdict addendum rules that a card opened from a
   * receipt STACKS on it rather than replacing it. On a phone the card covers the sheet at full
   * height, with the sheet kept mounted and hidden under it (stacked sheets R1, call 1). The
   * provider owns the modal and the sheet owns nothing of it, so the sheet says it is there and
   * the modal reads that.
   *
   * Counted rather than a flag, for the reason the scroll lock is counted: a flag set by one
   * mount and cleared by another's unmount is a race whenever two overlap.
   *
   * `backLabel` names the sheet, and the stacked card's close becomes `← {backLabel}` at both
   * widths (Analysis tab handoff §3; stacked sheets R1, call 2). The newest registration's label is the one drawn, because that
   * is the sheet a dismissal lands on.
   */
  registerSheet: (backLabel?: string, footer?: SheetFooter, overCard?: boolean, phoneBackLabel?: string) => () => void;
  /**
   * Declare the door a card opened with `{ door: true }` draws, and get back the call that withdraws
   * it. The deck page's Shopping list is the one caller: it knows the limit and the rows, and the
   * modal knows neither.
   */
  registerDoor: (door: CardDoor) => () => void;
};

/**
 * One card of the list Prev/Next pages through (the carousel, H23). An opener that already holds a
 * card's art and identity passes them, for the neighbors the carousel's later rounds draw before
 * their details are read; one that holds only ids passes those, and a neighbor then draws its
 * identity's gradient or a plain plate (handoff note 2). Bare ids stay valid everywhere a list is
 * accepted. Nothing reads the art yet: this round only carries it.
 */
export type SiblingCard = {
  oracleId: string;
  name?: string;
  imageUri?: string | null;
  colorIdentity?: readonly string[];
};
export type Sibling = string | SiblingCard;

/** A list in the one shape the provider holds. */
export function siblingCards(list: readonly Sibling[]): SiblingCard[] {
  return list.map((s) => (typeof s === "string" ? { oracleId: s } : s));
}

/** The swap tools' door for one card, in the desktop art column or the phone's strip, or null. */
export type CardDoor = (oracleId: string, layout: "art" | "strip") => ReactNode;

/**
 * A sheet's footer for a card stacked over it, or null for a card that is not one of the sheet's
 * own (the stand-ins sheet draws Take on its stand-ins and nothing on anything else). Drawn in
 * pieces the card places itself (stacked sheets R1, call 9):
 *
 * - `row`: the desktop nav row, in place of the Mana Pool link.
 * - `teaserNote`: the phone teaser's one line above its foot row (`in place of …`).
 * - `teaserAction`: the phone teaser's action, in the foot row beside All details.
 * - `foot`: the phone's full sheet, pinned at its foot.
 */
export type SheetFooterLayout = "row" | "teaserNote" | "teaserAction" | "foot";
/**
 * `priced`: whether the card on screen draws a price FIGURE, so a phone footer that leaves its plate
 * to the teaser's price line can keep it when that line has none (a failed read, or `no stock`).
 */
export type SheetFooter = (oracleId: string, layout: SheetFooterLayout, priced?: boolean) => ReactNode;

const CardDetailContext = createContext<CardDetailContextValue | null>(null);

/**
 * How many times a read that raced a write is retaken before it is called a failure.
 * The writes are the reader's own clicks on the art picker, so they stop; the cap only
 * exists so a pathological stream of them cannot keep one click reading forever.
 */
const READ_ATTEMPTS = 3;

export function useCardDetail(): CardDetailContextValue {
  const ctx = useContext(CardDetailContext);
  if (!ctx) throw new Error("useCardDetail must be used inside a CardDetailProvider");
  return ctx;
}

/**
 * How long a press waits on its card's prefetch before reading for itself: the warm route's p90,
 * MEASURED rather than chosen, rounded up to the next 10ms. Sixty prefetches of distinct cards on a `pull:staging` deck, 30 at
 * 1300 and 30 at 390, against `next start` with #1067's two-round-trip `loadCardDetail`, timed from
 * the GET's start to its last byte: p50 168ms, p90 177ms, p95 183ms, max 230ms. A prefetch has
 * already been reading for a while by the time the press lands, so a warm route almost always
 * answers inside this; a cold one costs the press at most this much before it reads for itself.
 * Re-measure it when the route's read changes.
 */
export const PREFETCH_WAIT_MS = 180;

/**
 * The prefetch's answer if it arrives within `PREFETCH_WAIT_MS`, else `undefined`. A failed
 * prefetch (`undefined`) is no answer either. The timer is cleared either way.
 */
function withinWait<T>(read: Promise<T | undefined>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<undefined>((r) => { timer = setTimeout(() => r(undefined), PREFETCH_WAIT_MS); });
  return Promise.race([read, expiry]).finally(() => clearTimeout(timer));
}

/** Whether focus arrived from the keyboard rather than with a press. */
function keyboardFocus(el: HTMLElement): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** How long a pointer rests on a trigger before it reads as intent rather than passing over. */
export const INTENT_DELAY_MS = 100;

/**
 * The handlers that prefetch a card on intent, spread onto whatever element opens it. A pointer
 * resting for `INTENT_DELAY_MS` prefetches, so a pointer sweeping down a list reads nothing; KEYBOARD
 * focus arriving prefetches at once.
 *
 * NOT a press going down, not a touch (a finger resting on a card fires `pointerenter` too), and
 * not the focus a press brings with it. A prefetch started by the
 * press itself has no head start on the press's own read, so it can only cost: measured at 390,
 * where a tap is all there is, the route (~190ms there) missed `PREFETCH_WAIT_MS` often enough that
 * a tap paid the wait AND the action, and the medians went from 354 to 408ms for a first press and
 * from 336 to 828ms for the next card. Chrome focuses a button on mousedown, so a focus handler
 * would start the same useless read; `:focus-visible` is what tells keyboard focus apart.
 */
export function useCardIntent(oracleId: string, art?: string | null) {
  const { prefetch } = useCardDetail();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  return useMemo(
    () => ({
      onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
        cancel();
        // A finger resting on a card is a tap about to land, not intent ahead of one.
        if (event.pointerType === "touch") return;
        timer.current = setTimeout(() => { timer.current = null; prefetch(oracleId, art); }, INTENT_DELAY_MS);
      },
      onPointerLeave: cancel,
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (keyboardFocus(event.currentTarget)) prefetch(oracleId, art);
      },
    }),
    [oracleId, art, prefetch, cancel],
  );
}

/**
 * The click target every deck surface wraps its card name (or art) in. Deliberately never
 * `disabled` while the fetch runs: disabling the focused element blurs it, and the modal's
 * focus-return would then have nothing to hand focus back to on close.
 */
/**
 * Ask for a card's modal art now, alongside the details read, rather than once that read has named
 * the printing. A detached Image, as the hover preview's preload (#969): no DOM node, nothing drawn,
 * and the bytes land in the HTTP cache the modal's background then reads. Called by `open` for an
 * `art` hint on a cache miss.
 */
function preloadCardArt(imageUri: string) {
  new window.Image().src = imageUri;
}

export function CardDetailTrigger({
  oracleId, name, siblings, className, style, title, ariaLabel, describedBy, testId, door = false, imageUri, children,
}: {
  oracleId: string;
  name: string;
  siblings?: readonly Sibling[];
  className?: string;
  style?: React.CSSProperties;
  /** Hover tooltip, where the surface truncates the name it wraps. */
  title?: string;
  /** Override the default accessible name. When omitted, falls back to
   *  `cardDetailCopy.triggerAria(name)`. Chips pass a richer label that
   *  includes the EDHREC inclusion figure. */
  ariaLabel?: string;
  /** Id of an element whose text a screen reader should read after this
   *  button's own name. For text that qualifies the card in its row rather
   *  than renaming the trigger: the ledger's mark uses it, so a reader
   *  tabbing through the decklist hears which pass placed the card. Sibling
   *  visually-hidden text alone is reachable only in browse mode. */
  describedBy?: string;
  /**
   * A `data-testid` on the rendered button.
   *
   * This trigger is how several surfaces draw a card's NAME, so on those surfaces it is the
   * name column — and a probe measuring against that column would otherwise have to recognise
   * it by its type size, which on a row full of 12.5px text picks whichever comes first. The
   * same reason `top-off-list.tsx` names its type column.
   */
  testId?: string;
  /** Opened from a Shopping row: the card draws the swap tools' door (audit F17). */
  door?: boolean;
  /**
   * The art the modal will draw, when the opener already knows it. The press asks for it at once,
   * alongside the details read, where otherwise it could only be asked for once that read answered
   * and named the printing: measured, the read answers at ~221ms and the art arrived at ~448ms,
   * strictly after it. Pass it only where it IS the modal's URL — the decklist row's `imageUri`
   * matched the modal's on every press `probe:image-timing --modal` made — or the press fetches an
   * image nothing draws.
   */
  imageUri?: string | null;
  children: ReactNode;
}) {
  const { open, pendingOracleId } = useCardDetail();
  const intent = useCardIntent(oracleId, imageUri);
  const pending = pendingOracleId === oracleId;
  return (
    <button
      type="button"
      {...intent}
      data-testid={testId}
      // The trigger names itself: Safari focuses no button on a click, so the dialog's own capture
      // of the focused element finds <body> there, and focus could never come back to this control.
      onClick={(e) => open(oracleId, siblings, undefined, { door, art: imageUri, opener: e.currentTarget })}
      aria-label={ariaLabel ?? cardDetailCopy.triggerAria(name)}
      aria-describedby={describedBy}
      aria-busy={pending}
      title={title}
      // The chrome reset lives here rather than at each call site: every surface
      // wraps its own already-styled content, so a UA's default button border,
      // padding and background is never what any of them wants. twMerge puts a
      // caller's own bg-/border- utility ahead of the reset; an inline style
      // from a caller outranks both. The reset is border-0 rather than
      // border-none: border-none sets --tw-border-style, which a caller's own
      // `border` reads, so it would give them a 1px border styled `none`.
      className={twMerge("bg-transparent border-0", className)}
      style={{
        cursor: "pointer",
        padding: 0,
        opacity: pending ? 0.55 : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Stable, so the context value's identity does not change every render. */
const EMPTY_IDS: ReadonlySet<string> = new Set();
const NOOP = () => {};
import { STACK_DROP_MS } from "./card-modal";
export { STACK_DROP_MS };

type EditCardRef = { oracleId: string; name: string; imageUri: string | null };
type OpenAt = {
  oracleId: string;
  printing: PreferredPrinting & { imageUri?: string | null; backImageUri?: string | null };
} | null;
/** A card lifted out of the live slot by a sheet opened over it, with what it needs to come back. */
/** `opener`: the control the held card was opened from, handed back when the sheet over it goes. */
/** A card a combo partner was opened FROM, put back when the partner closes. */
type TrailEntry = { card: BrowseCard; siblings: SiblingCard[]; openAt: OpenAt; door: boolean };
/** A card lifted under a sheet, with its own partner trail for when it comes back. */
type Held = TrailEntry & { opener: HTMLElement | null; trail: TrailEntry[] };

export function CardDetailProvider({
  children,
  fetchCard: fetchCardProp,
  prefetchCard: prefetchCardProp,
  onArtChange,
  deckId = null,
  deckName = null,
  deckPage = false,
  deckOracleIds,
  comboDeckOracleIds,
  deckPrintingPicks = null,
  collectionEdit = false,
}: {
  children: ReactNode;
  /**
   * The read a PRESS makes. Production is the server action, which runs in the page's own
   * function: warm, because the page just rendered there. Injected for tests.
   */
  fetchCard?: (
    oracleId: string,
    deckOracleIds?: readonly string[],
  ) => Promise<BrowseCard | null>;
  /**
   * The read a PREFETCH makes. Production is `GET /api/card-detail`, which is an ordinary request
   * and so never queues ahead of the reader's own actions — Next runs a page's actions one at a
   * time, and a guess must not sit in front of a press. It may run in a function the page never
   * warmed, which is why a press does not rely on it (see `load`). Injected for tests. A test that
   * injects only `fetchCard` gets NO prefetch, so the reads it counts are the presses' alone.
   */
  prefetchCard?: (
    oracleId: string,
    deckOracleIds?: readonly string[],
  ) => Promise<BrowseCard | null>;
  /** See `CardDetailContextValue.deckId`. Set by the deck page alone. */
  deckId?: string | null;
  /** The deck page or its `/changes`: the modal's availability line keeps a bare `short` there. */
  deckPage?: boolean;
  /** That deck's name, which the control's label and its marked sentence both
   *  spend — a sheet paged through with Prev/Next is easy to lose your place in. */
  deckName?: string | null;
  /** See `CardDetailContextValue.deckOracleIds`. */
  deckOracleIds?: ReadonlySet<string>;
  /**
   * Deck printings: the deck's held picks by oracle id (`DeckDetail.printingPicks`). With a
   * `deckId`, a card the deck holds opens with the picker in deck scope, picking for this deck.
   * Without one (the review screen, the update diff), a picked card opens on the deck's printing
   * and offers no pick. Null (the switch off) keeps today's collection-scoped picker everywhere.
   */
  deckPrintingPicks?: Readonly<Record<string, PreferredPrinting>> | null;
  /**
   * The deck's OWN cards, for the combo block's `in this deck` state.
   *
   * Separate from `deckOracleIds` above, which is the PROXY-ELIGIBLE set — a different
   * question with a different answer, and passing one where the other belongs would have the
   * block calling a card in-deck because it happens to be proxyable.
   */
  comboDeckOracleIds?: readonly string[];
  /**
   * Collection edit R2 §C: the receipt draws `Edit copies`, and pressing it closes the modal and
   * opens the Add cards sheet in edit mode for the card. Passed by `/collection` alone, and only
   * with `COLLECTION_EDIT_ENABLED` on, so every other surface keeps a read-only receipt.
   */
  collectionEdit?: boolean;
  /**
   * Fired when a printing pick is ATTEMPTED, and again when it settles — including when
   * the write was refused and the modal has rolled its own state back. It is a nudge that
   * ownership may have moved, never a statement that it did.
   *
   * Treat it that way. A consumer that took the first call as committed state would show a
   * pick the server never accepted; the set grid re-reads its own fingerprint and compares,
   * so an extra call costs one small query and a wrong one changes nothing.
   *
   * It exists because a surface whose data depends on WHICH printing is owned cannot see
   * the write otherwise: `revalidatePath` does not refresh a mounted client route, and a
   * reader who closes the modal before the action returns leaves nothing else to notice.
   *
   * `art` is what the card should draw now, resolved through the same tiers the server
   * uses — so a list can patch its own copy of that one card instead of refetching. Null
   * when the card names no printing; a caller wanting only the nudge ignores it.
   */
  onArtChange?: (oracleId: string, art: CardArt | null) => void;
}) {
  const fetchCard = fetchCardProp ?? getCardDetail;
  const prefetchCard = prefetchCardProp ?? (fetchCardProp ? null : fetchCardDetail);
  const [card, setCard] = useState<BrowseCard | null>(null);
  // The list Prev/Next pages, in the one shape the provider holds (`siblingCards`). `siblingIds` is
  // what every paging test reads; the cards beside it carry whatever art an opener passed.
  const [siblings, setSiblingList] = useState<SiblingCard[]>([]);
  const siblingIds = useMemo(() => siblings.map((s) => s.oracleId), [siblings]);
  const setSiblings = useCallback((list: readonly Sibling[]) => setSiblingList(siblingCards(list)), []);
  // Opened from a Shopping row: the swap tools' door draws (audit F17).
  const [door, setDoor] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  // THE WAY BACK FROM A COMBO PARTNER: each card a partner was opened from, oldest first. The
  // partner draws as stacked, `← {that card}` at both widths, and every way out of it (the pill,
  // Escape, hardware Back, the backdrop) puts that card back rather than closing them all. A ref
  // beside the state, because `dismiss` must read it in the press that pops it.
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const trailRef = useRef<TrailEntry[]>([]);
  // A partner asked for and not yet arrived. Its origin joins the trail only when the partner lands
  // (`show`): a read that fails leaves the original on screen, which must not then name itself as
  // its own way back, and two presses before the first read lands push the original once.
  const pendingPartner = useRef<{ from: TrailEntry; to: string } | null>(null);
  // The card the live one is a partner of, which its way back names. The trail is the LIVE slot's:
  // a card lifted under a sheet takes its own into `Held`, so a card over that sheet starts clean.
  const partnerOf = trail.at(-1)?.card ?? null;
  // The printing the caller asked to open at, carrying the oracle id it belongs to.
  //
  // NOTHING here moves when a card is merely asked for — only when one arrives. That is the
  // single rule, and it is what all three of this state's defects had in common: a printing
  // set at click time dressed the card still painted behind the read in the printing of the
  // one just clicked; a printing cleared at click time stripped the art off a card that
  // `load` then deliberately left standing when the read failed; and a printing kept by id
  // alone came back to life when the reader paged away and back.
  //
  // So `open` records a PENDING printing and `show` commits it, at the one moment the card
  // it describes is on screen. The id it carries is what lets `show` tell "this arrival is
  // the one that was asked for" from "this arrival is something else, so let the old one
  // go".
  const [openAt, setOpenAt] = useState<OpenAt>(null);
  /**
   * The printing an `open` asked for, before the card it describes has arrived. A ref, not
   * state: nothing renders from it, and `show` is memoised on nothing so it must read the
   * current value rather than one closed over at mount.
   */
  const pendingAt = useRef<{
    oracleId: string;
    printing: (PreferredPrinting & { imageUri?: string | null; backImageUri?: string | null }) | null;
  } | null>(null);
  const [pendingOracleId, setPendingOracleId] = useState<string | null>(null);
  // One entry per sheet underneath, in the order they registered. A token rather than the label
  // identifies an entry, since two sheets may carry the same label.
  const [sheets, setSheets] = useState<
    { token: object; label: string | undefined; footer?: SheetFooter; phoneLabel?: string }[]
  >([]);
  const sheetsBelow = sheets.length;
  const backLabel = sheets.at(-1)?.label;
  // No production caller currently supplies a `phoneLabel` distinct from `backLabel` — what
  // would have to go retired its split (Hugh, 2026-10-05), the only sheet that ever used one.
  // The plumbing stays for a future sheet whose phone name genuinely differs; until one exists,
  // this always reads undefined and falls back to `backLabel`.
  const phoneBackLabel = sheets.at(-1)?.phoneLabel;
  const sheetFooter = sheets.at(-1)?.footer;
  // THE RISE AND THE DROP (stacked sheets R1, motion). A card a sheet opens rises over it once, on
  // arrival: paging inside it, or the held card coming back under a closing sheet, does not re-run
  // it. Adjusted during render, so the first frame already carries it.
  const arrivalId = card?.oracleId ?? null;
  const [arrival, setArrival] = useState<{ id: string | null; rise: boolean }>({ id: null, rise: false });
  if (arrival.id !== arrivalId) {
    setArrival({ id: arrivalId, rise: arrival.id === null && arrivalId !== null && sheetsBelow > 0 });
  }
  // Closing it on the phone drops it for `STACK_DROP_MS` first, with the sheet already fading back
  // in under it (`revealing`), though still covered for assistive technology; see `dismiss`.
  const [leaving, setLeaving] = useState(false);
  const leavingTimer = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);
  // Bumped whenever a read settles (succeeds, fails, or finds nothing), so the read-ahead effect
  // retries after a cache-hit reopen's correction read — `card` itself only changes again there
  // when the correction brings back a new object; a failed or missing correction leaves `card`
  // exactly as `show(hit)` set it, so nothing else would re-run the effect at all.
  const [settleTick, setSettleTick] = useState(0);
  // Which control paged the carousel, captured once per arrival so a remounted CardModal (it
  // is keyed on oracle id) restores focus and plays its slide-in from the right side (H23 PR 2,
  // handoff README decisions 2/7/8). Null on a fresh open, which is also how `initialFocusRef`
  // tells a page from an open: the carousel never announces or slides on the first card.
  const [enterFrom, setEnterFrom] = useState<"prev" | "next" | "prevPeek" | "nextPeek" | null>(null);
  // Where the phone's card band stood when a swipe committed (carousel R2), so the card the swipe
  // led to enters from the spot the reader let go of rather than from its resting peek. Zero for
  // every page that was not a swipe. Set inside `load`, beside `enterFrom`, for the same reason.
  const [enterOffset, setEnterOffset] = useState(0);
  // The oracle id the IN-FLIGHT paging read is for, set and cleared by `load` itself (its
  // `page` argument) rather than by the handler that calls it. Two reasons it lives there and
  // not beside `setEnterFrom` in the handler: `load` resolves asynchronously, so the render
  // that first carries a fresh `enterFrom` usually still shows the OLD card — without a target
  // to compare against, the arrival effect below would fire on that stale render and announce
  // the card being left. And a second, unrelated read landing on the very id a page was headed
  // to (a combo partner adjacent in the decklist, say) must not inherit that page's intent:
  // since every `load` call declares its own `page` (or none), the LATEST call standing is
  // always the one this value reflects, never a stale one left behind by an earlier call that
  // lost the race.
  const enterTargetId = useRef<string | null>(null);
  // The carousel's own live-region text — distinct from the loading/unavailable region above,
  // which is the modal's.
  const [pagingAnnouncement, setPagingAnnouncement] = useState("");
  // An aria-live region only announces a CHANGE of text, so going straight to an identical
  // string is silent (pre-open review, round 1): pressing the same arrow at an end twice,
  // or paging A→B, closing, reopening A and paging to B again. Cleared first, on its own
  // frame, so a repeat is a real change twice over rather than a no-op. Deliberately not a
  // deps-based `useCallback`: every caller passes a literal built fresh each time, so there
  // is nothing to memoize against.
  const announce = (text: string) => {
    setPagingAnnouncement("");
    requestAnimationFrame(() => setPagingAnnouncement(text));
  };
  // Joined and re-split rather than held as an array, so the callback's dependency is a
  // STRING and cannot churn on identity alone. The deck page happens to memoise its list
  // today, so this buys nothing from that caller — it is a guard on every future one, and
  // on a caller passing a literal, which would otherwise rebuild the fetch and evict the
  // open card on renders that changed nothing.
  const comboScopeKey = (comboDeckOracleIds ?? []).join(",");
  const comboScope = useMemo(
    () => (comboScopeKey ? comboScopeKey.split(",") : undefined),
    [comboScopeKey],
  );
  // The scope current NOW, for a prefetch landing after the deck changed under it.
  const comboScopeRef = useRef(comboScope);
  useEffect(() => { comboScopeRef.current = comboScope; }, [comboScope]);
  // Clicks can overlap — a slow first fetch must not land on top of the card the user
  // actually asked for second.
  const latest = useRef(0);
  // Cards already fetched this visit, so reopening one paints with no wait. A ref
  // rather than state because it is read in the click handler and never during render.
  //
  // A cached card is shown and then checked, never shown and trusted: a card carries
  // its availability, and the deck builder keeps this provider mounted while adding
  // and removing cards changes exactly that. Those mutations revalidate on the server
  // and send no signal a client cache could listen for, so the only honest way to hold
  // a card across them is to re-ask and correct what is already on screen.
  const cache = useRef(new Map<string, BrowseCard>());
  // WHAT THE MODAL WILL DRAW, for every card the provider has read: the same `resolvedPrinting` the
  // modal draws its art from, so the copy the reader owns or picked. A neighbor plate draws this
  // over whatever art its opener passed, which is often the oracle-level printing (a different
  // frame: the art visibly jumped when the card opened) or nothing at all (a blank plate). The read
  // ahead fills both neighbors as soon as a card arrives.
  //
  // NULL IS AN ANSWER: a read whose printing has no image draws the modal's gradient, so its plate
  // draws none either, whatever its opener passed. An absent entry is a card not read yet, and only
  // that falls back to the opener. Evicting a card drops its entry with the cache's, so a pick in
  // flight never leaves the plate on the printing it replaced.
  //
  // The NAME travels with the art: a renamed owned printing (a Secret Lair card) is titled in the
  // modal with the name printed on it, so its plate's caption and label read that too, even where
  // the opener already passed the same picture under the oracle name.
  const [readArt, setReadArt] = useState<ReadonlyMap<string, { art: string | null; name: string }>>(() => new Map());
  const file = useCallback((oracleId: string, next: BrowseCard) => {
    cache.current.set(oracleId, next);
    const art = resolvedPrinting(next)?.imageUri ?? null;
    const name = printedNameOf(next);
    setReadArt((m) => {
      const was = m.get(oracleId);
      return was && was.art === art && was.name === name ? m : new Map(m).set(oracleId, { art, name });
    });
  }, []);
  // How many times each card has been evicted. A read that started before an eviction
  // answers with what the write it raced has not replaced yet, so the count taken when
  // the read starts is compared against the count when it lands: a read from the wrong
  // side of a write is dropped rather than filed as the current answer.
  const evictions = useRef(new Map<string, number>());
  // How many reads a press has settled for each card, whatever they answered: a card, or none.
  // A prefetch notes the count when it starts and is neither filed nor joined once it has moved,
  // because a press answered meanwhile, and that answer (a missing card included) is newer.
  const answers = useRef(new Map<string, number>());
  // The card the reader has asked for, for `evict` to compare against without being rebuilt
  // every time that changes — it is handed to every trigger through the context. Written
  // through `load` and `show` rather than read off `card`, both because a ref must not be
  // written during render and because `card` lags: it is the card on screen, and a reader
  // who has paged on to an uncached card is waiting on one that is not there yet. A write
  // settling on the card they left would otherwise re-read it and abandon the read they are
  // actually waiting for.
  const openRef = useRef<string | null>(null);
  // The card a read is in flight for, or null when none is. A write landing on a card that
  // is already being read needs no read of its own: the read in flight sees the eviction
  // and takes itself again. Starting a second one would abandon the first and reset its
  // attempt count, so a steady stream of writes could keep one click reading forever —
  // exactly what the cap above exists to prevent.
  const inFlight = useRef<string | null>(null);
  // The card actually on screen, which is not always the one that was asked for: a read the
  // reader is waiting on leaves the card they came from painted until it answers. Every
  // decision about whether there is something to fall back to reads this rather than the
  // cache, because an eviction's own re-read has deleted its entry and is still looking at
  // the card it is re-reading.
  const shownRef = useRef<string | null>(null);
  // A card a write landed on while a read for a different one was in flight. The modal the
  // reader wrote in is the one still painted behind that read, and re-reading it there would
  // abandon the read they are waiting for — so the re-read is owed rather than taken, and
  // paid once the read in flight is done and that card turns out to still be the one shown.
  const owed = useRef<string | null>(null);
  // The one prefetch in flight, or null. `load` takes its answer rather than asking again when
  // it is for the same card and the same deck scope, and nothing evicted the card since it
  // started. Resolves `undefined` when the read failed, so a load that joined it asks for
  // itself instead of inheriting a failure nobody pressed for.
  const prefetching = useRef<{
    oracleId: string;
    scope: readonly string[] | undefined;
    evictedAt: number;
    answeredAt: number;
    read: Promise<BrowseCard | null | undefined>;
  } | null>(null);
  const show = useCallback((next: BrowseCard | null) => {
    openRef.current = next?.oracleId ?? null;
    shownRef.current = openRef.current;
    // The opened-at printing dies when a DIFFERENT card actually lands, not when one is
    // asked for. Clearing it at the paging callback instead would strip the art off the
    // card still on screen the moment Prev was pressed — and `load` deliberately leaves
    // that card standing when the read fails, so a failed page left the wrong art behind.
    // Here it survives the whole transition and is invalidated by the transition
    // completing, which is also what stops paging back from resurrecting it.
    // The card that just arrived is the one a pending open was for: its printing commits
    // now, which is the first moment it has a card to describe. Read and cleared here
    // rather than inside the updater, which must stay pure.
    // A partner landing puts the card it was asked from on the trail; anything else landing drops
    // the ask.
    const partner = pendingPartner.current;
    if (partner && next) pendingPartner.current = null;
    if (partner && next && next.oracleId === partner.to) {
      const trailNext = [...trailRef.current, partner.from];
      trailRef.current = trailNext;
      setTrail(trailNext);
    } else if (next && trailRef.current.at(-1)?.card.oracleId === next.oracleId) {
      // Reached the origin some other way, by paging a list that holds both (#1271): the step back
      // is spent, or the card would name itself as its own way back.
      const trailNext = trailRef.current.slice(0, -1);
      trailRef.current = trailNext;
      setTrail(trailNext);
    }
    const pending = pendingAt.current;
    if (pending && pending.oracleId === next?.oracleId) {
      pendingAt.current = null;
      setOpenAt(
        pending.printing ? { oracleId: pending.oracleId, printing: pending.printing } : null,
      );
    } else {
      // Anything else arriving means whatever was committed belongs to a card that is no
      // longer on screen. A re-read of the SAME card keeps it, which is what lets an art
      // pick land without taking the reader off the printing they are looking at.
      setOpenAt((prev) => (prev && prev.oracleId !== next?.oracleId ? null : prev));
    }
    setCard(next);
  }, []);

  // `load` pays the debt above by calling itself, which it cannot do by name without giving
  // up its own memoization — every surface holds `open` through the context, so rebuilding
  // it on each render would re-render all of them.
  const loadRef = useRef<(oracleId: string, list?: readonly Sibling[]) => Promise<void>>(async () => {});
  const load = useCallback(
    async (
      oracleId: string,
      list?: readonly Sibling[],
      at?: (PreferredPrinting & { imageUri?: string | null; backImageUri?: string | null }) | null,
      // Where the card was reached from, when that moves the door: a combo partner is reached from
      // the combo block and never draws the Shopping door, while paging keeps it. Applied when the
      // card ARRIVES, so a read that fails leaves the card on screen, door and all, as it was.
      arrival?: { door: boolean },
      // Which carousel control asked for this read (H23 PR 2), or undefined for every other way a
      // card is reached — a combo partner, a re-open, a plain open. Set HERE, inside the one place
      // every read funnels through, rather than by the caller setting `enterFrom` and then calling
      // `load` as two separate steps: a caller that does both can be outraced by a SECOND, unrelated
      // read landing on the very id the first one was paging to (a combo partner adjacent in the
      // decklist, say) — that second read's arrival would otherwise still carry the first read's
      // stale paging intent, since nothing had cleared it. Every call to `load` now declares its own
      // intent (or declares none), so the latest call standing is always the one the arrival effect
      // believes.
      page?: "prev" | "next" | "prevPeek" | "nextPeek",
      // The band's offset at a swipe's release; see `enterOffset`.
      offset?: number,
    ) => {
      const request = ++latest.current;
      enterTargetId.current = page ? oracleId : null;
      setEnterFrom(page ?? null);
      setEnterOffset(page ? offset ?? 0 : 0);
      // EVERY read decides the pending printing, including the reads that have none: paging,
      // a re-read and an owed re-read all pass nothing, which clears whatever an earlier
      // open left behind. That is what binds the value to a read rather than to an oracle
      // id — held by id, an open whose read failed would sit waiting and commit its cell's
      // printing the next time the reader paged onto that card, a page that supplied no
      // printing at all. One place owns this value's whole life, which is why there is no
      // second guard on the way out.
      // `undefined` and `null` are different asks. `undefined` is not an open at all —
      // paging, a re-read, an owed re-read — and clears whatever an earlier open left. A
      // `null` IS an open, for a card with no printing in particular, and has to be able to
      // clear a printing on the card already shown: without the distinction, reopening the
      // current card plainly left it wearing the cell it was opened at last time.
      pendingAt.current = at === undefined ? null : { oracleId, printing: at };
      openRef.current = oracleId;
      inFlight.current = oracleId;
      if (list !== undefined) setSiblings(list);
      // A hit lands in the same pass as the click, so no pending state is ever set and
      // the trigger never flashes a busy affordance for a wait that does not happen.
      const hit = cache.current.get(oracleId);
      // Whether this read has anything on screen behind it. A hit paints one; an eviction's
      // re-read has no entry left but is looking at the card it re-reads. Either way the
      // read is a correction rather than a wait, so it announces nothing and a failure
      // leaves what is painted alone instead of emptying the modal under the reader.
      const standing = hit !== undefined || shownRef.current === oracleId;
      // The read is over and painted nothing, so the card the reader is looking at is the
      // open one again. Without this the modal left standing is one no write can reach: an
      // art pick made in it would evict a card `evict` no longer believes is open, and the
      // pick would sit there uncorrected.
      const giveUp = () => { openRef.current = shownRef.current; };
      setFailed(false);
      if (hit) {
        setPendingOracleId(null);
        if (arrival) setDoor(arrival.door);
        show(hit);
      } else if (!standing) {
        setPendingOracleId(oracleId);
      }
      try {
        // A read an eviction overtook is from the wrong side of the write that caused it,
        // so it is neither filed nor painted — it is taken again, now that the write has
        // landed. Retried rather than abandoned because a card opened from a miss has
        // nothing on screen to fall back to, and abandoning the read there would leave
        // the click looking like it did nothing at all.
        let next: BrowseCard | null = null;
        let raced = true;
        for (let attempt = 0; attempt < READ_ATTEMPTS && raced; attempt++) {
          const evictedAtStart = evictions.current.get(oracleId) ?? 0;
          // THE DECK'S CARDS TRAVEL WITH THE READ, so the combo block can say `in this deck`
          // and render its scope line. `deckOracleIds` is set by the deck page alone; every
          // other route sends nothing and the block draws the two states that have a referent,
          // which is the `/collection` face the design specifies.
          // A prefetch already reading this card, from this side of every write, is WAITED ON for
          // up to `PREFETCH_WAIT_MS` rather than raced. If it answers, no action is sent at all. If
          // it does not (a cold route, or a failure), the press reads for itself through the
          // action, and that answer is the one shown: the prefetch may still fill the cache, but it
          // never paints while the press's action is pending. See the header for why that rule.
          // Never after a press has settled this card since the prefetch started: that answer is
          // newer than anything the prefetch can bring back.
          const ahead = prefetching.current;
          const joined =
            attempt === 0 && ahead && ahead.oracleId === oracleId && ahead.scope === comboScope &&
            ahead.evictedAt === evictedAtStart &&
            ahead.answeredAt === (answers.current.get(oracleId) ?? 0)
              ? await withinWait(ahead.read)
              : undefined;
          if (latest.current !== request) return;
          next = joined !== undefined ? joined : await fetchCard(oracleId, comboScope);
          if (latest.current !== request) return;
          raced = (evictions.current.get(oracleId) ?? 0) !== evictedAtStart;
        }
        // Every attempt raced a write. Treated as a read that failed rather than filed as
        // an answer, because it is one: no attempt saw a settled world.
        if (raced) {
          if (!standing) setFailed(true);
          giveUp();
          return;
        }
        answers.current.set(oracleId, (answers.current.get(oracleId) ?? 0) + 1);
        if (next) {
          file(oracleId, next);
          if (arrival) setDoor(arrival.door);
          show(next);
        } else {
          // A card the server could not find is the one result not worth keeping: it is
          // rare, and filing it would keep the card missing for the rest of the visit.
          cache.current.delete(oracleId);
          // A read that found nothing is a read that failed, and is treated exactly like
          // one that threw: whatever is painted stays painted. The reader is left on the
          // card they came from rather than on an empty screen, and a card that has gone
          // missing between two reads of it is not worth yanking out from under them.
          if (!standing) setFailed(true);
          giveUp();
        }
      } catch {
        if (latest.current !== request) return;
        // Same reasoning: a failed re-ask leaves what is on screen alone.
        if (!standing) setFailed(true);
        giveUp();
      } finally {
        if (latest.current === request) {
          setPendingOracleId(null);
          inFlight.current = null;
          const debt = owed.current;
          owed.current = null;
          // Only if that card is still the one on screen: a write on a card the reader has
          // since left costs nothing to forget, because its entry is already gone and the
          // next open pays for the read.
          if (debt !== null && debt === shownRef.current) void loadRef.current(debt);
          setSettleTick((t) => t + 1);
        }
      }
    },
    [fetchCard, show, comboScope, setSiblings, file],
  );
  useEffect(() => { loadRef.current = load; }, [load]);

  // WHERE FOCUS GOES BACK when the card closes: the trigger that opened it, while it is still in
  // the document (stacked sheets R1, engineering 3: "on back, focus goes to the opener inside the
  // sheet"). A getter, so an opener that has since left the page reads null and the dialog falls
  // back to the element it captured.
  //
  // Only on a real CLOSE (`show(null)` has cleared `shownRef`). A page remounts the keyed modal too,
  // and its cleanup reads this: there the arriving card places focus itself (the control that
  // paged), so the getter hands back a DETACHED element whose `focus()` does nothing. Falling back to
  // the capture instead would jump focus out to the first card's opener and back on every page.
  const openerRef = useRef<HTMLElement | null>(null);
  const pagingSink = useRef<HTMLElement | null>(null);
  const returnFocusRef = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        if (shownRef.current !== null) {
          pagingSink.current ??= document.createElement("span");
          return pagingSink.current;
        }
        const el = openerRef.current;
        return el?.isConnected ? el : null;
      },
    }),
    [],
  );
  const open = useCallback(
    (
      oracleId: string,
      list?: readonly Sibling[],
      atPrinting?: (PreferredPrinting & { imageUri?: string | null; backImageUri?: string | null; scryfallId?: string }) | null,
      opts?: { door?: boolean; art?: string | null; opener?: HTMLElement | null },
    ) => {
      // The control this open came from, for the modal to hand focus back to. Set on every open, so
      // an opener that names none falls back to the dialog's own capture rather than an older one.
      openerRef.current = opts?.opener ?? null;
      // A fresh open is a new card, not a step from one: no way back to an earlier partner chain.
      trailRef.current = [];
      setTrail([]);
      pendingPartner.current = null;
      // An open landing while a card drops replaces it rather than waiting for it to leave.
      if (leavingTimer.current !== null) {
        window.clearTimeout(leavingTimer.current);
        leavingTimer.current = null;
        setLeaving(false);
      }
      // A prefetch reading this card asked for its art already.
      if (opts?.art && !cache.current.has(oracleId) && prefetching.current?.oracleId !== oracleId) {
        preloadCardArt(opts.art);
      }
      // PENDING, not committed, and the door with it: the door belongs to the card the open asked
      // for, so it moves when that card arrives and a failed read leaves the card on screen as it was.
      // PENDING, not committed. A second open while the first card is still painted must
      // not take the first card's printing away from it: the read may fail, and `load`
      // deliberately leaves that card standing. The printing commits in `show`, when the
      // card it describes actually arrives — and only if the read that asked for it is
      // still the current one.
      void load(oracleId, list ?? [], atPrinting ?? null, { door: opts?.door ?? false });
    },
    [load],
  );

  // Fits your decks (swap tools PR 5b): the card the picker is open for, stacked over that card. The
  // door is drawn for a Commander-legal card and a reader with a deck, both off the card's own payload,
  // which leaves them absent while the swap tools are off (`fitsGate`), so no door is drawn then.
  const [fitsFor, setFitsFor] = useState<BrowseCard | null>(null);
  const fitsDoor = (c: BrowseCard) => (c.commanderLegal && c.hasDecks ? () => setFitsFor(c) : null);

  // The card a sheet lifted out of the live slot (see `registerSheet`), read by `close`.
  const heldRef = useRef<Held | null>(null);

  // Bumping `latest` is what abandons an in-flight fetch: without it, a card
  // requested before the close lands afterwards and re-opens the modal.
  // `failed` is cleared too, or the live region keeps announcing a failure the
  // reader has already dismissed.
  const close = useCallback(() => {
    latest.current++;
    inFlight.current = null;
    owed.current = null;
    // Or a read abandoned by the close could still commit its printing onto the next card
    // the reader opens.
    pendingAt.current = null;
    show(null);
    setPendingOracleId(null);
    setFailed(false);
    setDoor(false);
    // The picker sits over a HELD card, and a card opened from the picker stacks over both. Closing
    // that top card is a step back to the picker, the stand-ins sheet's rule, so only a close with
    // nothing held (the picker's own card going) takes the picker with it.
    if (heldRef.current === null) setFitsFor(null);
    // The live slot's trail goes with its card. A held card's own is in `Held`.
    trailRef.current = [];
    setTrail([]);
    pendingPartner.current = null;
  }, [show, setFitsFor]);

  // One step back along the live slot's partner trail: the card the partner was opened from, exactly
  // as it was. False when there is nowhere to step back to.
  const stepBack = useCallback(() => {
    const back = trailRef.current.at(-1);
    if (!back) return false;
    pendingPartner.current = null;
    const next = trailRef.current.slice(0, -1);
    trailRef.current = next;
    setTrail(next);
    latest.current++;
    inFlight.current = null;
    owed.current = null;
    pendingAt.current = null;
    openRef.current = back.card.oracleId;
    shownRef.current = back.card.oracleId;
    setEnterFrom(null);
    setCard(back.card);
    setSiblingList(back.siblings);
    setOpenAt(back.openAt);
    setDoor(back.door);
    setPendingOracleId(null);
    setFailed(false);
    return true;
  }, []);

  // Every close of the live card goes through here: the ✕ or the pill, Escape, hardware Back and
  // the backdrop. A card over a sheet on the phone drops before it goes (stacked sheets R1: "the
  // card drops in 200ms", never sideways); anywhere else, and under reduced motion, it is a swap.
  const dismiss = useCallback(() => {
    if (leavingTimer.current !== null) return;
    if (stepBack()) return;
    const phone = !window.matchMedia?.("(min-width: 768px)")?.matches;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (sheetsBelow === 0 || !phone || still) {
      close();
      return;
    }
    setLeaving(true);
    leavingTimer.current = window.setTimeout(() => {
      leavingTimer.current = null;
      setLeaving(false);
      close();
    }, STACK_DROP_MS);
  }, [close, sheetsBelow, stepBack]);
  useEffect(() => () => {
    if (leavingTimer.current !== null) window.clearTimeout(leavingTimer.current);
  }, []);

  // The card a sheet opened OVER (the door's stand-ins sheet): lifted out of the live slot while the
  // sheet is up, so a card opened from the sheet stacks over both instead of replacing it, and put
  // back, with its list, printing and door, when the sheet goes.
  const live = useRef({ card, siblings, openAt, door });
  // A combo partner, through the same `load` that pages, with the card it was reached from put on
  // the trail first. It arrives without the Shopping door: the partner was reached from the combo
  // block, not a Shopping row.
  const selectPartner = useCallback((oracleId: string) => {
    const from = live.current;
    pendingPartner.current = from.card && from.card.oracleId !== oracleId
      ? { from: { card: from.card, siblings: from.siblings, openAt: from.openAt, door: from.door }, to: oracleId }
      : null;
    void load(oracleId, undefined, undefined, { door: false });
  }, [load]);
  useEffect(() => {
    live.current = { card, siblings, openAt, door };
  });
  const registerSheet = useCallback((label?: string, footer?: SheetFooter, overCard = false, phoneLabel?: string) => {
    const token = {};
    setSheets((list) => [...list, { token, label, footer, phoneLabel }]);
    const lifting = overCard ? live.current : null;
    if (lifting?.card) {
      const held: Held = {
        card: lifting.card, siblings: lifting.siblings, openAt: lifting.openAt, door: lifting.door, opener: openerRef.current,
        trail: trailRef.current,
      };
      trailRef.current = [];
      setTrail([]);
      pendingPartner.current = null;
      heldRef.current = held;
      setHeld(held);
      latest.current++;
      inFlight.current = null;
      owed.current = null;
      pendingAt.current = null;
      openRef.current = null;
      shownRef.current = null;
      setCard(null);
      setPendingOracleId(null);
      setFailed(false);
      setDoor(false);
    }
    return () => {
      setSheets((list) => list.filter((entry) => entry.token !== token));
      const back = lifting?.card ? heldRef.current : null;
      if (!back) return;
      heldRef.current = null;
      setHeld(null);
      latest.current++;
      inFlight.current = null;
      pendingAt.current = null;
      openRef.current = back.card.oracleId;
      shownRef.current = back.card.oracleId;
      setCard(back.card);
      setSiblingList(back.siblings);
      setOpenAt(back.openAt);
      setDoor(back.door);
      // A card opened from the sheet took the opener slot; the card coming back takes its own, and
      // its own way back along the partners it came through.
      openerRef.current = back.opener;
      trailRef.current = back.trail;
      setTrail(back.trail);
      pendingPartner.current = null;
    };
  }, []);

  const [doorRender, setDoorRender] = useState<CardDoor | null>(null);
  const registerDoor = useCallback((render: CardDoor) => {
    setDoorRender(() => render);
    return () => setDoorRender((current: CardDoor | null) => (current === render ? null : current));
  }, []);

  const evict = useCallback(
    /**
     * `reread: false` drops the entry and stops there, for a caller whose write has not
     * started yet. The re-read below is only sound AFTER a write — before one it fetches
     * the state the write is about to replace, which is filed by nothing and paid for by
     * everyone: an art pick fired two reads of the card, and the first was guaranteed
     * stale by construction.
     */
    (oracleId: string, { reread = true }: { reread?: boolean } = {}) => {
      cache.current.delete(oracleId);
      setReadArt((m) => {
        if (!m.has(oracleId)) return m;
        const next = new Map(m);
        next.delete(oracleId);
        return next;
      });
      evictions.current.set(oracleId, (evictions.current.get(oracleId) ?? 0) + 1);
      // Dropping the entry is not enough when the evicted card is the one on screen. A read
      // taken inside the write's own window answers with what the write has not replaced
      // yet, and if it lands before the write does, nothing about it looks raced: it is
      // filed and painted as the current answer, and the reader sits on the printing they
      // replaced until they close and reopen. Re-reading here is what ends that window —
      // the read it starts is from after the write, by construction.
      if (!reread) return;
      if (inFlight.current === oracleId) return;
      if (openRef.current === oracleId) void load(oracleId);
      else if (shownRef.current === oracleId) owed.current = oracleId;
    },
    [load],
  );

  // Edit copies: the card whose sheet is up (or whose toast is), with the list it was paged from so
  // the reopened details keep their Prev/Next. Cleared by the host when it has nothing left to show.
  const [editing, setEditing] = useState<{ card: EditCardRef; siblings: SiblingCard[]; n: number } | null>(null);
  const editCount = useRef(0);
  const startEdit = useCallback(
    (c: BrowseCard) => {
      setEditing({ card: { oracleId: c.oracleId, name: c.name, imageUri: c.imageUri }, siblings, n: ++editCount.current });
      close();
    },
    [siblings, close],
  );
  const editedId = editing?.card.oracleId ?? null;
  const editedSiblings = editing?.siblings;
  const reopenEdited = useCallback(() => {
    if (editedId === null) return;
    // Dropped without a re-read: the card is read again by the open below, after the write.
    evict(editedId, { reread: false });
    open(editedId, editedSiblings);
  }, [editedId, editedSiblings, evict, open]);
  const doneEditing = useCallback(() => setEditing(null), []);

  const prefetch = useCallback(
    (oracleId: string, art?: string | null) => {
      // Yields to every read already running: a prefetch is a guess, and a second request
      // beside the one the reader is waiting on only slows that one down.
      if (!prefetchCard || cache.current.has(oracleId) || inFlight.current !== null || prefetching.current) return undefined;
      if (art) preloadCardArt(art);
      const evictedAt = evictions.current.get(oracleId) ?? 0;
      const scope = comboScope;
      const answeredAt = answers.current.get(oracleId) ?? 0;
      const entry = {
        oracleId,
        scope,
        evictedAt,
        answeredAt,
        read: prefetchCard(oracleId, scope).then(
          (next) => {
            // Filed only if nothing moved under it: an eviction since it started means a write
            // it may have read the wrong side of, and a new scope means a different question.
            // Nor once a press has settled the card meanwhile: its action outran the wait, and
            // its answer is newer than this one, a card found missing included.
            if (
              next &&
              (answers.current.get(oracleId) ?? 0) === answeredAt &&
              (evictions.current.get(oracleId) ?? 0) === evictedAt &&
              scope === comboScopeRef.current
            ) {
              file(oracleId, next);
            }
            return next;
          },
          () => undefined,
        ),
      };
      prefetching.current = entry;
      return entry.read.finally(() => {
        if (prefetching.current === entry) prefetching.current = null;
      });
    },
    [prefetchCard, comboScope, file],
  );

  const value = useMemo<CardDetailContextValue>(
    () => ({
      open,
      prefetch,
      pendingOracleId,
      openOracleId: card?.oracleId ?? null,
      revealing: leaving,
      setSiblings,
      evict,
      close,
      deckId,
      deckOracleIds: deckOracleIds ?? EMPTY_IDS,
      registerSheet,
      registerDoor,
    }),
    [open, prefetch, pendingOracleId, card, leaving, evict, close, deckId, deckOracleIds, registerSheet, registerDoor],
  );

  const index = card ? siblingIds.indexOf(card.oracleId) : -1;

  // READ AHEAD BOTH WAYS once a card has arrived (carousel handoff note 2: "Today nothing reads
  // ahead"). The next card first, since paging forward is the common press, then the previous one
  // when that read settles. Through `prefetch` and nothing else, so a press landing mid-read waits
  // on it for `PREFETCH_WAIT_MS` exactly as an intent prefetch is waited on, and a neighbor already
  // cached costs nothing. `prefetch` yields to any read in flight, so the card's own re-read of a
  // cache hit goes first: this effect retries on `settleTick` once that re-read settles, whether
  // or not it brings back a new `card` — a failed or missing correction leaves the shown card
  // exactly as `show(hit)` set it, with nothing else to re-run the effect.
  // The live card's list: with a card held under a sheet, that is the TOP card's, which pages its
  // own list (carousel PR 4, call #9). The held card pages nothing and reads nothing ahead.
  const nextId = index >= 0 && index < siblingIds.length - 1 ? siblingIds[index + 1] : null;
  const prevId = index > 0 ? siblingIds[index - 1] : null;
  useEffect(() => {
    if (!card || (nextId === null && prevId === null)) return;
    const shownId = card.oracleId;
    const order = [nextId, prevId].filter((id): id is string => id !== null);
    let cancelled = false;
    void (async () => {
      for (const id of order) {
        // Twice at most per neighbor: now, and once more after a speculative read ALREADY running
        // settles (an intent prefetch of another card, or the cold prefetch a press outwaited),
        // since the provider keeps one at a time and `prefetch` starts nothing beside it.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (cancelled || shownRef.current !== shownId) return;
          const read = prefetch(id);
          if (read) { await read; break; }
          const running = prefetching.current?.read;
          // Cached already, or the card's own re-read is running: this effect runs again when that
          // re-read shows the card.
          if (!running) break;
          await running;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [card, nextId, prevId, prefetch, settleTick]);
  // See `openAt`: the printing applies to one card, and the card on screen is not always
  // the one that was asked for.
  const openAtPrinting = card && openAt?.oracleId === card.oracleId ? openAt.printing : null;
  const paging = index >= 0 && siblings.length > 1;
  const heldIndex = held ? held.siblings.findIndex((s) => s.oracleId === held.card.oracleId) : -1;
  const liveDoor = Boolean(card && door && doorRender && doorRender(card.oracleId, "art") !== null);
  // The desktop neighbor plates (handoff decision 2): the card either side of the one on
  // screen, or null at a list's end — same bound as `nextId`/`prevId` above, which read the
  // same positions to prefetch them.
  const plate = (s: SiblingCard | undefined): SiblingCard | null => {
    if (!s) return null;
    const read = readArt.get(s.oracleId);
    if (!read) return s;
    return read.art !== (s.imageUri ?? null) || read.name !== s.name ? { ...s, imageUri: read.art, name: read.name } : s;
  };
  const prevSibling = paging && index > 0 ? plate(siblings[index - 1]) : null;
  const nextSibling = paging && index < siblings.length - 1 ? plate(siblings[index + 1]) : null;
  // Announced once the paged card has actually arrived, never on the first open (decision 8:
  // "First open announces nothing new"). `enterFrom` is null on a fresh open and on any card
  // change that is not a page (the combo block's partner swap, for one), so this effect is
  // silent there by construction.
  useEffect(() => {
    if (!card || enterFrom === null) return;
    // The render carrying a fresh `enterFrom` usually still shows the card being left, since
    // `load` has not resolved yet — wait for the one that actually shows the target.
    if (card.oracleId !== enterTargetId.current) return;
    announce(cardCarouselCopy.arrived(card.name, index + 1, siblings.length));
    // Cleared once read: a `CardModal` instance is keyed on oracle id and captures `enterFrom`
    // at its own mount for focus and motion, so clearing the provider's copy here cannot take
    // that back from an instance that already has it.
    setEnterFrom(null);
    // `index`/`siblings.length` are read, not watched: this fires once per `enterFrom`
    // transition, not on every reorder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, enterFrom]);
  const announceAtStart = useCallback(() => announce(cardCarouselCopy.firstCard), []);
  const announceAtEnd = useCallback(() => announce(cardCarouselCopy.lastCard), []);

  // The action refreshes the page itself (`refresh()`), so every row, the art and the prices
  // move to the new pick together.
  const saveDeckPrinting = useCallback(
    async (oracleId: string, p: PreferredPrinting) =>
      deckId !== null && (await setDeckPrinting(deckId, oracleId, p)).ok,
    [deckId],
  );
  const deckPrintingFor = (oracleId: string): DeckPrintingScope | undefined => {
    if (deckPrintingPicks === null) return undefined;
    // The deck page: a card the deck holds picks for it.
    if (deckId !== null) {
      return (deckOracleIds ?? EMPTY_IDS).has(oracleId)
        ? { pick: deckPrintingPicks[oracleId] ?? null, save: (p) => saveDeckPrinting(oracleId, p) }
        : undefined;
    }
    // A deck surface with no deck write (the review screen, the update diff, E9): a picked card
    // opens on the deck's printing, with no picker; an unpicked one is today's modal, which already
    // shows the Collection's printing the deck falls back to.
    const pick = deckPrintingPicks[oracleId];
    return pick ? { pick } : undefined;
  };

  return (
    <CardDetailContext.Provider value={value}>
      {children}
      {/* The fetch is invisible until the modal mounts, so the wait is announced here. */}
      <div aria-live="polite" className="sr-only">
        {pendingOracleId ? cardDetailCopy.loading : failed ? cardDetailCopy.unavailable : ""}
      </div>
      {/* The carousel's own region (handoff decision 8), separate from the one above: the
          modal is keyed per card and remounts empty on every page, so the thing that
          survives a page — the provider — is what owns an announcement that must. */}
      <div aria-live="polite" className="sr-only">{pagingAnnouncement}</div>
      {held ? (
        <CardModal
          // The same slot and key the card was open in, so lifting it under the sheet keeps it
          // mounted: its scroll and its expanded state are where the reader left them.
          key={held.card.oracleId}
          card={held.card}
          deckId={deckId}
          deckPage={deckPage}
          deckName={deckName}
          deckHolds={(deckOracleIds ?? EMPTY_IDS).has(held.card.oracleId)}
          deckPrinting={deckPrintingFor(held.card.oracleId)}
          openAtPrinting={held.openAt?.oracleId === held.card.oracleId ? held.openAt.printing : null}
          position={heldIndex >= 0 && held.siblings.length > 1 ? heldIndex + 1 : 1}
          total={heldIndex >= 0 && held.siblings.length > 1 ? held.siblings.length : 1}
          onClose={NOOP}
          returnFocusRef={returnFocusRef}
          covered
          door={held.door && doorRender ? (layout) => doorRender(held.card.oracleId, layout) : null}
          // Kept mounted under the picker it opened, so its close can hand focus back to the door.
          onFindDeck={fitsDoor(held.card)}
          fitsOpen={fitsFor !== null}
          onPrev={null}
          onNext={null}
        />
      ) : card ? (
        <CardModal
          // Paging must not carry the previous card's expanded printing region or its
          // optimistic art pick across — same reason the collection browser remounts.
          key={card.oracleId}
          card={card}
          deckId={deckId}
          deckPage={deckPage}
          deckName={deckName}
          deckHolds={(deckOracleIds ?? EMPTY_IDS).has(card.oracleId)}
          deckPrinting={deckPrintingFor(card.oracleId)}
          onProxyWrite={() => evict(card.oracleId)}
          openAtPrinting={openAtPrinting}
          onArtChange={(art, settled) => {
            // Dropped on both calls, re-read on the settled one alone: the optimistic call
            // precedes the write, so a read started there answers with the preference the
            // write has not replaced yet.
            evict(card.oracleId, { reread: settled });
            onArtChange?.(card.oracleId, art);
          }}
          position={paging ? index + 1 : 1}
          total={paging ? siblings.length : 1}
          onClose={dismiss}
          returnFocusRef={returnFocusRef}
          stacked={sheetsBelow > 0 || partnerOf !== null}
          rise={arrival.rise}
          dropping={leaving}
          // Only a card the sheet has a footer FOR swaps its Mana Pool link out: the original, or any
          // card after a take, keeps the link rather than drawing nothing in its place.
          footer={sheetFooter && sheetFooter(card.oracleId, "row") !== null
            ? (layout, priced) => sheetFooter(card.oracleId, layout, priced)
            : null}
          backLabel={partnerOf ? partnerOf.name : backLabel}
          phoneBackLabel={partnerOf ? undefined : phoneBackLabel}
          // Fits your decks' door, on a card with no sheet under it (stacked sheets R1, call 8): nothing
          // in a stacked card opens a further layer, and a stand-in's Take replaces the door anyway.
          onFindDeck={sheetsBelow > 0 ? null : fitsDoor(card)}
          // Only from /collection, and only on a card nothing is stacked on: a partner opened from a
          // combo block or a card over a sheet is not the reader's own collection row.
          onEditCopies={collectionEdit && sheetsBelow === 0 && partnerOf === null ? () => startEdit(card) : null}
          fitsOpen={fitsFor !== null}
          // Only a card the door has something for: a door with nothing in it would still take its room
          // from the art.
          door={liveDoor ? (layout) => doorRender!(card.oracleId, layout) : null}
          // The combo block's partner name, through the same `load` that pages Prev/Next —
          // so a partner replaces the open card exactly as a sibling does, and the back
          // gesture returns to the card the reader started from. It arrives without the
          // Shopping door: the partner was reached from the combo block, not a Shopping row.
          onSelectCard={selectPartner}
          onPrev={paging && index > 0
            ? (offset?: number) => { void load(siblingIds[index - 1], undefined, undefined, undefined, "prev", offset); }
            : null}
          onNext={
            paging && index < siblings.length - 1
              ? (offset?: number) => { void load(siblingIds[index + 1], undefined, undefined, undefined, "next", offset); }
              : null
          }
          onPrevPeek={paging && index > 0
            ? () => { void load(siblingIds[index - 1], undefined, undefined, undefined, "prevPeek"); }
            : null}
          onNextPeek={paging && index < siblings.length - 1
            ? () => { void load(siblingIds[index + 1], undefined, undefined, undefined, "nextPeek"); }
            : null}
          onAtStart={paging ? announceAtStart : undefined}
          onAtEnd={paging ? announceAtEnd : undefined}
          prevSibling={prevSibling}
          nextSibling={nextSibling}
          enterFrom={enterFrom}
          enterOffset={enterOffset}
        />
      ) : null}
      {/* Before the third layer in the document, so a card opened from the picker paints over it:
          both are fixed at z-50, and the later one wins. */}
      {fitsFor ? <FitsPicker card={fitsFor} onClose={() => setFitsFor(null)} /> : null}
      {/* A card opened from a sheet that sits over a held card: the third layer (audit F16). */}
      {held && card ? (
        <CardModal
          // Paging must not carry the previous card's expanded printing region or its
          // optimistic art pick across — same reason the collection browser remounts.
          key={`top:${card.oracleId}`}
          card={card}
          deckId={deckId}
          deckPage={deckPage}
          deckName={deckName}
          deckHolds={(deckOracleIds ?? EMPTY_IDS).has(card.oracleId)}
          deckPrinting={deckPrintingFor(card.oracleId)}
          onProxyWrite={() => evict(card.oracleId)}
          openAtPrinting={openAtPrinting}
          onArtChange={(art, settled) => {
            // Dropped on both calls, re-read on the settled one alone: the optimistic call
            // precedes the write, so a read started there answers with the preference the
            // write has not replaced yet.
            evict(card.oracleId, { reread: settled });
            onArtChange?.(card.oracleId, art);
          }}
          position={paging ? index + 1 : 1}
          total={paging ? siblings.length : 1}
          onClose={dismiss}
          returnFocusRef={returnFocusRef}
          stacked
          dropped
          rise={arrival.rise}
          dropping={leaving}
          // Only a card the sheet has a footer FOR swaps its Mana Pool link out: the original, or any
          // card after a take, keeps the link rather than drawing nothing in its place.
          footer={sheetFooter && sheetFooter(card.oracleId, "row") !== null
            ? (layout, priced) => sheetFooter(card.oracleId, layout, priced)
            : null}
          backLabel={partnerOf ? partnerOf.name : backLabel}
          phoneBackLabel={partnerOf ? undefined : phoneBackLabel}
          // The combo block's partner name, through the same `load` that pages Prev/Next —
          // so a partner replaces the open card exactly as a sibling does, and the back
          // gesture returns to the card the reader started from. It arrives without the
          // Shopping door: the partner was reached from the combo block, not a Shopping row.
          onSelectCard={selectPartner}
          onPrev={paging && index > 0
            ? (offset?: number) => { void load(siblingIds[index - 1], undefined, undefined, undefined, "prev", offset); }
            : null}
          onNext={
            paging && index < siblings.length - 1
              ? (offset?: number) => { void load(siblingIds[index + 1], undefined, undefined, undefined, "next", offset); }
              : null
          }
          onPrevPeek={paging && index > 0
            ? () => { void load(siblingIds[index - 1], undefined, undefined, undefined, "prevPeek"); }
            : null}
          onNextPeek={paging && index < siblings.length - 1
            ? () => { void load(siblingIds[index + 1], undefined, undefined, undefined, "nextPeek"); }
            : null}
          onAtStart={paging ? announceAtStart : undefined}
          onAtEnd={paging ? announceAtEnd : undefined}
          prevSibling={prevSibling}
          nextSibling={nextSibling}
          enterFrom={enterFrom}
          enterOffset={enterOffset}
        />
      ) : null}
      {editing ? (
        <Suspense fallback={null}>
          <EditCopiesHost key={editing.n} card={editing.card} onReopen={reopenEdited} onDone={doneEditing} />
        </Suspense>
      ) : null}
    </CardDetailContext.Provider>
  );
}
