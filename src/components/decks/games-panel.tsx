"use client";
// GamesPanel — the Games view's body: headline, aggregate, form, history.
// A peer of the decklist and Consider rather than a drawer beside them, so it
// owns its own vertical rhythm and does not inherit the decklist's.

import { useEffect, useRef, useState } from "react";
import { mirrorUrl } from "../../lib/url/mirror";
import { GAME_PARAM, LANDING_RING_MS } from "../../lib/games/landing";
import type { DeckGame, GameSummary } from "../../lib/decks/games";
import type { Headline } from "../../lib/decks/game-headline";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { formatPlayed } from "../../lib/decks/format";
import { groupByMonth, MonthBox, recordOf, SummaryBox, type SummaryCell } from "./game-boxes";
import { spanText } from "./lineup/recency-card";
import { useZone } from "../zone-context";
import { GameTiles } from "./game-tiles";
import { GameHistoryRow } from "./game-history-row";
import { GameLogForm, type GameLogFormProps, type GameResult } from "./game-log-form";
import { GameMatchups } from "./game-matchups";
import type { DeckOpponentsWire } from "../../lib/decks/deck-opponents-read";
import { gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  /** This deck's name and its commander's art: the summary box's band and your tile in every game's Seats. */
  deck: { name: string; artUri: string | null };
  games: DeckGame[];
  summary: GameSummary;
  /** Suggested changes is on this deck: the Tuning tab holds it over a reading. */
  tuned?: boolean;
  /** Opens the Tuning tab with Suggested changes open, for the pointer line. */
  onOpenTuning?: () => void;
  /** The log form's "Across the table" row, for a reader with `SOCIAL_FRIENDS_ENABLED` on. Absent: the shipped form. */
  opponents?: GameLogFormProps["opponents"];
  /** The seats of each game and the matchups drawn from them (Social R3), for a reader with `SOCIAL_FRIENDS_ENABLED` on. Null: no Matchups, no `vs` lines. */
  gameOpponents?: DeckOpponentsWire | null;
  /** A Rule 0 table's seats, for the form to open with (plan §PR 8). Passed to whichever form this panel draws. */
  prefill?: GameLogFormProps["prefill"];
  onPrefillSpent?: GameLogFormProps["onPrefillSpent"];
  /** The game the cross-deck Games view landed on (`?tab=games&game=<id>`): its row scrolls into view and rings for two seconds. An id that is not one of this deck's rows rings nothing. */
  landingGameId?: string | null;
  /** The landing is spent once it has started: BuilderShell forgets it so the panel's next mount, from a tab change, does not ring again. */
  onLandingSpent?: () => void;
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
      [emphasis.record, "font-mono text-[12px] md:text-[13px] tabular-nums text-accent-text"],
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

/** The deck tab's summary cells: pods, the span played and the last game, read off the deck's own games (all of them are loaded). */
function deckCells(games: readonly DeckGame[], zone: string | null): SummaryCell[] {
  if (games.length === 0) return [];
  const pods = games.map((g) => g.podSize);
  const times = games.map((g) => g.playedAt.getTime());
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  return [
    { key: "pods", label: gameHistoryCopy.boxes.cell.pods, value: gameHistoryCopy.boxes.players(Math.min(...pods), Math.max(...pods)) },
    { key: "played", label: gameHistoryCopy.boxes.cell.played, value: spanText(first.toISOString(), last.toISOString()) },
    { key: "last", label: gameHistoryCopy.boxes.cell.last, value: formatPlayed(last, undefined, zone) },
  ];
}

export function GamesPanel({ deckId, deck, games, summary, tuned = false, onOpenTuning, opponents, gameOpponents = null, prefill, onPrefillSpent, landingGameId = null, onLandingSpent }: GamesPanelProps) {
  const zone = useZone();
  const [announcement, setAnnouncement] = useState("");
  // The table's prefill is held, and spent, by `BuilderShell` (a save or a Cancel in either form mount): this panel
  // remounts on every tab change. Its `table` parameter leaves the address on arrival, so a reload opens it plain.
  useEffect(() => {
    if (!prefill) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("table");
    mirrorUrl(url);
  }, [prefill]);

  // The landing from the cross-deck Games view (handoff Place W3): the row rings for two seconds, then the ring fades.
  // Held as state from the first render, so the shell forgetting the landing below does not end the ring early.
  const [ringed, setRinged] = useState<string | null>(() => (landingGameId && games.some((g) => g.id === landingGameId) ? landingGameId : null));
  // A landing is spent on arrival whether or not the game is one of this deck's rows (another deck's game, a deleted
  // one): the shell forgets it and the parameter leaves the address, so a later remount of the tab never rings it.
  const [landed] = useState(landingGameId);
  useEffect(() => {
    if (!landed) return;
    onLandingSpent?.();
    // The parameter leaves the address on arrival, as `table` does: a reload opens the tab plain.
    const url = new URL(window.location.href);
    if (url.searchParams.has(GAME_PARAM)) {
      url.searchParams.delete(GAME_PARAM);
      mirrorUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `onLandingSpent` is a state setter's wrapper; the landing is spent once, on mount.
  }, [landed]);
  useEffect(() => {
    if (!ringed) return;
    const timer = setTimeout(() => setRinged(null), LANDING_RING_MS);
    return () => clearTimeout(timer);
  }, [ringed]);

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
              opponents={opponents}
              prefill={prefill}
              onPrefillSpent={onPrefillSpent}
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
      {/* The summary box leads, and logging is its fourth cell: the action this view exists for sits in the first box,
          and its form opens across the whole row. */}
      <SummaryBox
        title={gameHistoryCopy.boxes.band(summary.count, deck.name)}
        record={summary.record}
        cells={deckCells(games, zone)}
        action={<GameLogForm
        deckId={deckId}
        tuned={tuned}
        isFirstGame={games.length === 0}
        opponents={opponents}
        prefill={prefill}
              onPrefillSpent={onPrefillSpent}
        onAnnounce={setAnnouncement}
        onSaved={(isFirst, result) =>
          isFirst
            ? setAnnouncement(gameLogCopy.announce.savedFirst)
            : announceShift(result, 1, gameLogCopy.announce.saved)
        }
          ctaSolid
        />}
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <GameTiles summary={summary} tuned={tuned} onOpenTuning={onOpenTuning} />

      {gameOpponents && <GameMatchups matchups={gameOpponents.matchups} />}

      {/* The row deletes through the server action; deckSurfaces() revalidates,
          so the shortened list comes back from the server rather than being
          spliced out here. */}
      {groupByMonth(games, zone).map((m) => (
        <MonthBox key={m.key} monthKey={m.key} count={m.games.length} record={recordOf(m.games)}>
          <ul className="m-0 flex list-none flex-col p-0">
            {m.games.map((g) => (
              <GameHistoryRow
                key={g.id}
                deckId={deckId}
                you={{ deckName: deck.name, artUri: deck.artUri }}
                game={g}
                isLast={games.length === 1}
                opponents={gameOpponents?.opponents[g.id]}
                ringed={ringed === g.id}
                onDeleted={(wasLast) =>
                  wasLast
                    ? setAnnouncement(gameLogCopy.announce.deletedLast)
                    : announceShift(g.result, -1, gameLogCopy.announce.deleted)
                }
              />
            ))}
          </ul>
        </MonthBox>
      ))}
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
          " flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] border-accent rotate-[18deg] translate-x-[14px] md:translate-x-[21px] font-display font-extrabold text-[15px] md:text-[22px] text-accent-text"
        }
      >
        99
      </div>
    </div>
  );
}
