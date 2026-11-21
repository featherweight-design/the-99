"use client";
// The table page's life tracker (addendum S1 to S6). The game lives on this device only (ruling 8), so everything here
// is read from local storage after mount: the server markup and the first client markup agree, and a device that
// holds no game for the table draws Start alone.
//
// - S3/S4 `Game in progress`: the device holds a running game. It takes Start's place, at the top of the page on a
//   phone and the top of the right column on desktop, with Back to the game and Discard this game (the shared toast's
//   Undo, no confirm). The closed page draws the same card above Log this game.
// - S6 `Last game`: the device holds a finished game. `Not logged yet` reads the server's link (ruling 4): the viewer
//   has logged no game from this table since this one ended (`loggedAt`). Start returns under it.
// - S1/S2: Start, `aria-disabled` with its reason over six seated; a seat still picking its deck says so under it.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonName, PersonText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { isOver, MAX_SEATS, placements, replay, type Game, type GameState } from "../../lib/tracker/engine";
import { gameLength, ordinal } from "../../lib/tracker/result";
import type { PlaySeat } from "../../lib/tracker/seat";
import { discardGame, loadKept, saveGame } from "../../lib/tracker/storage";
import { FadingImg } from "../ui/hydrated-art";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { local } from "../tracker/use-game";

const copy = trackerCopy.table;

export const playHref = (tableId: string, again = false) => `/friends/table/${tableId}/play${again ? "?again=1" : ""}`;

/** `readAt`: when it was read, the clock the card's length is measured to. */
type Kept = { game: Game; expiresAt: number; state: GameState; players: readonly PlaySeat[]; readAt: number };

/** The game this device holds for the table, read after mount; a game with no Start snapshot is not one the tracker resumes. */
export function useKeptGame(tableId: string) {
  const [kept, setKept] = useState<Kept | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    const s = local();
    const now = Date.now();
    const k = s ? loadKept(s, tableId, now) : null;
    const players = k?.game.config.snapshot?.players;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved game exists only in the browser, so it is read after mount
    setKept(k && players ? { ...k, state: replay(k.game), players, readAt: now } : null);
  }, [tableId]);

  // A running game's length keeps counting while its card is open: re-read the clock each minute.
  const ticking = kept !== null && !isOver(kept.state);
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setKept((k) => (k ? { ...k, readAt: Date.now() } : k)), 60_000);
    return () => window.clearInterval(id);
  }, [ticking]);

  const discard = useCallback(() => {
    if (!kept) return;
    const s = local();
    if (s) discardGame(s, tableId);
    setKept(null);
    setToast({
      id: ++toastId.current,
      text: copy.discarded,
      retry: {
        label: copy.undo,
        run: () => {
          const back = local();
          if (back) saveGame(back, kept.game, kept.expiresAt);
          setKept(kept);
          setToast(null);
        },
      },
    });
  }, [kept, tableId]);

  const running = kept && !isOver(kept.state) ? kept : null;
  const finished = kept && isOver(kept.state) ? kept : null;
  const toastNode = <SocialToast toast={toast} onDone={() => setToast(null)} role="status" />;
  return { running, finished, discard, toast: toastNode };
}

const who = (p: PlaySeat | undefined): string | ThirdPartyName => (p?.you ? copy.you : (p?.name ?? ""));

