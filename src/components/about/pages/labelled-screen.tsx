// One screen of an About page: its capture(s) with numbered pins, and the labels in a list (About visual build, plan
// `2026-10-27-about-visual.md`, PR 3, Task 3.2; handoff `design/design_handoff_the99_about_visual/`, calls 0, 1 and 8,
// boards Decks-Phone, Decks-Desktop, Labels and States).
//
// THE PICTURE MATCHES THE DEVICE (call 0): both widths are rendered and one is hidden at `md`, the codebase's
// responsive split, because a server render cannot know the reader's width. The pictures are lazy, and a browser does
// not fetch a lazy image that is `display: none`, so a phone reader never downloads a desktop capture or the reverse.
//
// Phone: each capture full width with its labels under it. Desktop: each capture 700 wide with its labels beside it.
// Pressing a label (or its pin) lights its region with `REGION_HALO` (the Ways-In board's ring and 0.34 dim), its pin and its line.
// While a capture loads its frame holds the capture's size with a quiet skeleton and no pins; the labels read without it.
//
// Addendum R4 (boards 1 to 3): the pins ride a 30px gutter left of the capture, never on it, each region marked by
// corner brackets and a slid pin joined to its row by a stub in the gutter (`pinsAt`); the halo is held 8px inside the
// clipped frame (`haloAt`), so an edge-touching region's ring closes; on a phone a pressed PIN also docks its label
// above the tab bar (`pin-dock.tsx`). A label line never docks: it is the list the dock repeats.

"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { PageWidth } from "../../../lib/about/page-shots";
import { PIN_GUTTER, haloAt, pinsAt, type ScreenLabel, type ScreenModel, type ScreenShot } from "../../../lib/about/pins";
import { PinDock, useDockSlot } from "./pin-dock";
import { LandingCard, LandingShowMe, NewTag, useLabelLanding, useLandingRequest } from "../../discovery/label-landing";

// The Ways-In board dims the screen around a lit region at 0.34; the Tools tab card keeps its own halo.
const REGION_HALO =
  "0 0 0 2px color-mix(in oklab, var(--accent) 75%, transparent), 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent), 0 0 0 2000px color-mix(in oklab, var(--bg) 34%, transparent)";

const PIN_SHADOW = "0 0 0 2px var(--bg), 0 3px 10px rgb(0 0 0 / 0.55)";
const PIN_SHADOW_LIT =
  "0 0 0 2px var(--bg), 0 0 0 6px color-mix(in oklab, var(--accent) 38%, transparent), 0 3px 10px rgb(0 0 0 / 0.55)";

// R4 board 1's corner brackets (`.brk i`): 2px arms with a 3px corner, at accent 85% (full accent lit), each edged in
// the page ground so it reads on light and dark parts of a capture alike.
const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2 rounded-tl-[3px]",
  "right-0 top-0 border-r-2 border-t-2 rounded-tr-[3px]",
  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[3px]",
  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-[3px]",
] as const;
/** The frame's border: the capture's padding box, where pins, brackets and the halo are measured, sits 1px inside it. */
const FRAME_BORDER = 1;

// The States board's skeleton: six quiet bars on the sunken frame, at its own tops and widths, a shade above
// `--surface-raised` (the board's skeleton shade in the dark reference sits between it and `--elevated`).
const SKELETON_BARS: readonly [number, number][] = [[12, 52], [19, 80], [34, 84], [52, 70], [60, 84], [76, 60]];

