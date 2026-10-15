"use client";

// The lab's reading and its controls (`/lab/scan`). A verdict records the reading the player was LOOKING AT when
// they reached for the controls, never one that arrived while their finger was coming down (Hugh, 2026-10-15: a
// Zirda verdict landed on the next frame's guess). A press anywhere in the controls area holds the reading on
// screen, its guess, figures and preview, while the camera keeps reading behind it; the ✓/✗ press then records
// that held reading, and the hold lets go once the verdict is saved, or when the press ends without one.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import { EMBED_H, EMBED_W } from "../../lib/scan-lab/geometry";
import { readingCrop, type Reading } from "../../lib/scan-lab/reading";

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

export function ScanControls({
  reading,
  keepFrame,
  onKeepFrame,
  onVerdict,
  children,
}: {
  /** The newest reading the camera loop published. */
  reading: Reading | null;
  keepFrame: boolean;
  onKeepFrame: (on: boolean) => void;
  /** Saves a verdict on THIS reading: the held one when the press began in the controls area. */
  onVerdict: (reading: Reading | null, correct: boolean) => Promise<void>;
  /** Under the controls: the tap count and the "What card was it?" step. */
  children?: ReactNode;
}) {
  // Held synchronously in a ref, so the click that follows a pointerdown in the same gesture reads it whatever has
  // rendered in between; the state copy is what draws.
  const hold = useRef<{ reading: Reading | null } | null>(null);
  const [held, setHeld] = useState<{ reading: Reading | null } | null>(null);
  // Verdicts still saving. Each took its OWN press's reading at its click and cleared the hold, so a second tap
  // while the first saves holds the reading in front of it then, never the first press's again.
  const saving = useRef(0);
  const shown = held ? held.reading : reading;

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

  function grab(e: React.PointerEvent) {
    if (hold.current) return;
    // What the player is LOOKING AT: while an earlier verdict saves, that is still its held reading.
    hold.current = { reading: shown };
    setHeld(hold.current);
    const which = hold.current;
    const pointer = e.pointerId;
    const up = (ev: PointerEvent) => { if (ev.pointerId === pointer) { stop(); maybeRelease(which, ev.target); } };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pointer) { stop(); release(which); } };
    const stop = () => {
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      if (unwatch.current === stop) unwatch.current = null;
    };
    unwatch.current?.();
    unwatch.current = stop;
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
  }
  function release(which: { reading: Reading | null } | null = hold.current) {
    // Only the hold this release was for: a newer press keeps its own.
    if (which === null || hold.current !== which) return;
    hold.current = null;
    if (saving.current === 0) setHeld(null);
  }
  // A press that ends with no verdict lets go. Off a ✓/✗ button (Keep this frame) that is the next task. On one, the
  // click that consumes the hold may come a task or more after the pointerup on a phone, so the hold waits for it and
  // lets go on its own only if no click comes at all (a finger slid off the button).
  function maybeRelease(which: { reading: Reading | null } | null, target: EventTarget | null) {
    const onVerdictButton = (target as Element | null)?.closest?.("[data-verdict]") != null;
    setTimeout(() => release(which), onVerdictButton ? VERDICT_CLICK_WAIT_MS : 0);
  }
  async function verdict(correct: boolean) {
    const r = hold.current ? hold.current.reading : reading;
    hold.current = null;
    saving.current += 1;
    try {
      await onVerdict(r, correct);
    } finally {
      saving.current -= 1;
      // The held reading stays on screen until its verdict is saved, unless a newer press holds another.
      if (saving.current === 0 && hold.current === null) setHeld(null);
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
            <span>{copy.noCard}</span>
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
