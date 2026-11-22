"use client";

// The roll on screen (F13 dice): a veil over the table, the 3D dice thrown above it to land on the chosen numbers, and
// the result card once they settle. With no 3D scene (reduced motion, no WebGL, the download failed) the card shows at
// once. The numbers are chosen by the caller before the throw (`rollFair`), so the overlay only shows them.

import { useEffect, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { type DieKind, diePoints, hideDice, reducedMotion, throwDice } from "./dice";

export type Roll = { kind: DieKind; values: readonly number[]; k: number };

/** How long the coin turns (P1 `cA`/`cB`); the result lands as it settles. */
const COIN_MS = 1150;

/**
 * `label` names the throw for a screen reader and the tap that repeats it ("Rolled a 4. Tap to roll again"); `onAgain`
 * throws again. A tap on a landed die or on the coin rolls again (bug 9); only a tap off them, on the veil, closes.
 */
export function DiceRoll({ roll, label, onAgain, onClose, tablet = false, children }: { roll: Roll; label: string; onAgain: () => void; onClose: () => void; tablet?: boolean; children: React.ReactNode }) {
  const [landed, setLanded] = useState<number | null>(null);
  // Where the thrown dice came to rest, for the buttons laid over them. Empty with no 3D scene.
  const [points, setPoints] = useState<{ k: number; at: { x: number; y: number }[] }>({ k: 0, at: [] });
  // The coin's tilt as it lands (P1 `--rz`, -40 to 40 degrees), varied per flip from its key.
  const tilt = ((roll.k * 37) % 81) - 40;
  useEffect(() => {
    let live = true;
    if (roll.kind === "coin") {
      // The coin is drawn here, not thrown: the library's coin needs image assets, and its plain d2 shows a 1 or a 2.
      hideDice();
      const t = window.setTimeout(() => setLanded(roll.k), reducedMotion() ? 0 : COIN_MS);
      return () => window.clearTimeout(t);
    }
    void throwDice(roll.kind, roll.values).then(async (thrown) => {
      const at = thrown ? await diePoints() : [];
      if (!live) return;
      setPoints({ k: roll.k, at });
      setLanded(roll.k);
    });
    return () => {
      live = false;
    };
  }, [roll]);
  useEffect(() => hideDice, []);
  const done = landed === roll.k;

  return (
    // The veil sits under the dice layer (z-60) and the card over it, so a die that lands low never covers the result.
    <div data-testid="dice-roll" data-k={roll.k} data-landed={done ? "" : undefined}>
      <button type="button" aria-label={trackerCopy.dice.close} onClick={onClose} className="fixed inset-0 z-50 cursor-default bg-[rgba(0,0,0,.55)]" />
      {roll.kind === "coin" ? (
        // The coin toss (tablet addendum, K1 to K9): a coin with an edge, thrown up off the table and caught by it. It rises
        // toward you (scale) as it turns end over end about its width (rotateX), falls back, rattles flat and a ring lands
        // under it, matching the dice's throw, settle and land. Its shadow stays on the table and shrinks while it is up.
        <div className="pointer-events-none fixed left-1/2 top-[38%] z-[60] -translate-x-1/2 -translate-y-1/2 [perspective:900px]" style={{ width: tablet ? 120 : 72, height: tablet ? 120 : 72 }}>
          <span key={`shadow-${roll.k}`} aria-hidden className="coin-shadow motion-safe:animate-[coin-shadow_.9s_linear_both]" />
          <span key={`land-${roll.k}`} aria-hidden className="absolute left-1/2 top-1/2 size-[166%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 shadow-[0_0_0_2px_var(--accent)] motion-safe:animate-[coin-land_.5s_ease-out_.9s_forwards]" />
          <span key={`arc-${roll.k}`} className="absolute inset-0 [transform-style:preserve-3d] motion-safe:animate-[coin-arc_.9s_linear_both]">
            <button
              key={roll.k}
              type="button"
              aria-label={label}
              onClick={onAgain}
              className="coin pointer-events-auto absolute inset-0 rounded-full motion-safe:animate-[coin-spin_.9s_cubic-bezier(.12,.6,.3,1)_both,coin-settle_.25s_ease-out_.9s_forwards]"
              style={{ "--rx": roll.values[0] === 1 ? "0deg" : "180deg", "--rz": `${tilt}deg`, "--t": tablet ? "8px" : "5px", transform: `rotateZ(${tilt}deg) rotateX(${roll.values[0] === 1 ? 0 : 180}deg)` } as React.CSSProperties}
              data-testid="dice-coin"
            >
              {[-3, -2, -1, 0, 1, 2, 3].map((i) => <span key={i} aria-hidden className="coin-rim" style={{ "--z": i / 7 } as React.CSSProperties} />)}
              <span aria-hidden className="coin-face coin-face-front" style={{ fontSize: tablet ? 20 : 14 }}>{trackerCopy.dice.heads}</span>
              <span aria-hidden className="coin-face coin-face-back" style={{ fontSize: tablet ? 20 : 14 }}>{trackerCopy.dice.tails}</span>
            </button>
          </span>
        </div>
      ) : done && points.k === roll.k ? (
        // Each landed die takes a tap where it lies: the 3D layer itself takes no pointer. Over the result card too, so a
        // die that lands under it still rolls again (the card's own button rolls again as well).
        points.at.map((p, i) => (
          <button
            key={`${roll.k}-${i}`}
            type="button"
            aria-label={label}
            onClick={onAgain}
            className="fixed z-[75] size-[96px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: p.x, top: p.y }}
            data-testid="dice-die"
          />
        ))
      ) : null}
      {done ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[12%] z-[70] flex flex-col items-center gap-3 px-4">
          <div key={roll.k} className="pointer-events-auto flex flex-col items-center gap-3 motion-safe:animate-[sheet-in_.25s_ease-out]">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

/** The landed number in its ring (`.dres`): the ring draws itself in as the card arrives. */
export function DiceResult({ value }: { value: string }) {
  return (
    <span className="relative grid size-[96px] place-items-center rounded-full bg-[color:var(--elevated)] font-display text-[40px] tabular-nums text-[color:var(--fg)]" data-testid="dice-value">
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r="47" fill="none" stroke="var(--accent)" strokeWidth="3" pathLength={1} strokeDasharray="1" className="motion-safe:animate-[ring-trace_.5s_ease-out_both]" />
      </svg>
      <span className={value.length > 2 ? "text-[20px]" : undefined}>{value}</span>
    </span>
  );
}
