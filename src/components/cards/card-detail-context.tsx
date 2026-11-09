"use client";
// What a surface reads of the card details: the context, its shape, the hooks, and the click target every deck surface wraps
// a card name in (`CardDetailTrigger`, `useCardIntent`). The provider that owns the modal, its reads and its writes is
// `card-detail-provider.tsx`, which re-exports these; this file imports no action and loads no modal, so a surface that draws a
// card name without the app's modal state can read it. Outside a provider `useCardDetail` throws and the `IfAny` forms are null.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

import type { Finish, FoilFinish, PreferredPrinting } from "../../lib/collection/browse";
import { usePreviewRow } from "../decks/hover-preview";

export const cardDetailCopy = {
  triggerAria: (name: string) => `View details for ${name}`,
  loading: "Loading card details…",
  unavailable: "Card details are unavailable.",
};

export type CardDetailContextValue = {
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
     * `door`: the card was opened from a Shopping row, so what is registered for that draws in it: the
     * swap tools' door (audit F17) and I got it's receipt link (A11).
     * A deck alone does not say that, since every opener on the deck page passes one. Kept across
     * Prev/Next, which pages the same list, and dropped on close.
     *
     * `art`: the URL the modal will draw, when the opener knows it. Asked for on a cache MISS only,
     * before the details read starts, so the bytes arrive alongside it. A hit needs nothing: the
     * card was drawn when it was cached. That is also what keeps a stale opener safe: after a
     * printing pick the provider re-reads and re-caches the card, so the next press is a hit and the
     * opener's old URL is never fetched.
     *
     * `combo`: the card is opened FOR its combo (a feed item's See the combo): its combo block starts open, and
     * the phone's sheet opens full so the block is on screen. Spent on that card alone: paging, a partner and a
     * close drop it.
     */
    opts?: { door?: boolean; art?: string | null; opener?: HTMLElement | null; combo?: boolean },
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
   * True for the whole card detail session: a card shown or loading, a card held under a sheet opened
   * over it (its combo, Find a deck's picker, a door's sheet), the third-layer card over that, or the Edit
   * copies sheet the card handed off to. `openOracleId` and `pendingOracleId` are both null while a card
   * is held, so a surface that must stand still for the whole visit (quick-add's outside-press dismissal)
   * reads this rather than those two.
   */
  sessionActive: boolean;
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
  /**
   * Declare the link a card opened with `{ door: true }` draws on its `In your collection` label line
   * (I got it, A11), and get back the call that withdraws it. The deck page's Shopping list is the
   * one caller, for the reason it registers the door. A card it draws a link for always draws the
   * receipt, even with nothing in it, so the link has a line to sit on.
   */
  registerReceiptLink: (link: ReceiptLink) => () => void;
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
  /**
   * The finish of the copy `imageUri` draws, when every copy held of it shares one and the art is its own (foil
   * handoff R2, G10): the peek and the neighbor plate draw R1's tile film from it. Absent draws none, the safe
   * direction, so an opener that cannot know it passes nothing.
   */
  foil?: FoilFinish;
};
export type Sibling = string | SiblingCard;

/** One printing a card is viewed at: `open`'s `atPrinting`. */
export type ViewPrinting = (PreferredPrinting & {
  imageUri?: string | null;
  backImageUri?: string | null;
  scryfallId?: string;
  /** The finish the list holds the card in (a precon box's), which the details face draws whoever owns what. */
  finish?: Finish;
}) | ViewFinish;

/**
 * A finish with no printing: a list card whose holder owns none of it, so no printing is theirs to show. Card details
 * draw the reader's own printing, in the list's finish rather than the reader's own copy's.
 */
export type ViewFinish = {
  setCode?: undefined;
  collectorNumber?: undefined;
  imageUri?: undefined;
  backImageUri?: undefined;
  scryfallId?: undefined;
  finish: Finish;
};

/** A list in the one shape the provider holds. */
export function siblingCards(list: readonly Sibling[]): SiblingCard[] {
  return list.map((s) => (typeof s === "string" ? { oracleId: s } : s));
}

/** The swap tools' door for one card, in the desktop art column or the phone's strip, or null. */
export type CardDoor = (oracleId: string, layout: "art" | "strip") => ReactNode;

/** I got it's link for one card, on the receipt's label line, or null. */
export type ReceiptLink = (oracleId: string) => ReactNode;

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

export const CardDetailContext = createContext<CardDetailContextValue | null>(null);

export function useCardDetail(): CardDetailContextValue {
  const ctx = useContext(CardDetailContext);
  if (!ctx) throw new Error("useCardDetail must be used inside a CardDetailProvider");
  return ctx;
}

/** The provider when there is one, else null: for a row also drawn as an About specimen, outside any. */
export function useCardDetailIfAny(): CardDetailContextValue | null {
  return useContext(CardDetailContext);
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
  // Never null: `useCardDetail` throws outside a provider, so a prefetch is always there.
  return useIntentWith(useCardDetail().prefetch, oracleId, art)!;
}

/** `useCardIntent` where there may be no provider (a row also drawn as an About specimen): no handlers then. */
export function useCardIntentIfAny(oracleId: string, art?: string | null) {
  const handlers = useIntentWith(useCardDetailIfAny()?.prefetch ?? null, oracleId, art);
  return handlers ?? {};
}

function useIntentWith(prefetch: CardDetailContextValue["prefetch"] | null, oracleId: string, art?: string | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  return useMemo(
    () => (prefetch
      ? {
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
        }
      : null),
    [oracleId, art, prefetch, cancel],
  );
}

/**
 * The click target every deck surface wraps its card name (or art) in. Deliberately never
 * `disabled` while the fetch runs: disabling the focused element blurs it, and the modal's
 * focus-return would then have nothing to hand focus back to on close.
 */
/**
 * What every card-name trigger shares: the intent prefetch, the hover preview, the pending flag
 * and the press itself. `openFrom` takes the control the press came from, which the modal hands
 * focus back to on close. Shared by the native-button `CardDetailTrigger` and the text-flow
 * `CardDetailFlowTrigger`, so the two cannot drift on what a press does.
 */
export function useCardTrigger({ oracleId, siblings, door = false, imageUri, preview = false }: {
  oracleId: string;
  siblings?: readonly Sibling[];
  door?: boolean;
  imageUri?: string | null;
  preview?: boolean;
}) {
  const { open, pendingOracleId } = useCardDetail();
  const intent = useCardIntent(oracleId, imageUri);
  const hover = usePreviewRow(preview ? imageUri : null);
  const pending = pendingOracleId === oracleId;
  const openFrom = (opener: HTMLElement) => open(oracleId, siblings, undefined, { door, art: imageUri, opener });
  return { intent, hover, pending, openFrom };
}

export function CardDetailTrigger({
  oracleId, name, siblings, className, style, title, ariaLabel, describedBy, testId, door = false, imageUri, preview = false, children,
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
  /**
   * Draw the hover preview of `imageUri` from the surrounding `HoverPreviewProvider`. For a trigger that IS the
   * card's row (a name in a sentence, a plate): every card row has both a preview and a press (Hugh,
   * 2026-10-12). Off by default, because a trigger inside a row that already previews would close the row's own
   * preview on leaving the name. A no-op with no provider, or with no `imageUri`.
   */
  preview?: boolean;
  children: ReactNode;
}) {
  const { intent, hover, pending, openFrom } = useCardTrigger({ oracleId, siblings, door, imageUri, preview });
  return (
    <button
      type="button"
      {...intent}
      {...(preview ? hover : {})}
      data-testid={testId}
      // The trigger names itself: Safari focuses no button on a click, so the dialog's own capture
      // of the focused element finds <body> there, and focus could never come back to this control.
      onClick={(e) => openFrom(e.currentTarget)}
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
