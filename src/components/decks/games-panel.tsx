"use client";
// GamesPanel — the Games view's body: headline, aggregate, form, history.
// A peer of the decklist and Consider rather than a drawer beside them, so it
// owns its own vertical rhythm and does not inherit the decklist's.

import { useState } from "react";
import type { AxisTally, DeckGame, GameSummary } from "../../lib/decks/games";
import { deriveHeadline } from "../../lib/decks/game-headline";
import { GameAxisCell } from "./game-axis-cell";
import { GameLogForm, type GameResult } from "./game-log-form";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  games: DeckGame[];
  summary: GameSummary;
}

// The record the save just produced. The summary in hand is the pre-save one
// until the route revalidates, so the announcement counts the new game itself
// rather than reading a figure that has not caught up yet.
function recordAfter(record: GameSummary["record"], result: GameResult): string {
  const wins = record.wins + (result === "win" ? 1 : 0);
  const losses = record.losses + (result === "loss" ? 1 : 0);
  const draws = record.draws + (result === "draw" ? 1 : 0);
  return draws > 0
    ? gameLogCopy.headline.recordWithDraws(String(wins), String(losses), String(draws))
    : gameLogCopy.headline.record(String(wins), String(losses));
}

const BUCKET_HEADING ="font-mono uppercase text-[10px] tracking-[0.14em]";

function Bucket({
  heading,
  gloss,
  colour,
  tallies,
  gameCount,
}: {
  heading: string;
  gloss: string;
  colour: string;
  tallies: AxisTally[];
  gameCount: number;
}) {
  if (tallies.length === 0) return null;
  return (
    <section className="mb-[16px] md:mb-[24px]">
      <div className="flex items-baseline gap-[8px]">
        {/* Below PATTERN_MIN the heading is named but neutral — see LOW-N-summary. */}
        <h4
          className={BUCKET_HEADING}
          style={{ color: gameCount >= PATTERN_MIN ? colour : "var(--fg-faint)" }}
        >
          {heading}
        </h4>
        <span className="font-mono text-[10px] text-[color:var(--fg-locked)]">{gloss}</span>
      </div>
      <div className="flex flex-wrap gap-[6px] md:gap-[8px] mt-[8px]">
        {tallies.map((t) => (
          <GameAxisCell key={t.key} tally={t} gameCount={gameCount} />
        ))}
      </div>
    </section>
  );
}

// One clause per mixed axis, joined into the single sentence the copy module
// closes with. Each clause carries its own two counts, so a run of three mixed
// axes still reads as three separate readings rather than one blurred one.
function mixedSentence(mixed: AxisTally[]): string {
  if (mixed.length === 1) {
    const t = mixed[0];
    return gameLogCopy.buckets.mixedLine(axisCopy[t.key].label, String(t.worked), String(t.hurt));
  }
  const clauses = mixed
    .map((t) => `${axisCopy[t.key].label} — ${t.worked} up, ${t.hurt} down.`)
    .join(" ");
  return gameLogCopy.buckets.mixedLineMulti(clauses);
}

export function GamesPanel({ deckId, games, summary }: GamesPanelProps) {
  const headline = deriveHeadline(summary);
  const [announcement, setAnnouncement] = useState("");

  return (
    <section className="px-[16px] py-[14px] md:px-[30px] md:py-[20px]">
      {headline && (
        <header className="mb-[14px] md:mb-[20px]">
          <h3 className="font-display text-[20px] md:text-[26px] leading-[1.2] text-[color:var(--fg)]">
            {headline.heading}
            {/* N=1 only. At N>=2 the record is a clause inside the sub-line, so
                a span here would print it twice. */}
            {headline.record && (
              <>
                {" "}
                <span className="font-mono text-[13px] tabular-nums text-[color:var(--accent)]">
                  {headline.record}
                </span>
              </>
            )}
          </h3>
          {headline.sub && (
            <p className="mt-[6px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
              {headline.sub}
            </p>
          )}
        </header>
      )}
      {summary.count === 1 ? (
        <section className="mb-[16px] md:mb-[24px]">
          <h4 className={BUCKET_HEADING} style={{ color: "var(--fg-faint)" }}>
            {gameLogCopy.buckets.oneGameHeading}
          </h4>
          <p className="font-mono text-[10px] text-[color:var(--fg-locked)] mt-[2px]">
            {gameLogCopy.buckets.oneGameNote}
          </p>
          <div className="flex flex-wrap gap-[6px] md:gap-[8px] mt-[8px]">
            {summary.axes.map((t) => (
              <GameAxisCell key={t.key} tally={t} gameCount={summary.count} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <Bucket
            heading={gameLogCopy.buckets.fix}
            gloss={gameLogCopy.buckets.fixNote}
            colour="var(--warning)"
            tallies={summary.fix}
            gameCount={summary.count}
          />
          <Bucket
            heading={gameLogCopy.buckets.keep}
            gloss={gameLogCopy.buckets.keepNote}
            colour="var(--success)"
            tallies={summary.keep}
            gameCount={summary.count}
          />
          {summary.mixed.length > 0 && (
            <div className="pt-[10px] mb-[16px] md:mb-[24px] border-t border-[color:var(--border)]">
              <span className={BUCKET_HEADING} style={{ color: "var(--fg-faint)" }}>
                {gameLogCopy.buckets.mixed}
              </span>{" "}
              <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">
                {mixedSentence(summary.mixed)}
              </span>
            </div>
          )}
        </>
      )}
      <GameLogForm
        deckId={deckId}
        isFirstGame={games.length === 0}
        onAnnounce={setAnnouncement}
        onSaved={(isFirst, result) =>
          setAnnouncement(
            isFirst
              ? gameLogCopy.announce.savedFirst
              : gameLogCopy.announce.saved(recordAfter(summary.record, result)),
          )
        }
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <h2 className="mt-[18px] md:mt-[24px] font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[color:var(--fg-faint)]">
        {gameLogCopy.history.heading}
      </h2>
      <ul>
        {games.map((g) => (
          <li key={g.id}>{g.result}</li>
        ))}
      </ul>
    </section>
  );
}
