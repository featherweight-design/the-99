"use client";

// The play surface (F03 to F12): the seats' panels laid out for this screen, the centre strip, and the game's life from
// setup to the last player standing. Game state is this device's (`useGame`); the one server write is the result, saved
// once when the game ends (`saveTableResultAction`). A running game draws the table it kept at Start (`TableSnapshot`),
// never the live one, so a reseat, a deck change or a close does not touch it (addendum, Snapshot rule). Undo the last
// change takes a mistaken ending back (Undo addendum): it deletes the saved result, then reopens the game on this device.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { gameLoggedAction, saveTableResultAction, undoTableResultAction } from "../../app/friends/table/result-actions";
import { trackerCopy } from "../../lib/copy/tracker";
import type { GameLogged } from "../../lib/social/rule-zero-result";
import { endingLine } from "../../lib/tracker/ending";
import { mirrorUrl } from "../../lib/url/mirror";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { PersonName, type ThirdPartyName } from "../../lib/person-name";
import { isOver, placements, replay, type Game, type GameConfig } from "../../lib/tracker/engine";
import { landLife } from "../../lib/tracker/result";
import { layoutById, layoutsFor, type Device } from "../../lib/tracker/layouts";
import { rollFair, SIDES, type DieKind } from "./dice";
import { DiceResult, DiceRoll, type Roll } from "./dice-roll";
import { MonarchIcon, InitiativeIcon } from "./icons";
import type { PlaySeat } from "../../lib/tracker/seat";
import { Panel, type SeatPick } from "./panel";
import { Result } from "./result";
import { Setup } from "./setup";
import { Sheet, type SheetView } from "./sheet";
import { Spine } from "./spine";
import { useGame } from "./use-game";
import { useWakeLock } from "./use-wake-lock";

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
  logHref,
  podName,
  closed = null,
  undoNow = false,
  again = false,
}: {
  tableId: string;
  /** The server's sealed Start roster (seats, accounts, decks, issue time). A game keeps the one from its Start and hands that back with the result. */
  roster: string;
  expiresAt: number;
  /** The live seats in turn order, starting with the viewer's own; null on a closed table, where no game starts. */
  seats: readonly PlaySeat[] | null;
  backHref: string;
  /** The viewer's deck's Games tab for this table (`logGameHref`). */
  logHref: string | null;
  podName: string | ThirdPartyName;
  /** Opened from the table page's Start under its Last game (S6): a finished game this device holds opens setup on its layout and life. */
  again?: boolean;
  /** The table's host closed it (S4): who ("you", a name, or null when unknown) and when. */
  closed?: { by: string | ThirdPartyName | null; at: number } | null;
  /** Opened from the Last game card's Undo (U5): the finished game this device holds is undone on arrival. */
  undoNow?: boolean;
}) {
  const device = useDevice();
  const router = useRouter();
  const { ready, game, start, commit, undo, discard, finish } = useGame(tableId, expiresAt);
  /** Every panel's pending life change, so a change that ends the game lands the others with it (S5). */
  const pendingFrom = useRef(new Map<number, () => number>());
  /** A rematch opens setup on the finished game's table and life, and keeps its players for a table that has closed. */
  const [rematch, setRematch] = useState<{ layout: string; life: number; players: readonly PlaySeat[] } | null>(null);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [saved, setSaved] = useState<"saving" | "saved" | "failed" | null>(null);
  const [pick, setPick] = useState<"monarch" | "initiative" | null>(null);
  const [fly, setFly] = useState<{ kind: "monarch" | "initiative"; k: number; from: [number, number]; to: [number, number] } | null>(null);
  const [roll, setRoll] = useState<Roll | null>(null);
  const savedFor = useRef<string | null>(null);
  const saveSeq = useRef(0);
  /** Saves and Undos run one at a time, in order, so an Undo's delete never lands before the save it takes back (clarification 3). */
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [undoing, setUndoing] = useState(false);
  // The guard itself is a ref: the toast's Try again keeps the closure of the render that failed.
  const undoingRef = useRef(false);
  const [logged, setLogged] = useState<GameLogged | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  /** The seat whose panel takes focus once an Undo has reopened the game (clarification 10). */
  const refocus = useRef<number | null>(null);
  const board = useRef<HTMLDivElement>(null);

  const state = useMemo(() => (game ? replay(game) : null), [game]);
  const saved_layout = game ? layoutById(game.config.layout) : undefined;
  // The game's own table, from its Start. A saved game without one, or one that does not fit its layout, is not resumed.
  const snapshot = game?.config.snapshot;
  const players = snapshot?.players ?? [];
  const fits = !!snapshot && !!saved_layout && saved_layout.cells.length === players.length && game!.config.seats.length === players.length && game!.config.seats.every((c, i) => c.seat === players[i].seat);
  useEffect(() => (game && !fits ? discard() : undefined), [game, fits, discard]);
  // Start under the Last game (S6) is a rematch on the live seats; the flag leaves the address bar at once, so a reload
  // of the game it starts, or of that game's result, is never discarded by it.
  const [againPending, setAgainPending] = useState(again);
  useEffect(() => {
    if (!ready || !againPending) return;
    mirrorUrl(window.location.pathname);
    if (game && game.endedAt !== undefined && seats) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved game exists only in the browser, so the rematch is decided after it is read
      setRematch({ layout: game.config.layout, life: game.config.startingLife, players: seats });
      discard();
    }
    setAgainPending(false);
  }, [ready, againPending, game, seats, discard]);
  // Setup draws the live seats; on a closed table only a rematch has seats to start from, and with none it goes back.
  const setupSeats = seats ?? rematch?.players ?? null;
  const nowhere = ready && !game && setupSeats === null;
  useEffect(() => (nowhere ? router.replace(backHref) : undefined), [nowhere, router, backHref]);
  const over = state ? isOver(state) : false;
  // The change that ended the game, named for the Undo row and its toast (three replays, so once per game, not per render).
  const ending = useMemo(() => (game && over && snapshot ? endingLine(game, snapshot.players) : null), [game, over, snapshot]);
  useWakeLock(!!state && !over);
  // A game that ends under an open sheet closes it, so an Undo that reopens the game does not bring the sheet back.
  if (over && sheet) setSheet(null);
  if (over && pick) setPick(null);

  useEffect(() => {
    if (over) finish(Date.now());
  }, [over, finish]);

  // The result is saved once per finished game, keyed on its length so an undo that reopens the game and a new finish saves again.
  useEffect(() => {
    if (!over) savedFor.current = null;
    if (!state || !over) return;
    const key = `${tableId}:${state.entries}`;
    if (savedFor.current === key) return;
    savedFor.current = key;
    // A save that resolves after a Rematch or a later finish is not this game's, so it sets nothing.
    const mine = ++saveSeq.current;
    const settle = (v: "saved" | "failed") => {
      if (saveSeq.current !== mine) return;
      setSaved(v);
      readLogged(mine);
    };
    setSaved("saving");
    const sealed = snapshot?.roster ?? roster;
    const rows = placements(state);
    const save = chain.current.then(() => saveTableResultAction(tableId, sealed, rows));
    chain.current = save.catch(() => undefined);
    save.then(
      (r) => settle(r.ok ? "saved" : "failed"),
      () => settle("failed"),
    );
  }, [state, over, tableId, roster, snapshot]); // eslint-disable-line react-hooks/exhaustive-deps -- readLogged reads refs only

  // Who logged the game (U3) is the server's, read once the save settles and again whenever the screen comes back into view.
  const sealedRoster = snapshot?.roster ?? roster;
  function readLogged(seq: number) {
    gameLoggedAction(tableId, sealedRoster).then(
      (l) => (saveSeq.current === seq ? setLogged(l) : undefined),
      () => undefined,
    );
  }
  useEffect(() => {
    if (!over) return;
    const seq = saveSeq.current;
    const onShow = () => (document.visibilityState === "visible" ? readLogged(seq) : undefined);
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [over, tableId, sealedRoster]); // eslint-disable-line react-hooks/exhaustive-deps -- readLogged reads refs only

  // Undo the last change: the server's result goes first, and only once it has does the game reopen here. A game someone
  // seated has logged stays over and shows who (U3); a failure leaves it over with an alert to try again (clarification 4).
  const runUndo = () => {
    if (!game || undoingRef.current) return;
    const line = ending;
    if (!line) return;
    const before = state ? new Set(state.seats.filter((x) => x.out).map((x) => x.seat)) : new Set<number>();
    const seq = saveSeq.current;
    undoingRef.current = true;
    setUndoing(true);
    const done = () => {
      undoingRef.current = false;
      setUndoing(false);
    };
    // A refusal is the server's decision (the night closed, or the seat changed under the game), so it offers no retry.
    const fail = (retry: boolean) => setToast({ id: Date.now(), text: copy.undo.failed, retry: retry ? { label: copy.undo.retry, run: runUndo } : undefined });
    const call = chain.current.then(() => undoTableResultAction(tableId, sealedRoster));
    chain.current = call.catch(() => undefined);
    call.then(
      ({ result }) => {
        done();
        if (saveSeq.current !== seq) return;
        if (result === "logged") return readLogged(seq);
        if (result !== "undone") return fail(false);
        const back = replay({ config: game.config, log: game.log.slice(0, -1) });
        const flipped = back.seats.find((x) => before.has(x.seat) && !x.out);
        refocus.current = flipped?.seat ?? players.find((p) => p.you)?.seat ?? null;
        saveSeq.current++;
        setSaved(null);
        setLogged(null);
        undo();
        setToast({ id: Date.now(), text: copy.undo.backOn, detail: copy.undo.undid(line) });
      },
      () => {
        done();
        fail(true);
      },
    );
  };

  // Once the board is back, focus goes to the panel that came back in, which the toast announces.
  useEffect(() => {
    if (over || refocus.current === null) return;
    const i = players.findIndex((p) => p.seat === refocus.current);
    const name = board.current?.querySelectorAll<HTMLElement>('[data-testid="panel-name"]')[i];
    if (!name) return;
    refocus.current = null;
    name.focus();
  });

  // The Last game card's Undo (U5) lands here with `?undo=1`: the flag leaves the address bar at once, so a reload never
  // undoes again, and the game this device holds is undone once it is read.
  const [undoPending, setUndoPending] = useState(undoNow);
  useEffect(() => {
    if (!ready || !undoPending) return;
    mirrorUrl(window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved game exists only in the browser, so the Undo is decided after it is read
    setUndoPending(false);
    if (over && Date.now() < expiresAt) runUndo();
  }, [ready, undoPending, over]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once, on arrival

  if (!ready || againPending) return <div className="flex-1" aria-busy="true" />;

  if (game && !fits) return null;
  if (!game || !state) {
    if (setupSeats === null) return null;
    const layouts = layoutsFor(device, setupSeats.length);
    return (
      <Setup
        seats={setupSeats}
        layouts={layouts.length ? layouts : layoutsFor(device === "phone" ? "tablet" : "phone", setupSeats.length)}
        initial={rematch ?? undefined}
        backHref={backHref}
        onStart={({ layout, life, first }) => {
          setRematch(null);
          const config: GameConfig = {
            tableId,
            startingLife: life,
            seats: setupSeats.map((s) => ({ seat: s.seat, commanders: s.partnerArt ? 2 : 1 })),
            first,
            layout,
            startedAt: Date.now(),
            snapshot: { players: setupSeats, roster },
          };
          start({ config, log: [] } satisfies Game);
        }}
      />
    );
  }

  const layout = saved_layout!;
  const seatsInPlay = players;
  const bySeat = new Map(seatsInPlay.map((s) => [s.seat, s]));
  const activeName = bySeat.get(state.active);
  const pct = (x: number, y: number): [number, number] => [(x / layout.canvas.w) * 100, (y / layout.canvas.h) * 100];
  const spine = layout.spine;
  const holder = (kind: "monarch" | "initiative") => {
    const held = state[kind] === null ? undefined : bySeat.get(state[kind]!);
    const name = held ? held.name : null;
    return {
      held: !!held,
      art: held?.art ?? null,
      label: kind === "monarch" ? copy.strip.monarchAria(name) : copy.strip.initiativeAria(name),
    };
  };
  const seatPick = (seat: PlaySeat, cellIndex: number, out: boolean): SeatPick | null => {
    if (!pick || out) return null;
    const now = state[pick] === seat.seat;
    const label = pick === "monarch"
      ? now ? copy.pick.monarchNow : seat.you ? copy.pick.takeCrown : copy.pick.crown(seat.name)
      : now ? copy.pick.initiativeNow : seat.you ? copy.pick.takeInitiative : copy.pick.giveInitiative(seat.name);
    return {
      kind: pick,
      now,
      label,
      onPick: () => {
        setPick(null);
        if (now) return;
        commit({ t: pick, seat: seat.seat });
        const c = layout.cells[cellIndex];
        setFly({ kind: pick, k: (fly?.k ?? 0) + 1, from: pct(spine.x + spine.w / 2, spine.y + spine.h / 2), to: pct(c.x + c.w / 2, c.y + c.h / 2) });
      },
    };
  };
  const rollDie = (kind: DieKind) => setRoll({ kind, values: [rollFair(SIDES[kind])], k: (roll?.k ?? 0) + 1 });

  return (
    <div ref={board} className="relative flex w-full flex-1 items-center justify-center overflow-hidden" data-testid="tracker-play">
      <div
        className="relative"
        style={{ aspectRatio: `${layout.canvas.w} / ${layout.canvas.h}`, width: `min(100%, calc(100dvh * ${layout.canvas.w} / ${layout.canvas.h}))` }}
      >
        {layout.cells.map((cell, i) => {
          const seat = seatsInPlay[i];
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
              monarch={state.monarch === seat.seat}
              initiative={state.initiative === seat.seat}
              onSheet={(focus) => setSheet({ seat: seat.seat, tab: focus ? "counters" : "damage", focus })}
              disabled={over}
              pick={seatPick(seat, i, s.out !== null)}
              onLife={(delta) =>
                commit(landLife(state, seat.seat, delta, () => [...pendingFrom.current].filter(([n]) => n !== seat.seat).map(([n, take]) => ({ seat: n, delta: take() }))))
              }
              pendingFrom={pendingFrom}
              tablet={device === "tablet"}
              onEndTurn={() => commit({ t: "endTurn" })}
              onUndo={undo}
            />
          );
        })}

        <div
          aria-hidden
          className={"pointer-events-none absolute inset-0 z-10 bg-[rgba(14,20,40,.22)] motion-safe:transition-opacity motion-safe:duration-[.6s] " + (state.day === "night" ? "opacity-100" : "opacity-0")}
          data-testid="night-tint"
        />

        <Spine
          rect={spine}
          canvas={layout.canvas}
          round={state.round}
          roundLabel={activeName?.you ? copy.strip.roundAriaYou(state.round) : copy.strip.roundAria(state.round, activeName?.name ?? "")}
          monarch={holder("monarch")}
          initiative={holder("initiative")}
          day={state.day}
          pick={pick}
          canUndo={state.entries > 0}
          menu={menu}
          onPick={(kind) => setPick((p) => (p === kind ? null : kind))}
          onDay={() => commit({ t: "day", value: state.day === "day" ? "night" : "day" })}
          onDice={rollDie}
          onUndo={undo}
          onMenu={() => setMenu((m) => !m)}
        />

        {fly ? (
          <span
            key={fly.k}
            aria-hidden
            onAnimationEnd={() => setFly(null)}
            className="pointer-events-none absolute z-40 grid size-9 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--bg)] opacity-0 motion-reduce:hidden motion-safe:animate-[holder-fly_.55s_cubic-bezier(.5,0,.3,1)_both]"
            style={{ "--fx": `${fly.from[0]}%`, "--fy": `${fly.from[1]}%`, "--tx": `${fly.to[0]}%`, "--ty": `${fly.to[1]}%` } as React.CSSProperties}
            data-testid="holder-fly"
          >
            {fly.kind === "monarch" ? <MonarchIcon size={18} /> : <InitiativeIcon size={18} />}
          </span>
        ) : null}
      </div>

      {sheet && !over ? (
        <Sheet
          view={sheet}
          seats={seatsInPlay}
          state={state}
          game={game}
          rot={layout.cells[seatsInPlay.findIndex((s) => s.seat === sheet.seat)].rot}
          onView={setSheet}
          onClose={() => setSheet(null)}
          onCommit={commit}
          onUndo={undo}
        />
      ) : null}

      <p className="sr-only" aria-live="polite" role="status">
        {activeName ? (activeName.you ? copy.panel.yourTurn : <PersonName n={activeName.name} />) : null}
      </p>

      {menu ? (
        <div role="dialog" aria-label={copy.strip.menu} className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] p-3">
          <Link href={backHref} className="min-h-[44px] px-3 py-3 text-[14px] text-[color:var(--fg)]">{copy.strip.back}</Link>
          <button type="button" onClick={() => setMenu(false)} className="min-h-[44px] px-3 text-[14px] text-[color:var(--fg-body)]">{copy.strip.close}</button>
        </div>
      ) : null}

      {roll ? (
        <DiceRoll roll={roll} onClose={() => setRoll(null)}>
          <DiceResult value={roll.kind === "coin" ? (roll.values[0] === 1 ? copy.dice.heads : copy.dice.tails) : String(roll.values[0])} />
          <button
            type="button"
            onClick={() => rollDie(roll.kind)}
            className="min-h-[48px] rounded-full bg-[color:var(--elevated)] px-5 text-[15px] font-semibold text-[color:var(--fg)]"
            data-testid="dice-again"
          >
            {roll.kind === "coin"
              ? copy.dice.flipAgain(roll.values[0] === 1 ? copy.dice.heads : copy.dice.tails)
              : copy.dice.rollAgain(copy.dice.rolled(roll.values[0]))}
          </button>
        </DiceRoll>
      ) : null}

      {over ? (
        <Result
          state={state}
          seats={seatsInPlay}
          podName={podName}
          startedAt={game.config.startedAt}
          endedAt={game.endedAt}
          saved={saved}
          logHref={logHref}
          backHref={backHref}
          tablet={device === "tablet"}
          closed={closed}
          closesAt={expiresAt}
          undo={ending ? { line: ending, busy: undoing || saved === "saving", onUndo: runUndo } : null}
          logged={logged}
          onRematch={() => {
            setRematch({ layout: game.config.layout, life: game.config.startingLife, players: seatsInPlay });
            setSaved(null);
            setLogged(null);
            saveSeq.current++;
            discard();
          }}
        />
      ) : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} role={toast?.text === copy.undo.failed ? "alert" : "status"} />
    </div>
  );
}
