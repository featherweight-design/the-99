"use client";

// The seat map (F02, F02b, F02c): the device drawn small, with each player's face on the side of it they sit on. A face
// dragged onto another face swaps their seats; the arrow keys do the same from the keyboard. With "I'll pick", a tap
// picks who goes first, ringed and captioned. The seat a face holds is its cell in the layout, which is its turn order.

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import type { Cell, Layout } from "../../lib/tracker/layouts";
import { PersonInitials, PersonName, PersonText, personAttrs, type PersonParts } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import type { PlaySeat } from "./panel";

const copy = trackerCopy.setup;

type Side = "top" | "bottom" | "left" | "right";
type Rect = { x: number; y: number; w: number; h: number };
type Slot = { side: Side; along: number; rect: Rect };

const SIDE_OF: Record<Cell["rot"], Side> = { 0: "bottom", 180: "top", 90: "left", [-90]: "right" } as Record<Cell["rot"], Side>;
const PAD = 7;
const GAP = 5;
/** The face's block: a 64px face, a 4px gap and the 13px name on its 17px line (64 + 4 + 17). */
const BLOCK_W = 84;
const BLOCK_H = 85;
/** Room a face needs past the outline at an end (F02b: the top face at 0, the outline at 96). */
const END = 96;
/** The "Goes first" caption's line under a name (11px mono, its -2px pull included). */
const CAPTION = 16;
/** The margin above and below an outline with no face at that end (F02: a 290 outline in a 330 map). */
const EDGE = 20;
/** F02 places the two faces on each long side by hand, not on their panels' centres. */
const BOARD_TOPS: Record<string, readonly number[]> = { "phone-4-sides": [214, 46, 46, 214] };

/**
 * The outline's panels from the layout's cells. The spine is folded out of the drawing (the boards draw panels only),
 * and every edge snaps to twelfths of the outline, so the drawing keeps the boards' even 5px gaps.
 */
function panels(layout: Layout, W: number, H: number): Rect[] {
  const { spine } = layout;
  const vertical = spine.h > spine.w;
  const fold = (v: number, at: number, size: number) => (v <= at ? v : v >= at + size ? v - size : at);
  const edges = layout.cells.map((c) => {
    const [x0, x1] = vertical ? [fold(c.x, spine.x, spine.w), fold(c.x + c.w, spine.x, spine.w)] : [c.x, c.x + c.w];
    const [y0, y1] = vertical ? [c.y, c.y + c.h] : [fold(c.y, spine.y, spine.h), fold(c.y + c.h, spine.y, spine.h)];
    return { x0, x1, y0, y1 };
  });
  const minX = Math.min(...edges.map((e) => e.x0));
  const maxX = Math.max(...edges.map((e) => e.x1));
  const minY = Math.min(...edges.map((e) => e.y0));
  const maxY = Math.max(...edges.map((e) => e.y1));
  const snap = (v: number, lo: number, hi: number) => Math.round(((v - lo) / (hi - lo)) * 12) / 12;
  const start = (f: number, inner: number) => PAD + f * inner + (f > 0 ? GAP / 2 : 0);
  const end = (f: number, inner: number) => PAD + f * inner - (f < 1 ? GAP / 2 : 0);
  const iw = W - PAD * 2;
  const ih = H - PAD * 2;
  return edges.map((e) => {
    const x = start(snap(e.x0, minX, maxX), iw);
    const y = start(snap(e.y0, minY, maxY), ih);
    return { x, y, w: end(snap(e.x1, minX, maxX), iw) - x, h: end(snap(e.y1, minY, maxY), ih) - y };
  });
}

/** Spreads faces that share a side so no two overlap, keeping their order and their mean. */
function spread(centres: number[], min: number): number[] {
  const order = centres.map((c, i) => ({ c, i })).sort((a, b) => a.c - b.c);
  for (let pass = 0; pass < 8; pass++) {
    for (let k = 1; k < order.length; k++) {
      const short = min - (order[k].c - order[k - 1].c);
      if (short > 0) {
        order[k - 1].c -= short / 2;
        order[k].c += short / 2;
      }
    }
  }
  const out = [...centres];
  for (const o of order) out[o.i] = o.c;
  return out;
}

