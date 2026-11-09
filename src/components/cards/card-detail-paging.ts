"use client";

// The card details provider's paging pieces: the arrival a page hands the next card, the carousel's announcement, where focus
// goes back when the card closes, the neighbor plates and the Prev/Next/peek wiring, moved here from the signed-in provider
// (`card-detail-provider.tsx`, 5l-e PR 3) so the landing demo's host, which forks them today, can page from one copy. Like
// `card-modal-hooks.ts`, nothing here reads a context, a server action or a provider: what the signed-in provider adds (its
// shown card, its opener, its read art, its viewed printings and deck picks) arrives as an argument.

import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { faceFilm, printedNameOf, resolvedPrinting, withDeckPick, type BrowseCard, type FoilFinish, type PreferredPrinting } from "../../lib/collection/browse";
import type { SiblingCard, ViewPrinting } from "./card-detail-context";

/** Which carousel control paged to the card: null on a fresh open and on any card change that is not a page. */
export type Enter = "prev" | "next" | "prevPeek" | "nextPeek" | null;
/** A page's direction: the control that asked for it. */
export type PageFrom = Exclude<Enter, null>;

/** What a page hands the card it arrives at, as one value. */
export type Arrival = { from: Enter; offset: number; progress: number; leftFace: string | null };

/**
 * The arrival a read carries: a page keeps its swipe's offset, progress and the face being left; anything that is not a page
 * (`page` undefined) arrives fresh, whatever else it was handed.
 */
export function arrivalOf(page: PageFrom | undefined, offset?: number, progress?: number, leftFace?: string | null): Arrival {
  return {
    from: page ?? null,
    offset: page ? offset ?? 0 : 0,
    progress: page ? progress ?? 0 : 0,
    leftFace: page ? leftFace ?? null : null,
  };
}

/** The paging arrival as the provider holds it: four values, each set on its own. */
export function usePagingArrival() {
  // Which control paged the carousel, captured once per arrival so a remounted CardModal (it
  // is keyed on oracle id) restores focus and plays its slide-in from the right side (H23 PR 2,
  // handoff README decisions 2/7/8). Null on a fresh open, which is also how `initialFocusRef`
  // tells a page from an open: the carousel never announces or slides on the first card.
  const [enterFrom, setEnterFrom] = useState<Enter>(null);
  // Where the phone's card band stood when a swipe committed (carousel R2), so the card the swipe
  // led to enters from the spot the reader let go of rather than from its resting peek. Zero for
  // every page that was not a swipe. Set inside `load`, beside `enterFrom`, for the same reason.
  const [enterOffset, setEnterOffset] = useState(0);
  // How far that swipe had carried the swap (0 to 1), so the card enters at the size it had grown to.
  const [enterProgress, setEnterProgress] = useState(0);
  // The face the card being left was showing (a turned back, a printing it was opened at), so it keeps
  // that face while it shrinks into its peek.
  const [enterLeftFace, setEnterLeftFace] = useState<string | null>(null);
  return { enterFrom, enterOffset, enterProgress, enterLeftFace, setEnterFrom, setEnterOffset, setEnterProgress, setEnterLeftFace };
}

/**
 * The carousel's own live-region text and the one way to set it. The region is drawn by whatever survives a page (the provider):
 * the modal is keyed per card and remounts empty on every page.
 */
export function useAnnouncer() {
  // The carousel's own live-region text — distinct from the loading/unavailable region above,
  // which is the modal's.
  const [announcement, setAnnouncement] = useState("");
  // An aria-live region only announces a CHANGE of text, so going straight to an identical
  // string is silent (pre-open review, round 1): pressing the same arrow at an end twice,
  // or paging A→B, closing, reopening A and paging to B again. Cleared first, on its own
  // frame, so a repeat is a real change twice over rather than a no-op. Not memoized against
  // its text: every caller passes a literal built fresh each time, so there is nothing to
  // memoize against. Held at one identity only because it reads nothing but its own setter,
  // so a caller's `useCallback` can list it without rebuilding.
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);
  return { announcement, announce };
}

/**
 * The control focus can actually go back to for an opener still in the document: the opener itself, or, when the page has
 * since made it inert or hidden, the disclosure that controls that region. Null when no such control is found within 8 hops.
 */
export function focusableOpener(el: HTMLElement): HTMLElement | null {
  // An opener the page has since made inert or hidden (a group or row the reader collapsed while the card
  // was open) cannot take focus, and neither can the capture, which is the same control. Focus goes to the
  // disclosure that controls that region instead, which is where the reader's collapse left them, walking
  // out while that disclosure is itself inside a collapsed region (a row's head inside a closed group).
  let target: HTMLElement | null = el;
  for (let hops = 0; target && hops < 8; hops++) {
    const region: HTMLElement | null = target.closest<HTMLElement>("[inert],[hidden]");
    if (!region) return target;
    // A hidden item (a tile a fold hid) carries no id of its own: its container is the region the disclosure names.
    const named: HTMLElement | null | undefined = region.id ? region : region.parentElement?.closest<HTMLElement>("[id]");
    target = named?.id ? document.querySelector<HTMLElement>(`[aria-controls~="${CSS.escape(named.id)}"]`) : null;
  }
  return null;
}

