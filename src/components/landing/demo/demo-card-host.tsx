"use client";
// What the signed-in `CardDetailProvider` does around its modal, read-only, for the landing's Try it (5l-d): hold which card is
// open, page through the list it was opened from, remember the control to give focus back to, and say each arrival. No read
// (the card is one entry of the exported fixture, asked through `detailFor`), no fetch, no cache, no action and nothing stored.
// The dialog itself is `DemoCardModal`.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { faceFilm, printedNameOf, resolvedPrinting, type BrowseCard } from "../../../lib/collection/browse";
import { cardCarouselCopy } from "../../../lib/copy/card-carousel";
import type { DemoCardDetail } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";
import type { SiblingCard } from "../../cards/card-detail-context";
import { DemoCardModal, type Enter } from "./demo-card-modal";
import { detailFor, type DemoDeckRole } from "./demo-detail";

/** The card a press opened, as the demo's frame holds it: the list it pages (as the opener passed it), the control that opened it and the deck it came from. */
export type DemoOpened = { oracleId: string; siblings: readonly SiblingCard[]; opener: HTMLElement | null; role: DemoDeckRole | null };

/** The details for a card in one opening: `detailFor` bound to the data and the deck the press came from. */
type DetailOf = (oracleId: string) => DemoCardDetail | undefined;

/**
 * The list Prev and Next page, from the list an opener passed: only cards the fixture holds details for (a press on any other opens
 * nothing, so paging onto one would), each once, and only when the open card is among them with another beside it. Else none:
 * the modal then reads "1 of 1" with both arrows off, as the signed-in modal does for a card opened from no list.
 */
export function pageList(siblings: readonly SiblingCard[], current: string, detail: DetailOf): SiblingCard[] {
  const seen = new Set<string>();
  const list = siblings.filter((s) => {
    if (seen.has(s.oracleId) || !detail(s.oracleId)) return false;
    seen.add(s.oracleId);
    return true;
  });
  return list.length > 1 && seen.has(current) ? list : [];
}

/**
 * A neighbor as its plate or peek draws it: the printing its own details will show, never the opener's art, which is often the
 * oracle-level printing (the signed-in provider's `plate`).
 */
export function plateOf(sibling: SiblingCard, detail: DetailOf): SiblingCard {
  const card: BrowseCard | undefined = detail(sibling.oracleId);
  if (!card) return sibling;
  const printing = resolvedPrinting(card);
  const imageUri = printing?.imageUri ?? null;
  const name = printedNameOf(card);
  const foil = faceFilm(printing);
  return imageUri === (sibling.imageUri ?? null) && name === sibling.name && foil === sibling.foil ? sibling : { ...sibling, imageUri, name, foil };
}

type Arrival = { from: Enter; offset: number; progress: number; leftFace: string | null };
const FRESH: Arrival = { from: null, offset: 0, progress: 0, leftFace: null };

export function DemoCardHost({ data, opened, onPage, onClose }: { data: Pick<Projected, "cardDetails">; opened: DemoOpened; onPage: (oracleId: string) => void; onClose: () => void }) {
  const detail = useCallback<DetailOf>((id) => detailFor(data, id, opened.role), [data, opened.role]);
  const card = detail(opened.oracleId);
  const list = useMemo(() => pageList(opened.siblings, opened.oracleId, detail), [opened.siblings, opened.oracleId, detail]);
  const index = list.findIndex((s) => s.oracleId === opened.oracleId);
  const paging = index >= 0;
  const [arrival, setArrival] = useState<Arrival>(FRESH);
  // The phone sheet's min snap, carried while the reader pages: a fresh open and a close drop it.
  const [minimized, setMinimized] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const announce = (text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  };
  // True from a page's press until the arriving card has mounted: the card being left must not hand focus to the opener on its way out.
  const paged = useRef(false);
  const sink = useRef<HTMLElement | null>(null);
  const openerRef = useRef(opened.opener);
  useEffect(() => {
    openerRef.current = opened.opener;
  }, [opened.opener]);
  const returnFocusRef = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        if (paged.current) {
          sink.current ??= document.createElement("span");
          return sink.current;
        }
        const el = openerRef.current;
        return el?.isConnected ? el : null;
      },
    }),
    [],
  );

  const page = (to: number, from: Enter, offset = 0, progress = 0, leftFace: string | null = null) => {
    const target = list[to];
    const shown = target ? detail(target.oracleId) : undefined;
    if (!target || !shown) return;
    paged.current = true;
    setArrival({ from, offset, progress, leftFace });
    // The card is in hand, so the arrival is said at the press (the signed-in provider waits for its read to land first).
    announce(cardCarouselCopy.arrived(printedNameOf(shown), to + 1, list.length));
    onPage(target.oracleId);
  };
  // The page has landed once the arriving card has mounted: from then on the card being left is gone, so a close hands focus to the opener.
  useEffect(() => {
    paged.current = false;
  }, [opened.oracleId]);

  const onMinimizedChange = useCallback((value: boolean) => setMinimized(value), []);
  if (!card || typeof document === "undefined") return null;
  const prev = paging && index > 0 ? index - 1 : null;
  const next = paging && index < list.length - 1 ? index + 1 : null;
  return createPortal(
    <>
      <DemoCardModal
        // Paging remounts the dialog: a new card starts on its front face, at the teaser, with its own focus.
        key={card.oracleId}
        card={card}
        position={paging ? index + 1 : 1}
        total={paging ? list.length : 1}
        onClose={onClose}
        onPrev={prev === null ? null : (offset, progress, leftFace) => page(prev, "prev", offset, progress, leftFace)}
        onNext={next === null ? null : (offset, progress, leftFace) => page(next, "next", offset, progress, leftFace)}
        onPrevPeek={prev === null ? null : (leftFace) => page(prev, "prevPeek", 0, 0, leftFace)}
        onNextPeek={next === null ? null : (leftFace) => page(next, "nextPeek", 0, 0, leftFace)}
        onAtStart={paging ? () => announce(cardCarouselCopy.firstCard) : undefined}
        onAtEnd={paging ? () => announce(cardCarouselCopy.lastCard) : undefined}
        prevSibling={prev === null ? null : plateOf(list[prev], detail)}
        nextSibling={next === null ? null : plateOf(list[next], detail)}
        enterFrom={arrival.from}
        enterOffset={arrival.offset}
        enterProgress={arrival.progress}
        enterLeftFace={arrival.leftFace}
        // Only a page carries the min snap: a fresh open and any other remount start at the teaser.
        startMinimized={minimized && arrival.from !== null}
        onMinimizedChange={onMinimizedChange}
        returnFocusRef={returnFocusRef}
      />
      {/* The carousel's own live region, beside the dialog: a page remounts the dialog and its own region with it. */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </>,
    document.body,
  );
}
