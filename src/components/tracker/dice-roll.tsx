"use client";

// The roll on screen (F13 dice): a veil over the table, the 3D dice thrown above it to land on the chosen numbers, and
// the result card once they settle. With no 3D scene (reduced motion, no WebGL, the download failed) the card shows at
// once. The numbers are chosen by the caller before the throw (`rollFair`), so the overlay only shows them.

import { useEffect, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { type DieKind, hideDice, throwDice } from "./dice";

export type Roll = { kind: DieKind; values: readonly number[]; k: number };

export function DiceRoll({ roll, onClose, children }: { roll: Roll; onClose: () => void; children: React.ReactNode }) {
  const [landed, setLanded] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    // The coin is not thrown: the library's coin needs image assets, and its plain d2 shows a 1 or a 2, not a face.
    void (roll.kind === "coin" ? Promise.resolve(false) : throwDice(roll.kind, roll.values)).then(() => {
      if (live) setLanded(roll.k);
    });
    return () => {
      live = false;
    };
  }, [roll]);
  useEffect(() => hideDice, []);

  return (
    // The veil sits under the dice layer (z-60) and the card over it, so a die that lands low never covers the result.
    <div data-testid="dice-roll" data-landed={landed === roll.k ? "" : undefined}>
      <button type="button" aria-label={trackerCopy.dice.close} onClick={onClose} className="fixed inset-0 z-50 cursor-default bg-[rgba(0,0,0,.55)]" />
      {landed === roll.k ? (
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
