/**
 * Matchups (social scope §4, "Matchup stats this makes possible"): a deck's games split by who sat across
 * the table, against a commander, a color identity and a friend. Pure, beside `summarizeGames`, and built
 * from it: every cell IS a `GameSummary` of that cell's games, so its record and its worked/hurt axes are
 * one computation with the deck's own panel, and the panel's rules hold unchanged. No percentage and no
 * net figure leaves here for drawing (`net` orders axes and is never rendered), every count comes with its
 * denominator (`summary.count`), and below `PATTERN_MIN` the panel describes rather than finds. That gate
 * is the panel's, as it is for `summarizeGames`: this answers the same way at N=1 as at N=30.
 *
 * A cell counts GAMES, not seats: two opponents of one identity in one game are one game against it.
 * `beatMe` is how many of the cell's games the player lost to an opponent in that cell (Q15's tap). Cells
 * order by how many games they hold, then by key, never by record, which would rank on a rate.
 */
import { summarizeGames, type DeckGame, type GameSummary } from "./games";
import type { GameOpponent, OpponentCommander } from "./game-opponents";

type Cell = { key: string; summary: GameSummary; beatMe: number };

export type CommanderCell = Cell & { commander: OpponentCommander; partner: OpponentCommander | null };
/** `colorIdentity` in WUBRG order; empty is colorless. */
export type IdentityCell = Cell & { colorIdentity: string[] };
export type FriendCell = Cell & { name: string };

export type Matchups = {
  /** Every game on the deck. */
  games: number;
  /** Games with at least one opponent recorded: the denominator a "recorded in 2 of 6 games" line reads. */
  recorded: number;
  commanders: CommanderCell[];
  identities: IdentityCell[];
  friends: FriendCell[];
};

type Bucket<T> = { meta: T; games: DeckGame[]; beatMe: number };

function add<T>(map: Map<string, Bucket<T>>, key: string, meta: T, game: DeckGame, beat: boolean) {
  let bucket = map.get(key);
  if (!bucket) map.set(key, (bucket = { meta, games: [], beatMe: 0 }));
  bucket.games.push(game);
  if (beat) bucket.beatMe += 1;
}

function cells<T>(map: Map<string, Bucket<T>>): (Cell & { meta: T })[] {
  return [...map.entries()]
    .map(([key, b]) => ({ key, meta: b.meta, summary: summarizeGames(b.games), beatMe: b.beatMe }))
    .sort((a, b) => b.summary.count - a.summary.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function summarizeMatchups(games: readonly DeckGame[], opponents: ReadonlyMap<string, readonly GameOpponent[]>): Matchups {
  const byCommander = new Map<string, Bucket<{ commander: OpponentCommander; partner: OpponentCommander | null }>>();
  const byIdentity = new Map<string, Bucket<string[]>>();
  const byFriend = new Map<string, Bucket<string>>();
  let recorded = 0;
  for (const game of games) {
    const seats = opponents.get(game.id) ?? [];
    if (seats.length === 0) continue;
    recorded += 1;
    const lost = game.result === "loss";
    // One game lands in a cell once, and beat the player there if any of that cell's seats won it.
    const commanders = new Map<string, { meta: { commander: OpponentCommander; partner: OpponentCommander | null }; won: boolean }>();
    const identities = new Map<string, { meta: string[]; won: boolean }>();
    const friends = new Map<string, { meta: string; won: boolean }>();
    for (const s of seats) {
      if (s.commander !== null) {
        // A pair is one pairing whichever side a deck stored first, so its key is the two ids in order.
        const key = s.partner === null ? s.commander.oracleId : [s.commander.oracleId, s.partner.oracleId].sort().join("+");
        const prior = commanders.get(key);
        commanders.set(key, { meta: { commander: s.commander, partner: s.partner }, won: (prior?.won ?? false) || s.won });
        const idKey = s.colorIdentity.join("") || "C";
        identities.set(idKey, { meta: s.colorIdentity, won: (identities.get(idKey)?.won ?? false) || s.won });
      }
      if (s.friend !== null) {
        friends.set(s.friend.key, { meta: friends.get(s.friend.key)?.meta ?? s.friend.name, won: (friends.get(s.friend.key)?.won ?? false) || s.won });
      }
    }
    for (const [k, v] of commanders) add(byCommander, k, v.meta, game, lost && v.won);
    for (const [k, v] of identities) add(byIdentity, k, v.meta, game, lost && v.won);
    for (const [k, v] of friends) add(byFriend, k, v.meta, game, lost && v.won);
  }
  return {
    games: games.length,
    recorded,
    commanders: cells(byCommander).map(({ meta, ...c }) => ({ ...c, ...meta })),
    identities: cells(byIdentity).map(({ meta, ...c }) => ({ ...c, colorIdentity: meta })),
    friends: cells(byFriend).map(({ meta, ...c }) => ({ ...c, name: meta })),
  };
}
