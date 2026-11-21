"use client";

// The result (F11, and S5 for a draw): the winner's art, or the drawn players' art split by an equals mark; everyone
// else out, last first; Log this game, which opens the viewer's deck's Games tab with the saved result filled in;
// and Rematch, same seats. Drawn at 390 only: the tablet shows the same column, centred (READINESS). Under the winner,
// Undo the last change takes a mistaken ending back (addendum U1), or a note says why the ending stays (U3, U4, S4).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { joinNames, PersonName, personAttrs, PersonText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import type { GameLogged } from "../../lib/social/rule-zero-result";
import type { GameState } from "../../lib/tracker/engine";
import { gameLength, ordinal, resultOf } from "../../lib/tracker/result";
import { closesWhen } from "../../lib/social/when";
import { FadingImg } from "../ui/hydrated-art";
import { UndoIcon } from "./icons";
import type { PlaySeat } from "./panel";

const copy = trackerCopy.result;

type Who = string | ThirdPartyName;

/** "Colin and you", "Max, Peter and you": the viewer always last, so "you" never opens a sentence. */
function andList(seats: readonly PlaySeat[]): PersonParts {
  const names: Who[] = [...seats.filter((s) => !s.you).map((s) => s.name), ...(seats.some((s) => s.you) ? ["you"] : [])];
  if (names.length < 2) return names;
  return [...joinNames(names.slice(0, -1)), " and ", names[names.length - 1]];
}

function Art({ src, className }: { src: string | null; className: string }) {
  return src ? (
    <FadingImg src={src} alt="" className={className + " object-cover"} />
  ) : (
    <span aria-hidden className={className + " block bg-[radial-gradient(var(--elevated),var(--surface))]"} />
  );
}