function Picture({
  shot, width, lit, onPress,
}: {
  shot: ScreenShot;
  width: PageWidth;
  lit: string | null;
  onPress: (key: string) => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  // The picture's rendered size in CSS pixels, measured: the pins are placed at it (`pinsAt`), so their 28px gap and
  // edge clamp hold however narrow the picture is drawn. Null until measured, and no pin is drawn before then.
  // Its padding box, which the capture and the pins are positioned in (inside the 1px border).
  const [rendered, setRendered] = useState<{ w: number; h: number } | null>(null);
  // A capture cached by the browser can finish before hydration attaches `onLoad`; read it once mounted.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true);
  }, []);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () =>
      setRendered((cur) => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w <= 0 || h <= 0) return null;
        return cur && cur.w === w && cur.h === h ? cur : { w, h };
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pins = rendered === null ? [] : pinsAt(shot.pins, rendered.w, rendered.h);
  const litPin = shot.pins.find((p) => p.key === lit);
  const halo = rendered !== null && litPin ? haloAt(litPin.box, rendered.w, rendered.h) : null;
  const desk = width === "desktop";
  return (
    // The gutter the pins ride (R4 board 1, `.gut`): the capture is drawn 30px narrower than its column.
    <div
      data-about-gutter
      className={`relative w-full flex-none ${desk ? "md:w-[700px] md:max-w-[60%]" : ""}`}
      style={{ paddingLeft: PIN_GUTTER }}
    >
      <div
        ref={frame}
        data-about-shot={width}
        data-loaded={loaded ? "" : undefined}
        className={`relative w-full overflow-hidden border border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] ${
          desk ? "rounded-[12px]" : "rounded-[20px]"
        }`}
        style={{ aspectRatio: `${shot.shot.w} / ${shot.shot.h}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture served as-is from public/ */}
        <img
          ref={img}
          src={shot.shot.src}
          width={shot.shot.w}
          height={shot.shot.h}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute left-0 top-0 block h-full w-full ${loaded ? "" : "opacity-0"}`}
        />
        {!loaded && (
          <div
            aria-hidden
            data-about-skeleton
            className="absolute inset-0 bg-[linear-gradient(110deg,var(--surface-sunken)_30%,var(--surface-raised)_45%,var(--surface-sunken)_60%)]"
          >
            {SKELETON_BARS.map(([top, w]) => (
              <i
                key={top}
                className="absolute left-[8%] block h-[10px] rounded-[5px] bg-[color:color-mix(in_oklab,var(--surface-raised)_75%,var(--elevated))]"
                style={{ top: `${top}%`, width: `${w}%` }}
              />
            ))}
          </div>
        )}
        {loaded && litPin && halo && (
          // Inside the clipped frame, held 8px in on every side so its ring and glow close (R4 board 2).
          <span
            aria-hidden
            data-about-halo={litPin.key}
            className="pointer-events-none absolute z-[2] rounded-[8px]"
            style={{ left: `${halo.x}px`, top: `${halo.y}px`, width: `${halo.w}px`, height: `${halo.h}px`, boxShadow: REGION_HALO }}
          />
        )}
      </div>
      {loaded &&
        pins.map((p) => {
          const on = p.key === lit;
          const k = p.bracket;
          return (
            <Fragment key={p.key}>
              <span
                aria-hidden
                data-about-bracket={p.key}
                data-lit={on ? "" : undefined}
                className="pointer-events-none absolute z-[3] block"
                style={{
                  left: `${PIN_GUTTER + FRAME_BORDER + k.l}px`,
                  top: `${FRAME_BORDER + k.t}px`,
                  width: `${k.r - k.l}px`,
                  height: `${k.b - k.t}px`,
                }}
              >
                {CORNERS.map((c) => (
                  <i
                    key={c}
                    className={`absolute block border-solid [filter:drop-shadow(0_0_1px_var(--bg))_drop-shadow(0_0_1px_var(--bg))] ${c} ${
                      on ? "border-[color:var(--accent)]" : "border-[color:color-mix(in_oklab,var(--accent)_85%,transparent)]"
                    }`}
                    style={{ width: `${k.arm}px`, height: `${k.arm}px` }}
                  />
                ))}
              </span>
              {p.stub && (
                <span
                  aria-hidden
                  data-about-stub={p.key}
                  className={`pointer-events-none absolute z-[2] -ml-[0.75px] block w-[1.5px] ${
                    on ? "bg-[color:var(--accent)]" : "bg-[color:color-mix(in_oklab,var(--accent)_55%,transparent)]"
                  }`}
                  style={{ left: `${p.x}px`, top: `${FRAME_BORDER + p.stub.top}px`, height: `${p.stub.height}px` }}
                />
              )}
              {/* The list's line is the control a keyboard or screen reader uses; the pin is its pointer twin. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                data-about-pin={p.key}
                data-lit={on ? "" : undefined}
                onClick={() => onPress(p.key)}
                className="absolute z-[3] -ml-[12px] -mt-[12px] h-[24px] w-[24px] cursor-pointer rounded-full border-0 bg-[color:var(--accent)] p-0 text-center font-mono text-[12px] font-semibold leading-[24px] text-[color:var(--bg)]"
                style={{ left: `${p.x}px`, top: `${FRAME_BORDER + p.y}px`, boxShadow: on ? PIN_SHADOW_LIT : PIN_SHADOW }}
              >
                {p.n}
              </button>
            </Fragment>
          );
        })}
    </div>
  );
}

function LabelList({
  labels, lit, onPress, width,
}: {
  labels: readonly ScreenLabel[];
  lit: string | null;
  onPress: (key: string) => void;
  width: PageWidth;
}) {
  const landing = useLabelLanding();
  return (
    <ol className="m-0 flex list-none flex-col gap-[2px] p-0">
      {labels.map((l) => {
        const on = l.key === lit;
        const landed = landing !== null && landing.key === l.key ? landing : null;
        return (
          <li key={l.key} data-about-label={l.key}>
            <div
              className={`-mx-[10px] w-[calc(100%+20px)] rounded-[10px] border border-solid ${
                on
                  ? "border-[color:color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color:var(--surface)]"
                  : "border-transparent bg-transparent"
              }`}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPress(l.key)}
                className="flex w-full cursor-pointer items-start gap-[12px] rounded-[9px] border-0 bg-transparent px-[10px] py-[9px] text-left"
              >
                <span
                  aria-hidden
                  className="mt-[1px] h-[22px] w-[22px] flex-none rounded-full bg-[color:var(--accent)] text-center font-mono text-[11px] font-semibold leading-[22px] text-[color:var(--bg)]"
                >
                  {l.n}
                </span>
                <span className="text-[14px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">
                  <b className="font-semibold text-[color:var(--fg)]">{l.lead}</b>
                  {l.text}
                  {landed && <NewTag landing={landed} />}
                </span>
              </button>
              {landed && landed.isNew && landed.card && (
                // On a coarse pointer Show me gets its own 44px row, so its touch target never covers the label above.
                <div className="-mt-[5px] pb-[9px] pl-[44px] pr-[10px] pointer-coarse:mt-0 pointer-coarse:flex pointer-coarse:min-h-[44px] pointer-coarse:items-center pointer-coarse:pb-0">
                  <LandingShowMe landing={landed} width={width} />
                </div>
              )}
            </div>
            {landed && width === "phone" && <LandingCard landing={landed} />}
          </li>
        );
      })}
    </ol>
  );
}

/** A phone screen's press state: the lit region, and the label docked for it (drawn only while it is the lit one). */
type Press = { lit: string | null; docked: string | null };

function Width({ model, width }: { model: ScreenModel; width: PageWidth }) {
  // A Show me landing lights its label through this same state, as a press would (`label-landing.tsx`). A later
  // landing on this page (another Show me while it is open, the same label's included) lights its label, adjusted
  // during render. Keyed on the landing's token, not its label: a second Show me to a label the reader has since turned
  // off lands the same label again, and keying on the label would leave it dark. A landing never docks.
  const landing = useLabelLanding();
  const request = useLandingRequest();
  const landed = landing !== null && model.labels.some((l) => l.key === landing.key) ? landing.key : null;
  const [{ lit, docked }, setPress] = useState<Press>({ lit: landed, docked: null });
  const [from, setFrom] = useState<number>(request);
  if (request !== from) {
    setFrom(request);
    if (landed !== null) setPress({ lit: landed, docked: null });
  }
  const root = useRef<HTMLDivElement>(null);
  const slot = useDockSlot();
  // Another section's dock opening puts this one out, its region with it; a region lit by its line stays lit.
  const putOut = useCallback(
    () => setPress((p) => (p.docked !== null && p.docked === p.lit ? { lit: null, docked: null } : { ...p, docked: null })),
    [],
  );
  const { release } = slot;
  useEffect(() => () => release(putOut), [release, putOut]);
  // A label line toggles its region and never docks (it is the list the dock repeats).
  const pressLine = (key: string) => setPress((p) => ({ lit: p.lit === key ? null : key, docked: null }));
  const desk = width === "desktop";
  // Phone pins dock (R4 board 3): the docked pin again puts both out, any other pin lights and docks its own.
  const pressPin = desk
    ? pressLine
    : (key: string) => {
        if (docked === key && lit === key) {
          setPress({ lit: null, docked: null });
          slot.release(putOut);
          return;
        }
        slot.claim(putOut);
        setPress({ lit: key, docked: key });
      };
  const close = () => {
    const key = docked;
    setPress({ lit: null, docked: null });
    slot.release(putOut);
    // The ✕ unmounts under focus: hand it to the label's line, its keyboard twin, without moving the page.
    const items = root.current?.querySelectorAll<HTMLElement>("[data-about-label]") ?? [];
    const item = [...items].find((el) => el.dataset.aboutLabel === key);
    item?.querySelector<HTMLElement>("button[aria-pressed]")?.focus({ preventScroll: true });
  };
  const dockLabel = !desk && docked !== null && docked === lit ? model.labels.find((l) => l.key === docked) : undefined;
  const unpinned = model.labels.filter((l) => l.shot === null);
  return (
    <div
      ref={root}
      data-about-width={width}
      className={desk ? "hidden flex-col gap-[20px] md:flex" : "flex flex-col gap-[16px] md:hidden"}
    >
      {model.shots.map((s, i) => (
        <div key={s.shot.src} className={desk ? "flex flex-row items-start gap-[36px]" : "flex flex-col gap-[16px]"}>
          <Picture shot={s} width={width} lit={lit} onPress={pressPin} />
          <div className={desk ? "flex min-w-0 flex-1 flex-col gap-[16px]" : "contents"}>
            <LabelList labels={model.labels.filter((l) => l.shot === i)} lit={lit} onPress={pressLine} width={width} />
          </div>
        </div>
      ))}
      {unpinned.length > 0 && <LabelList labels={unpinned} lit={lit} onPress={pressLine} width={width} />}
      {dockLabel && <PinDock label={dockLabel} onClose={close} />}
    </div>
  );
}

/** A section's labelled screen at both widths; CSS shows the reader's own (call 0). */
export function LabelledScreen({ phone, desktop }: { phone: ScreenModel; desktop: ScreenModel }) {
  return (
    <>
      <Width model={phone} width="phone" />
      <Width model={desktop} width="desktop" />
    </>
  );
}
