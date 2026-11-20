"use client";

// Arrange mode on /decks (#2990): one column of rows, a ⠿ handle on each, Cancel / Done. A MODE of
// the route, not a page: the view swaps its grid for this and puts the filters back after.
//
// THE HANDLE IS THE ONLY MOVE CONTROL. Pointer or touch drag from the handle (`touch-action: none`
// so a drag is not a scroll); keyboard: Space lifts, ↑/↓ move, Space or Enter drops, Esc puts the
// lift back. Rows are not links. Every move is spoken into one live region.
//
// This component owns the draft order and nothing else. `onDone` saves it (the view's one
// `reorderDecks` call) and `onCancel` leaves. Leaving with a changed order asks first, in the box
// `discard-draft` draws for its own question: the same plate, danger rule and answer geometry.

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deckOrderCopy as copy } from "../../lib/copy/deck-order";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import type { DeckListItem } from "../../lib/decks/read";
import { deckBodySize } from "../../lib/decks/deck-size";
import { clampDy, rowShift, slotAt, slotTop, type DragGeometry } from "../../lib/decks/drag-slots";
import { noteAppScroll } from "../../lib/ui/reveal";
import { ArtLayer } from "../ui/art-layer";
import { PRIMARY } from "../ui/button";
import { statusPillLabel } from "./status-pill";

const EDGE_PX = 80;
const SCROLL_STEP = 14;
/** The lifted row's slide into its slot on release. */
const SETTLE_MS = 140;

