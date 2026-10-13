"use client";
// GamesPanel — the Games view's body: headline, aggregate, form, history.
// A peer of the decklist and Consider rather than a drawer beside them, so it
// owns its own vertical rhythm and does not inherit the decklist's.

import { useRef, useState } from "react";
import type { AxisTally, DeckGame, GameSummary } from "../../lib/decks/games";
import { deriveHeadline, type Headline } from "../../lib/decks/game-headline";
import { GameAxisCell } from "./game-axis-cell";
import { GameHistoryRow } from "./game-history-row";
import { GameLogForm, type GameResult } from "./game-log-form";
import { deckTuningGamesCopy } from "../../lib/copy/deck-tuning-games";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  games: DeckGame[];
  summary: GameSummary;
  /** Suggested changes is on this deck: the Analysis tab exists and holds a reading. */
  tuned?: boolean;
  /** Presses the Analysis tab, for the pointer line. */
  onOpenAnalysis?: () => void;
}

type GameRecord = GameSummary["record"];

// The record a mutation just produced. The summary in hand is the pre-mutation
// one until the route revalidates, so the announcement counts the game itself
// rather than reading a figure that has not caught up yet.
function recordShifted(record: GameRecord, result: GameResult, delta: 1 | -1): GameRecord {
  return {
    wins: record.wins + (result === "win" ? delta : 0),
    losses: record.losses + (result === "loss" ? delta : 0),
    draws: record.draws + (result === "draw" ? delta : 0),
  };
}

function recordSaid(record: GameRecord): string {
  return record.draws > 0
    ? gameLogCopy.headline.recordWithDraws(
        String(record.wins),
        String(record.losses),
        String(record.draws),
      )
    : gameLogCopy.headline.record(String(record.wins), String(record.losses));
}

const recordKey = (record: GameRecord) => `${record.wins}-${record.losses}-${record.draws}`;

const BUCKET_HEADING = "font-mono uppercase text-[10px] tracking-[0.14em]";
const CELL_STRIP = "flex flex-col md:flex-row md:flex-wrap gap-[6px] md:gap-[12px]";

// The sub-line's record figure and denominator carry their own ink, but the
// sentence around them is one string from the copy module. Splitting on the two
// substrings keeps the wording there rather than reassembling it here.
function subFragments(
  text: string,
  emphasis: Headline["subEmphasis"],
): { text: string; ink: string | null }[] {
  if (!emphasis) return [{ text, ink: null }];
  const found = (
    [
      [emphasis.denominator, "font-semibold text-fg"],
      [emphasis.record, "font-mono text-[12px] md:text-[13px] tabular-nums text-accent"],
    ] as const
  )
    .map(([value, ink]) => ({ value, ink, at: text.indexOf(value) }))
    .filter((m) => m.value.length > 0 && m.at >= 0)
    .sort((a, b) => a.at - b.at);

  const out: { text: string; ink: string | null }[] = [];
  let cursor = 0;
  for (const m of found) {
    if (m.at < cursor) continue;
    if (m.at > cursor) out.push({ text: text.slice(cursor, m.at), ink: null });
    out.push({ text: m.value, ink: m.ink });
    cursor = m.at + m.value.length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), ink: null });
  return out;
}

function Bucket({
  heading,
  gloss,
  colour,
  tallies,
  gameCount,
  bucket,
  first,
}: {
  heading: string;
  gloss: string;
  colour: string;
  tallies: AxisTally[];
  gameCount: number;
  bucket: "fix" | "keep";
  /** The first bucket drawn carries no top margin — the panel's padding does. */
  first: boolean;
}) {
  if (tallies.length === 0) return null;
  return (
    <section className={first ? "" : "mt-[15px] md:mt-[20px]"}>
      <div className="md:flex md:items-baseline md:gap-[9px] mb-[9px] md:mb-[11px]">
        {/* Below PATTERN_MIN the heading is named but neutral — see LOW-N-summary. */}
        <h4 className={BUCKET_HEADING + (gameCount >= PATTERN_MIN ? " " + colour : " text-fg-faint")}>
          {heading}
        </h4>
        <span className="hidden md:inline font-mono text-[10px] text-fg-locked">{gloss}</span>
      </div>
      <div className={CELL_STRIP}>
        {tallies.map((t) => (
          <GameAxisCell key={t.key} tally={t} gameCount={gameCount} bucket={bucket} />
        ))}
      </div>
    </section>
  );
}

// One clause per mixed axis, joined into the single sentence the copy module
// closes with. Each clause carries its own two counts, so a run of three mixed
// axes still reads as three separate readings rather than one blurred one.
function mixedSentence(mixed: AxisTally[]): string {
  const clauses = mixed
    .map((t) =>
      gameLogCopy.buckets.mixedClause(axisCopy[t.key].label, String(t.worked), String(t.hurt)),
    )
    .join(" ");
  return gameLogCopy.buckets.mixedLine(clauses);
}

