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

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deckOrderCopy as copy } from "../../lib/copy/deck-order";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import type { DeckListItem } from "../../lib/decks/read";
import { deckBodySize } from "../../lib/decks/deck-size";
import { PRIMARY } from "../ui/button";
import { statusPillLabel } from "./status-pill";

const EDGE_PX = 80;
const SCROLL_STEP = 14;

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
  const drag = useRef<{ id: string; y: number; timer: number } | null>(null);

  function targetIndex(y: number, id: string): number {
    const others = order.filter((o) => o !== id);
    let to = 0;
    for (const o of others) {
      const r = rows.current.get(o)?.getBoundingClientRect();
      if (r && y > r.top + r.height / 2) to += 1;
    }
    return to;
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    before.current = order;
    setLifted(id);
    const state = { id, y: e.clientY, timer: 0 };
    // Edge autoscroll: runs while the pointer is held near the top or bottom of the window.
    state.timer = window.setInterval(() => {
      if (state.y < EDGE_PX) window.scrollBy(0, -SCROLL_STEP);
      else if (state.y > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_STEP);
      else return;
      moveTo(id, targetIndex(state.y, id));
    }, 16);
    drag.current = state;
  }
  function onPointerMove(e: React.PointerEvent, id: string) {
    const d = drag.current;
    if (!d || d.id !== id) return;
    d.y = e.clientY;
    moveTo(id, targetIndex(e.clientY, id));
  }
  function endDrag(e: React.PointerEvent, id: string, cancelled: boolean) {
    const d = drag.current;
    if (!d || d.id !== id) return;
    window.clearInterval(d.timer);
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancelled) setOrder(before.current);
    setLifted(null);
    const k = (cancelled ? before.current : order).indexOf(id);
    say(cancelled ? copy.cancelledLift(name(id)) : copy.dropped(name(id), k + 1, order.length));
  }
  useEffect(
    () => () => {
      if (drag.current) window.clearInterval(drag.current.timer);
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
      <div className="mt-[8px] flex flex-wrap items-end justify-between gap-x-[16px] gap-y-[8px]">
        <h1 className="m-0 font-display text-[30px] font-bold leading-[1.1] text-[color:var(--fg)] md:text-[34px]">{heading}</h1>
        <div className="hidden items-center gap-[10px] md:flex">
          <Actions saving={saving} onCancel={cancel} onDone={done} />
        </div>
      </div>
      <p className="m-0 mt-[10px] text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.hint}</p>
      {shelfLabel !== null && (
        <p className="m-0 mt-[6px] text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.shelfNote}</p>
      )}
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

      <ol className="m-0 flex list-none flex-col gap-[10px] p-0 pb-[24px]">
        {order.map((id, i) => {
          const deck = byId.get(id)!;
          const isLifted = lifted === id;
          const status = statusPillLabel(deck.statusPill);
          const count = `${deck.built} / ${deckBodySize(deck.partnerName !== null)}`;
          const commander = commanderDisplayName({ name: deck.commanderName, printedName: deck.commanderPrintedName });
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) rows.current.set(id, el);
                else rows.current.delete(id);
              }}
              className={`flex items-center gap-[12px] rounded-[12px] bg-[color:var(--surface)] py-[8px] pl-[8px] pr-[4px] md:gap-[14px] md:py-[10px] md:pl-[12px] ${
                isLifted
                  ? "border border-solid border-[color:var(--accent)] shadow-[0_14px_32px_rgba(0,0,0,0.5)]"
                  : "border border-solid border-[color:var(--border)]"
              }`}
            >
              <span aria-hidden className="hidden w-[18px] flex-none text-center font-mono text-[13px] text-[color:var(--fg-faint)] md:block">{i + 1}</span>
              {/* The art crop as a background: decorative, and the tile's own wash draws it the same way. */}
              <span
                aria-hidden
                style={deck.commanderArtCropUri ? { backgroundImage: `url(${deck.commanderArtCropUri})` } : undefined}
                className="h-[64px] w-[86px] flex-none rounded-[8px] bg-[color:var(--elevated)] bg-cover bg-center md:h-[56px] md:w-[84px]"
              />
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
            </li>
          );
        })}
      </ol>

      {failed && <p role="alert" className="m-0 mb-[10px] text-[13px] text-[color:var(--danger)]">{copy.failed}</p>}

      <div className="sticky bottom-[var(--tabbar-h,0px)] z-10 -mx-[16px] flex gap-[12px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[12px] [border-top:1px_solid_var(--border)] md:hidden">
        <Actions saving={saving} onCancel={cancel} onDone={done} phone />
      </div>
    </section>
  );
}

function Actions({ saving, onCancel, onDone, phone = false }: { saving: boolean; onCancel: () => void; onDone: () => void; phone?: boolean }) {
  const size = phone ? "min-h-[48px] flex-1" : "h-[40px] px-[20px]";
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={`flex ${size} cursor-pointer items-center justify-center rounded-[8px] bg-transparent font-sans text-[14px] text-[color:var(--fg)] disabled:opacity-50 [border:1px_solid_var(--border-strong)]`}
      >
        {copy.cancel}
      </button>
      <button
        type="button"
        onClick={onDone}
        disabled={saving}
        className={`flex ${size} cursor-pointer items-center justify-center rounded-[8px] border-0 font-sans text-[14px] font-semibold disabled:opacity-50 ${PRIMARY}`}
      >
        {saving ? copy.saving : copy.done}
      </button>
    </>
  );
}