/** A face tile: the seat's art behind its name, rectangular (`.f`). */
function Tile({ p, h, className, children }: { p: PlaySeat; h: 56 | 64; className: string; children: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-[9px] bg-[color:var(--surface-sunken)] ${h === 64 ? "h-[64px]" : "h-[56px]"} ${className}`}>
      {p.art ? <FadingImg src={p.art} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
      <b className="absolute bottom-[5px] left-[8px] right-[34px] truncate text-[12px] font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,.8)]">
        {p.you ? copy.you : <PersonName n={p.name} />}
      </b>
      {children}
    </div>
  );
}

/** Four to a row as drawn; five and six seats wrap three to a row, so a name keeps the width it has at four. */
const grid = (n: number) => (n <= 4 ? ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][n] : "grid-cols-3");

/** S3 and S4: the running game this device holds. */
export function GameInProgress({ tableId, kept, onDiscard, className = "" }: { tableId: string; kept: Kept; onDiscard: () => void; className?: string }) {
  const { state, players, game, readAt } = kept;
  const life = new Map(state.seats.map((s) => [s.seat, s]));
  const turn = players.find((p) => p.seat === state.active);
  const length = gameLength(readAt - (game.config.startedAt ?? readAt));
  return (
    <section aria-label={copy.inProgressAria} className={`flex flex-col gap-[12px] rounded-[14px] bg-[color:var(--surface)] px-[14px] pb-[10px] pt-[14px] text-left shadow-[inset_0_0_0_1px_var(--accent)] ${className}`}>
      <div className="flex items-baseline gap-[10px]">
        <span className="font-mono text-[11px] uppercase tracking-[.06em] text-[color:var(--accent)]">{copy.inProgress}</span>
        <span className="ml-auto font-mono text-[11.5px] text-[color:var(--fg-faint)]">{copy.meta(state.round, length)}</span>
      </div>
      <div className={`grid gap-[8px] ${grid(players.length)}`}>
        {players.map((p) => {
          const seat = life.get(p.seat);
          const out = !seat || seat.out !== null;
          return (
            <Tile
              key={p.seat}
              p={p}
              h={64}
              className={`${out ? "[&_img]:opacity-30 [&_img]:[filter:grayscale(1)]" : "[&_img]:opacity-55"} ${p.seat === state.active && !out ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}
            >
              {out ? (
                <strong className="absolute right-[8px] top-[8px] font-mono text-[10.5px] font-medium text-[color:var(--fg-muted)]">{copy.out}</strong>
              ) : (
                <strong className="absolute right-[8px] top-[4px] font-display text-[22px] font-bold [text-shadow:0_2px_8px_rgba(0,0,0,.7)]">{seat.life}</strong>
              )}
            </Tile>
          );
        })}
      </div>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
        {/* "phone" where the tracker plays as a phone, "device" from the tablet width up (`useDevice`, 768px). */}
        <span className="md:hidden">{turn?.you ? copy.savedPhoneYou : <PersonText text={copy.savedPhone(who(turn))} />}</span>
        <span className="hidden md:inline">{turn?.you ? copy.savedDeviceYou : <PersonText text={copy.savedDevice(who(turn))} />}</span>
      </p>
      <StartLink href={playHref(tableId)} label={copy.resume} />
      <button type="button" onClick={onDiscard} className="min-h-[44px] w-full text-[14px] font-semibold text-[color:var(--fg-muted)]">
        {copy.discard}
      </button>
    </section>
  );
}

/** How far a device clock may run ahead of the server's before a fresh log reads as an earlier game's. */
const CLOCK_SKEW = 120_000;

