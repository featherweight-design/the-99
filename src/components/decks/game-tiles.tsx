"use client";
// How it's playing — one tile per mark, never per game (handoff games tabs, PR 2). Replaces the Fix and Keep buckets.
// Hurting first, then Both ways, then Helping. Each tile draws the mark's last ten games as dots, oldest first.

import { useState } from "react";
import type { AxisMark, AxisTally, GameSummary } from "../../lib/decks/games";
import { deriveHeadline } from "../../lib/decks/game-headline";
import { deckTuningGamesCopy } from "../../lib/copy/deck-tuning-games";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { GameBox } from "./game-boxes";

const copy = gameLogCopy.tiles;
/** The phone draws this many tiles before "Show N more". */
const PHONE_TILES = 4;
/** How far back the lead's second clause looks. */
const LAST_FEW = 5;

type Status = "hurting" | "both" | "helping";

/** Hurting first, then Both ways, then Helping: each group already strongest first. */
function tilesOf(summary: GameSummary): { tally: AxisTally; status: Status }[] {
  return [
    ...summary.fix.map((tally) => ({ tally, status: "hurting" as const })),
    ...summary.mixed.map((tally) => ({ tally, status: "both" as const })),
    ...summary.keep.map((tally) => ({ tally, status: "helping" as const })),
  ];
}

// Below PATTERN_MIN no tile takes status ink: two games are not a pattern. The dots stay, in the neutral ink.
const DOT_INK: Record<Status, string> = {
  hurting: "bg-warning",
  helping: "bg-success",
  both: "bg-fg-faint",
};
const BOTH_DOT = "[background:linear-gradient(90deg,var(--warning)_50%,var(--success)_50%)]";

function StatusDot({ status, patterned }: { status: Status; patterned: boolean }) {
  const ink = !patterned ? "bg-fg-faint" : status === "both" ? BOTH_DOT : DOT_INK[status];
  return <span aria-hidden className={`inline-block h-[8px] w-[8px] flex-none rounded-full ${ink}`} />;
}

function markInk(mark: AxisMark, patterned: boolean): string {
  if (mark === null) return "border border-border-strong";
  if (!patterned) return "bg-fg-faint";
  return mark === "worked" ? "bg-success" : "bg-warning";
}

function Dots({ marks, patterned }: { marks: AxisMark[]; patterned: boolean }) {
  return (
    <span aria-hidden data-dots className="flex flex-none items-center gap-[4px]">
      {marks.map((m, i) => (
        <span key={i} data-mark={m ?? "none"} className={`inline-block h-[8px] w-[8px] rounded-full ${markInk(m, patterned)}`} />
      ))}
    </span>
  );
}

function countText(tally: AxisTally, status: Status, count: number): string {
  if (count === 1) return tally.worked === 1 ? gameLogCopy.cell.figureOneUp : gameLogCopy.cell.figureOneDown;
  if (status === "hurting") return copy.down(String(tally.hurt), String(count));
  if (status === "helping") return copy.up(String(tally.worked), String(count));
  return gameLogCopy.cell.sub(String(tally.worked), String(tally.hurt));
}

function countInk(status: Status, patterned: boolean): string {
  if (!patterned || status === "both") return "text-fg-body";
  return status === "hurting" ? "text-warning" : "text-success";
}

function Tile({ tally, status, count, hiddenOnPhone }: { tally: AxisTally; status: Status; count: number; hiddenOnPhone: boolean }) {
  const patterned = count >= PATTERN_MIN;
  return (
    <li data-tile={tally.key} data-status={status} className={`${hiddenOnPhone ? "hidden md:block" : ""} min-w-0 rounded-[9px] border border-border bg-surface px-[12px] py-[10px]`}>
      <div className="flex min-w-0 items-center gap-[8px]">
        <StatusDot status={status} patterned={patterned} />
        <span className="truncate text-[13px] text-fg">{axisCopy[tally.key].label}</span>
      </div>
      <div className="mt-[8px] flex flex-col gap-[6px] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-[8px]">
        <Dots marks={tally.recent} patterned={patterned} />
        <span className={`whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums ${countInk(status, patterned)}`}>
          {countText(tally, status, count)}
        </span>
      </div>
    </li>
  );
}

