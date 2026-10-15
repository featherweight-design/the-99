"use client";

// The lab's reading and its controls (`/lab/scan`). A verdict records the reading the player was LOOKING AT when
// they reached for the controls, never one that arrived while their finger was coming down (Hugh, 2026-10-15: a
// Zirda verdict landed on the next frame's guess). A press anywhere in the controls area holds the reading on
// screen, its guess, figures and preview, while the camera keeps reading behind it; the ✓/✗ press then records
// that held reading, and the hold lets go once the verdict is saved, or when the press ends without one. The reading
// on screen is the steady one (`steady.ts`), and a press that comes within `CHANGE_GRACE_MS` of it changing is recorded
// against the guess shown before the change (`tapTarget`), with how long before the press it changed.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import { EMBED_H, EMBED_W } from "../../lib/scan-lab/geometry";
import { readingCrop } from "../../lib/scan-lab/reading";
import { sameAnswer, tapTarget, type Display } from "../../lib/scan-lab/steady";

/** A verdict's target: the reading it is recorded against, what was on screen at the press, and how long before. */
export type Tap = ReturnType<typeof tapTarget>;

/** The normalised tensor back to pixels, for the preview and a kept frame. */
export function tensorToImage(t: Float32Array, w: number, h: number): ImageData {
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const plane = w * h;
  const img = new ImageData(w, h);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) img.data[i * 4 + c] = Math.round((t[c * plane + i] * std[c] + mean[c]) * 255);
    img.data[i * 4 + 3] = 255;
  }
  return img;
}

/** How long a ✓/✗ press waits for its click before letting go of the hold on its own. */
export const VERDICT_CLICK_WAIT_MS = 1500;

/** A hold: what the screen showed when the press began (its reading, when that last changed, and what it showed
 * before), and the tap that press makes on it. */
type Held = { display: Display; tap: Tap };

// The clock taps and holds are timed on, the camera loop's own. Read from the press handlers, never while rendering.
const clock = () => performance.now();

