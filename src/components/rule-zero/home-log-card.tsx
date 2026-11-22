"use client";
// Home's `Game to log` card (log reminder 2b, boards H1 to H3): one card for every game the viewer played at a closed
// table and has not logged, until its week ends (`tableKept`) or they hide it. One game is the Last game card's tiles
// over `Log this game`; two or more are one row per game, newest first, up to four and `Show N more` for the rest. The
// shell is `HomeTableCard`'s. Read per request (`loadHomeLogGames`), never from Home's cached payload.
//
// The ✕ hides that game's reminder for the viewer only. It is optimistic and never revalidates Home (the card is read
// per request, so a refresh already leaves it out); the shared toast carries Undo for as long as it stays.

import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { useRef, useState } from "react";
import { hideLogReminderAction, unhideLogReminderAction } from "../../app/friends/table/actions";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonText, personAttrs } from "../../lib/person-name";
import { logGameHref } from "../../lib/rule-zero/table-view";
import type { HomeLogGame } from "../../lib/social/rule-zero-log-home";
import { gameDay, monthDay } from "../../lib/social/when";
import { ordinal } from "../../lib/tracker/result";
import type { PlaySeat } from "../../lib/tracker/seat";
import { useHydrated } from "../ui/hydrated-art";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { grid, Tile } from "./table-game";
import { ACCENT_BUTTON } from "./setup-sheet";

const copy = ruleZeroCopy.homeLog;
const last = trackerCopy.table;
const DAY_MS = 86_400_000;
/** Up to four rows draw; a fifth game is behind `Show N more` (board H2: four in a week is the realistic top). */
const ROWS = 4;

const keyOf = (g: HomeLogGame) => `${g.tableId}:${g.gameMs}`;
const seatOf = (s: HomeLogGame["seats"][number], i: number): PlaySeat => ({ seat: i, you: s.you, name: s.name, art: s.artCropUri, partnerArt: null, commander: "", partner: null, deck: null });