/** Where the outline sits and where each cell's face goes, in the map's own px (x from the outline's left). */
export function seatMapGeometry(layout: Layout) {
  const sides = layout.cells.map((c) => SIDE_OF[c.rot]);
  const hasTop = sides.includes("top");
  const hasBottom = sides.includes("bottom");
  const hasEnds = hasTop || hasBottom;
  const hasSides = sides.includes("left") || sides.includes("right");
  // A phone's outline is 150x290, and shorter (170) when faces sit at its ends (F02b). A tablet is the same outline
  // turned landscape, narrower when faces sit at its sides too, so they fit the 420px column.
  const W = layout.device === "phone" ? 150 : hasSides ? 200 : 290;
  const H = layout.device === "phone" ? (hasEnds ? 170 : 290) : Math.round((W * layout.canvas.h) / layout.canvas.w);
  const top = hasTop ? END : EDGE;
  // A face at the bottom end keeps room under its name for the "Goes first" caption, picked or not, so the map never
  // changes height as the pick moves.
  const height = top + H + (hasBottom ? END + CAPTION : EDGE);
  const rects = panels(layout, W, H);
  const along = rects.map((r, i) => (sides[i] === "left" || sides[i] === "right" ? top + r.y + r.h / 2 : r.x + r.w / 2));
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const idx = sides.flatMap((s, i) => (s === side ? [i] : []));
    const vertical = side === "left" || side === "right";
    const moved = spread(idx.map((i) => along[i]), vertical ? BLOCK_H + 7 : BLOCK_W + 4);
    idx.forEach((i, k) => (along[i] = moved[k]));
  }
  const tops = BOARD_TOPS[layout.id];
  const slots: Slot[] = rects.map((rect, i) => ({ side: sides[i], along: tops ? tops[i] + BLOCK_H / 2 : along[i], rect }));
  return { W, H, top, height, slots };
}

/** The words for where a face sits: "left side, top", "top end", "bottom end, left". */
function whereOf(slots: readonly Slot[], i: number): string {
  const { side, along } = slots[i];
  const mates = slots.filter((s) => s.side === side).map((s) => s.along).sort((a, b) => a - b);
  const base = copy.where[side];
  const w = copy.along;
  if (mates.length < 2) return base;
  const k = mates.indexOf(along);
  const vertical = side === "left" || side === "right";
  const ends = vertical ? [w.top, w.bottom] : [w.left, w.right];
  const at = k === 0 ? ends[0] : k === mates.length - 1 ? ends[1] : w.middle;
  return `${base}, ${at}`;
}

