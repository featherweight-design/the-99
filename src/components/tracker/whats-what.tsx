"use client";

// What's what (addendum What's what): one screen over the board that labels every control at once. A 66% scrim with a
// cutout and the halo ring around each control, a label for each with a leader to it, and a header card. The labels are
// placed from the drawn controls (`guide-place.ts`), so every layout, turned or not, follows one rule. The board is
// inert while it shows; a tap anywhere, the close button or Esc takes it away, and the guide hands focus back through
// `onClose`. It also holds any moment bubble for as long as it shows.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { centre, edgePoint, placeLabels, placeRow, rowLabelWidth, type Box, type Placing, type Pt } from "../../lib/tracker/guide-place";
import type { Device } from "../../lib/tracker/layouts";
import { useYieldMoment } from "../moments/moments-context";

const copy = trackerCopy.whatsWhat;

type Id = "round" | "monarch" | "initiative" | "dayNight" | "dice" | "undo" | "menu" | "endTurn" | "sheet" | "badges" | "life";
type Target = { id: Id; box: Box; round: boolean; /** Ring only, no label of its own (the + half of Life). */ ringOnly?: boolean; panel?: Box };

const STRIP: readonly [Id, string][] = [
  ["round", "strip-round"],
  ["monarch", "strip-monarch"],
  ["initiative", "strip-initiative"],
  ["dayNight", "strip-day"],
  ["dice", "strip-dice"],
  ["undo", "strip-undo"],
  ["menu", "strip-menu"],
];
const ALL: readonly Id[] = ["round", "monarch", "initiative", "dayNight", "dice", "undo", "menu", "life", "endTurn", "sheet", "badges"];

/** The ring stands this far off a control, and a label keeps this far from the ring. */
const RING = 5;
const CLEAR = 10;

/** A leader runs from a label's near edge to its control; a labelled row starts each at its own button's x, clamped to the label. */
const ROW_LEAD = 40;
const COLUMN_FOOT_W = 120;

type Plan = { header: Box; labels: Map<Id, Box>; widths: Map<Id, number>; targets: Target[]; leaders: { from: Pt; to: Pt }[] };

