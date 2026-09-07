import "./lib/env.mjs";
import { and, eq, inArray } from "drizzle-orm";

/**
 * `pnpm db:seed:games` — give the local fixture decks a play history.
 *
 *   --user <clerkId>  required
 *   --dry-run         resolve the decks and report; write nothing
 *
 * The game log's whole argument is a threshold: below three games the panel
 * describes, at or above it the panel makes a finding. That is unreviewable on
 * an empty database and tedious to reach by hand, so each fixture deck below is
 * seeded to sit at a different point on that scale — one deck per state, all
 * under one login, so the states can be compared side by side rather than
 * reconstructed one at a time.
 *
 * Decks are matched by name and skipped when absent, so this is safe to run
 * against a branch that has only some of them. It is idempotent: the games it
 * seeded are deleted before the new ones are written, and the axis rows go with
 * them by cascade.
 */

import type { AxisPolarity, GameAxisKey } from "../src/lib/decks/game-axes";

type GameResult = "win" | "loss" | "draw";

type SeedGame = {
  result: GameResult;
  podSize: number;
  /** Whole days before today. The list is written oldest-first for readability. */
  daysAgo: number;
  worked: GameAxisKey[];
  hurt: GameAxisKey[];
};

type SeedDeck = {
  deckName: string;
  /** What this deck is here to show. Printed, so a reader of the output knows where to look. */
  demonstrates: string;
  games: SeedGame[];
};

/**
 * One deck per point on the threshold scale. The tallies are deliberate:
 *
 * - Atraxa is the mature case — a clear Fix, a clear Keep, a genuinely Mixed
 *   axis, one game carrying no marks at all, and a draw, so the record renders
 *   its three-figure form and the sub-line takes its "marked in 8 of 9" branch.
 * - Korvold sits exactly on PATTERN_MIN and is marked in every game, which is
 *   the sub-line's other branch. Its Fix is card_flow at 3 of 3 — the same
 *   sentence the empty state quotes as its pitch.
 * - Kitchen table brew is the two-game leaning, Weekend jank the one-game
 *   description, and Avail gate 2 is deliberately absent so the empty state
 *   stays reachable on a deck that is otherwise real.
 */
const SEED: SeedDeck[] = [
  {
    deckName: "Atraxa Superfriends",
    demonstrates: "9 games — Fix (cards in hand, 7 of 9), Keep (board), a Mixed axis, one unmarked game, record 4-4-1",
    games: [
      { result: "loss", podSize: 4, daysAgo: 20, worked: ["board"], hurt: ["card_flow", "speed"] },
      { result: "win", podSize: 4, daysAgo: 18, worked: ["board", "engine"], hurt: ["card_flow"] },
      { result: "loss", podSize: 3, daysAgo: 15, worked: [], hurt: ["card_flow", "mana"] },
      { result: "win", podSize: 5, daysAgo: 13, worked: ["board", "mana"], hurt: ["card_flow"] },
      { result: "draw", podSize: 4, daysAgo: 11, worked: [], hurt: [] },
      { result: "loss", podSize: 4, daysAgo: 8, worked: ["board"], hurt: ["card_flow", "closing"] },
      { result: "win", podSize: 3, daysAgo: 6, worked: ["board", "mana"], hurt: ["card_flow"] },
      { result: "loss", podSize: 5, daysAgo: 3, worked: ["board"], hurt: ["card_flow", "mana"] },
      { result: "win", podSize: 4, daysAgo: 1, worked: ["board", "engine", "resilience"], hurt: [] },
    ],
  },
  {
    deckName: "Korvold Treasure Sacrifice Value Engine",
    demonstrates: "3 games — exactly PATTERN_MIN, the pass where the panel starts making findings",
    games: [
      { result: "loss", podSize: 4, daysAgo: 12, worked: [], hurt: ["card_flow", "speed"] },
      { result: "loss", podSize: 4, daysAgo: 7, worked: ["closing"], hurt: ["card_flow"] },
      { result: "win", podSize: 3, daysAgo: 2, worked: ["closing", "board"], hurt: ["card_flow"] },
    ],
  },
  {
    deckName: "Kitchen table brew",
    demonstrates: "2 games — the leaning: noticed, not yet called a pattern",
    games: [
      { result: "loss", podSize: 4, daysAgo: 9, worked: [], hurt: ["interaction", "mana"] },
      { result: "loss", podSize: 5, daysAgo: 4, worked: ["speed"], hurt: ["interaction"] },
    ],
  },
  {
    deckName: "Weekend jank",
    demonstrates: "1 game — the description: no colour, and neither Keep nor Fix on screen",
    games: [
      { result: "win", podSize: 3, daysAgo: 5, worked: ["speed", "board"], hurt: ["closing"] },
    ],
  },
];

