/**
 * What each split of the Matchups section draws, as plain rows (Social R3 plan, PR 4). Pure, so every rule the
 * section states is one function a test can break:
 *
 * - a game is ONE SQUARE: wins first, then draws, then losses, then the games someone else won (order, never
 *   date), the wins in `--success`. A loss is drawn only on the opponent who won it (`GameMark`); the others in
 *   that game get a dashed dash. At one game a row is one square and cannot be read as 100%. Past ten games the
 *   squares give way to counts;
 * - never a ratio: no percentage, no `net`. A row's denominator is its `N games`, the section's is
 *   `Matchups · X of N games`;
 * - rows keep `summarizeMatchups`' own order (games, then key), never record;
 * - a color identity is named as `colorLabel` names it (Izzet, Jeskai); what it does not name (none, four,
 *   five colors) comes from the copy, and four colors name the missing one beneath.
 */
import type { ThirdPartyName } from "../person-name/brand";
import { colorLabel } from "./format";
import type { OpponentCommander } from "./game-opponents";
import type { GameMark, Matchups } from "./matchups";
import { gameMatchupsCopy } from "../copy/game-matchups";

export type MatchupSplit = "commanders" | "identities" | "friends";

export type Thumb =
  | { kind: "art"; imageUri: string }
  | { kind: "pips"; colorIdentity: string[] }
  /** Two letters of the friend's name, for a friend seated with no commander: drawn by `PersonInitials`, never as text. */
  | { kind: "initials"; name: ThirdPartyName }
  /** A commander the catalog has no art for. */
  | { kind: "blank" };

export type MatchupRow = {
  key: string;
  thumb: Thumb;
  name: string | ThirdPartyName;
  sub: string | null;
  /** One mark per game, W then D then L then the dash; null past `SQUARES_MAX` games. */
  squares: GameMark[] | null;
  /** `W 4 · L 5 · – 2`, for a row past ten games; null when squares are drawn. */
  counts: string | null;
  /** The games, spoken: `2 won, 1 lost`. */
  aria: string;
  games: number;
};

/** The most games a row draws as squares. */
export const SQUARES_MAX = 10;

const MISSING: Record<string, string> = { W: "white", U: "blue", B: "black", R: "red", G: "green" };

const shortName = (name: string) => name.split(",")[0].trim();

function commanderThumb(c: OpponentCommander | null): Thumb {
  return c?.imageUri ? { kind: "art", imageUri: c.imageUri } : { kind: "blank" };
}

const ORDER: GameMark[] = ["W", "D", "L", "-"];

function drawn(cell: { summary: { count: number }; marks: readonly GameMark[] }) {
  const copy = gameMatchupsCopy.matchups;
  const n = (m: GameMark) => cell.marks.filter((x) => x === m).length;
  const [w, d, l, o] = [n("W"), n("D"), n("L"), n("-")];
  const squares = cell.summary.count <= SQUARES_MAX ? ORDER.flatMap((m) => cell.marks.filter((x) => x === m)) : null;
  return {
    squares,
    counts: squares === null ? copy.counts(w, l, d, o) : null,
    aria: copy.squareAria(w, l, d, o),
    games: cell.summary.count,
  };
}

export function identityName(colorIdentity: readonly string[]): { name: string; sub: string | null } {
  const copy = gameMatchupsCopy.matchups;
  if (colorIdentity.length === 0) return { name: copy.colorless, sub: null };
  if (colorIdentity.length === 5) return { name: copy.fiveColors, sub: null };
  if (colorIdentity.length === 4) {
    const missing = Object.keys(MISSING).find((c) => !colorIdentity.includes(c));
    return { name: copy.fourColors, sub: missing ? copy.fourColorsSub(MISSING[missing]) : null };
  }
  return { name: colorLabel([...colorIdentity]), sub: null };
}

export function matchupRows(matchups: Matchups, split: MatchupSplit): MatchupRow[] {
  if (split === "commanders") {
    return matchups.commanders.map((c) => ({
      key: c.key,
      thumb: commanderThumb(c.commander),
      name: c.partner ? `${shortName(c.commander.name)} + ${shortName(c.partner.name)}` : c.commander.name,
      sub: null,
      ...drawn(c),
    }));
  }
  if (split === "identities") {
    return matchups.identities.map((c) => ({
      key: c.key,
      thumb: { kind: "pips", colorIdentity: c.colorIdentity },
      ...identityName(c.colorIdentity),
      ...drawn(c),
    }));
  }
  return matchups.friends.map((c) => ({
    key: c.key,
    thumb: c.commander?.imageUri ? { kind: "art", imageUri: c.commander.imageUri } : { kind: "initials", name: c.name },
    name: c.name,
    sub: null,
    ...drawn(c),
  }));
}

/** The one line above the rows when most of them are a single game: `mostlyOne`, `allOne`, or none. */
export function singleGameCaption(rows: readonly Pick<MatchupRow, "games">[]): "allOne" | "mostlyOne" | null {
  if (rows.length === 0) return null;
  const single = rows.filter((r) => r.games === 1).length;
  if (single === rows.length) return "allOne";
  return single * 2 > rows.length ? "mostlyOne" : null;
}