/** The ✕: bare, a 44px hit box. The ring is a shadow over a transparent outline so forced-colors still shows focus. */
function Hide({ g, onHide, className }: { g: HomeLogGame; onHide: (g: HomeLogGame) => void; className: string }) {
  return (
    <button
      type="button"
      data-testid="home-log-hide"
      {...personAttrs(
        { "aria-label": copy.dismiss(g.podName) },
        `z-[2] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent p-0 text-[color:var(--fg-muted)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--accent)] ${className}`,
      )}
      onClick={() => onHide(g)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function Heading({ g }: { g: HomeLogGame }) {
  const r = g.result;
  if (r.kind === "unknown") return null;
  return r.kind === "draw" ? <>{last.draw}</> : r.kind === "you" ? <>{last.wonYou}</> : <PersonText text={last.won(r.name)} />;
}

function Wash({ games }: { games: HomeLogGame[] }) {
  const art = games.flatMap((g) => g.seats.flatMap((s) => (s.artCropUri ? [s.artCropUri] : []))).slice(0, 4);
  if (art.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[-40px] flex opacity-[.28] [filter:blur(34px)_saturate(1.25)]">
      {art.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- the seats' own art, already requested by the tiles
        <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
      ))}
    </div>
  );
}

const SHELL = "relative flex flex-col gap-[10px] overflow-hidden rounded-[14px] bg-[color:var(--surface-rail)] p-[14px] [border:1px_solid_var(--accent)]";

function One({ g, until, day, onHide }: { g: HomeLogGame; until: string; day: string; onHide: (g: HomeLogGame) => void }) {
  const href = logGameHref({ tableId: g.tableId, viewerDeckId: g.deckId }, g.gameMs);
  const body = copy.body(until);
  return (
    <section
      aria-label={copy.kicker}
      data-testid="home-log-card"
      className={`${SHELL} xl:flex-row xl:items-center xl:gap-[22px] xl:p-[16px_18px]`}
    >
      <Wash games={[g]} />
      <Hide g={g} onHide={onHide} className="absolute right-[4px] top-[4px] xl:static xl:order-last xl:m-[-4px_-8px_-4px_-10px]" />
      <div className="relative flex flex-wrap items-baseline gap-x-[10px] gap-y-[10px] pr-[34px] xl:w-[230px] xl:flex-none xl:flex-col xl:items-start xl:gap-[8px] xl:pr-0">
        <span className="font-mono text-[10.5px] leading-[14px] font-medium uppercase tracking-[.14em] text-[color:var(--accent-text)] xl:order-1">{copy.kicker}</span>
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)] xl:order-3">
          <PersonText text={copy.meta(g.podName, day)} />
        </span>
        <h3 className="m-0 w-full font-display text-[18px] leading-[25px] font-bold text-[color:var(--fg)] xl:order-2"><Heading g={g} /></h3>
      </div>
      <div className="relative flex flex-col gap-[10px] xl:min-w-0 xl:flex-1">
        <div className={`grid gap-[8px] ${grid(g.seats.length)}`}>
          {g.seats.map((s, i) => {
            const first = s.place === 1;
            return (
              <Tile key={i} p={seatOf(s, i)} h={56} className={first ? "shadow-[inset_0_0_0_2px_var(--accent)] [&_img]:opacity-60" : "[&_img]:opacity-40 [&_img]:[filter:grayscale(.6)]"}>
                <em className={`absolute right-[7px] top-[4px] font-display text-[13px] font-bold not-italic [text-shadow:0_1px_4px_rgba(0,0,0,.8)] ${first ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-body)]"}`}>
                  {ordinal(s.place)}
                </em>
              </Tile>
            );
          })}
        </div>
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
          {body.before}
          <b className="font-semibold text-[color:var(--fg)]">{g.deckName}</b>
          {body.after}
        </p>
      </div>
      {href ? (
        <Link href={href} data-testid="home-log-open" className={`${ACCENT_BUTTON} relative w-full no-underline xl:h-[40px] xl:min-h-0 xl:w-auto xl:px-[20px] xl:text-[13.5px]`}>
          {ruleZeroCopy.page.log}
          <PendingReporter href={href} />
        </Link>
      ) : null}
    </section>
  );
}