/** S6: the finished game this device holds, best place first. */
export function LastGame({ kept, loggedAt }: { kept: Kept; loggedAt: Date | null }) {
  const { state, players, game } = kept;
  const place = new Map(placements(state).map((p) => [p.seat, p.place]));
  const ranked = [...players].sort((a, b) => (place.get(a.seat) ?? 99) - (place.get(b.seat) ?? 99));
  const winners = ranked.filter((p) => place.get(p.seat) === 1);
  const start = game.config.startedAt;
  const length = start !== undefined && game.endedAt !== undefined ? gameLength(game.endedAt - start) : null;
  // Ruling 4: the server's link decides it. A log from this table before this game ended was an earlier game's.
  // `endedAt` is the device's clock and `loggedAt` the server's, and Log this game can follow the end by seconds, so
  // the comparison allows CLOCK_SKEW of drift; an earlier game's log is a whole game earlier than that.
  const logged = loggedAt !== null && game.endedAt !== undefined && loggedAt.getTime() >= game.endedAt - CLOCK_SKEW;
  return (
    <section aria-label={copy.lastAria} className="flex flex-col gap-[12px] rounded-[14px] bg-[color:var(--surface)] p-[14px] shadow-[inset_0_0_0_1px_var(--border-strong)]">
      <div className="flex items-baseline gap-[10px]">
        <span className="font-mono text-[11px] uppercase tracking-[.06em] text-[color:var(--fg-muted)]">{copy.last}</span>
        <span className="ml-auto font-mono text-[11.5px] text-[color:var(--fg-faint)]">{copy.lastMeta(state.round, length)}</span>
      </div>
      <h2 className="m-0 font-display text-[20px] font-bold">
        {winners.length !== 1 ? copy.draw : winners[0].you ? copy.wonYou : <PersonText text={copy.won(winners[0].name)} />}
      </h2>
      <div className={`grid gap-[8px] ${grid(players.length)}`}>
        {ranked.map((p) => {
          const first = place.get(p.seat) === 1;
          return (
            <Tile
              key={p.seat}
              p={p}
              h={56}
              className={first ? "shadow-[inset_0_0_0_2px_var(--accent)] [&_img]:opacity-60" : "[&_img]:opacity-40 [&_img]:[filter:grayscale(.6)]"}
            >
              <em className={`absolute right-[7px] top-[4px] font-display text-[13px] font-bold not-italic [text-shadow:0_1px_4px_rgba(0,0,0,.8)] ${first ? "text-[color:var(--accent)]" : "text-[color:var(--fg-body)]"}`}>
                {ordinal(place.get(p.seat) ?? ranked.length)}
              </em>
            </Tile>
          );
        })}
      </div>
      {logged ? null : <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.notLogged}</p>}
    </section>
  );
}

const PLAY = (
  <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
);

const GO = "flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[10px] text-[16px] font-semibold";

function StartLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`${GO} bg-[color:var(--accent)] text-[color:var(--bg)]`}>
      {PLAY}
      {label}
    </Link>
  );
}

/** "Max, Bo and you": the others in seat order, the viewer last. */
function listNames(seats: readonly { you: boolean; name: string | ThirdPartyName }[]): PersonParts {
  const names = [...seats.filter((w) => !w.you).map((w) => w.name), ...(seats.some((w) => w.you) ? [copy.youInList] : [])];
  return names.flatMap((n, i) => (i === 0 ? [n] : [i === names.length - 1 ? " and " : ", ", n]));
}

/** S1, S2 and S6's Start, at the head of the table's foot. */
export function StartGame({
  tableId,
  seated,
  waiting,
  again,
}: {
  tableId: string;
  seated: number;
  /** Seats still picking a deck, in seat order: the viewer's own as "you". */
  waiting: readonly { you: boolean; name: string | ThirdPartyName }[];
  /** The device holds a finished game (S6): Start opens setup on its layout and life. */
  again: boolean;
}) {
  if (seated > MAX_SEATS) {
    return (
      <>
        {/* Stays in place, unavailable, so its reason sits where the reader looks for it (S1). */}
        <button type="button" aria-disabled="true" aria-describedby="tracker-too-many" className={`${GO} cursor-default bg-[color:var(--elevated)] text-[color:var(--fg-disabled)] shadow-[inset_0_0_0_1px_var(--border-strong)]`}>
          {PLAY}
          {copy.start}
        </button>
        <p id="tracker-too-many" className="m-0 flex items-start justify-center gap-[8px] text-left text-[13px] leading-[1.5] text-[color:var(--fg-body)]">
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-[2px] flex-none text-[color:var(--fg-muted)]">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M6 6l12 12" />
          </svg>
          <span>
            <b className="font-semibold text-[color:var(--fg)]">{copy.tooManyLead(seated)}</b>
            {copy.tooManyFix}
          </span>
        </p>
      </>
    );
  }
  const sub: string | PersonParts | null = again
    ? copy.again
    : waiting.length === 0
      ? null
      : waiting.length > 1
        ? copy.waitingMany(listNames(waiting))
        : waiting[0].you
          ? copy.waitingYou
          : copy.waiting(waiting[0].name);
  return (
    <>
      <StartLink href={playHref(tableId, again)} label={copy.start} />
      {sub ? (
        <p className="m-0 text-center text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">
          <PersonText text={sub} />
        </p>
      ) : null}
    </>
  );
}
