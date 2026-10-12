"use client";

// "Brackets and colors" (handoff R2 SpreadCard). Nine bracket rows, `1 · 1–2 · 2 … 5`, each led by the shipped
// bracket mark (a range shows both, the upper at `DIM_OPACITY`), with a named chip per deck; then not analyzed,
// with dashed chips. Each deck sits where its own tile's bracket says (lock 2). Decks per color: the shipped
// mana symbol as the key, untinted, and a bar with ONE FIXED SEGMENT PER DECK in lineup order, lit for each deck
// that plays the color, so a deck's segment sits in the same place on every row (the table's correction of the
// canvas, which lit the first N).

import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import type { Spread } from "../../../lib/lineup/figures";
import type { LineupDeck } from "../../../lib/lineup/types";
import { BracketMark } from "../bracket-mark";
import { PIP_STYLE } from "../mana-color-parts";
import { DeckName } from "./deck-link";

const copy = decksStatsCopy.spread;
const ROW = "grid grid-cols-[56px_minmax(0,1fr)_18px] items-start gap-[10px] md:grid-cols-[88px_minmax(0,1fr)_24px]";
/** Every cell of a row takes the first chip's height, so a wrapped row reads as one row. */
const CELL = "flex h-[34px] items-center md:h-[30px]";

function Chip({ deck, dashed, chosen }: { deck: LineupDeck; dashed: boolean; chosen: boolean }) {
  const note = deck.bracket?.answered ? copy.declared(deck.bracket.answered) : deck.identity.length === 0 ? copy.colorless : null;
  return (
    <span
      data-stats-chip={deck.id}
      className={`inline-flex min-h-[34px] max-w-full items-center gap-[7px] rounded-[8px] pr-[10px] pl-[6px] md:min-h-[30px] ${chosen ? "border border-[color:var(--accent)]" : dashed ? "border border-dashed border-[color:var(--border-dashed)]" : "border border-[color:var(--border-strong)]"} ${dashed ? "" : "bg-[var(--surface)]"}`}
    >
      <DeckName id={deck.id} name={deck.name} identity={deck.identity} small accent={chosen} />
      {note ? <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{note}</span> : null}
    </span>
  );
}

export function SpreadBody({ s, decks, chosenId }: { s: Spread; decks: readonly LineupDeck[]; chosenId: string | null }) {
  return (
    <>
      <span className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.axis}</span>
      <div className="flex flex-col">
        {s.slots.map((slot) => {
          const range = slot.brackets.length === 2;
          const has = slot.decks.length > 0;
          return (
            <div
              key={slot.label}
              data-stats-slot={slot.label}
              className={`${ROW} min-h-[30px] ${has ? "py-[6px]" : "py-[1px]"} ${range ? `border-b border-dashed border-b-[color:var(--border)] ${has ? "bg-[var(--surface-rail)]" : ""}` : "border-b border-b-[color:var(--border)]"}`}
            >
              <span
                role="img"
                aria-label={copy.bracketAria(slot.brackets[0], range ? slot.brackets[1]! : null)}
                className={`flex items-center ${has ? "h-[34px] md:h-[30px]" : "h-[28px]"}`}
              >
                <BracketMark bracket={slot.brackets[0]} px={26} />
                {range ? <span className="-ml-[5px] inline-flex"><BracketMark bracket={slot.brackets[1]!} px={26} dim /></span> : null}
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-[6px]">
                {has ? slot.decks.map((d) => <Chip key={d.id} deck={d} dashed={false} chosen={d.id === chosenId} />) : <span className="font-mono text-[10.5px] text-[color:var(--fg-locked)]">{copy.none}</span>}
              </div>
              <span className={`${has ? CELL : "flex h-[28px] items-center"} justify-end font-mono text-[11px] text-[color:var(--fg-muted)]`}>{has ? slot.decks.length : ""}</span>
            </div>
          );
        })}
        <div data-stats-slot="not-analyzed" className={`${ROW} mt-[6px] min-h-[44px] pt-[9px] pb-[4px]`}>
          <span className={`${CELL} font-mono text-[10px] leading-[1.3] text-[color:var(--fg-muted)]`}>{copy.notAnalyzed}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-[6px]">
            {s.notAnalyzed.length > 0 ? s.notAnalyzed.map((d) => <Chip key={d.id} deck={d} dashed chosen={d.id === chosenId} />) : <span className="font-mono text-[10.5px] text-[color:var(--fg-locked)]">{copy.none}</span>}
          </div>
          <span className={`${CELL} justify-end font-mono text-[11px] text-[color:var(--fg-muted)]`}>{s.notAnalyzed.length || ""}</span>
        </div>
      </div>
      {s.analyzed === 0 ? <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.noneAnalyzed}</span> : null}
      <div className="flex flex-col gap-[7px] border-t border-t-[color:var(--border)] pt-[12px]">
        <span className="pb-[2px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.colorsHead}</span>
        {s.colors.map(({ color, decks: playing }) => {
          const lit = new Set(playing.map((d) => d.id));
          return (
            <div key={color} data-stats-color={color} className="grid min-h-[28px] grid-cols-[24px_minmax(0,1fr)_52px] items-center gap-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- the shipped symbol, drawn as itself and untinted */}
              <img src={`/mana/${color}.svg`} alt={copy.colorName[color]} width={22} height={22} className="block h-[22px] w-[22px]" />
              <div aria-hidden="true" className="flex h-[12px] gap-[2px]">
                {decks.map((d, j) => (
                  <span
                    key={d.id}
                    data-lit={lit.has(d.id) || undefined}
                    className={`h-full min-w-0 flex-1 ${j === 0 ? "rounded-l-[3px]" : ""} ${j === decks.length - 1 ? "rounded-r-[3px]" : ""}`}
                    style={{
                      background: lit.has(d.id) ? PIP_STYLE[color].bg : "var(--elevated)",
                      // The chosen deck's segment, ringed in accent on every row it sits on.
                      boxShadow: d.id === chosenId ? "inset 0 0 0 2px var(--accent)" : undefined,
                    }}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap text-right font-mono text-[12px] text-[color:var(--fg)]">{copy.nOf(playing.length, decks.length)}</span>
            </div>
          );
        })}
        <span className="pt-[4px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.sizeLine(s.sizes)}</span>
      </div>
    </>
  );
}