export function SeatMap({
  seats,
  order,
  layout,
  pick,
  first,
  onMove,
  onPick,
}: {
  seats: readonly PlaySeat[];
  /** Seat numbers by cell: `order[i]` sits in the layout's cell i. */
  order: readonly number[];
  layout: Layout;
  /** "I'll pick": a tap picks who goes first. */
  pick: boolean;
  first: number;
  onMove: (order: number[]) => void;
  onPick: (seat: number) => void;
}) {
  const geo = seatMapGeometry(layout);
  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const map = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ seat: number; x0: number; y0: number; dx: number; dy: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const [said, setSaid] = useState<PersonParts | string>("");

  const swap = (from: number, to: number) => {
    if (from === to) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    onMove(next);
    const s = bySeat.get(order[from]);
    if (s) setSaid(copy.moved(s.name, whereOf(geo.slots, to)));
  };

  // The face under a point, by the centre of each face's own box.
  const nearest = (x: number, y: number, but: number, within: number) => {
    const faces = map.current?.querySelectorAll<HTMLElement>("[data-slot]") ?? [];
    let best: { i: number; d: number } | null = null;
    for (const el of faces) {
      const i = Number(el.dataset.slot);
      if (i === but) continue;
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (d <= within && (!best || d < best.d)) best = { i, d };
    }
    return best?.i ?? null;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, seat: number) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragged.current = false;
    setDrag({ seat, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false });
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > 6 });
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    if (!drag) return;
    if (drag.moved) {
      dragged.current = true;
      const r = e.currentTarget.getBoundingClientRect();
      const to = nearest(r.left + r.width / 2, r.top + r.height / 2, i, 72);
      if (to !== null) swap(i, to);
    }
    setDrag(null);
  };

  // The keyboard's drag: an arrow swaps this face with the nearest face that way.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const faces = [...(map.current?.querySelectorAll<HTMLElement>("[data-slot]") ?? [])];
    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const me = faces.find((el) => Number(el.dataset.slot) === i);
    if (!me) return;
    const [mx, my] = centre(me);
    let best: { i: number; d: number } | null = null;
    for (const el of faces) {
      const j = Number(el.dataset.slot);
      if (j === i) continue;
      const [x, y] = centre(el);
      const ahead = (x - mx) * dir[0] + (y - my) * dir[1];
      if (ahead <= 4) continue;
      // Straight ahead counts most; off to the side costs double.
      const d = ahead + 2 * Math.abs((x - mx) * dir[1] + (y - my) * dir[0]);
      if (!best || d < best.d) best = { i: j, d };
    }
    if (best) swap(i, best.i);
  };

  const mapLabel = pick ? copy.pickHint : copy.mapAria;
  const outlineLeft = `calc(50% - ${geo.W / 2}px)`;

  return (
    <div ref={map} role="group" aria-label={mapLabel} className="relative flex-none" style={{ height: geo.height }} data-testid="seat-map">
      <div
        aria-hidden="true"
        data-testid="seat-map-device"
        className="absolute rounded-[22px] bg-[color:var(--surface-sunken)] shadow-[inset_0_0_0_1.5px_var(--border-dashed)]"
        style={{ left: outlineLeft, top: geo.top, width: geo.W, height: geo.H }}
      >
        {geo.slots.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-[12px] bg-[color:var(--surface)] shadow-[inset_0_0_0_1px_var(--border)]"
            style={{ left: s.rect.x, top: s.rect.y, width: s.rect.w, height: s.rect.h }}
          />
        ))}
      </div>
      {order.map((seatNo, i) => {
        const seat = bySeat.get(seatNo);
        const slot = geo.slots[i];
        if (!seat || !slot) return null;
        const isFirst = pick && first === seatNo;
        const moving = drag?.seat === seatNo && drag.moved;
        const pos =
          slot.side === "left"
            ? { left: 0, top: slot.along - BLOCK_H / 2 }
            : slot.side === "right"
              ? { right: 0, top: slot.along - BLOCK_H / 2 }
              : { left: `calc(${outlineLeft} + ${slot.along - BLOCK_W / 2}px)`, top: slot.side === "top" ? 0 : geo.top + geo.H + 10 };
        const label = pick
          ? isFirst
            ? copy.firstAria(seat.name)
            : copy.pickAria(seat.name)
          : copy.seatAria(seat.name, whereOf(geo.slots, i));
        const ring = moving
          ? "shadow-[0_0_0_2px_var(--accent),0_8px_20px_rgba(0,0,0,.5)]"
          : isFirst
            ? "shadow-[0_0_0_3px_var(--accent),0_0_0_7px_color-mix(in_oklab,var(--accent)_22%,transparent)]"
            : "shadow-[0_0_0_2px_var(--border-strong)]";
        return (
          <div
            key={seatNo}
            className={`absolute flex w-[84px] flex-col items-center gap-[4px] ${moving ? "z-10" : "transition-[left,right,top] duration-200 motion-reduce:transition-none"}`}
            style={{ ...pos, transform: moving ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
            data-seat-face={seatNo}
          >
            <button
              type="button"
              data-slot={i}
              {...(pick ? { "aria-pressed": isFirst } : {})}
              aria-describedby="seat-map-keys"
              {...personAttrs(
                { "aria-label": label },
                `relative h-[64px] w-[64px] cursor-grab touch-none overflow-hidden rounded-full border-0 bg-[color:var(--elevated)] p-0 select-none focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-[color:var(--accent)] ${ring}`,
              )}
              onPointerDown={(e) => onPointerDown(e, seatNo)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, i)}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                if (pick) onPick(seatNo);
              }}
            >
              {seat.art ? (
                <FadingImg src={seat.art} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover object-top" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-[color:var(--fg-body)]">
                  <PersonInitials n={seat.name} />
                </span>
              )}
            </button>
            <b className="max-w-full truncate text-[13px] font-semibold text-[color:var(--fg)]">
              {seat.you ? (seat.name as string) : <PersonName n={seat.name} />}
            </b>
            {isFirst ? <em className="-mt-[2px] font-mono text-[11px] not-italic text-[color:var(--accent-text)]">{copy.goesFirst}</em> : null}
          </div>
        );
      })}
      <span id="seat-map-keys" className="sr-only">{copy.moveKeys}</span>
      <span className="sr-only" aria-live="polite">
        <PersonText text={said} />
      </span>
    </div>
  );
}