/**
 * WHERE FOCUS GOES BACK when the card closes: a ref whose `current` is a getter, read by the dialog's cleanup.
 *
 * While `isPaging()` (a page is remounting the keyed modal), a DETACHED element whose `focus()` does nothing: the arriving card
 * places focus itself. Otherwise the opener `getOpener()` names, while it is still in the document, through `resolveTarget`
 * (the signed-in provider passes `focusableOpener`); null else, and the dialog falls back to the element it captured.
 *
 * The three functions are read at the first render only (the ref's identity never changes), so they must read refs, not
 * render values.
 */
export function usePagedReturnFocus({
  isPaging,
  getOpener,
  resolveTarget,
}: {
  isPaging: () => boolean;
  getOpener: () => HTMLElement | null;
  resolveTarget?: (opener: HTMLElement) => HTMLElement | null;
}): React.RefObject<HTMLElement | null> {
  const pagingSink = useRef<HTMLElement | null>(null);
  return useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        if (isPaging()) {
          pagingSink.current ??= document.createElement("span");
          return pagingSink.current;
        }
        const el = getOpener();
        if (!el?.isConnected) return null;
        return resolveTarget ? resolveTarget(el) : el;
      },
    }),
    // Read once: see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

/** What decides a neighbor plate's printing beyond the list's own entry. */
export type PlateSource = {
  /** The printing the list views the card at (`viewPrintings`), if any. */
  viewed?: ViewPrinting;
  /** The card as its own read answered, if it has been read. */
  read?: BrowseCard;
  /** The deck's pick for the card, applied to the read card. */
  pick?: PreferredPrinting | null;
};

/**
 * A neighbor plate as it draws: the printing its own details will show when paged onto, never the opener's art, which is
 * often the oracle-level printing. The sibling itself when nothing changes, so an unchanged plate keeps its identity.
 */
export function plateFor(s: SiblingCard, { viewed, read: readCard, pick }: PlateSource): SiblingCard {
  // A card viewed at one printing (`viewPrintings`) shows it on its plate too, as it will when
  // paged onto: the plate never draws the reader's own copy of a card the list stands at another.
  // Its film is the viewed printing's finish, the box's on a precon, never the reader's own copy's.
  if (viewed?.imageUri) {
    const foil = viewed.finish === "nonfoil" ? undefined : viewed.finish;
    return viewed.imageUri !== (s.imageUri ?? null) || s.foil !== foil ? { ...s, imageUri: viewed.imageUri, foil } : s;
  }
  // A finish with no printing: the reader's own printing, drawn in the list's finish, never the reader's own copy's.
  const filmOf = (reader: FoilFinish | undefined) => (viewed && viewed.setCode === undefined ? (viewed.finish === "nonfoil" ? undefined : viewed.finish) : reader);
  if (!readCard) return s.foil !== filmOf(s.foil) ? { ...s, foil: filmOf(s.foil) } : s;
  const shown = withDeckPick(readCard, pick);
  const printing = resolvedPrinting(shown);
  // The film follows the printing the plate draws, as the details face's does (foil handoff R2, G9).
  const read = { art: printing?.imageUri ?? null, name: printedNameOf(shown), foil: filmOf(faceFilm(printing)) };
  return read.art !== (s.imageUri ?? null) || read.name !== s.name || read.foil !== s.foil
    ? { ...s, imageUri: read.art, name: read.name, foil: read.foil }
    : s;
}

/** A page to the card at list position `to`, from the control `from`, with a swipe's offset and progress and the face being left. */
export type PageTo = (to: number, from: PageFrom, offset?: number, progress?: number, leftFace?: string | null) => void;

/**
 * The carousel's handlers for the card at `index` of a list of `count`: Prev and Next (a press or a swipe, carrying the
 * swipe's offset and progress), the two peeks (no offset), and the two ends' announcements. Paging only where the card is in a
 * list of two or more; null (or undefined, for the ends) where there is no page that way. Built fresh on every call, as the
 * provider's inline handlers were; `atStart` and `atEnd` pass through as handed, so a stable callback stays stable.
 *
 * Named as a hook though it calls none: `go` reads the caller's refs when pressed (a read's request counter, a paged flag),
 * and the React compiler's lint takes a ref-reading function handed to a plain function as read during render. A hook's
 * arguments are not, so the handlers it builds are taken for what they are, called on a press.
 */
export function usePagingHandlers({
  index,
  count,
  go,
  atStart,
  atEnd,
}: {
  index: number;
  count: number;
  go: PageTo;
  atStart: () => void;
  atEnd: () => void;
}) {
  const paging = index >= 0 && count > 1;
  const hasPrev = paging && index > 0;
  const hasNext = paging && index < count - 1;
  return {
    onPrev: hasPrev ? (offset?: number, progress?: number, leftFace?: string | null) => go(index - 1, "prev", offset, progress, leftFace) : null,
    onNext: hasNext ? (offset?: number, progress?: number, leftFace?: string | null) => go(index + 1, "next", offset, progress, leftFace) : null,
    onPrevPeek: hasPrev ? (leftFace?: string | null) => go(index - 1, "prevPeek", 0, 0, leftFace) : null,
    onNextPeek: hasNext ? (leftFace?: string | null) => go(index + 1, "nextPeek", 0, 0, leftFace) : null,
    onAtStart: paging ? atStart : undefined,
    onAtEnd: paging ? atEnd : undefined,
  };
}