function Row({ g, utc, lastDay, onHide }: { g: HomeLogGame; utc: boolean; lastDay: boolean; onHide: (g: HomeLogGame) => void }) {
  const href = logGameHref({ tableId: g.tableId, viewerDeckId: g.deckId }, g.gameMs);
  const winner = g.seats.find((s) => s.place === 1) ?? g.seats[0];
  const mine = g.seats.find((s) => s.you);
  const tz = utc ? "UTC" : undefined;
  return (
    <div data-testid="home-log-row" className="flex items-center [border-top:1px_solid_var(--border)]">
      <Link
        href={href ?? "#"}
        {...personAttrs({ "aria-label": copy.rowLabel(g.podName) })}
        className="flex min-h-[68px] min-w-0 flex-1 items-center gap-[12px] py-[10px] pl-[14px] pr-[4px] text-[color:var(--fg)] no-underline"
      >
        <span className="relative h-[40px] w-[40px] flex-none overflow-hidden rounded-[10px] bg-[color:var(--surface-sunken)] shadow-[0_0_0_2px_var(--accent)]">
          {winner?.artCropUri ? (
            // eslint-disable-next-line @next/next/no-img-element -- the winner's own art, already requested by the wash
            <img src={winner.artCropUri} alt="" className="block h-full w-full object-cover" />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px] xl:flex-row xl:items-baseline xl:gap-[14px]">
          <b className="truncate text-[15px] font-semibold xl:w-[150px] xl:flex-none">
            <Heading g={g} />
            {lastDay ? <i className="ml-[8px] font-mono text-[10px] font-medium uppercase tracking-[.1em] text-[color:var(--warning)] not-italic">{copy.lastDay}</i> : null}
          </b>
          <small className="font-mono text-[11px] leading-[1.45] text-[color:var(--fg-faint)] xl:w-[210px] xl:flex-none">
            <PersonText text={copy.meta(g.podName, monthDay(new Date(g.startedAt), tz))} />
          </small>
          <span className="truncate text-[13px] text-[color:var(--fg-body)] xl:flex-1">{copy.placed(g.deckName, ordinal(mine?.place ?? g.seats.length))}</span>
        </span>
        <span className="flex h-[36px] flex-none items-center rounded-[9px] px-[12px] text-[13.5px] font-semibold text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--accent)]">{copy.log}</span>
        <PendingReporter href={href ?? "#"} />
      </Link>
      <Hide g={g} onHide={onHide} className="mr-[4px]" />
    </div>
  );
}

export function HomeLogCard({ games, now }: { games: HomeLogGame[]; now: Date }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);
  const utc = !useHydrated();
  const tz = utc ? "UTC" : undefined;
  const shown = games.filter((g) => !hidden.has(keyOf(g)));

  const flip = (g: HomeLogGame, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.add(keyOf(g));
      else next.delete(keyOf(g));
      return next;
    });
  // The hide each game last sent: Undo waits on it, so its delete can never overtake the insert it undoes.
  const sent = useRef(new Map<string, Promise<boolean>>());
  const send = (g: HomeLogGame, act: typeof hideLogReminderAction) => {
    const p = (sent.current.get(keyOf(g)) ?? Promise.resolve(true)).then(() => act(g.tableId, g.gameMs)).catch(() => false);
    sent.current.set(keyOf(g), p);
    return p;
  };
  const offerUndo = (g: HomeLogGame) =>
    setToast({
      id: ++toastId.current,
      text: copy.hidden(gameDay(new Date(g.until), tz)),
      retry: {
        label: copy.undo,
        run: () => {
          flip(g, false);
          setToast(null);
          void send(g, unhideLogReminderAction).then((ok) => {
            if (ok) return;
            flip(g, true);
            offerUndo(g);
          });
        },
      },
    });
  const hide = (g: HomeLogGame) => {
    flip(g, true);
    offerUndo(g);
    void send(g, hideLogReminderAction).then((ok) => {
      if (ok) return;
      flip(g, false);
      setToast({ id: ++toastId.current, text: copy.hideFailed, retry: { label: ruleZeroCopy.close.retry, run: () => hide(g) } });
    });
  };

  const toastEl = <SocialToast toast={toast} role="status" onDone={() => setToast(null)} />;
  if (shown.length === 0) return toastEl;
  if (shown.length === 1) {
    const g = shown[0];
    return (
      <>
        <One g={g} until={gameDay(new Date(g.until), tz)} day={gameDay(new Date(g.startedAt), tz)} onHide={hide} />
        {toastEl}
      </>
    );
  }
  const drawn = more ? shown : shown.slice(0, ROWS);
  return (
    <>
      <section aria-label={copy.kickerMany(shown.length)} data-testid="home-log-card" className={SHELL}>
        <Wash games={shown.slice(0, 3)} />
        <span className="relative font-mono text-[10.5px] leading-[14px] font-medium uppercase tracking-[.14em] text-[color:var(--accent-text)]">{copy.kickerMany(shown.length)}</span>
        <div className="relative m-[0_-14px_-14px] flex flex-col xl:m-[0_-18px_-16px]">
          {drawn.map((g) => (
            <Row key={keyOf(g)} g={g} utc={utc} lastDay={new Date(g.until).getTime() - now.getTime() <= DAY_MS} onHide={hide} />
          ))}
          {shown.length > drawn.length ? (
            <button type="button" data-testid="home-log-more" onClick={() => setMore(true)} className="min-h-[44px] cursor-pointer border-0 [border-top:1px_solid_var(--border)] bg-transparent px-[14px] text-left font-sans text-[13px] font-medium text-[color:var(--fg-muted)]">
              {copy.more(shown.length - drawn.length)}
            </button>
          ) : null}
        </div>
      </section>
      {toastEl}
    </>
  );
}