/**
 * The aggregate readings — the Fix and Keep buckets, and the Mixed line under
 * them.
 *
 * Extracted from the panel's own render so `/about` can draw it. It takes the
 * summary and nothing else, which is what made the extraction safe: the panel
 * around it holds a deck id, a form, announcements and a history, and none of
 * them reach in here.
 */
export function GameFindings({ summary }: { summary: GameSummary }) {
  return (
    <>
    {/* Case 4 of the ladder — games logged, no axis ever marked — draws no
        aggregate at all. The headline has already said everything there is. */}
    {summary.axes.length > 0 && (
      <div className="mt-[18px] md:mt-[24px] rounded-[10px] md:rounded-[11px] px-[14px] py-[13px] md:px-[18px] md:py-[16px] bg-surface-sunken border border-border">
        {summary.count === 1 ? (
          <section>
            <h4 className={BUCKET_HEADING + " text-fg-faint mb-[10px] md:mb-[12px]"}>
              {gameLogCopy.buckets.oneGameHeading}
            </h4>
            <div className={CELL_STRIP}>
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
              colour="text-warning"
              tallies={summary.fix}
              gameCount={summary.count}
              bucket="fix"
              first
            />
            <Bucket
              heading={gameLogCopy.buckets.keep}
              gloss={gameLogCopy.buckets.keepNote}
              colour="text-success"
              tallies={summary.keep}
              gameCount={summary.count}
              bucket="keep"
              first={summary.fix.length === 0}
            />
          </>
        )}
        {summary.mixed.length > 0 && (
          <div className="md:flex md:flex-wrap md:items-baseline md:gap-[10px] mt-[14px] md:mt-[18px] pt-[12px] md:pt-[14px] border-t border-border">
            <span className={BUCKET_HEADING + " text-fg-faint"}>{gameLogCopy.buckets.mixed}</span>{" "}
            <span className="font-mono text-[10.5px] md:text-[11px] text-fg-muted">
              {mixedSentence(summary.mixed)}
            </span>
          </div>
        )}
      </div>
    )}
    </>
  );
}

/**
 * The Games tab's headline: the heading, the record at one game, and the sub-line. Exported so
 * the About page's log-findings figure draws the tab's own heading rather than a copy of it.
 */
export function GameHeadlineHeader({ headline, count }: { headline: Headline; count: number }) {
  return (
    <header className="md:flex md:flex-wrap md:items-baseline md:gap-[14px] md:mt-[20px] md:mb-[6px]">
      <h3 className="font-display font-bold text-[20px] md:text-[26px] leading-[1.25] md:leading-normal text-fg">
        {headline.heading}
      </h3>
      {/* N=1 only. At N>=2 the record is a clause inside the sub-line, so
          a span here would print it twice. */}
      {headline.record && (
        <span className="block md:inline mt-[5px] md:mt-0 font-mono text-[12px] md:text-[13px] md:tabular-nums text-fg-body">
          {headline.record}
        </span>
      )}
      {headline.sub && (
        <p
          className={
            "mt-[9px] md:mt-0 text-[13px] md:text-[13.5px] leading-[1.6] " +
            (count === 1 ? "md:max-w-[620px] text-fg-faint" : "md:max-w-[640px] text-fg-body")
          }
        >
          {subFragments(headline.sub, headline.subEmphasis).map((f, i) =>
            f.ink ? (
              <span key={i} className={f.ink}>
                {f.text}
              </span>
            ) : (
              <span key={i}>{f.text}</span>
            ),
          )}
        </p>
      )}
    </header>
  );
}

