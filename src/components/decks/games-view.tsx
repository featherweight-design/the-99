"use client";

// The Games view on /decks (design handoff `design_handoff_the99_game_history`, build PR 2+3, filter-free): every game the
// reader has logged on every deck, newest first, grouped by month, under a summary in the Games tab's voice. A history,
// not a tracker: read-only, and each row opens its deck's Games tab at that game. Fifty a read; `Show 50 more` asks the
// server for the next window and keeps the rows already drawn when that fails. The filters (Played against, Result, deck)
// are PR 4's. Month heads count the WHOLE month from the first read's aggregates, not the window.

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { loadMoreGamesAction } from "../../app/decks/game-history-actions";
import { gameHistoryCopy as copy } from "../../lib/copy/game-history";
import { PATTERN_MIN } from "../../lib/copy/game-log";
import { GAME_HISTORY_WINDOW } from "../../lib/games/history-rules";
import type { HistoryGame } from "../../lib/games/history";
import type { GamesPayload } from "../../lib/games/history-wire";
import { GhostButton, PrimaryButton } from "../ui/button";
import { DeckSelect } from "./lineup/deck-select";
import { spanText } from "./lineup/recency-card";
import { viewPanelId, viewTabId } from "./lineup/stats-view-switch";
import { GameEntry } from "./game-entry";
import { GamesFailedToast } from "./games-failed-toast";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** `2026-10`, the way the read groups (`to_char(played_at, 'YYYY-MM')` on a timestamp without a zone, read as UTC). */
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const monthLabel = (key: string) => MONTH.format(new Date(`${key}-01T00:00:00Z`));

/** The rows in order, cut at each change of month. */
export function groupByMonth(games: readonly HistoryGame[]): { key: string; games: HistoryGame[] }[] {
  const out: { key: string; games: HistoryGame[] }[] = [];
  for (const g of games) {
    const key = monthKey(g.playedAt);
    const last = out[out.length - 1];
    if (last?.key === key) last.games.push(g);
    else out.push({ key, games: [g] });
  }
  return out;
}

type DeckChoice = { id: string; name: string; identity: string[] };

/** What the view has drawn beyond the first window: the rows, the position after them, and a failed ask. Tied to the payload it grew from. */
export type GamesHeld = { seen: GamesPayload; games: HistoryGame[]; next: string | null; moreFailed: boolean };
export const freshGames = (d: GamesPayload): GamesHeld => ({ seen: d, games: d.games, next: d.next, moreFailed: false });
/** The parent's keeping of `GamesHeld`, so flipping to Decks and back does not discard the windows already drawn. */
export type GamesHold = { value: GamesHeld | null; set: Dispatch<SetStateAction<GamesHeld | null>> };

