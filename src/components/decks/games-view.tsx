"use client";

// The Games view on /decks (design handoff `design_handoff_the99_game_history`, build PR 2+3, filters PR 4): every game the
// reader has logged on every deck, newest first, grouped by month, under a summary in the Games tab's voice. A history,
// not a tracker: read-only, and each row opens its deck's Games tab at that game. Fifty a read; `Show 50 more` asks the
// server for the next window and keeps the rows already drawn when that fails. Deck, Result and Played against scope the
// list AND the summary (`games-filter-controls.tsx`, held by `use-games-filters.ts`); filters that match nothing leave the
// controls, the chips and the count and put one line and one way out in the list's place (Small items 9, A1). Month heads
// count the WHOLE month under the filter from the first read's aggregates, not the window.

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { loadMoreGamesAction } from "../../app/decks/game-history-actions";
import { gameHistoryCopy as copy } from "../../lib/copy/game-history";
import { PATTERN_MIN } from "../../lib/copy/game-log";
import { isEmptyGamesFilter, withGamesFilter } from "../../lib/games/history-filter";
import { GAME_HISTORY_WINDOW, type GameHistoryFilter } from "../../lib/games/history-rules";
import type { HistoryGame } from "../../lib/games/history";
import type { GamesPayload } from "../../lib/games/history-wire";
import { joinNames, PersonName } from "../../lib/person-name";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { FiltersBoxTrigger } from "../ui/filters-box-trigger";
import { GhostButton, PrimaryButton } from "../ui/button";
import { useMinWidth } from "../ui/use-min-width";
import { DeckSelect } from "./lineup/deck-select";
import {
  AgainstWideTrigger, againstOptions, chosenAgainst, DeckPhonePicker, DeckWideTrigger, GamesFilterSheet, OptionName, ResultWideTrigger,
  type AgainstOption, type DeckChoice,
} from "./games-filter-controls";
import { TrophyIcon } from "./trophy-icon";
import { useGamesFilters } from "./use-games-filters";
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

/** What the view has drawn beyond the first window: the rows, the position after them, and a failed ask. Tied to the payload it grew from. */
export type GamesHeld = { seen: GamesPayload; games: HistoryGame[]; next: string | null; moreFailed: boolean };
export const freshGames = (d: GamesPayload): GamesHeld => ({ seen: d, games: d.games, next: d.next, moreFailed: false });
/** The parent's keeping of `GamesHeld`, so flipping to Decks and back does not discard the windows already drawn. */
export type GamesHold = { value: GamesHeld | null; set: Dispatch<SetStateAction<GamesHeld | null>> };