export function Result({
  state,
  seats,
  podName,
  startedAt,
  endedAt,
  saved,
  logHref,
  backHref,
  tablet,
  closed,
  closesAt,
  undo,
  logged,
  onRematch,
}: {
  state: GameState;
  seats: readonly PlaySeat[];
  podName: Who;
  startedAt: number | undefined;
  endedAt: number | undefined;
  saved: "saving" | "saved" | "failed" | null;
  /** The viewer's deck's Games tab for this table; null when there is nowhere to log from. */
  logHref: string | null;
  backHref: string;
  tablet: boolean;
  /** The table closed by its host while the game ran (S4): who closed it ("you", their name, or null when unknown) and when. */
  closed: { by: Who | null; at: number } | null;
  /** The table's 6 am, when it stops logging. */
  closesAt: number;
  /** Undo the last change (U1): the line naming the change that ended the game, and whether a save or an Undo is in flight. */
  undo: { line: PersonParts; busy: boolean; onUndo: () => void } | null;
  /** Who seated logged this game first (U3), from the server; once anyone has, the ending stays. */
  logged: GameLogged | null;
  onRematch: () => void;
}) {
  const r = resultOf(state);
  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const winners = r.winners.map((n) => bySeat.get(n)!);
  const losers = r.out.map((o) => bySeat.get(o.seat)!);
  const draw = winners.length > 1;
  const length = startedAt !== undefined && endedAt !== undefined ? gameLength(endedAt - startedAt) : null;
  const win = winners[0];
  const winLife = state.seats.find((x) => x.seat === win.seat)!.life;

  // The dialog takes focus when it opens, so a keyboard is not left on a panel behind it.
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => dialog.current?.focus(), []);

  // Past the table's 6 am nothing logs from it, so Log this game gives way to a line saying where to log instead.
  const [stopped, setStopped] = useState(() => Date.now() >= closesAt);
  useEffect(() => {
    if (stopped) return;
    const t = setTimeout(() => setStopped(true), Math.max(0, closesAt - Date.now()));
    return () => clearTimeout(t);
  }, [stopped, closesAt]);
  const until = clock(closesAt);
  const closedNote =
    closed === null
      ? null
      : closed.by === "you"
        ? trackerCopy.over.closedByYou(clock(closed.at), until)
        : closed.by === null
          ? trackerCopy.over.closedByUnknown(clock(closed.at), until)
          : trackerCopy.over.closedBy(closed.by, clock(closed.at), until);
  const loggedNote = logged === null ? null : loggedNoteText(logged);
  // Past 6 am one note stands in the slot (U4); before it, a logged game's note takes Undo's place (U3), and a table its
  // host closed keeps its note under either (clarification 7).
  const notes: { icon: "clock" | "check" | "table"; text: string | PersonParts; id: string }[] = stopped
    ? [{ icon: "clock", text: trackerCopy.over.stopped(until), id: "result-stopped-note" }]
    : [
        ...(loggedNote ? [{ icon: "check" as const, text: loggedNote, id: "result-logged-note" }] : []),
        ...(closedNote ? [{ icon: "table" as const, text: closedNote, id: "result-closed-note" }] : []),
      ];
  const offerUndo = undo !== null && !stopped && logged === null;
  // Six seats on the tablet keep the column inside 820px: a shorter hero and tighter out rows (U1-Six-Tablet).
  const six = tablet && seats.length >= 6;
  const live = logHref !== null && !stopped;

  const logCls = "grid min-h-[52px] place-items-center rounded-[10px] bg-[color:var(--accent)] text-[16px] font-semibold text-[color:var(--bg)]";
  const ghost = "min-h-[44px] rounded-[10px] text-[14.5px] text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)]";
  return (
    <div ref={dialog} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label={trackerCopy.over.title} className="absolute inset-0 z-50 overflow-y-auto bg-[color:var(--bg)]" data-testid="tracker-result">
      <div className={"mx-auto flex min-h-full w-full flex-col gap-[14px] px-4 pb-[22px] pt-2 " + (tablet ? "max-w-[472px]" : "max-w-[430px]")}>
        <div className="flex h-11 items-center">
          <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]" data-testid="result-meta">
            <PersonName n={podName} />
            {copy.meta(state.round, length)}
          </span>
          <Link href={backHref} aria-label={copy.close} className="ml-auto grid size-11 place-items-center text-[22px] text-[color:var(--fg)]">
            ✕
          </Link>
        </div>

        <div className={"relative overflow-hidden rounded-[14px] shadow-[inset_0_0_0_2px_var(--accent)] " + (six ? "h-[150px]" : tablet ? "h-[180px]" : "h-[210px]")} data-testid="result-hero">
          {draw ? (
            <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${winners.length}, 1fr)` }}>
              {winners.map((w) => <Art key={w.seat} src={w.art} className="size-full" />)}
            </div>
          ) : (
            <Art src={win.art} className="size-full" />
          )}
          {draw ? (
            <span aria-hidden className="absolute left-1/2 top-[44%] grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--bg)_85%,transparent)] text-[color:var(--accent-text)] shadow-[inset_0_0_0_2px_var(--accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 9h14M5 15h14" /></svg>
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,color-mix(in_srgb,var(--bg)_92%,transparent))] px-4 pb-[14px] pt-10">
            <strong className="block font-display text-[30px] font-bold text-[color:var(--fg)]">
              {draw ? copy.draw : win.you ? copy.youWin : <PersonText text={copy.wins(win.name)} />}
            </strong>
            <small className="block font-mono text-[11.5px] text-[color:var(--fg-body)]">
              <PersonText text={draw ? (r.byHand ? copy.drawHand : copy.drawOut)(andList(winners), r.round) : win.deck === null ? copy.winSubNoDeck(winLife) : copy.winSub(win.deck, winLife)} />
            </small>
          </div>
        </div>

        {offerUndo || notes.length ? (
          <div className="flex flex-col gap-[10px]" data-testid="result-undo-slot">
            {offerUndo ? <UndoRow line={undo.line} busy={undo.busy} onUndo={undo.onUndo} /> : null}
            {notes.map((n) => <Note key={n.id} icon={n.icon} text={n.text} testId={n.id} />)}
          </div>
        ) : null}

        {r.out.length ? (
          <>
            <p className="-mb-1 mt-1 font-mono text-[11px] uppercase tracking-[.06em] text-[color:var(--fg-muted)]">{copy.outKicker}</p>
            <ol className="rounded-[12px] bg-[color:var(--surface)] shadow-[inset_0_0_0_1px_var(--border)]" data-testid="result-out">
              {r.out.map((o, i) => {
                const s = bySeat.get(o.seat)!;
                const from = o.reason?.kind === "commander" ? bySeat.get(o.reason.from) : undefined;
                const how = !o.reason
                  ? copy.outStillIn(o.round)
                  : o.reason.kind === "life"
                    ? copy.outLife(o.round)
                    : o.reason.kind === "poison"
                      ? copy.outPoison(o.round)
                      : copy.outCommander(o.round, (o.reason.cmdr === 1 ? from?.partner : from?.commander) || trackerCopy.sheet.commanderFallback);
                return (
                  <li key={o.seat} className={"flex items-center gap-3 px-3 " + (six ? "py-2 " : "py-[10px] ") + (i ? "border-t border-[color:var(--border)]" : "")}>
                    <Art src={s.art} className={(six ? "h-[34px] w-[52px]" : "h-[38px] w-14") + " shrink-0 rounded-[7px] grayscale-[.7]"} />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[14px] font-semibold text-[color:var(--fg)]">{s.you ? copy.outYou : <PersonName n={s.name} />}</b>
                      <small className="block text-[12px] text-[color:var(--fg-muted)]">{how}</small>
                    </div>
                    <em className="font-display text-[18px] font-bold not-italic text-[color:var(--fg-faint)]">{ordinal(o.place)}</em>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}

        <div className="mt-auto flex flex-col gap-[10px]">
          {live && saved === "saving" ? (
            // Until the result is saved, the Games tab would open blank, so the button waits.
            <span aria-disabled="true" className={logCls + " opacity-60"} data-testid="result-log">
              {copy.log}
            </span>
          ) : live ? (
            <Link href={logHref} className={logCls} data-testid="result-log">
              {copy.log}
            </Link>
          ) : null}
          {live ? <p className="m-0 text-center text-[12.5px] text-[color:var(--fg-muted)]" data-testid="result-log-sub">
            {saved === "failed" ? (
              trackerCopy.over.notSaved
            ) : draw ? (
              <PersonText text={copy.logDraw(andList(winners), losers.length ? andList(losers) : null)} />
            ) : win.you ? (
              copy.logWinYou
            ) : (
              <PersonText text={copy.logWin(win.name)} />
            )}
          </p> : null}
          {stopped ? null : (
            <button type="button" onClick={onRematch} className={ghost} data-testid="result-rematch">
              {copy.rematch}
            </button>
          )}
          <Link href={backHref} className={ghost + " grid place-items-center"} data-testid="result-back">
            {closed || stopped ? trackerCopy.over.backFriends : trackerCopy.over.back}
          </Link>
        </div>
      </div>
    </div>
  );
}

// "6 am", not "6:00 am": the tracker runs in the reader's browser, so the times are the reader's own zone.
const clock = (ms: number) => closesWhen(new Date(ms), new Date(ms)).replace(":00 ", " ");

/** U3's note: who logged the game first, so its ending stays. The Result and the Last game card (U5) both draw it. */
export function loggedNoteText(logged: GameLogged): string | PersonParts {
  const at = clock(logged.at.getTime());
  return logged.you ? trackerCopy.undo.loggedYou(at) : logged.name === null ? trackerCopy.undo.loggedUnknown(at) : trackerCopy.undo.loggedBy(logged.name, at);
}

/** Undo the last change (U1): a full-width row, the arrow in its circle, the label over the line naming the change. While
 *  the result saves or the Undo is in flight it waits, as Log does (clarifications 3 and 4). */
export function UndoRow({ line, busy, onUndo, sunken = false }: { line: PersonParts; busy: boolean; onUndo: () => void; sunken?: boolean }) {
  return (
    <button
      type="button"
      aria-disabled={busy || undefined}
      onClick={() => (busy ? undefined : onUndo())}
      {...personAttrs(
        { "aria-label": trackerCopy.undo.aria(line) },
        "flex min-h-[60px] w-full items-center gap-3 rounded-[12px] py-2 pl-2 pr-[14px] text-left text-[color:var(--fg)] shadow-[inset_0_0_0_1px_var(--border-strong)] " +
          (sunken ? "bg-[color:var(--surface-sunken)] " : "bg-[color:var(--surface)] ") +
          (busy ? "cursor-default opacity-60" : "cursor-pointer"),
      )}
      data-testid="result-undo"
    >
      <span className="grid size-11 flex-none place-items-center rounded-full bg-[color:var(--elevated)] text-[color:var(--fg-body)] shadow-[inset_0_0_0_1px_var(--border-strong)]">
        <UndoIcon size={22} />
      </span>
      <span className="min-w-0">
        <b className="block text-[15px] font-semibold">{trackerCopy.undo.label}</b>
        <small className="mt-[2px] block font-mono text-[11.5px] text-[color:var(--fg-muted)]">
          <PersonText text={line} />
        </small>
      </span>
    </button>
  );
}

const NOTE_ICON = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.5" /></>,
  table: <><ellipse cx="12" cy="12" rx="9" ry="5" /><path d="M8 20l1-3M16 20l-1-3" /></>,
};

/** The note in Undo's slot saying why the ending stays (U3, U4) or that the host closed the table (S4). */
export function Note({ icon, text, testId }: { icon: keyof typeof NOTE_ICON; text: string | PersonParts; testId: string }) {
  return (
    <div className="flex items-start gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] px-3 py-[10px] text-[13px] leading-[1.5] text-[color:var(--fg-body)] shadow-[inset_0_0_0_1px_var(--border)]" data-testid={testId}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[2px] flex-none text-[color:var(--fg-muted)]">
        {NOTE_ICON[icon]}
      </svg>
      <span>{typeof text === "string" ? text : <PersonText text={text} />}</span>
    </div>
  );
}