export function GamesView({ data, viewSwitch, decks, hold }: {
  data: GamesPayload;
  viewSwitch: ReactNode;
  /** The reader's decks, for the empty state's `Log one on` select. */
  decks: readonly DeckChoice[];
  /** Kept by the parent beside the first window; absent, the view keeps its own (a fresh payload replaces it either way). */
  hold?: GamesHold;
}) {
  const [local, setLocal] = useState<GamesHeld | null>(null);
  // A fresh first window from the server replaces what grew from the old one, adjusted in render so the old never paints.
  if (!hold && local?.seen !== data) setLocal(freshGames(data));
  const stored = hold ? hold.value : local;
  const setStored = hold ? hold.set : setLocal;
  const st = stored && stored.seen === data ? stored : freshGames(data);
  const { games, next, moreFailed } = st;
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  // The payload on screen now, read after an ask returns: an answer for any other one is dropped, never appended.
  const latest = useRef(data);
  useEffect(() => { latest.current = data; }, [data]);
  const focusId = useRef<string | null>(null);

  async function more() {
    if (inFlight.current || next === null) return;
    inFlight.current = true;
    const tag = data;
    const cursor = next;
    setLoading(true);
    // Applies to the held state only while it still grew from the payload and the position this ask started from.
    const apply = (f: (h: GamesHeld) => GamesHeld) =>
      setStored((prev) => (prev && prev.seen === tag && prev.next === cursor ? f(prev) : prev));
    apply((h) => (h.moreFailed ? { ...h, moreFailed: false } : h));
    try {
      const res = await loadMoreGamesAction(cursor);
      if (!res.ok) {
        apply((h) => ({ ...h, moreFailed: true }));
        return;
      }
      // By id, so a window that overlaps what is drawn (a game logged between two reads) never doubles a row.
      const have = new Set(games.map((g) => g.id));
      const added = res.games.filter((g) => !have.has(g.id));
      if (latest.current === tag) focusId.current = added[0]?.id ?? null;
      apply((h) => {
        const ids = new Set(h.games.map((g) => g.id));
        return { ...h, games: [...h.games, ...res.games.filter((g) => !ids.has(g.id))], next: res.next, moreFailed: false };
      });
    } catch {
      // A request that never reached the server reads as the same failed state.
      apply((h) => ({ ...h, moreFailed: true }));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }
  // After an appended window draws, focus moves to its first row: the button that asked for it is now past the new rows.
  useEffect(() => {
    const id = focusId.current;
    if (!id) return;
    focusId.current = null;
    document.querySelector<HTMLElement>(`[data-game-entry="${id}"] a`)?.focus();
  }, [games]);

  const { summary, months, total } = data.aggregates;
  const monthCounts = useMemo(() => new Map(months.map((m) => [m.month, m.games])), [months]);
  const groups = useMemo(() => groupByMonth(games), [games]);

  return (
    <div data-decks-games className="flex min-h-0 w-full flex-auto flex-col">
      <div className="flex items-center gap-[8px] px-[16px] pt-[8px] pb-[10px] md:flex-wrap md:gap-[6px] md:border-t md:border-t-[color:var(--border)] md:px-[22px] md:py-[10px]">
        {viewSwitch}
      </div>
      <div
        role="tabpanel"
        id={viewPanelId("games")}
        aria-labelledby={viewTabId("games")}
        className="flex flex-col px-[16px] pb-[22px] md:border-t md:border-t-[color:var(--border)] md:px-[22px]"
      >
        <p data-games-count className="m-0 -mx-[16px] border-0 border-b border-solid border-b-[color:var(--border)] px-[16px] pt-[2px] pb-[14px] font-mono text-[12.5px] leading-[normal] text-fg-faint md:-mx-[22px] md:px-[22px] md:pt-[12px]">
          {copy.count(summary.games)}
        </p>
        {total === 0 ? (
          <Empty decks={decks} />
        ) : (
          <>
            <Summary data={data} games={games} />
            {groups.map((g) => (
              <div key={g.key} data-games-month={g.key}>
                <h3 className="mx-0 mt-[18px] mb-[10px] flex items-baseline gap-[10px] font-mono text-[10px] font-normal uppercase leading-[normal] tracking-[0.14em] text-fg-faint">
                  {monthLabel(g.key)}
                  <span className="sr-only">, </span>
                  <em className="text-[11px] normal-case leading-[normal] not-italic tracking-normal text-fg-locked">{copy.count(monthCounts.get(g.key) ?? g.games.length)}</em>
                </h3>
                <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
                  {g.games.map((game) => <GameEntry key={game.id} game={game} />)}
                </ul>
              </div>
            ))}
            <Foot shown={games.length} total={summary.games} more={next !== null} loading={loading} onMore={more} />
          </>
        )}
      </div>
      {moreFailed ? <GamesFailedToast kind="games-more-failed" title={copy.moreFailed} onRetry={more} onDone={() => setStored((prev) => (prev && prev.seen === data ? { ...prev, moreFailed: false } : prev))} /> : null}
    </div>
  );
}

function Summary({ data, games }: { data: GamesPayload; games: readonly HistoryGame[] }) {
  const s = data.aggregates.summary;
  const first = s.firstPlayedAt && s.lastPlayedAt ? spanText(s.firstPlayedAt.toISOString(), s.lastPlayedAt.toISOString()) : null;
  // One deck holds every game: its own name stands in for `1 deck`.
  const lead = s.decks === 1 && games[0] ? games[0].deck.name : copy.decks(s.decks);
  const tail = [s.podMin !== null && s.podMax !== null ? copy.pods(s.podMin, s.podMax) : null, first].filter((x) => x !== null);
  return (
    <div data-games-summary className="flex flex-col gap-[7px] pt-[20px] pb-[6px]">
      <h2 className="m-0 font-display text-[17px] font-bold leading-[1.3] text-fg md:text-[20px]">
        {copy.headline(s.games, s.wins, s.losses, s.draws)}
      </h2>
      <p className="m-0 font-mono text-[11px] leading-[1.6] text-fg-faint">
        <b className="font-normal text-fg-body">{lead}</b>
        {tail.map((t) => ` · ${t}`).join("")}
      </p>
      {s.games >= PATTERN_MIN && s.mostPlayed ? (
        <p className="m-0 font-mono text-[11px] leading-[1.6] text-fg-faint">
          {copy.mostPlayed.lead} <b className="font-normal text-fg-body">{s.mostPlayed.name}</b>
          {copy.mostPlayed.tail(s.mostPlayed.games, s.games)}
        </p>
      ) : null}
      {s.games < PATTERN_MIN ? <p className="m-0 max-w-[620px] text-[13px] leading-[1.55] text-fg-muted">{copy.low}</p> : null}
    </div>
  );
}

/** What is drawn of the whole, and fifty more. Nothing under one window: a history that fits has no foot to say. */
function Foot({ shown, total, more, loading, onMore }: { shown: number; total: number; more: boolean; loading: boolean; onMore: () => void }) {
  if (!more && shown <= GAME_HISTORY_WINDOW) return null;
  return (
    <div data-games-foot className="flex flex-col items-center gap-[10px] pt-[18px] pb-[22px]">
      <small className="font-mono text-[11px] leading-[normal] text-fg-faint">{more ? copy.window(shown, total) : copy.all(total)}</small>
      {/* Polite progress for a screen reader: the button's own name changes too, but a press that moves nothing else says nothing. */}
      <span role="status" className="sr-only">{loading ? copy.loading : ""}</span>
      {more ? (
        // aria-disabled, not disabled: the button keeps focus while it loads, and the guard in `more` swallows a second press.
        <GhostButton
          onClick={onMore}
          aria-disabled={loading || undefined}
          aria-busy={loading || undefined}
          className={
            "inline-flex min-h-[44px] min-w-[220px] items-center justify-center rounded-[10px] px-[14px] text-[14px] font-normal md:min-h-[36px] md:rounded-[8px] md:text-[13px] " +
            (loading ? "cursor-default text-[color:var(--fg-muted)] hover:[border-color:var(--border-strong)] hover:[color:var(--fg-muted)]" : "")
          }
        >
          {loading ? (
            <>
              <span aria-hidden className="mr-[8px] inline-block h-[12px] w-[12px] animate-spin rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--fg-muted)] motion-reduce:animate-none" />
              {copy.loading}
            </>
          ) : (
            copy.more
          )}
        </GhostButton>
      ) : null}
    </div>
  );
}

/** No games yet: the one place a game is logged is a deck's Games tab, so the way there is a deck and a press. */
function Empty({ decks }: { decks: readonly DeckChoice[] }) {
  // The first deck: the app keeps no last-opened deck to default to (the board asks for it).
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  return (
    <div data-games-empty className="flex max-w-[560px] flex-col gap-[14px] pt-[26px] pb-[8px]">
      <h2 className="m-0 font-display text-[17px] font-bold leading-[1.3] text-fg md:text-[20px]">{copy.empty.title}</h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-fg-body">{copy.empty.body}</p>
      {decks.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <small className="font-mono text-[10px] uppercase leading-[normal] tracking-[0.12em] text-fg-faint">{copy.empty.pick}</small>
          <div className="flex gap-[8px]">
            <DeckSelect
              decks={decks}
              value={deckId}
              onChange={setDeckId}
              label={copy.empty.pick}
              className="min-w-0 flex-1 rounded-[10px] bg-[color:var(--surface-raised)] text-[14px] md:w-[300px] md:flex-none md:text-[13px]"
            />
            <PrimaryButton
              href={`/decks/${encodeURIComponent(deckId)}?tab=games`}
              className="inline-flex min-h-[44px] flex-none items-center justify-center rounded-[10px] px-[16px] text-[14px] font-medium md:min-h-[36px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]"
            >
              {copy.empty.log}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