export function GamesView({ data, viewSwitch, decks, hold, onData }: {
  data: GamesPayload;
  /** A payload read under a new filter, or served back from this visit's cache: the parent draws it as the first window. */
  onData: (next: GamesPayload) => void;
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
      const res = await loadMoreGamesAction(cursor, data.filter);
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

  // The filters draw from PATTERN_MIN games of history on: under it the view is a count and a line on where games come from.
  const filtersOn = total >= PATTERN_MIN;
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const gf = useGamesFilters(data, onData);
  const f = gf.filter;
  const options = useMemo(() => againstOptions(data), [data]);
  const against = chosenAgainst(options, f);
  const deckCounts = useMemo(() => new Map(data.aggregates.byDeck.map((d) => [d.deckId, d.games])), [data.aggregates.byDeck]);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Clear all takes off every filter on the wide form; on the phone the deck is the picker beside the switch (as the shelf
  // is on Decks, "nav, not filter"), so it stays.
  const clearAll = useCallback(
    () => gf.change(wide ? {} : withGamesFilter(f, { result: undefined, friend: undefined, commander: undefined })),
    [gf, wide, f],
  );
  const chips = useMemo((): FilterChip[] => {
    const out: FilterChip[] = [];
    const off = (change: Partial<GameHistoryFilter>) => () => gf.change(withGamesFilter(f, change));
    const deck = decks.find((d) => d.id === f.deckId);
    if (wide && f.deckId) out.push({ key: "deck", label: deck?.name ?? copy.filter.allDecks, onRemove: off({ deckId: undefined }) });
    if (f.friend || f.commander) {
      out.push({
        key: "against",
        label: against ? (typeof against.name === "string" ? against.name : joinNames([against.name])) : f.friend ? copy.filter.formerFriend : copy.filter.playedAgainst,
        onRemove: off({ friend: undefined, commander: undefined }),
      });
    }
    if (f.result) out.push({ key: "result", label: f.result === "win" || f.result === "loss" || f.result === "draw" ? copy.filter.results[f.result] : f.result, onRemove: off({ result: undefined }) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `gf.change` is rebuilt with the cache; the chips read it when pressed
  }, [wide, f, decks, against, gf.change]);

  const pad = "px-[16px] md:px-[22px]";
  return (
    <div data-decks-games className="flex min-h-0 w-full flex-auto flex-col">
      {filtersOn ? (
        <FilterChassis
          form={wide ? "wide" : "compact"}
          controls={
            wide ? (
              <>
                {viewSwitch}
                <span aria-hidden className="h-[20px] w-px flex-none bg-[color:var(--border)]" />
                <DeckWideTrigger decks={decks} filter={f} onChange={gf.change} />
                <ResultWideTrigger filter={f} onChange={gf.change} />
                <AgainstWideTrigger options={options} filter={f} onChange={gf.change} />
              </>
            ) : (
              <div className="flex w-full min-w-0 flex-col items-start gap-[14px]">
                <div className="flex w-full min-w-0 items-center gap-[8px]">
                  {viewSwitch}
                  <span className="flex-1" />
                  <DeckPhonePicker decks={decks} filter={f} counts={deckCounts} onChange={gf.change} />
                </div>
                <FiltersBoxTrigger
                  label={copy.filter.open}
                  badge={(f.result ? 1 : 0) + (f.friend || f.commander ? 1 : 0)}
                  onClick={() => setSheetOpen(true)}
                  expanded={sheetOpen}
                />
              </div>
            )
          }
          chips={chips}
          onClearAll={clearAll}
          resultLine={copy.count(summary.games)}
          silentResult={sheetOpen}
          revision={gf.pending ? "pending" : summary.games}
          after={
            wide ? null : (
              <GamesFilterSheet
                open={sheetOpen}
                onDismiss={() => setSheetOpen(false)}
                filter={f}
                onChange={gf.change}
                options={options}
                byResult={data.aggregates.byResult}
                shown={summary.games}
              />
            )
          }
        />
      ) : (
        <div className="flex items-center gap-[8px] px-[16px] pt-[8px] pb-[10px] md:flex-wrap md:gap-[6px] md:border-t md:border-t-[color:var(--border)] md:px-[22px] md:py-[10px]">
          {viewSwitch}
        </div>
      )}
      <div
        role="tabpanel"
        id={viewPanelId("games")}
        aria-labelledby={viewTabId("games")}
        aria-busy={gf.pending || undefined}
        className={`flex flex-col pb-[22px] ${pad} ${filtersOn ? "" : "md:border-t md:border-t-[color:var(--border)]"} ${gf.pending ? "opacity-60" : ""}`}
      >
        {filtersOn ? null : (
          <p data-games-count className="m-0 -mx-[16px] border-0 border-b border-solid border-b-[color:var(--border)] px-[16px] pt-[2px] pb-[14px] font-mono text-[12.5px] leading-[normal] text-fg-faint md:-mx-[22px] md:px-[22px] md:pt-[12px]">
            {copy.count(summary.games)}
          </p>
        )}
        {total === 0 ? (
          <Empty decks={decks} />
        ) : summary.games === 0 ? (
          <NoMatch onClear={clearAll} />
        ) : (
          <>
            <Summary data={data} games={games} against={chosenAgainst(options, data.filter)} />
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
      {gf.failed ? <GamesFailedToast kind="games-failed" title={copy.failed} onRetry={gf.retry} onDone={gf.dismissFailed} /> : null}
    </div>
  );
}

function Summary({ data, games, against }: { data: GamesPayload; games: readonly HistoryGame[]; against: AgainstOption | null }) {
  const s = data.aggregates.summary;
  const f = data.filter;
  const first = s.firstPlayedAt && s.lastPlayedAt ? spanText(s.firstPlayedAt.toISOString(), s.lastPlayedAt.toISOString()) : null;
  // One deck holds every game: its own name stands in for `1 deck`.
  const lead = s.decks === 1 && games[0] ? games[0].deck.name : copy.decks(s.decks);
  const tail = [s.podMin !== null && s.podMax !== null ? copy.pods(s.podMin, s.podMax) : null, first].filter((x) => x !== null);
  const won = against?.kind === "friend" && typeof against.name !== "string" ? s.friendWonLosses : null;
  return (
    <div data-games-summary className="flex flex-col gap-[7px] pt-[20px] pb-[6px]">
      <h2 className="m-0 font-display text-[17px] font-bold leading-[1.3] text-fg md:text-[20px]">
        {copy.headline(s.games, s.wins, s.losses, s.draws)}
      </h2>
      <p className="m-0 font-mono text-[11px] leading-[1.6] text-fg-faint">
        <b className="font-normal text-fg-body">{lead}</b>
        {against ? (
          <> {copy.scoped.with} <b className="font-normal text-fg-body"><OptionName option={against} /></b> {copy.scoped.atTable}</>
        ) : null}
        {tail.map((t) => ` · ${t}`).join("")}
      </p>
      {won && won.losses > 0 && against && typeof against.name !== "string" ? (
        <p data-games-beat-me className="m-0 flex items-center gap-[6px] font-mono text-[11px] leading-[1.6] text-fg-faint">
          <TrophyIcon size={12} />
          <span><PersonName n={against.name} />{copy.beatMe(won.won, won.losses)}</span>
        </p>
      ) : null}
      {/* Most played says nothing under a deck filter (that deck leads its own list), so it goes with it. */}
      {s.games >= PATTERN_MIN && s.mostPlayed && !f.deckId ? (
        <p className="m-0 font-mono text-[11px] leading-[1.6] text-fg-faint">
          {copy.mostPlayed.lead} <b className="font-normal text-fg-body">{s.mostPlayed.name}</b>
          {copy.mostPlayed.tail(s.mostPlayed.games, s.games)}
        </p>
      ) : null}
      {s.games < PATTERN_MIN && isEmptyGamesFilter(f) ? <p className="m-0 max-w-[620px] text-[13px] leading-[1.55] text-fg-muted">{copy.low}</p> : null}
    </div>
  );
}

/** Filters that match nothing (Small items 9, A1): one line and one way out, where the headline and the months were. */
function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div data-games-no-match className="flex flex-col items-start gap-[12px] pb-[8px] pt-[26px]">
      <h2 className="m-0 font-sans text-[15px] font-semibold leading-[1.3] text-fg">{copy.filter.noMatch}</h2>
      <GhostButton
        onClick={onClear}
        className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-[14px] text-[14px] font-normal md:min-h-[36px] md:rounded-[8px] md:text-[13px]"
      >
        {copy.filter.clearFilters}
      </GhostButton>
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
