import "./lib/env.mjs";
import { and, eq, inArray, sql } from "drizzle-orm";

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
 * against a branch that has only some of them.
 *
 * IT IS DESTRUCTIVE. Re-running replaces rather than accumulates, and the way it
 * does that is to delete every game this user has on each matched deck — not only
 * the games a previous run of this script wrote. There is nothing on a row marking
 * it as seeded, so real play history on a deck that shares one of these names would
 * go with it, and the axis rows follow by cascade. The plan printed before any
 * write names each deck's current game count for that reason, and --dry-run prints
 * the same plan without touching anything.
 *
 * Two decks can carry the same name — there is no unique index on
 * (user_id, name) — so a duplicate is refused rather than resolved, since either
 * choice would be a guess about which one to overwrite.
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
    .select({
      id: decks.id,
      name: decks.name,
      games: sql<number>`count(${deckGames.id})::int`,
    })
    .from(decks)
    // Joined on the same predicate the delete below uses, so the count printed in
    // the plan is exactly the set of rows that run would remove. A game whose
    // user_id disagrees with its deck's owner is corrupt data this script leaves
    // alone rather than quietly reassigns.
    .leftJoin(deckGames, and(eq(deckGames.deckId, decks.id), eq(deckGames.userId, args.user)))
    .where(eq(decks.userId, args.user))
    .groupBy(decks.id, decks.name);

  // Nothing stops a user owning two decks with the same name, and a Map would
  // silently keep the last one — which is a coin toss about whose history the
  // delete below destroys. Refuse instead.
  const named = new Map<string, typeof owned>();
  for (const deck of owned) named.set(deck.name, [...(named.get(deck.name) ?? []), deck]);
  const ambiguous = SEED.map((s) => s.deckName).filter((name) => (named.get(name)?.length ?? 0) > 1);
  if (ambiguous.length > 0) {
    throw new Error(
      `this account owns more than one deck named ${ambiguous.map((n) => `"${n}"`).join(", ")}; ` +
        "rename or remove the duplicate — seeding one of them would delete the other's games at random",
    );
  }

  console.log(`database: ${databaseHost()}`);
  console.log(`user:     ${args.user} (${owned.length} decks)`);
  console.log("");

  const planned = SEED.map((deck) => ({ ...deck, match: named.get(deck.deckName)?.[0] ?? null }));
  for (const deck of planned) {
    if (!deck.match) {
      console.log(`[skip] ${deck.deckName} — not found on this account`);
      continue;
    }
    // The existing count is the warning: a non-zero one is history this run destroys.
    const existing =
      deck.match.games === 0
        ? "no games yet"
        : `DELETES ${deck.match.games} existing game${deck.match.games === 1 ? "" : "s"}`;
    console.log(`[seed] ${deck.deckName} — ${existing} — ${deck.demonstrates}`);
  }
  console.log("");

  const targets = planned.filter((d): d is typeof d & { match: NonNullable<typeof d.match> } => d.match !== null);
  if (targets.length === 0) throw new Error("none of the fixture decks exist on this account");

  if (args.dryRun) {
    console.log("dry run — nothing written.");
    return;
  }

  // Delete first so a re-run replaces rather than accumulates. This removes every
  // game this user has on these decks, not only the ones a previous run wrote —
  // nothing marks a row as seeded — so a deck listed above with a non-zero count
  // loses that history here. The predicate matches the count query's join, so the
  // number printed in the plan is the number of rows removed. deck_game_axes
  // cascades, so it needs no statement of its own.
  const deleted = await db
    .delete(deckGames)
    .where(and(eq(deckGames.userId, args.user), inArray(deckGames.deckId, targets.map((d) => d.match.id))))
    .returning({ id: deckGames.id });

  let written = 0;
  for (const deck of targets) {
    for (const game of deck.games) {
      const [row] = await db
        .insert(deckGames)
        .values({
          deckId: deck.match.id,
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

  console.log(`deleted ${deleted.length} existing games; wrote ${written} across ${targets.length} decks.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