/** The lead's second line: the strongest reading's own count, and its last five. Only once there is a pattern to state. */
function leadLine(summary: GameSummary): string | null {
  const count = String(summary.count);
  const worst = summary.fix[0];
  const best = summary.keep[0];
  const lead = worst ?? best;
  if (!lead || summary.count < PATTERN_MIN) return null;
  const hurting = worst !== undefined;
  const last = lead.recent.slice(-LAST_FEW);
  const recent = String(last.filter((m) => m === (hurting ? "hurt" : "worked")).length);
  const total = String(hurting ? lead.hurt : lead.worked);
  if (summary.count <= LAST_FEW) return hurting ? copy.leadHurt(total, count) : copy.leadHelp(total, count);
  return hurting
    ? copy.leadHurtRecent(total, count, recent, String(last.length))
    : copy.leadHelpRecent(total, count, recent, String(last.length));
}

function Key({ patterned }: { patterned: boolean }) {
  const swatch = "inline-block h-[8px] w-[8px] rounded-full";
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-[14px] gap-y-[4px] font-mono text-[10.5px] text-fg-faint">
      <span className="inline-flex items-center gap-[6px]"><span aria-hidden className={`${swatch} ${patterned ? "bg-success" : "bg-fg-faint"}`} />{copy.keyHelped}</span>
      <span className="inline-flex items-center gap-[6px]"><span aria-hidden className={`${swatch} ${patterned ? "bg-warning" : "bg-fg-faint"}`} />{copy.keyHurt}</span>
      <span className="inline-flex items-center gap-[6px]"><span aria-hidden className={`${swatch} border border-border-strong`} />{copy.keyNone}</span>
      <span className="text-fg-locked">{copy.keyNote}</span>
    </p>
  );
}

export function GameTiles({ summary, tuned = false, onOpenTuning }: { summary: GameSummary; tuned?: boolean; onOpenTuning?: () => void }) {
  const [open, setOpen] = useState(false);
  // Case 4 of the ladder: games logged, no mark ever made. There is nothing to read, so no box.
  if (summary.axes.length === 0) return null;
  const tiles = tilesOf(summary);
  const headline = deriveHeadline(summary);
  const line = leadLine(summary) ?? (summary.count < PATTERN_MIN ? headline?.sub : null);
  const patterned = summary.count >= PATTERN_MIN;
  const extra = tiles.length - PHONE_TILES;
  return (
    <GameBox title={copy.title}>
      <div data-games-tiles className="px-[14px] py-[14px] md:px-[16px] md:py-[16px]">
        {headline ? (
          <div className="mb-[12px]">
            <p className="m-0 font-display text-[16px] font-semibold leading-[1.3] text-fg md:text-[18px]">{headline.heading}</p>
            {line ? <p className="m-0 mt-[4px] text-[13px] leading-[1.5] text-fg-body">{line}</p> : null}
          </div>
        ) : null}
        <ul aria-label={copy.title} className="m-0 grid list-none grid-cols-2 gap-[8px] p-0 md:grid-cols-4 md:gap-[10px]">
          {tiles.map((t, i) => (
            <Tile key={t.tally.key} tally={t.tally} status={t.status} count={summary.count} hiddenOnPhone={!open && i >= PHONE_TILES} />
          ))}
        </ul>
        {extra > 0 ? (
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-[10px] flex min-h-[44px] w-full items-center justify-center rounded-[8px] border border-border font-mono text-[11px] text-fg-body md:hidden">
            {open ? copy.showFewer : copy.showMore(String(extra))}
          </button>
        ) : null}
        <div className="mt-[14px]">
          <Key patterned={patterned} />
        </div>
      </div>
      {tuned && onOpenTuning ? (
        <p data-games-pointer className="m-0 flex min-h-[44px] flex-wrap items-center gap-x-[6px] px-[14px] text-[13px] leading-[1.5] text-fg-body [border-top:1px_solid_var(--border)] md:px-[16px]">
          {deckTuningGamesCopy.gamesLine.lead}{" "}
          <button type="button" onClick={onOpenTuning} className="font-semibold text-[color:var(--accent-text)] hover:underline">
            {deckTuningGamesCopy.gamesLine.link}
          </button>
        </p>
      ) : null}
    </GameBox>
  );
}