function measure(root: HTMLElement, canvas: HTMLElement, base: number): Plan | null {
  const o = root.getBoundingClientRect();
  const rel = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  };
  const bounds = rel(canvas);
  const targets: Target[] = [];
  for (const [id, tid] of STRIP) {
    const el = canvas.querySelector(`[data-testid="${tid}"]`);
    if (el) targets.push({ id, box: rel(el), round: true });
  }
  const spineEl = canvas.querySelector('[data-testid="tracker-spine"]');
  const spine = spineEl ? rel(spineEl) : null;
  // The foot panel is the viewer's own (`data-pane="foot"`); a table without one is labelled from its first panel.
  // A panel flipped out shows its back, so its front controls are inert and unlabelled.
  const panelEl = canvas.querySelector('[data-testid="tracker-panel"][data-pane="foot"]') ?? canvas.querySelector('[data-testid="tracker-panel"]');
  const panel = panelEl ? rel(panelEl) : undefined;
  const live = (el: Element | null): el is Element => !!el && !el.closest('[data-testid="panel-front"]')?.hasAttribute("inert");
  if (panelEl) {
    const minus = panelEl.querySelector('[data-testid="half-minus"] > span:last-child');
    const plus = panelEl.querySelector('[data-testid="half-plus"] > span:last-child');
    if (live(minus)) targets.push({ id: "life", box: rel(minus), round: false, panel });
    if (live(plus)) targets.push({ id: "life", box: rel(plus), round: false, ringOnly: true, panel });
    const sheet = panelEl.querySelector('[data-testid="panel-sheet"]');
    if (live(sheet)) targets.push({ id: "sheet", box: rel(sheet), round: true, panel });
    const badges = panelEl.querySelector('[data-testid="panel-badges"]');
    if (live(badges) && badges.childElementCount > 0) targets.push({ id: "badges", box: rel(badges), round: false, panel });
  }
  // End turn is on whichever panel holds the turn, so it is found across the table.
  const end = canvas.querySelector('[data-testid="end-turn"]');
  if (end && live(end)) {
    const p = end.closest('[data-testid="tracker-panel"]');
    targets.push({ id: "endTurn", box: rel(end), round: false, panel: p ? rel(p) : undefined });
  }

  // Every label starts at its base width; a labelled row narrows them below so all seven fit across the canvas.
  const widths = new Map<Id, number>();
  for (const id of ALL) {
    const el = root.querySelector<HTMLElement>(`[data-ww="${id}"]`);
    if (el) el.style.width = `${base}px`;
  }
  const size = (id: string): { w: number; h: number } => {
    const el = root.querySelector<HTMLElement>(`[data-ww="${id}"]`);
    return { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
  };
  const headerSize = size("header");
  const header: Placing = { id: "header", size: headerSize, ideal: { x: bounds.x + bounds.w / 2, y: bounds.y + headerSize.h / 2 + 14 } };
  const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, w: b.w + by * 2, h: b.h + by * 2 });
  const avoid = targets.map((t) => grow(t.box, RING + CLEAR));

  // A row strip: one label over each button in the buttons' order, so each leader is short, straight and crosses nothing.
  const rowIds = new Set<Id>();
  const rowFrom = new Map<Id, Pt>();
  const rowLabels = new Map<Id, Box>();
  const rowLegs: [Pt, Pt][] = [];
  const strip = targets.filter((t) => STRIP.some(([id]) => id === t.id)).sort((a, b) => a.box.x - b.box.x);
  if (spine && spine.w >= spine.h && strip.length > 0) {
    const footY = (panel ? centre(panel) : { x: 0, y: bounds.y + bounds.h }).y;
    const side: -1 | 1 = footY > centre(spine).y ? -1 : 1;
    const lit = targets.filter((t) => t.id === "endTurn" || t.id === "sheet");
    const setWidth = (id: string, w: number) => {
      const el = root.querySelector<HTMLElement>(`[data-ww="${id}"]`);
      if (el) el.style.width = `${w}px`;
    };
    const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    let chosen: { group: typeof strip; boxes: Box[]; sd: -1 | 1; rowW: number } | null = null;
    for (const sd of [side, side === -1 ? 1 : -1] as const) {
      // A control sitting between the strip and the row (End turn, the sheet chevron) joins the row, so its label is not boxed in behind the others.
      const beside = lit.filter((t) => (sd === -1 ? centre(t.box).y < spine.y : centre(t.box).y > spine.y + spine.h) && Math.abs(centre(t.box).y - centre(spine).y) < 160);
      const group = [...strip, ...beside].sort((a, b) => a.box.x - b.box.x);
      for (const t of [...strip, ...lit]) setWidth(t.id, base);
      const rowW = rowLabelWidth(bounds, group.length, base);
      for (const t of group) setWidth(t.id, rowW);
      const buttons = group.map((t) => grow(t.box, RING));
      const sizes = group.map((t) => size(t.id));
      for (let lead = ROW_LEAD; lead <= ROW_LEAD + 120 && !chosen; lead += 8) {
        const got = placeRow(bounds, buttons, sizes, sd, lead);
        if (got && got.every((b) => avoid.every((a) => !overlaps(b, a)))) chosen = { group, boxes: got, sd, rowW };
      }
      if (chosen) break;
    }
    if (chosen) {
      const { group, boxes, sd, rowW } = chosen;
      group.forEach((t, i) => {
        rowIds.add(t.id);
        widths.set(t.id, rowW);
        rowLabels.set(t.id, boxes[i]);
        const b = boxes[i];
        const from = { x: Math.min(Math.max(centre(t.box).x, b.x + 10), b.x + b.w - 10), y: sd === -1 ? b.y + b.h : b.y };
        rowFrom.set(t.id, from);
        avoid.push(b);
        rowLegs.push([from, centre(t.box)]);
      });
    } else {
      for (const t of [...strip, ...lit]) setWidth(t.id, base);
    }
  }

  const column = !!spine && spine.h > spine.w;
  const foot = panel ?? null;
  const stripC = spine ? centre(spine) : { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
  const footC = foot ? centre(foot) : { x: stripC.x, y: bounds.y + bounds.h };
  // A row goes on the far side of the foot panel vertically; a column alternates sides (addendum P1).
  const away = footC.y > stripC.y ? -1 : 1;
  // In the narrow column the foot panel's labels are slimmer and go first, so they keep their spot beside the control (addendum P1).
  if (column) {
    for (const t of targets) {
      if (t.ringOnly || STRIP.some(([id]) => id === t.id)) continue;
      const el = root.querySelector<HTMLElement>(`[data-ww="${t.id}"]`);
      if (el) el.style.width = `${COLUMN_FOOT_W}px`;
      widths.set(t.id, COLUMN_FOOT_W);
    }
  }
  const items: Placing[] = [];
  let k = 0;
  for (const t of targets) {
    if (t.ringOnly || !ALL.includes(t.id) || rowIds.has(t.id)) continue;
    const s = size(t.id);
    const c = centre(t.box);
    if (STRIP.some(([id]) => id === t.id)) {
      const side = column ? (k % 2 === 0 ? -1 : 1) : away;
      k++;
      const ideal = column
        ? { x: c.x + side * (s.w / 2 + t.box.w / 2 + 18), y: c.y }
        : { x: c.x, y: c.y + side * (s.h / 2 + t.box.h / 2 + 22) };
      items.push({ id: t.id, size: s, ideal, to: c });
    } else {
      const p = t.panel ?? bounds;
      const pc = centre(p);
      const dx = pc.x - c.x;
      const dy = pc.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(s.w, s.h) / 2 + 20;
      items.push({ id: t.id, size: s, ideal: { x: c.x + (dx / d) * reach, y: c.y + (dy / d) * reach }, home: t.panel, to: c });
    }
  }
  const isStrip = (i: Placing) => STRIP.some(([id]) => id === i.id);
  const placed = placeLabels(bounds, avoid, [header, ...(column ? [...items.filter((i) => !isStrip(i)), ...items.filter(isStrip)] : items)], rowLegs);
  const headerBox = placed.get("header")!;
  const labels = new Map<Id, Box>();
  for (const it of items) labels.set(it.id as Id, placed.get(it.id)!);
  for (const [id, b] of rowLabels) labels.set(id, b);

  // The header is not a target's, but the later labels keep clear of it: placed first above, so `placeLabels` knows it.
  const leaders: Plan["leaders"] = [];
  for (const t of targets) {
    const lb = labels.get(t.id);
    if (!lb || t.ringOnly) continue;
    const c = centre(t.box);
    const rowStart = rowFrom.get(t.id);
    const from = rowStart ?? edgePoint(lb, c);
    const ring = grow(t.box, RING);
    const lc = rowStart ?? centre(lb);
    let to: Pt;
    if (t.round) {
      const r = Math.max(ring.w, ring.h) / 2;
      const dx = lc.x - c.x;
      const dy = lc.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      to = { x: c.x + (dx / d) * r, y: c.y + (dy / d) * r };
    } else to = edgePoint(ring, lc);
    leaders.push({ from, to });
  }
  return { header: headerBox, labels, widths, targets, leaders };
}