export function ScanControls({
  display,
  keepFrame,
  onKeepFrame,
  onVerdict,
  children,
}: {
  /** What the screen says: the steady reading the camera loop published, and when it last changed. */
  display: Display;
  keepFrame: boolean;
  onKeepFrame: (on: boolean) => void;
  /** Saves a verdict on THIS tap: the held display at the press, when the press began in the controls area. */
  onVerdict: (tap: Tap, correct: boolean) => Promise<void>;
  /** Under the controls: the tap count and the "What card was it?" step. */
  children?: ReactNode;
}) {
  // Held synchronously in a ref, so the click that follows a pointerdown in the same gesture reads it whatever has
  // rendered in between; the state copy is what draws.
  const hold = useRef<Held | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  // The held display ON SCREEN (the state's twin, for handlers and timers), the newest display the loop published, and
  // the change the player SAW when a hold let go: the camera kept reading behind the hold, so the live display's own
  // change time and previous reading can describe changes nobody saw (Copilot, #1887 round 1).
  const onScreen = useRef<Held | null>(null);
  const live = useRef(display);
  useLayoutEffect(() => { live.current = display; }, [display]);
  const afterHold = useRef<{ at: number; view: Display } | null>(null);
  /** What the screen says now, as the player saw it change. */
  function visible(): Display {
    if (onScreen.current) return onScreen.current.display;
    const d = live.current;
    const a = afterHold.current;
    // Until the live display changes again after the hold let go, its last change is the one the release showed.
    return a && d.changedAt <= a.at ? { ...a.view, reading: d.reading } : d;
  }
  /** Shows a hold, or lets one go; letting go is itself a change on screen when the live answer moved meanwhile. */
  function show(h: Held | null) {
    const prev = onScreen.current;
    if (prev && !h) {
      const at = clock();
      const now = live.current.reading;
      afterHold.current = {
        at,
        view: sameAnswer(now, prev.display.reading) ? prev.display : { reading: now, changedAt: at, before: prev.display.reading },
      };
    }
    onScreen.current = h;
    setHeld(h);
  }
  // Verdicts still saving. Each took its OWN press's reading at its click and cleared the hold, so a second tap
  // while the first saves holds the reading in front of it then, never the first press's again.
  const saving = useRef(0);
  const shown = held ? held.display.reading : display.reading;

  const previewRef = useRef<HTMLCanvasElement>(null);
  // The preview is painted from the reading ON SCREEN, in the same commit as its guess, so the two never
  // describe different frames. No card clears it.
  useLayoutEffect(() => {
    const ctx = previewRef.current?.getContext("2d");
    if (!ctx) return;
    const crop = readingCrop(shown);
    if (crop) ctx.putImageData(tensorToImage(crop, EMBED_W, EMBED_H), 0, 0);
    else ctx.clearRect(0, 0, EMBED_W, EMBED_H);
  }, [shown]);

  // The press's own release is watched on the WINDOW, so a finger or a mouse let go outside the controls still
  // ends the hold (capture-phase handlers on the area never see it). Removed when the hold ends and on unmount.
  const unwatch = useRef<(() => void) | null>(null);
  useEffect(() => () => unwatch.current?.(), []);

  // A finger is still down on the press that holds: a second pointer adds nothing. A hold whose press has ended and
  // is only waiting for a click (or its timer) does not block a new press, which takes a fresh hold of its own, so
  // the old timer, which lets go only of the hold it was set for, can never clear it.
  const pressing = useRef(false);

  function grab(e: React.PointerEvent) {
    if (hold.current && pressing.current) return;
    pressing.current = true;
    // What the player is LOOKING AT, judged at THIS press: while an earlier verdict saves, that is still its held
    // display, so a change it showed counts from when it showed, not from the earlier press.
    const v = visible();
    hold.current = { display: v, tap: tapTarget(v, clock()) };
    show(hold.current);
    const which = hold.current;
    const pointer = e.pointerId;
    const up = (ev: PointerEvent) => { if (ev.pointerId === pointer) { stop(); maybeRelease(which, ev.target); } };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pointer) { stop(); release(which); } };
    // Watching ends with the press, whichever way it ends.
    const stop = () => {
      pressing.current = false;
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      if (unwatch.current === stop) unwatch.current = null;
    };
    unwatch.current?.();
    unwatch.current = stop;
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
  }
  function release(which: Held | null = hold.current) {
    // Only the hold this release was for: a newer press keeps its own.
    if (which === null || hold.current !== which) return;
    hold.current = null;
    if (saving.current === 0) show(null);
  }
  // A press that ends with no verdict lets go. Off a ✓/✗ button (Keep this frame) that is the next task. On one, the
  // click that consumes the hold may come a task or more after the pointerup on a phone, so the hold waits for it and
  // lets go on its own only if no click comes at all (a finger slid off the button).
  function maybeRelease(which: Held | null, target: EventTarget | null) {
    const onVerdictButton = (target as Element | null)?.closest?.("[data-verdict]") != null;
    setTimeout(() => release(which), onVerdictButton ? VERDICT_CLICK_WAIT_MS : 0);
  }
  async function verdict(correct: boolean) {
    const tap = hold.current ? hold.current.tap : tapTarget(visible(), clock());
    hold.current = null;
    saving.current += 1;
    try {
      await onVerdict(tap, correct);
    } finally {
      saving.current -= 1;
      // The held reading stays on screen until its verdict is saved, unless a newer press holds another.
      if (saving.current === 0 && hold.current === null) show(null);
    }
  }

  return (
    <section className="flex flex-col gap-[8px]" aria-live="polite">
      {/* A FIXED height, the tallest reading at 390 (two lines for each of the name, the figures, the timings and the
          next guesses): the reading changes length every frame, and the controls under it must
          never move while the camera runs. Each line is clamped, and the column clips what is left. */}
      <div className="flex h-[188px] gap-[12px]" data-held={held ? "" : undefined}>
        <canvas ref={previewRef} width={EMBED_W} height={EMBED_H} className="h-[168px] w-[120px] shrink-0 rounded-[6px]" />
        <div className="flex min-w-0 flex-col gap-[4px] overflow-hidden text-[14px]">
          {shown?.kind === "card" ? (
            <>
              <span className={`text-[12px] ${held ? "text-[color:var(--accent)]" : "text-[color:var(--fg-muted)]"}`}>
                {held ? copy.held : copy.guessing}
              </span>
              <strong className="line-clamp-2 text-[18px] leading-[1.25] [overflow-wrap:anywhere]">{shown.guesses[0]?.name}</strong>
              <span className="line-clamp-2 text-[12px] text-[color:var(--fg-muted)]">
                {shown.guesses[0]?.score.toFixed(3)} · +{shown.margin.toFixed(3)}
                {shown.committed ? ` · ${copy.agreed(shown.agreed)}` : ""}
              </span>
              <span className="line-clamp-2 text-[12px] text-[color:var(--fg-muted)]">{copy.timings(shown.detMs, shown.embMs, shown.matchMs)}</span>
              <span className="line-clamp-2 text-[12px] text-[color:var(--fg-muted)]">
                {copy.runnersUp}: {shown.guesses.slice(1).map((g) => g.name).join(", ")}
              </span>
            </>
          ) : (
            <span>{shown === null ? copy.unsure : copy.noCard}</span>
          )}
        </div>
      </div>
      {/* The controls area: a finger coming down anywhere in it holds the reading above. */}
      <div
        className="flex flex-col gap-[8px]"
        onPointerDownCapture={grab}
      >
        <label className="flex touch-manipulation items-center gap-[8px] text-[14px]">
          <input type="checkbox" checked={keepFrame} onChange={(e) => onKeepFrame(e.target.checked)} />
          {copy.keepFrame}
        </label>
        <div className="flex gap-[8px]">
          <button type="button" data-verdict="" onClick={() => void verdict(true)} className="flex-1 touch-manipulation rounded-[8px] border px-[12px] py-[10px] text-[15px]">
            {copy.right}
          </button>
          <button type="button" data-verdict="" onClick={() => void verdict(false)} className="flex-1 touch-manipulation rounded-[8px] border px-[12px] py-[10px] text-[15px]">
            {copy.wrong}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}