export function ArrangeDecks({
  decks,
  shelfLabel,
  onDone,
  onCancel,
}: {
  /** The decks to arrange, in the order they are drawn when Arrange opens. */
  decks: readonly DeckListItem[];
  /** The folder's (or Unfiled's) label; null is All decks. */
  shelfLabel: string | null;
  /** Saves the order. `false` is a refusal or a failure; the draft stays up. */
  onDone: (ids: string[]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(() => decks.map((d) => d.id));
  const [start] = useState(order);
  const dirty = order.some((id, i) => id !== start[i]);
  const byId = new Map(decks.map((d) => [d.id, d]));

  // `lifted` is a keyboard lift or a pointer drag; `before` is the order a lift came from, for Esc.
  const [lifted, setLifted] = useState<string | null>(null);
  const before = useRef<string[]>(order);
  const [said, setSaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [leaving, setLeaving] = useState<null | { href: string | null }>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const handles = useRef(new Map<string, HTMLElement>());
  const keepFocus = useRef(false);

  const name = (id: string) => byId.get(id)?.name ?? "";
  const say = (text: string) => setSaid(text);

  function moveTo(id: string, to: number) {
    setOrder((cur) => {
      const from = cur.indexOf(id);
      if (from < 0 || to < 0 || to >= cur.length || from === to) return cur;
      const next = [...cur];
      next.splice(from, 1);
      next.splice(to, 0, id);
      return next;
    });
  }

  // A keyboard move rebuilds the list, and the browser can drop focus from a moved node.
  useEffect(() => {
    if (lifted && keepFocus.current) handles.current.get(lifted)?.focus({ preventScroll: false });
  }, [order, lifted]);

  // Unsaved changes: the browser's own leave prompt, and in-app links, which ask in the box below.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaving({ href: a.pathname + a.search + a.hash });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // ── Keyboard ────────────────────────────────────────────────────────────
  function onHandleKey(e: React.KeyboardEvent, id: string) {
    // A pointer drag holds the DOM order; a key during it would reorder it and lose the pointer's capture. Esc cancels it.
    if (drag.current || dragging) {
      if (e.key === "Escape" && drag.current) {
        e.preventDefault();
        e.stopPropagation();
        const d = drag.current;
        window.clearInterval(d.timer);
        drag.current = null;
        finishDrag(d, true);
      }
      return;
    }
    const n = order.length;
    const k = order.indexOf(id);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (lifted === id) {
        setLifted(null);
        keepFocus.current = false;
        say(copy.dropped(name(id), k + 1, n));
      } else if (e.key === " ") {
        before.current = order;
        keepFocus.current = true;
        setLifted(id);
        say(copy.lifted(name(id), k + 1, n));
      }
      return;
    }
    if (lifted !== id) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOrder(before.current);
      setLifted(null);
      keepFocus.current = false;
      say(copy.cancelledLift(name(id)));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const to = Math.min(n - 1, Math.max(0, k + (e.key === "ArrowUp" ? -1 : 1)));
      if (to === k) return;
      moveTo(id, to);
      say(copy.position(name(id), to + 1, n));
    }
  }

  // ── Pointer ─────────────────────────────────────────────────────────────
  // A drag never reorders the DOM. The list keeps its order for the whole drag: the lifted row follows the pointer
  // by a transform, its neighbours slide a row's height to open the gap, and the order is committed once, at the
  // drop. Reordering mid-drag moved the lifted row's node (React places a row that moves DOWN with insertBefore), and
  // a node that leaves the document loses its pointer capture: the drag was cancelled and the row snapped back.
  // Positions are read ONCE at pickup, from the undisturbed layout, so nothing the drag does feeds back into where
  // the next target is computed.
  const drag = useRef<{ id: string; clientY: number; timer: number; geo: DragGeometry; to: number } | null>(null);
  const list = useRef<HTMLOListElement | null>(null);
  /** The pending commit of a drop's settle; Done and Cancel wait it out (below), and leaving clears it. */
  const settleTimer = useRef(0);
  const [dragging, setDragging] = useState<null | { id: string; dy: number; to: number; settling: boolean; geo: DragGeometry }>(null);

  function track(d: NonNullable<typeof drag.current>) {
    const { geo } = d;
    // Clamped to the list, so a drag past either end holds the row in the first or last slot.
    const dy = clampDy(geo, d.clientY + window.scrollY - geo.startPageY);
    const to = slotAt(geo, dy);
    d.to = to; // read at release: a quick release can beat the render that would carry it in state
    setDragging((cur) => (cur && cur.id === d.id && cur.dy === dy && cur.to === to ? cur : { id: d.id, dy, to, settling: false, geo }));
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0 || drag.current || dragging) return;
    const ids = order;
    const rects = ids.map((o) => rows.current.get(o)?.getBoundingClientRect());
    if (rects.some((r) => !r)) return;
    const tops = rects.map((r) => r!.top + window.scrollY);
    const heights = rects.map((r) => r!.height);
    const from = ids.indexOf(id);
    const gap = from < ids.length - 1 ? tops[from + 1] - tops[from] - heights[from] : from > 0 ? tops[from] - tops[from - 1] - heights[from - 1] : 0;
    const olTop = (list.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    e.currentTarget.setPointerCapture(e.pointerId);
    keepFocus.current = false; // a keyboard lift's focus-keeping must not pull the page at pickup
    before.current = order;
    setLifted(id);
    const state = { id, clientY: e.clientY, timer: 0, to: from, geo: { tops, heights, from, startPageY: e.clientY + window.scrollY, olTop, gap } };
    // Edge autoscroll: runs while the pointer is held near the top or bottom of the window.
    state.timer = window.setInterval(() => {
      // Stop the moment this drag is no longer the live one; never act on a stale closure.
      if (drag.current !== state) {
        window.clearInterval(state.timer);
        return;
      }
      if (state.clientY < EDGE_PX) {
        noteAppScroll();
        window.scrollBy(0, -SCROLL_STEP);
      } else if (state.clientY > window.innerHeight - EDGE_PX) {
        noteAppScroll();
        window.scrollBy(0, SCROLL_STEP);
      } else return;
      track(state);
    }, 16);
    drag.current = state;
    setDragging({ id, dy: 0, to: from, settling: false, geo: state.geo });
  }
  function onPointerMove(e: React.PointerEvent, id: string) {
    const d = drag.current;
    if (!d || d.id !== id) return;
    d.clientY = e.clientY;
    track(d);
  }
  function endDrag(e: React.PointerEvent, id: string, cancelled: boolean) {
    const d = drag.current;
    if (!d || d.id !== id) return;
    window.clearInterval(d.timer);
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    finishDrag(d, cancelled);
  }
  // Capture lost with no up or cancel (the element left, the browser took the pointer): the drag is over.
  function onLostCapture(id: string) {
    const d = drag.current;
    if (!d || d.id !== id) return;
    window.clearInterval(d.timer);
    drag.current = null;
    finishDrag(d, true);
  }
  function finishDrag(d: NonNullable<typeof drag.current>, cancelled: boolean) {
    const { id, geo } = d;
    const to = d.to;
    const n = order.length;
    if (cancelled || to === geo.from) {
      setDragging(null);
      setLifted(null);
      say(cancelled ? copy.cancelledLift(name(id)) : copy.dropped(name(id), geo.from + 1, n));
      return;
    }
    // Settle: the row slides into the gap, then the order is committed in one step (no frame between).
    setDragging({ id, dy: slotTop(geo, to) - geo.tops[geo.from], to, settling: true, geo });
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = 0;
      moveTo(id, to);
      setDragging(null);
      setLifted(null);
      say(copy.dropped(name(id), to + 1, n));
    }, SETTLE_MS);
  }
  useEffect(
    () => () => {
      if (drag.current) window.clearInterval(drag.current.timer);
      drag.current = null;
      window.clearTimeout(settleTimer.current);
    },
    [],
  );

  // ── Done / Cancel ───────────────────────────────────────────────────────
  async function done() {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    const ok = await onDone(order).catch(() => false);
    if (!ok) {
      setSaving(false);
      setFailed(true);
    }
  }
  function cancel() {
    if (dirty) setLeaving({ href: null });
    else onCancel();
  }

  const heading = shelfLabel === null ? copy.headingAll : copy.headingShelf(shelfLabel);
  const eyebrow = shelfLabel === null ? copy.eyebrowAll(order.length) : copy.eyebrowShelf(shelfLabel, order.length);

  return (
    <section aria-label={heading} className="mx-auto flex w-full max-w-[720px] flex-col px-[16px] pt-[20px] md:px-0 md:pt-[32px]">
      <p className="m-0 font-mono text-[11px] tracking-[0.16em] text-[color:var(--fg-faint)]">{eyebrow}</p>
      <h1 className="m-0 mt-[8px] font-display text-[30px] font-bold leading-[1.1] text-[color:var(--fg)] md:text-[34px]">{heading}</h1>
      <div className="mt-[10px] flex items-end justify-between gap-x-[16px]">
        {/* In a folder the note is the whole line; on All decks it is the hint. */}
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">
          {shelfLabel === null ? copy.hint : copy.shelfNote}
        </p>
        <div className="hidden flex-none items-center gap-[10px] md:flex">
          <Actions saving={saving} settling={dragging?.settling === true} onCancel={cancel} onDone={done} />
        </div>
      </div>
      <hr className="my-[18px] w-full border-x-0 border-b-0 border-t border-solid border-t-[color:var(--border)]" />

      <p role="status" aria-live="assertive" className="sr-only">{said}</p>

      {leaving && (
        <div
          role="alertdialog"
          aria-label={copy.leaveTitle}
          className="mb-[14px] flex flex-col rounded-[10px] bg-[color:var(--surface-rail)] px-[14px] py-[13px]"
          style={{ border: "1px solid var(--border-strong)", borderLeft: "3px solid var(--danger)" }}
        >
          <p className="m-0 mb-[4px] font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--danger)]">{copy.leaveTitle}</p>
          <p className="m-0 mb-[12px] text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.leaveBody}</p>
          <div className="flex gap-[10px]">
            <button
              type="button"
              autoFocus
              onClick={() => setLeaving(null)}
              className={`flex min-h-[44px] items-center justify-center rounded-[8px] border-0 px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer md:min-h-0 ${PRIMARY}`}
            >
              {copy.keep}
            </button>
            <button
              type="button"
              onClick={() => {
                const href = leaving.href;
                setLeaving(null);
                // The listener is dirty-scoped; leaving discards, so it is already moot.
                if (href) router.push(href);
                else onCancel();
              }}
              className="flex min-h-[44px] items-center justify-center rounded-[8px] bg-transparent px-[18px] py-[10px] font-sans text-[13.5px] font-semibold text-[color:var(--danger)] cursor-pointer md:min-h-0 [border:1px_solid_color-mix(in_oklab,var(--danger)_34%,transparent)]"
            >
              {copy.discard}
            </button>
          </div>
        </div>
      )}

      <ol ref={list} className="relative m-0 flex list-none flex-col gap-[10px] p-0 pb-[24px]">
        {order.map((id, i) => {
          const deck = byId.get(id)!;
          const isLifted = lifted === id;
          const shift = dragging ? rowShift(dragging.geo, i, dragging.to, dragging.dy) : null;
          const status = statusPillLabel(deck.statusPill);
          const count = `${deck.built} / ${deckBodySize(deck.partnerName !== null)}`;
          const commander = commanderDisplayName({ name: deck.commanderName, printedName: deck.commanderPrintedName });
          return (
            <Fragment key={id}>
            <li
              ref={(el) => {
                if (el) rows.current.set(id, el);
                else rows.current.delete(id);
              }}
              // A dragged list keeps its DOM order: positions are transforms (see Pointer above).
              style={shift === null ? undefined : { transform: `translateY(${shift}px)`, transition: dragging?.settling || dragging?.id !== id ? `transform ${SETTLE_MS}ms ease` : "none" }}
              className={`relative motion-reduce:!transition-none ${dragging?.id === id ? "z-20" : ""}`}
            >
              <div
                className={`relative flex items-center gap-[12px] rounded-[12px] bg-[color:var(--surface)] py-[8px] pl-[8px] pr-[4px] md:gap-[14px] md:py-[10px] md:pl-[12px] ${
                  isLifted
                    ? "border border-solid border-[color:var(--accent)] shadow-[0_18px_40px_rgba(0,0,0,0.65)]"
                    : "border border-solid border-[color:var(--border)]"
                }`}
              >
              <span aria-hidden className="hidden w-[18px] flex-none text-center font-mono text-[13px] text-[color:var(--fg-faint)] md:block">{i + 1}</span>
              {/* The art crop, decorative, through ArtLayer so it fades in like every other art. */}
              <span
                aria-hidden
                className="relative h-[64px] w-[86px] flex-none overflow-hidden rounded-[8px] bg-[color:var(--elevated)] md:h-[56px] md:w-[84px]"
              >
                {deck.commanderArtCropUri ? <ArtLayer src={deck.commanderArtCropUri} /> : null}
              </span>
              <span className="flex min-w-0 flex-auto flex-col gap-[4px]">
                <span className="truncate font-display text-[17px] font-semibold text-[color:var(--fg)] md:text-[19px]">{deck.name}</span>
                <span className="truncate font-mono text-[12px] text-[color:var(--fg-muted)]">
                  <span className="hidden md:inline">{commander} · </span>
                  {status} · {count}
                </span>
              </span>
              <button
                ref={(el) => {
                  if (el) handles.current.set(id, el);
                  else handles.current.delete(id);
                }}
                type="button"
                aria-label={copy.handle(deck.name)}
                aria-pressed={isLifted}
                onKeyDown={(e) => onHandleKey(e, id)}
                onPointerDown={(e) => onPointerDown(e, id)}
                onPointerMove={(e) => onPointerMove(e, id)}
                onPointerUp={(e) => endDrag(e, id, false)}
                onPointerCancel={(e) => endDrag(e, id, true)}
                onLostPointerCapture={() => onLostCapture(id)}
                onBlur={() => {
                  if (lifted === id && !drag.current) {
                    setLifted(null);
                    keepFocus.current = false;
                  }
                }}
                style={{ touchAction: "none" }}
                className={`flex h-[52px] w-[44px] flex-none cursor-grab items-center justify-center rounded-[10px] bg-transparent p-0 text-[color:var(--fg-muted)] ${
                  isLifted ? "[border:2px_solid_var(--accent)] bg-[color:var(--elevated)]" : "border-0"
                }`}
              >
                <svg aria-hidden width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
                  {[3, 11, 19].flatMap((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />))}
                </svg>
              </button>
              </div>
            </li>
            {isLifted && !dragging && (
              // The empty slot the lifted row left: dashed and the height of a row, per the boards.
              <li
                aria-hidden
                data-testid="drop-slot"
                className="min-h-[80px] rounded-[12px] border border-dashed border-[color:var(--border-strong)] md:min-h-[78px]"
              />
            )}
            </Fragment>
          );
        })}
        {dragging && (
          // The slot the lifted row will land in: dashed, a row's height, in the gap the neighbours opened.
          <li
            aria-hidden
            data-testid="drop-slot"
            className="pointer-events-none absolute inset-x-0 rounded-[12px] border border-dashed border-[color:var(--border-strong)]"
            style={{ top: slotTop(dragging.geo, dragging.to) - dragging.geo.olTop, height: dragging.geo.heights[dragging.geo.from] }}
          />
        )}
      </ol>

      {failed && <p role="alert" className="m-0 mb-[10px] text-[13px] text-[color:var(--danger)]">{copy.failed}</p>}

      <div className="sticky bottom-[var(--tabbar-h,0px)] z-10 -mx-[16px] flex gap-[12px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[12px] [border-top:1px_solid_var(--border)] md:hidden">
        <Actions saving={saving} settling={dragging?.settling === true} onCancel={cancel} onDone={done} phone />
      </div>
    </section>
  );
}

function Actions({ saving, settling, onCancel, onDone, phone = false }: { saving: boolean; settling: boolean; onCancel: () => void; onDone: () => void; phone?: boolean }) {
  const size = phone ? "min-h-[48px] flex-1" : "h-[40px] px-[20px]";
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving || settling}
        className={`flex ${size} cursor-pointer items-center justify-center rounded-[8px] bg-transparent font-sans text-[14px] text-[color:var(--fg)] disabled:opacity-50 [border:1px_solid_var(--border-strong)]`}
      >
        {copy.cancel}
      </button>
      <button
        type="button"
        onClick={onDone}
        // A dropped row is still sliding into its slot for a moment: Done would save the order from before it.
        disabled={saving || settling}
        className={`flex ${size} cursor-pointer items-center justify-center rounded-[8px] border-0 font-sans text-[14px] font-semibold disabled:opacity-50 ${PRIMARY}`}
      >
        {saving ? copy.saving : copy.done}
      </button>
    </>
  );
}