export function WhatsWhat({ canvas, device, onClose }: { canvas: React.RefObject<HTMLElement | null>; device: Device; onClose: () => void }) {
  const tablet = device === "tablet";
  const w = tablet ? 200 : 148;
  const root = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const maskId = useId();
  const closing = useRef(false);

  // Fade in over 200 ms before first paint; reduced motion draws no fade.
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = () => getComputedStyle(root.current!).getPropertyValue("--motion-ease-out").trim() || "ease-out";
  useLayoutEffect(() => {
    if (!reduced()) root.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: ease() });
  }, []);

  useLayoutEffect(() => {
    const run = () => {
      if (root.current && canvas.current) setPlan(measure(root.current, canvas.current, w));
    };
    run();
    const ro = new ResizeObserver(run);
    if (canvas.current) ro.observe(canvas.current);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [canvas, w]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const el = root.current;
    if (!el || reduced()) return onClose();
    const ms = parseFloat(getComputedStyle(el).getPropertyValue("--motion-exit-quick")) || 140;
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "linear", fill: "forwards" });
    a.onfinish = onClose;
    a.oncancel = onClose;
  };

  // The guide is the visit's one guide: any moment bubble is closed, and none arrives, until it goes.
  const yieldMoment = useYieldMoment();
  useEffect(() => yieldMoment(), [yieldMoment]);

  // The header is hidden until the first measure, and a hidden button cannot take focus: focus it once it shows.
  const drawn = plan !== null;
  useEffect(() => {
    if (drawn) closeButton.current?.focus();
  }, [drawn]);

  // Focus comes to the close button after any focus return (the Menu's) has run, and stays in the guide.
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "Tab") {
        e.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- close reads refs and the first onClose only

  const lineSize = tablet ? "text-[13px] leading-[1.35]" : "text-[12px] leading-[1.35]";
  const nameSize = tablet ? "text-[14px]" : "text-[13px]";
  const surface = "absolute rounded-[10px] bg-[color:var(--elevated)] px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.45),inset_0_0_0_1px_var(--border-strong)]";
  const pick = (id: Id) => copy[id][tablet ? 1 : 2];
  const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, w: b.w + by * 2, h: b.h + by * 2 });

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={copy.title} onClick={close} className="absolute inset-0 z-50 cursor-default" data-testid="whats-what">
      {plan ? (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              {plan.targets.map((t, i) => {
                const b = grow(t.box, RING);
                return <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={t.round ? Math.min(b.w, b.h) / 2 : 10} fill="black" />;
              })}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,.66)" mask={`url(#${maskId})`} />
          {plan.targets.map((t, i) => {
            const b = grow(t.box, RING);
            const rx = t.round ? Math.min(b.w, b.h) / 2 : 10;
            const o = grow(b, 3);
            const n = grow(b, 1);
            return (
              <g key={i} fill="none" style={{ stroke: "var(--accent)" }}>
                <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={rx + 3} strokeWidth={6} strokeOpacity={0.2} />
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={rx + 1} strokeWidth={2} strokeOpacity={0.75} />
              </g>
            );
          })}
          {plan.leaders.map((l, i) => (
            <g key={i} style={{ stroke: "var(--accent)", fill: "var(--accent)" }} opacity={0.8}>
              <line x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} strokeWidth={1.5} />
              <circle cx={l.to.x} cy={l.to.y} r={3} stroke="none" />
            </g>
          ))}
        </svg>
      ) : null}

      <div
        data-ww="header"
        className={surface + " flex items-start gap-2 pr-1.5"}
        style={{ width: Math.min(tablet ? 380 : 330, (canvas.current?.clientWidth ?? 390) - 24), ...(plan ? { left: plan.header.x, top: plan.header.y } : { visibility: "hidden", left: 0, top: 0 }) }}
        data-testid="whats-what-header"
      >
        <span className="min-w-0 flex-1 py-1">
          <span className="block text-[16px] font-semibold text-[color:var(--fg)]">{copy.title}</span>
          <span className={"mt-0.5 block text-[color:var(--fg-body)] " + (tablet ? "text-[14px]" : "text-[13px]") + " leading-[1.35]"}>{copy.intro}</span>
        </span>
        <button
          ref={closeButton}
          type="button"
          aria-label={copy.close}
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full text-[color:var(--fg)] outline-offset-2"
          data-testid="whats-what-close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {ALL.map((id) => {
        const box = plan?.labels.get(id);
        const [name] = copy[id];
        return (
          <div
            key={id}
            data-ww={id}
            data-testid={`whats-what-${id}`}
            className={surface}
            style={{ width: plan?.widths.get(id) ?? w, ...(box ? { left: box.x, top: box.y } : { visibility: "hidden", left: 0, top: 0 }) }}
          >
            <span className={"block font-semibold text-[color:var(--fg)] " + nameSize}>{name}</span>
            <span className={"mt-0.5 block text-[color:var(--fg-body)] " + lineSize}>{pick(id)}</span>
          </div>
        );
      })}
    </div>
  );
}
