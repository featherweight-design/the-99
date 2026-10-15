// Split out of games.ts so the aggregation is importable from a client bundle: games.ts holds the database read,
// and a client component that reached it through `summarizeMatchups` dragged `src/db` into the browser.
import { GAME_AXIS_KEYS, type GameAxisKey } from "./game-axes";
import type { AxisTally, DeckGame, GameSummary } from "./games";
import { playRecord } from "./stats";

/**
 * Pure. Takes rows that are already loaded and returns everything the panel
 * draws — which is what makes the whole aggregation testable without a
 * database, and why listDeckGames does no counting of its own.
 *
 * There is deliberately no minimum-games gate here. summarizeGames answers the
 * same way at N=1 as at N=30; PATTERN_MIN is a rendering decision the panel
 * makes about ink and headings, not a rule about what the data means.
 */
export function summarizeGames(games: DeckGame[]): GameSummary {
  // Tallied through the stats layer rather than here, so the panel's record and
  // the deck-stats figure are one computation. `played` is dropped because
  // `count` already carries it; two names for one number is how they drift.
  const { wins, losses, draws } = playRecord(games);
  const record = { wins, losses, draws };
  const tallies = new Map<GameAxisKey, AxisTally>();
  let marked = 0;

  for (const g of games) {
    if (g.worked.length > 0 || g.hurt.length > 0) marked += 1;
    for (const key of g.worked) tally(tallies, key).worked += 1;
    for (const key of g.hurt) tally(tallies, key).hurt += 1;
  }

  const axes = [...tallies.values()].map((t) => ({ ...t, net: t.worked - t.hurt }));

  return {
    count: games.length,
    marked,
    record,
    axes: [...axes].sort((a, b) => GAME_AXIS_KEYS.indexOf(a.key) - GAME_AXIS_KEYS.indexOf(b.key)),
    keep: sortAxes(axes.filter((a) => a.net > 0)),
    fix: sortAxes(axes.filter((a) => a.net < 0)),
    mixed: sortAxes(axes.filter((a) => a.net === 0)),
  };
}

function tally(map: Map<GameAxisKey, AxisTally>, key: GameAxisKey): AxisTally {
  const existing = map.get(key);
  if (existing) return existing;
  const created = { key, worked: 0, hurt: 0, net: 0 };
  map.set(key, created);
  return created;
}

// Strongest signal first. The tie-break is the vocabulary order rather than
// alphabetical, so two axes of equal weight always appear in the same sequence
// they appear in on the form and on a history row.
function sortAxes(axes: AxisTally[]): AxisTally[] {
  return [...axes].sort((a, b) => {
    const byMagnitude = Math.abs(b.net) - Math.abs(a.net);
    if (byMagnitude !== 0) return byMagnitude;
    return GAME_AXIS_KEYS.indexOf(a.key) - GAME_AXIS_KEYS.indexOf(b.key);
  });
}