type Args = { user: string | null; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { user: null, dryRun: false };
  const value = (flag: string, next: string | undefined) => {
    if (next === undefined || next.startsWith("--")) throw new Error(`${flag} needs a value`);
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--user") args.user = value("--user", argv[++i]);
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else throw new Error(`unknown argument "${argv[i]}"`);
  }
  return args;
}

/** Host only — the connection string carries the password. */
function databaseHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  try {
    return new URL(url).host;
  } catch {
    return "<unparseable DATABASE_URL>";
  }
}

/** An evening, so the date reads as a game night rather than a timestamp. */
function playedAt(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(20, 30, 0, 0);
  return d;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.user) {
    throw new Error("--user <clerkId> is required (a deck's games belong to exactly one user)");
  }

  const { db } = await import("../src/db");
  const { deckGames, deckGameAxes, decks } = await import("../src/db/schema");

  const owned = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .where(eq(decks.userId, args.user));
  const byName = new Map(owned.map((d) => [d.name, d.id]));

  console.log(`database: ${databaseHost()}`);
  console.log(`user:     ${args.user} (${owned.length} decks)`);
  console.log("");

  const planned = SEED.map((deck) => ({ ...deck, deckId: byName.get(deck.deckName) ?? null }));
  for (const deck of planned) {
    const mark = deck.deckId ? "seed" : "skip";
    console.log(`[${mark}] ${deck.deckName} — ${deck.deckId ? deck.demonstrates : "not found on this account"}`);
  }
  console.log("");

  const targets = planned.filter((d): d is typeof d & { deckId: string } => d.deckId !== null);
  if (targets.length === 0) throw new Error("none of the fixture decks exist on this account");

  if (args.dryRun) {
    console.log("dry run — nothing written.");
    return;
  }

  // Delete first so a re-run replaces rather than accumulates. deck_game_axes
  // cascades from deck_games, so it needs no statement of its own.
  const deleted = await db
    .delete(deckGames)
    .where(and(eq(deckGames.userId, args.user), inArray(deckGames.deckId, targets.map((d) => d.deckId))))
    .returning({ id: deckGames.id });

  let written = 0;
  for (const deck of targets) {
    for (const game of deck.games) {
      const [row] = await db
        .insert(deckGames)
        .values({
          deckId: deck.deckId,
          userId: args.user,
          result: game.result,
          podSize: game.podSize,
          playedAt: playedAt(game.daysAgo),
        })
        .returning({ id: deckGames.id });

      const marks: { gameId: string; axis: GameAxisKey; polarity: AxisPolarity }[] = [
        ...game.worked.map((axis) => ({ gameId: row.id, axis, polarity: "worked" as const })),
        ...game.hurt.map((axis) => ({ gameId: row.id, axis, polarity: "hurt" as const })),
      ];
      if (marks.length > 0) await db.insert(deckGameAxes).values(marks);
      written++;
    }
  }

  console.log(`removed ${deleted.length} existing games; wrote ${written} across ${targets.length} decks.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