export function GamesPanel({ deckId, games, summary, tuned = false, onOpenAnalysis }: GamesPanelProps) {
  const headline = deriveHeadline(summary);
  const [announcement, setAnnouncement] = useState("");

  // Nothing on the page draws this record — only the live region says it — so it
  // is a ref rather than state: a re-render would tell no one anything new.
  const optimistic = useRef(summary.record);
  const settled = useRef(recordKey(summary.record));

  // Each mutation shifts the last record announced, so a player who logs two
  // games before the route revalidates hears the second one counted too. The
  // server's figure wins the moment it moves — revalidation is what settles the
  // record, and an optimistic count that outlived it would drift.
  function announceShift(result: GameResult, delta: 1 | -1, say: (record: string) => string) {
    const key = recordKey(summary.record);
    const next = recordShifted(key === settled.current ? optimistic.current : summary.record, result, delta);
    optimistic.current = next;
    settled.current = key;
    setAnnouncement(say(recordSaid(next)));
  }

  // §8.4. The empty state replaces the panel rather than sitting above it: an
  // aggregate of nothing and a history of nothing are two more empty boxes,
  // and the pitch is the third game, not the act of logging one.
  if (games.length === 0) {
    return (
      <section className="md:flex md:items-start md:justify-center md:gap-[34px] px-[20px] pt-[34px] pb-[40px] md:px-[24px] md:pt-[44px] md:pb-[34px] text-center md:text-left">
        <CardFanMark />
        <div className="md:flex-1 md:min-w-0 md:max-w-[720px]">
          <h3 className="font-display font-bold text-[21px] md:text-[26px] mt-[22px] md:mt-0 text-fg">
            {gameLogCopy.empty.heading}
          </h3>
          <p className="mt-[11px] md:mt-[12px] md:max-w-[520px] text-[13.5px] md:text-[14.5px] leading-[1.6] md:leading-[1.65] text-fg-body">
            {gameLogCopy.empty.body} <i className="text-fg">{gameLogCopy.empty.bodyQuote}</i>
            {gameLogCopy.empty.bodyAfter}
          </p>
          <p className="mt-[9px] md:mt-[10px] md:max-w-[520px] text-[13.5px] md:text-[14.5px] leading-[1.6] md:leading-[1.65] text-fg-body">
            {gameLogCopy.empty.cost}
          </p>
          <div className="mt-[20px] md:mt-[22px]">
            <GameLogForm
              deckId={deckId}
              tuned={tuned}
              isFirstGame
              onAnnounce={setAnnouncement}
              onSaved={() => setAnnouncement(gameLogCopy.announce.savedFirst)}
              ctaLabel={gameLogCopy.empty.cta}
              ctaSolid
            />
          </div>
        </div>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </section>
    );
  }

  return (
    <section className="px-[16px] py-[14px] md:px-[30px] md:py-[20px]">
      {headline && <GameHeadlineHeader headline={headline} count={summary.count} />}

      {/* Above the aggregate, below the record line: logging is the action this
          view exists for, and burying it under the readings hides it. */}
      <GameLogForm
        deckId={deckId}
        tuned={tuned}
        isFirstGame={games.length === 0}
        onAnnounce={setAnnouncement}
        onSaved={(isFirst, result) =>
          isFirst
            ? setAnnouncement(gameLogCopy.announce.savedFirst)
            : announceShift(result, 1, gameLogCopy.announce.saved)
        }
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <GameFindings summary={summary} />

      {/* The pointer to what reads these games (addendum r1, C1/C2): only over a reading, and
          only with a game to read. The second half needs no clause here: a deck with no game
          returns the empty state above, before this point. */}
      {tuned && onOpenAnalysis ? (
        <p data-games-pointer className="mt-[10px] flex min-h-[44px] flex-wrap items-center gap-x-[4px] text-[13px] leading-[1.5] text-fg-body md:mt-[14px]">
          {deckTuningGamesCopy.gamesLine.lead}{" "}
          <button type="button" onClick={onOpenAnalysis} className="font-semibold text-[color:var(--accent)] hover:underline">
            {deckTuningGamesCopy.gamesLine.link}
          </button>
        </p>
      ) : null}

      <div className={`flex items-baseline gap-[10px] mb-[10px] ${tuned && onOpenAnalysis ? "mt-[10px] md:mt-[12px]" : "mt-[22px]"}`}>
        <h2 className="font-mono uppercase text-[10px] tracking-[0.14em] text-fg-faint">
          {gameLogCopy.history.heading}
        </h2>
        <span className="font-mono text-[10px] text-fg-locked">
          {gameLogCopy.history.headingNote}
        </span>
      </div>
      {/* The row deletes through the server action; deckSurfaces() revalidates,
          so the shortened list comes back from the server rather than being
          spliced out here. */}
      <ul className="flex flex-col gap-[6px]">
        {games.map((g) => (
          <GameHistoryRow
            key={g.id}
            deckId={deckId}
            game={g}
            isLast={games.length === 1}
            onDeleted={(wasLast) =>
              wasLast
                ? setAnnouncement(gameLogCopy.announce.deletedLast)
                : announceShift(g.result, -1, gameLogCopy.announce.deleted)
            }
          />
        ))}
      </ul>
    </section>
  );
}

// The brand sheet's secondary mark — three cards fanned at -18°, 0° and +18°,
// the front one carrying the numerals. Decoration only: the heading carries the
// meaning, so it is hidden from the accessibility tree. The brand sheet gives
// the three fills as literal hexes; they ship as the nearest surface tokens
// because six themes redefine the palette and a component naming a hex fails
// the repo's own test.
function CardFanMark() {
  const card =
    "absolute w-[38px] h-[58px] md:w-[56px] md:h-[84px] rounded-[6px] md:rounded-[8px] border-[1.5px]";
  return (
    <div
      aria-hidden
      className="relative flex-none flex items-center justify-center w-[96px] h-[96px] md:w-[150px] md:h-[150px] mx-auto md:mx-0"
    >
      <div className={card + " bg-elevated border-border-strong -rotate-[18deg] -translate-x-[14px] md:-translate-x-[21px]"} />
      <div className={card + " bg-surface-raised border-border-dashed"} />
      <div
        className={
          card +
          " flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] border-accent rotate-[18deg] translate-x-[14px] md:translate-x-[21px] font-display font-extrabold text-[15px] md:text-[22px] text-accent"
        }
      >
        99
      </div>
    </div>
  );
}
