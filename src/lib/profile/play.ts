import { summarizeGames, type DeckGame } from "../decks/games";

/**
 * The PLAY-DATA fact group — the one `types.ts` names as a later sibling key. SERVER-ONLY in
 * practice: `summarizeGames` lives beside `listDeckGames`, whose module imports the database.
 * `types.ts` takes only the TYPE from here, so the profile stays client-safe.
 *
 * NEVER CACHED WITH THE PROFILE. The profile's fingerprint is over the deck's cards, so a play
 * group filed under it would carry last week's games after a new one is logged, and moving the
 * key instead would retire the stored analysis every time a game is logged, for figures no game
 * can change. A consumer composes it at the read: `{ ...profile, play: buildPlayGroup(games) }`.
 *
 * JSON-only, like the rest of the profile: `playedAt` is an ISO date string, not a Date.
 */
export type ProfilePlay = {
  games: {
    id: string;
    result: "win" | "loss" | "draw";
    podSize: number;
    playedAt: string;
    worked: string[];
    hurt: string[];
    note: string | null;
  }[];
  summary: {
    count: number;
    /** Games carrying at least one mark — the numerator of "marked in 3 of 5 games". */
    marked: number;
    record: { wins: number; losses: number; draws: number };
    /** Fix first, then mixed, then keep, each strongest first. NO `net`: it orders, and it
     *  never travels — the model cannot render a figure it was never given. */
    axes: { key: string; worked: number; hurt: number }[];
  };
};

export function buildPlayGroup(games: DeckGame[]): ProfilePlay {
  const s = summarizeGames(games);
  return {
    games: games.map((g) => ({
      id: g.id,
      result: g.result,
      podSize: g.podSize,
      playedAt: g.playedAt.toISOString(),
      worked: [...g.worked],
      hurt: [...g.hurt],
      note: g.note,
    })),
    summary: {
      count: s.count,
      marked: s.marked,
      record: s.record,
      axes: [...s.fix, ...s.mixed, ...s.keep].map(({ key, worked, hurt }) => ({ key, worked, hurt })),
    },
  };
}
