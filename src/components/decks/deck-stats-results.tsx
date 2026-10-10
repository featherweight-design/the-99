"use client";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { formatPlayed, formatShortDeckDate } from "../../lib/decks/format";
import { recordText, type ResultsStats } from "../../lib/decks/stats-results";
import type { GameResult } from "../../lib/decks/stats";
import { Shell } from "./deck-stats-shell";

// Win is the canvas brass, loss an outline, draw a half fill; the letter is what carries it in greyscale.
const BEAD: Record<GameResult, { bg: string; border: string; ink: string }> = {
  win: { bg: "var(--result-win)", border: "var(--result-win)", ink: "var(--pip-ink-dark)" },
  loss: { bg: "transparent", border: "var(--fg-muted)", ink: "var(--fg-body)" },
  draw: { bg: "linear-gradient(135deg, var(--border-strong) 0 50%, transparent 50% 100%)", border: "var(--fg-muted)", ink: "var(--fg)" },
};

function Bead({ result, className }: { result: GameResult; className: string }) {
  const b = BEAD[result];
  return (
    <span
      aria-hidden="true"
      data-result-bead={result}
      className={`box-border flex flex-none items-center justify-center border font-mono font-semibold ${className}`}
      style={{ background: b.bg, borderColor: b.border, color: b.ink }}
    >
      {deckStatsCopy.results.letters[result]}
    </span>
  );
}

const LINK = "border-b border-b-[color:color-mix(in_oklab,var(--accent)_45%,transparent)] font-mono text-[11px] text-[color:var(--accent)]";

export function ResultsCard({ results, onLogGame }: { results: ResultsStats; onLogGame?: () => void }) {
  const copy = deckStatsCopy.results;
  const title = deckStatsCopy.cards.results;
  const empty = results.games === 0;
  const denom = empty ? copy.denomNone : copy.denom(results.games);
  const { record, span, beads, lastFive, versions } = results;

  return (
    <Shell title={title} id="results" denom={denom} label={`${title}, ${denom}`}>
      {empty ? (
        <div className="flex flex-col items-start gap-[8px] pb-[4px] pt-[6px]" data-results-empty>
          <div aria-hidden="true" className="flex gap-[6px]">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="box-border size-[30px] rounded-[5px] border border-dashed border-[color:var(--border-dashed)] md:size-[28px]" />
            ))}
          </div>
          <span className="text-[14px] text-[color:var(--fg-body)]">{copy.emptyHead}</span>
          <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)] [text-wrap:pretty]">{copy.emptyBody}</span>
          <button type="button" onClick={onLogGame} className="flex min-h-[44px] items-center md:min-h-[28px]">
            <span className={LINK}>{copy.emptyLink}</span>
            <span aria-hidden="true" className="ml-[8px] text-[12px] text-[color:var(--fg-muted)]">⟶</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-[16px] gap-y-[6px]">
            <span data-results-record className="font-mono text-[34px] font-semibold leading-none text-[color:var(--fg)]">{recordText(record)}</span>
            <div className="flex flex-col gap-[2px] pb-[2px]">
              <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.recordKey}</span>
              <span className="text-[12.5px] text-[color:var(--fg-body)]">
                {span ? copy.span(results.games, formatPlayed(span.from), formatPlayed(span.to)) : null}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.every}</span>
            <ol aria-label={copy.every} className="flex flex-wrap gap-[6px]" data-results-beads>
              {beads.map((b, i) => (
                <li key={i} data-result-last-five={b.lastFive ? "true" : undefined} className="flex flex-col items-center gap-[4px]">
                  <Bead result={b.result} className="size-[30px] rounded-[5px] text-[11.5px] md:size-[28px]" />
                  <span aria-hidden="true" className="h-[2px] w-full" style={{ background: b.lastFive ? "var(--fg-muted)" : "transparent" }} />
                  <span aria-hidden="true" className="whitespace-nowrap font-mono text-[9px] text-[color:var(--fg-muted)]">{formatPlayed(b.playedAt)}</span>
                  <span className="sr-only">{copy.bead(copy.words[b.result], formatPlayed(b.playedAt))}</span>
                </li>
              ))}
            </ol>
            <span data-results-trend className="text-[12.5px] text-[color:var(--fg-body)]">
              {lastFive ? copy.lastFive(recordText(lastFive)) : copy.lastFiveSoon}
            </span>
          </div>
          {versions ? (
            <div className="flex flex-col" data-results-versions>
              <span className="pb-[6px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.byVersion}</span>
              <ul>
                {versions.map((v) => {
                  const name = v.number === null ? copy.unrecorded : `v${v.number}`;
                  const sub = v.committedAt ? formatShortDeckDate(v.committedAt) : "";
                  return (
                    <li
                      key={v.key}
                      data-result-version={v.key}
                      className="grid min-h-[34px] grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-[10px] border-t border-t-[color:var(--border)] py-[4px] md:grid-cols-[160px_minmax(0,1fr)_auto]"
                    >
                      <span className="flex flex-col">
                        <span className={`text-[13px] ${v.number === null ? "italic text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}>{name}</span>
                        {v.current || sub ? (
                          <span className="font-mono text-[9.5px] text-[color:var(--fg-muted)]">{v.current ? `${copy.current} · ${sub}` : sub}</span>
                        ) : null}
                      </span>
                      <div className="flex flex-wrap items-center gap-[4px]">
                        {v.beads.map((r, i) => (
                          <Bead key={i} result={r} className="size-[16px] rounded-[3px] text-[9px]" />
                        ))}
                        {v.record ? (
                          <span className="sr-only">{v.beads.map((r) => copy.words[r]).join(", ")}</span>
                        ) : (
                          <span className="text-[11.5px] text-[color:var(--fg-faint)]">{copy.noGames}</span>
                        )}
                      </div>
                      <span className="font-mono text-[12px] text-[color:var(--fg)]">{v.record ? recordText(v.record) : null}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </Shell>
  );
}
