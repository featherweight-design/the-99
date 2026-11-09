"use client";
// What the signed-in `CardDetailProvider` does around its modal, read-only, for the landing's Try it (5l-d): hold which card is
// open, page through the list it was opened from, remember the control to give focus back to, and say each arrival. No read
// (the card is one entry of the loaded card data, asked through `detailFor`), no fetch, no cache, no action and nothing stored.
// The dialog itself is `DemoCardModal`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { printedNameOf } from "../../../lib/collection/browse";
import { cardCarouselCopy } from "../../../lib/copy/card-carousel";
import type { DemoCardData, DemoCardDetail } from "../../../lib/demo/project-cards";
import type { SiblingCard } from "../../cards/card-detail-context";
import { arrivalOf, plateFor, useAnnouncer, usePagedReturnFocus, usePagingArrival, usePagingHandlers, type PageFrom } from "../../cards/card-detail-paging";
import { DemoCardModal } from "./demo-card-modal";
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

export function DemoCardHost({ data, opened, onPage, onClose }: { data: DemoCardData; opened: DemoOpened; onPage: (oracleId: string) => void; onClose: () => void }) {
  const detail = useCallback<DetailOf>((id) => detailFor(data, id, opened.role), [data, opened.role]);
  const card = detail(opened.oracleId);
  const list = useMemo(() => pageList(opened.siblings, opened.oracleId, detail), [opened.siblings, opened.oracleId, detail]);
  const index = list.findIndex((s) => s.oracleId === opened.oracleId);
  const paging = index >= 0;
  // Which control paged the card, and the swipe's offset, progress and the face being left (`usePagingArrival`, shared with the
  // signed-in provider). Only a page sets them: a fresh open and a close start with none.
  const { enterFrom, enterOffset, enterProgress, enterLeftFace, setEnterFrom, setEnterOffset, setEnterProgress, setEnterLeftFace } = usePagingArrival();
  // The phone sheet's min snap, carried while the reader pages: a fresh open and a close drop it.
  const [minimized, setMinimized] = useState(false);
  // The carousel's live-region text and its one setter (`useAnnouncer`, shared with the signed-in provider).
  const { announcement, announce } = useAnnouncer();
  // True from a page's press until the arriving card has mounted: the card being left must not hand focus to the opener on its way out.
  const paged = useRef(false);
  const openerRef = useRef(opened.opener);
  useEffect(() => {
    openerRef.current = opened.opener;
  }, [opened.opener]);
  const returnFocusRef = usePagedReturnFocus({ isPaging: () => paged.current, getOpener: () => openerRef.current });

  const page = (to: number, from: PageFrom, offset?: number, progress?: number, leftFace?: string | null) => {
    const target = list[to];
    const shown = target ? detail(target.oracleId) : undefined;
    if (!target || !shown) return;
    paged.current = true;
    const entered = arrivalOf(from, offset, progress, leftFace);
    setEnterFrom(entered.from);
    setEnterOffset(entered.offset);
    setEnterProgress(entered.progress);
    setEnterLeftFace(entered.leftFace);
    // The card is in hand, so the arrival is said at the press (the signed-in provider waits for its read to land first).
    announce(cardCarouselCopy.arrived(printedNameOf(shown), to + 1, list.length));
    onPage(target.oracleId);
  };
  // The page has landed once the arriving card has mounted: from then on the card being left is gone, so a close hands focus to the opener.
  useEffect(() => {
    paged.current = false;
  }, [opened.oracleId]);
  const pager = usePagingHandlers({
    index,
    count: list.length,
    go: page,
    atStart: () => announce(cardCarouselCopy.firstCard),
    atEnd: () => announce(cardCarouselCopy.lastCard),
  });

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
        onPrev={pager.onPrev}
        onNext={pager.onNext}
        onPrevPeek={pager.onPrevPeek}
        onNextPeek={pager.onNextPeek}
        onAtStart={pager.onAtStart}
        onAtEnd={pager.onAtEnd}
        prevSibling={prev === null ? null : plateFor(list[prev], { read: detail(list[prev].oracleId) })}
        nextSibling={next === null ? null : plateFor(list[next], { read: detail(list[next].oracleId) })}
        enterFrom={enterFrom}
        enterOffset={enterOffset}
        enterProgress={enterProgress}
        enterLeftFace={enterLeftFace}
        // Only a page carries the min snap: a fresh open and any other remount start at the teaser.
        startMinimized={minimized && enterFrom !== null}
        onMinimizedChange={onMinimizedChange}
        returnFocusRef={returnFocusRef}
      />
      {/* The carousel's own live region, beside the dialog: a page remounts the dialog and its own region with it. */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </>,
    document.body,
  );
}
