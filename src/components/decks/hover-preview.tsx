"use client";

// The decklist's hover preview (#351) — section 5 of the card-surfaces handoff.
//
// One instance per decklist, not one per row: ninety-nine rows would otherwise
// each carry a positioned 252×352 box and a timer of its own. The rows report
// hover; this layer owns the image, the geometry and the two delays.
//
// It shows the card and nothing else. Every fact it owes is already printed on
// the thing it is showing, and a name caption or a pip row would be the app
// restating Wizards' typography over the top of it. That is also why it is
// `aria-hidden` throughout — it duplicates the row it is anchored to, and the
// card modal, whose trigger is the card name a few pixels away, serves the
// reader who needs more than "which card is this".

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cssUrl } from "../../lib/collection/browse";

/** 252×352 is the handoff's figure and 63:88 exactly — the card's own ratio. */
const WIDTH = 252;
const HEIGHT = 352;
/** Clear of the row on whichever side it opens. */
const GUTTER = 14;

/**
 * 240ms in, 80ms out. The delay is what makes an instant appearance calm rather
 * than twitchy, and it is doing the work a transition usually does — the
 * preview does not fade or scale, because zero net motion is locked.
 *
 * Row-to-row is 0ms *while already open*: a scan that re-paid 240ms at every
 * row would feel gated. The open delay is the price of opening, once.
 */
const OPEN_DELAY = 240;
const CLOSE_DELAY = 80;

/**
 * The image and where it goes, measured together in the event handler. The
 * geometry is state rather than something derived at render time: both rects
 * are live DOM measurements, and a render that took them would be reading the
 * layout of a frame it is in the middle of producing.
 */
type PreviewTarget = { imageUri: string; box: PreviewBox };
type PreviewBox = { top: number; left: number };

type PreviewApi = {
  /** Hover began on a row. Null `imageUri` is a no-op — see `usePreviewRow`. */
  open: (imageUri: string | null | undefined, row: HTMLElement) => void;
  close: () => void;
};

const PreviewContext = createContext<PreviewApi | null>(null);

/**
 * Where the box goes. Left of the row, because the add panel docks right;
 * flipped right when there is not `WIDTH + GUTTER` to the left of it, which is
 * what a right-column row at a narrow desktop hits.
 *
 * Bounded by the decklist pane rather than the viewport: the preview may
 * overlap rows, since it is a transient, but it must never cover the panel.
 */
function place(row: DOMRect, pane: DOMRect): PreviewBox {
  const leftward = row.left - GUTTER - WIDTH;
  const left = leftward >= pane.left ? leftward : row.right + GUTTER;
  // Anchored to the row's vertical centre, then held inside the pane — a row
  // near either end would otherwise hang the box off the top or the bottom.
  const centred = row.top + row.height / 2 - HEIGHT / 2;
  const top = Math.min(Math.max(centred, pane.top), pane.bottom - HEIGHT);
  return { top, left };
}

/**
 * The decklist's own pane. It is the provider itself rather than an element
 * inside it, because the pane is the box the preview is bounded by: two
 * elements would let one be wrapped without the other and place the preview
 * against something that is not the list.
 */
export function HoverPreviewProvider({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<PreviewTarget | null>(null);
  const paneEl = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read in `open` to decide whether the 240ms has already been paid. A ref
  // rather than the state itself, because `open` is stable and would otherwise
  // close over the value it had when the row first mounted.
  const isOpen = useRef(false);

  useEffect(() => {
    isOpen.current = target !== null;
  }, [target]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo<PreviewApi>(
    () => ({
      open: (imageUri, row) => {
        // A row whose card has no art has nothing to preview. Silence rather
        // than a plate: the preview exists to answer "which card is this", and
        // an empty rectangle answers nothing.
        if (!imageUri || !paneEl.current) return;
        // Desktop only. A touch device fires `mouseenter` on tap, which would
        // put a transient the reader cannot dismiss over the row they meant to
        // press. Checked here rather than in CSS because the delays and the
        // geometry are script either way.
        if (!window.matchMedia("(hover: hover)").matches) return;
        if (timer.current) clearTimeout(timer.current);
        const show = () => {
          const pane = paneEl.current;
          if (!pane) return;
          setTarget({
            imageUri,
            box: place(row.getBoundingClientRect(), pane.getBoundingClientRect()),
          });
        };
        if (isOpen.current) show();
        else timer.current = setTimeout(show, OPEN_DELAY);
      },
      close: () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
      },
    }),
    [],
  );

  return (
    <PreviewContext.Provider value={api}>
      <div ref={paneEl} className={className}>
        {children}
      </div>
      {target && (
        <div
          aria-hidden
          data-testid="hover-preview"
          className="fixed z-40 pointer-events-none rounded-[12px] hidden md:block"
          style={{
            top: target.box.top,
            left: target.box.left,
            width: WIDTH,
            height: HEIGHT,
            border: "1px solid var(--border-strong)",
            boxShadow: "0 18px 40px -12px rgba(0, 0, 0, 0.72)",
            background: `center / cover no-repeat ${cssUrl(target.imageUri)}`,
          }}
        />
      )}
    </PreviewContext.Provider>
  );
}

/**
 * The handlers a row spreads onto its shell. Returns an empty object outside a
 * provider, so a row rendered on its own — in a test, or on a surface that has
 * no preview — costs nothing and behaves as it always did.
 */
export function usePreviewRow(imageUri: string | null | undefined) {
  const api = useContext(PreviewContext);
  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => api?.open(imageUri, e.currentTarget),
    [api, imageUri],
  );
  const onMouseLeave = useCallback(() => api?.close(), [api]);
  if (!api) return {};
  return { onMouseEnter, onMouseLeave };
}
