"use client";

// The result (F11, and S5 for a draw): the winner's art, or the drawn players' art split by an equals mark; everyone
// else out, last first; Log this game, which opens the viewer's deck's Games tab with the saved result filled in;
// and Rematch, same seats. Drawn at 390 only: the tablet shows the same column, centred (READINESS).

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackerCopy } from "../../lib/copy/tracker";
import { joinNames, PersonName, PersonText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import type { GameState } from "../../lib/tracker/engine";
import { gameLength, ordinal, resultOf } from "../../lib/tracker/result";
import { FadingImg } from "../ui/hydrated-art";
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

        <div className={"relative overflow-hidden rounded-[14px] shadow-[inset_0_0_0_2px_var(--accent)] " + (tablet ? "h-[180px]" : "h-[210px]")} data-testid="result-hero">
          {draw ? (
            <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${winners.length}, 1fr)` }}>
              {winners.map((w) => <Art key={w.seat} src={w.art} className="size-full" />)}
            </div>
          ) : (
            <Art src={win.art} className="size-full" />
          )}
          {draw ? (
            <span aria-hidden className="absolute left-1/2 top-[44%] grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--bg)_85%,transparent)] text-[color:var(--accent)] shadow-[inset_0_0_0_2px_var(--accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 9h14M5 15h14" /></svg>
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,color-mix(in_srgb,var(--bg)_92%,transparent))] px-4 pb-[14px] pt-10">
            <strong className="block font-display text-[30px] font-bold text-[color:var(--fg)]">
              {draw ? copy.draw : win.you ? copy.youWin : <PersonText text={copy.wins(win.name)} />}
            </strong>
            <small className="block font-mono text-[11.5px] text-[color:var(--fg-body)]">
              <PersonText text={draw ? (r.byHand ? copy.drawHand : copy.drawOut)(andList(winners), r.round) : copy.winSub(win.deck, winLife)} />
            </small>
          </div>
        </div>

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
                      : copy.outCommander(o.round, (o.reason.cmdr === 1 ? from?.partner : from?.commander) ?? "");
                return (
                  <li key={o.seat} className={"flex items-center gap-3 px-3 py-[10px] " + (i ? "border-t border-[color:var(--border)]" : "")}>
                    <Art src={s.art} className="h-[38px] w-14 shrink-0 rounded-[7px] grayscale-[.7]" />
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
          {logHref && saved === "saving" ? (
            // Until the result is saved, the Games tab would open blank, so the button waits.
            <span aria-disabled="true" className={logCls + " opacity-60"} data-testid="result-log">
              {copy.log}
            </span>
          ) : logHref ? (
            <Link href={logHref} className={logCls} data-testid="result-log">
              {copy.log}
            </Link>
          ) : null}
          <p className="m-0 text-center text-[12.5px] text-[color:var(--fg-muted)]" data-testid="result-log-sub">
            {saved === "failed" ? (
              trackerCopy.over.notSaved
            ) : draw ? (
              <PersonText text={copy.logDraw(andList(winners), losers.length ? andList(losers) : null)} />
            ) : win.you ? (
              copy.logWinYou
            ) : (
              <PersonText text={copy.logWin(win.name)} />
            )}
          </p>
          <button type="button" onClick={onRematch} className={ghost} data-testid="result-rematch">
            {copy.rematch}
          </button>
          <Link href={backHref} className={ghost + " grid place-items-center"}>
            {trackerCopy.over.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
