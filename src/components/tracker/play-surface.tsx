"use client";

// The play surface (F03 to F12): the seats' panels laid out for this screen, the centre strip, and the game's life from
// setup to the last player standing. Game state is this device's (`useGame`); the one server write is the result, saved
// once when the game ends (`saveTableResultAction`).

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { saveTableResultAction } from "../../app/friends/table/result-actions";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonName } from "../../lib/person-name";
import { isOver, placements, replay, type Game, type GameConfig } from "../../lib/tracker/engine";
import { layoutById, layoutsFor, type Device } from "../../lib/tracker/layouts";
import { Panel, type PlaySeat } from "./panel";
import { Setup } from "./setup";
import { useGame } from "./use-game";

const copy = trackerCopy;

const subscribe = (cb: () => void) => {
  const q = window.matchMedia("(min-width: 768px)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const useDevice = (): Device => (useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 768px)").matches, () => false) ? "tablet" : "phone");

export function PlaySurface({
  tableId,
  roster,
  expiresAt,
  seats,
  backHref,
}: {
  tableId: string;
  /** The server's hash of who sat where, handed back with the result. */
  roster: string;
  expiresAt: number;
  /** In turn order, starting with the viewer's own seat. */
  seats: readonly PlaySeat[];
  backHref: string;
}) {
  const device = useDevice();
  const { ready, game, start, commit, undo, discard } = useGame(tableId, expiresAt);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState<"saving" | "saved" | "failed" | null>(null);
  const savedFor = useRef<string | null>(null);

  const state = useMemo(() => (game ? replay(game) : null), [game]);
  const saved_layout = game ? layoutById(game.config.layout) : undefined;
  // A saved game that no longer fits this table (another seat count, or seats that changed) is not resumed.
  const fits = !!game && !!saved_layout && saved_layout.cells.length === seats.length && game.config.seats.length === seats.length && game.config.seats.every((c, i) => c.seat === seats[i].seat);
  useEffect(() => (game && !fits ? discard() : undefined), [game, fits, discard]);
  const over = state ? isOver(state) : false;

  // The result is saved once per finished game, keyed on its length so an undo that reopens the game and a new finish saves again.
  useEffect(() => {
    if (!over) savedFor.current = null;
    if (!state || !over) return;
    const key = `${tableId}:${state.entries}`;
    if (savedFor.current === key) return;
    savedFor.current = key;
     
    setSaved("saving");
    saveTableResultAction(tableId, roster, placements(state)).then(
      (r) => setSaved(r.ok ? "saved" : "failed"),
      () => setSaved("failed"),
    );
  }, [state, over, tableId, roster]);

  if (!ready) return <div className="flex-1" aria-busy="true" />;

  if (game && !fits) return null;
  if (!game || !state) {
    const layouts = layoutsFor(device, seats.length);
    return (
      <Setup
        seats={seats}
        layouts={layouts.length ? layouts : layoutsFor(device === "phone" ? "tablet" : "phone", seats.length)}
        onStart={({ layout, life, first }) => {
          const config: GameConfig = {
            tableId,
            startingLife: life,
            seats: seats.map((s) => ({ seat: s.seat, commanders: s.partnerArt ? 2 : 1 })),
            first,
            layout,
          };
          start({ config, log: [] } satisfies Game);
        }}
      />
    );
  }

  const layout = saved_layout!;
  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const activeName = bySeat.get(state.active);

  return (
    <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden" data-testid="tracker-play">
      <div
        className="relative"
        style={{ aspectRatio: `${layout.canvas.w} / ${layout.canvas.h}`, width: `min(100%, calc(100dvh * ${layout.canvas.w} / ${layout.canvas.h}))` }}
      >
        {layout.cells.map((cell, i) => {
          const seat = seats[i];
          const s = state.seats.find((x) => x.seat === seat.seat)!;
          const from = s.out?.reason.kind === "commander" ? bySeat.get(s.out.reason.from) : undefined;
          return (
            <Panel
              key={seat.seat}
              cell={cell}
              canvas={layout.canvas}
              seat={seat}
              state={s}
              active={state.active === seat.seat}
              round={state.round}
              outFrom={from ? { you: from.you, name: from.name } : null}
              disabled={over}
              onLife={(delta) => commit({ t: "life", seat: seat.seat, delta })}
              onEndTurn={() => commit({ t: "endTurn" })}
              onUndo={undo}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div role="group" className="pointer-events-auto flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-3 py-1 text-[13px] text-[color:var(--fg-body)]">
            <span data-testid="strip-round">{copy.strip.round(state.round)}</span>
            <button type="button" onClick={undo} disabled={state.entries === 0} className="min-h-[44px] px-2 disabled:opacity-40">{copy.strip.undo}</button>
            <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="min-h-[44px] px-2">{copy.strip.menu}</button>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" role="status">
        {activeName ? (activeName.you ? copy.panel.yourTurn : <PersonName n={activeName.name} />) : null}
      </p>

      {menu ? (
        <div role="dialog" aria-label={copy.strip.menu} className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] p-3">
          <Link href={backHref} className="min-h-[44px] px-3 py-3 text-[14px] text-[color:var(--fg)]">{copy.strip.back}</Link>
          <button type="button" onClick={() => setMenu(false)} className="min-h-[44px] px-3 text-[14px] text-[color:var(--fg-body)]">{copy.strip.close}</button>
        </div>
      ) : null}

      {over ? (
        <div role="alertdialog" aria-label={copy.over.title} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:color-mix(in_srgb,var(--bg)_82%,transparent)]" data-testid="tracker-over">
          <h2 className="text-[22px] font-semibold text-[color:var(--fg)]">{copy.over.title}</h2>
          <p className="text-[14px] text-[color:var(--fg-body)]">{saved === "saved" ? copy.over.saved : saved === "failed" ? copy.over.notSaved : ""}</p>
          <button type="button" onClick={undo} className="min-h-[44px] px-6 text-[14px] text-[color:var(--fg)]">{copy.strip.undo}</button>
          <Link href={backHref} className="min-h-[44px] rounded-full bg-[color:var(--accent)] px-6 py-3 text-[14px] font-medium text-[color:var(--bg)]">{copy.over.back}</Link>
        </div>
      ) : null}
    </div>
  );
}
