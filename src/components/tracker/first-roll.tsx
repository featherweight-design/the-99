"use client";

// Random's d20 for who goes first (README: "Random rolls the d20 on screen for each seat"). The game has already started
// on the winner; this only shows how. One die per seat is thrown across the screen, and once they land each seat's
// number rings up on its own panel, turned to face that player. A tie for the highest throws again for the tied seats
// only, and the winner's ring gains "Goes first". A tap anywhere clears it, at any point. The rounds are decided before
// anything is thrown (`rollForFirst`), so the physics never chooses a number.

import { useEffect, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonText } from "../../lib/person-name";
import type { FirstRoll as Rolls } from "../../lib/tracker/first-roll";
import type { Layout } from "../../lib/tracker/layouts";
import type { PlaySeat } from "../../lib/tracker/seat";
import { hideDice, throwDice } from "./dice";
import { DiceResult } from "./dice-roll";

const copy = trackerCopy.firstRoll;
/** README: the dice land and rest 0.5 s before they clear for the numbers. */
const LAND_MS = 500;
/** How long a tied round's numbers stay up before the tied seats throw again. */
const TIE_MS = 1200;

/** The board stands as dealt this long before the first throw, so the throw is seen starting (not already in the air). */
export const PRE_ROLL_MS = 1000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function FirstRoll({ rolls, layout, seats, onDone }: { rolls: Rolls; layout: Layout; seats: readonly PlaySeat[]; onDone: () => void }) {
  // The last round whose numbers are on the panels; -1 while the first throw is in the air.
  const [shown, setShown] = useState(-1);
  useEffect(() => {
    let live = true;
    void (async () => {
      // Reduced motion throws nothing, so there is nothing to see begin: no hold.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) await wait(PRE_ROLL_MS);
      for (let i = 0; i < rolls.rounds.length && live; i++) {
        if (i > 0) await wait(TIE_MS);
        if (!live) return;
        const thrown = await throwDice("d20", rolls.rounds[i].map((r) => r.value));
        if (thrown) await wait(LAND_MS);
        if (!live) return;
        hideDice();
        setShown(i);
      }
    })();
    return () => {
      live = false;
      hideDice();
    };
  }, [rolls]);

  // Each seat's latest number up to the round on screen, and whether it is still in the running there.
  const latest = new Map<number, { value: number; live: boolean }>();
  for (let i = 0; i <= shown; i++) {
    for (const r of rolls.rounds[i]) latest.set(r.seat, { value: r.value, live: true });
    if (i > 0) for (const r of rolls.rounds[i - 1]) if (!rolls.rounds[i].some((x) => x.seat === r.seat)) latest.get(r.seat)!.live = false;
  }
  const last = shown === rolls.rounds.length - 1;
  const top = shown < 0 ? 0 : Math.max(...rolls.rounds[shown].map((r) => r.value));
  const winner = seats.find((s) => s.seat === rolls.first);

  return (
    <div data-testid="first-roll" data-round={shown} data-done={last ? "" : undefined}>
      <button type="button" aria-label={copy.play} onClick={onDone} className="fixed inset-0 z-50 cursor-default bg-[rgba(0,0,0,.55)]" />
      {layout.cells.map((cell, i) => {
        const seat = seats[i];
        const got = seat && latest.get(seat.seat);
        if (!got) return null;
        const tied = !last && got.live && got.value === top;
        const first = last && seat.seat === rolls.first;
        // Once the winner is known every other seat dims; before that, only the seats a tie left out.
        const dim = last ? !first : !got.live;
        return (
          <div
            key={seat.seat}
            aria-hidden
            className="pointer-events-none absolute z-[70] grid place-items-center"
            style={{ left: `${(cell.x / layout.canvas.w) * 100}%`, top: `${(cell.y / layout.canvas.h) * 100}%`, width: `${(cell.w / layout.canvas.w) * 100}%`, height: `${(cell.h / layout.canvas.h) * 100}%` }}
            data-first-roll-seat={seat.seat}
            data-value={got.value}
            data-first={first ? "" : undefined}
            data-dim={dim ? "" : undefined}
          >
            <div
              // A seat out of the running dims by brightness, not opacity, so its life number never shows through the ring.
              className={"flex flex-col items-center gap-[6px] motion-safe:transition-[filter] motion-safe:duration-300 " + (dim ? "[filter:brightness(.45)]" : "")}
              style={cell.rot === 0 ? undefined : { transform: `rotate(${cell.rot}deg)` }}
            >
              <DiceResult value={String(got.value)} />
              {first ? <em className="font-mono text-[11px] not-italic text-[color:var(--accent-text)]">{copy.goesFirst}</em> : null}
              {tied ? <em className="font-mono text-[11px] not-italic text-[color:var(--fg-muted)]">{copy.tie}</em> : null}
            </div>
          </div>
        );
      })}
      <p className="sr-only" aria-live="polite" role="status">
        {shown < 0 ? null : last && winner ? (
          winner.you ? copy.youFirst : <PersonText text={copy.first(winner.name)} />
        ) : (
          copy.tie
        )}
      </p>
    </div>
  );
}
