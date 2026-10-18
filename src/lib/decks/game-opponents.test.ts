import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleOpponents, gameOpponentsQuery, opponentRows, parseOpponents, withTableSeats, type ResolvedOpponent } from "./game-opponents";

const A = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const B = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const C = "8b1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const loss = { podSize: 4, result: "loss" };
const win = { podSize: 4, result: "win" };

describe("parseOpponents", () => {
  it("takes no opponents as none", () => {
    expect(parseOpponents(undefined, loss)).toEqual([]);
    expect(parseOpponents([], loss)).toEqual([]);
  });

  it("reads each kind of seat", () => {
    expect(parseOpponents([
      { friend: A, deck: B },
      { friend: C, commander: A },
      { commander: B, partner: C, label: "  Sam  " },
      { label: "Jo" },
    ].slice(0, 3), loss)).toEqual([
      { kind: "friendDeck", friend: A, deck: B, won: false },
      { kind: "friend", friend: C, commander: A, partner: null, won: false },
      { kind: "other", commander: B, partner: C, label: "Sam", won: false },
    ]);
    expect(parseOpponents([{ label: "Jo" }], loss)).toEqual([{ kind: "other", commander: null, partner: null, label: "Jo", won: false }]);
  });

  it("holds at most pod size minus one seats", () => {
    expect(parseOpponents([{ label: "a" }, { label: "b" }, { label: "c" }], loss)).toHaveLength(3);
    expect(parseOpponents([{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }], loss)).toBeNull();
    expect(parseOpponents([{ label: "a" }, { label: "b" }], { podSize: 2, result: "loss" })).toBeNull();
  });

  it("marks one winner, and only on a loss (Q15)", () => {
    expect(parseOpponents([{ label: "a", won: true }, { label: "b" }], loss)?.map((o) => o.won)).toEqual([true, false]);
    expect(parseOpponents([{ label: "a", won: true }, { label: "b", won: true }], loss)).toBeNull();
    expect(parseOpponents([{ label: "a", won: true }], win)).toBeNull();
    expect(parseOpponents([{ label: "a", won: true }], { podSize: 4, result: "draw" })).toBeNull();
    expect(parseOpponents([{ label: "a", won: "yes" }], loss)).toBeNull();
  });

  it("refuses a seat that names nobody", () => {
    expect(parseOpponents([{}], loss)).toBeNull();
    expect(parseOpponents([{ label: "   " }], loss)).toBeNull();
    expect(parseOpponents([{ won: false }], loss)).toBeNull();
  });

  it("refuses a malformed shape", () => {
    for (const bad of [
      "seat", {}, [null], [[A]], [{ friend: "nope" }], [{ friend: A, deck: "nope" }], [{ commander: 7 }],
      [{ commander: A, partner: A }], [{ partner: A }], [{ deck: B }], [{ label: 5 }],
    ]) expect(parseOpponents(bad, loss), JSON.stringify(bad)).toBeNull();
  });

  it("snapshots a friend's deck, so nothing may ride beside it", () => {
    expect(parseOpponents([{ friend: A, deck: B, commander: C }], loss)).toBeNull();
    expect(parseOpponents([{ friend: A, label: "Dave" }], loss)).toBeNull();
  });

  it("seats a friend once", () => {
    expect(parseOpponents([{ friend: A }, { friend: A, deck: B }], loss)).toBeNull();
  });

  it("refuses a label over 30 code points or holding a control character", () => {
    expect(parseOpponents([{ label: "x".repeat(30) }], loss)).not.toBeNull();
    expect(parseOpponents([{ label: "x".repeat(31) }], loss)).toBeNull();
    expect(parseOpponents([{ label: "a\u0007b" }], loss)).toBeNull();
  });
});

// A seat from a Rule 0 table (plan §PR 8) names its number and nothing else: who sat there is read on the server.
describe("parseOpponents, table seats", () => {
  it("reads a seat number, beside a winner mark and the other kinds", () => {
    expect(parseOpponents([{ tableSeat: 2, won: true }, { tableSeat: 4 }, { label: "Jo" }], loss)).toEqual([
      { kind: "tableSeat", seat: 2, won: true },
      { kind: "tableSeat", seat: 4, won: false },
      { kind: "other", commander: null, partner: null, label: "Jo", won: false },
    ]);
  });

  it("refuses anything sent beside the number", () => {
    for (const extra of [{ friend: A }, { deck: B }, { commander: A }, { partner: A }, { label: "Max" }, { name: "Max" }]) {
      expect(parseOpponents([{ tableSeat: 2, ...extra }], loss), JSON.stringify(extra)).toBeNull();
    }
  });

  it("takes a whole seat from 1 to 8, each once", () => {
    for (const seat of [0, 9, 1.5, -1, "2", null]) expect(parseOpponents([{ tableSeat: seat === null ? {} : seat }], loss), String(seat)).toBeNull();
    expect(parseOpponents([{ tableSeat: 1 }], loss)).not.toBeNull();
    expect(parseOpponents([{ tableSeat: 8 }], { podSize: 8, result: "loss" })).not.toBeNull();
    expect(parseOpponents([{ tableSeat: 3 }, { tableSeat: 3 }], loss)).toBeNull();
  });

  it("still marks one winner, and only on a loss", () => {
    expect(parseOpponents([{ tableSeat: 2, won: true }, { label: "Jo", won: true }], loss)).toBeNull();
    expect(parseOpponents([{ tableSeat: 2, won: true }], win)).toBeNull();
  });
});

describe("withTableSeats", () => {
  const parsed = parseOpponents([{ label: "Jo" }, { tableSeat: 2, won: true }, { tableSeat: 3 }, { tableSeat: 4 }], { podSize: 5, result: "loss" })!;
  const table = [
    { kind: "friend" as const, friend: A, deck: B },
    { kind: "friend" as const, friend: C, deck: null },
    { kind: "other" as const, commander: A, partner: null, label: "Max" },
  ];

  it("puts what the table resolved in each table seat's place, keeping its winner mark", () => {
    expect(withTableSeats(parsed, table)).toEqual([
      { kind: "other", commander: null, partner: null, label: "Jo", won: false },
      { kind: "friendDeck", friend: A, deck: B, won: true },
      { kind: "friend", friend: C, commander: null, partner: null, won: false },
      { kind: "other", commander: A, partner: null, label: "Max", won: false },
    ]);
  });

  it("refuses when the table refused, or answered for a different number of seats", () => {
    expect(withTableSeats(parsed, null)).toBeNull();
    expect(withTableSeats(parsed, table.slice(1))).toBeNull();
  });

  it("refuses a friend seated twice, once picked and once from the table", () => {
    const twice = parseOpponents([{ friend: A }, { tableSeat: 2 }], loss)!;
    expect(withTableSeats(twice, [{ kind: "friend", friend: A, deck: null }])).toBe("twice");
  });

  it("passes a parse with no table seat through", () => {
    const plain = parseOpponents([{ label: "Jo" }], loss)!;
    expect(withTableSeats(plain, [])).toEqual(plain);
  });
});

describe("opponentRows", () => {
  it("numbers seats from 1 and lays each friend's facts on its own seat", () => {
    const parsed = withTableSeats(parseOpponents([{ label: "Sam", won: true }, { friend: A, deck: B }, { friend: C, commander: A }], loss)!, [])! as ResolvedOpponent[];
    const facts = (id: string, deck: string | null) => ({
      friendUserId: id, friendNameThen: id, friendDeckId: deck, deckNameThen: deck && "Yuriko",
      commanderOracleId: deck && C, partnerOracleId: null,
    });
    const rows = opponentRows("g", parsed, [facts("u_a", B), facts("u_c", null)]);
    expect(rows.map((r) => [r.seat, r.label, r.friendUserId, r.friendDeckId, r.commanderOracleId, r.won])).toEqual([
      [1, "Sam", null, null, null, true],
      [2, null, "u_a", B, C, false],
      [3, null, "u_c", null, A, false],
    ]);
  });
});

describe("gameOpponentsQuery", () => {
  it("reads only the owner's games on the deck", () => {
    const q = gameOpponentsQuery(A, "user_me").toSQL();
    expect(q.sql).toContain(`inner join "deck_games" on "deck_games"."id" = "deck_game_opponents"."game_id"`);
    expect(q.sql).toMatch(/where \("deck_games"\."deck_id" = \$1 and "deck_games"\."user_id" = \$2\)/);
    expect(q.sql).toContain(`left join "cards" "partner_card" on "partner_card"."oracle_id" = "deck_game_opponents"."partner_oracle_id"`);
  });
});

describe("assembleOpponents", () => {
  const row = (over: object) => ({
    gameId: "g1", seat: 1, friendUserId: null, friendNameThen: null, deckNameThen: null, label: null, won: false,
    commanderOracleId: null, commanderName: null, commanderIdentity: null,
    partnerOracleId: null, partnerName: null, partnerIdentity: null, ...over,
  });

  it("groups a friend's seats under one opaque key and never returns the account id", () => {
    const out = assembleOpponents([
      row({ friendUserId: "user_dave", friendNameThen: "Dave" }),
      row({ gameId: "g2", friendUserId: "user_dave", friendNameThen: "David" }),
      row({ gameId: "g2", seat: 2, friendUserId: null, friendNameThen: "Gone" }),
      row({ gameId: "g3", friendUserId: null, friendNameThen: "Gone" }),
    ]);
    expect(out.get("g1")![0].friend).toEqual({ key: "f1", name: "Dave" });
    expect(out.get("g2")!.map((s) => s.friend)).toEqual([{ key: "f1", name: "David" }, { key: "gone:g2:2", name: "Gone" }]);
    // Two seats of deleted accounts sharing a name are not assumed to be one person.
    expect(out.get("g3")![0].friend!.key).not.toBe(out.get("g2")![1].friend!.key);
    expect(JSON.stringify([...out.values()])).not.toContain("user_dave");
  });

  it("joins the pair's color identity in WUBRG order", () => {
    const out = assembleOpponents([row({
      commanderOracleId: A, commanderName: "Tymna", commanderIdentity: ["W", "B"],
      partnerOracleId: B, partnerName: "Thrasios", partnerIdentity: ["U", "G"],
    })]);
    expect(out.get("g1")![0]).toMatchObject({ commander: { name: "Tymna" }, partner: { name: "Thrasios" }, colorIdentity: ["W", "U", "B", "G"] });
  });
});

// The label is player-typed and a friend's name is typed by ANOTHER player, so neither may reach a model
// prompt (scope §4 "playerText": opponent names never do). The table is read only by the modules below;
// a prompt builder that started reading it would have to join this list in a reviewed diff, and with it
// take on `playerText` for every name it sends.
describe("who reads the opponents table", () => {
  // `discovery/fits.ts` (discovery R2·3) asks only WHETHER a deck has a game with an opponent recorded, for Matchups'
  // Try it: it selects the deck id alone, never a label, a name or a friend link, and sends nothing to a model.
  const ALLOWED = new Set([
    "src/db/schema.ts",
    "src/lib/decks/game-opponents.ts",
    "src/lib/discovery/fits.ts",
    "src/lib/social/purge.ts",
  ]);
  // Dot directories are skipped: other guards write short-lived fixtures under `src/lib/.name-*` and remove
  // them while this walk may be running.
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name.startsWith(".") ? [] : walk(path);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : [];
  });

  it("is only the modules named here", () => {
    const readers = walk("src").filter((p) => /deckGameOpponents|deck_game_opponents/.test(readFileSync(p, "utf8")));
    expect(readers.length).toBeGreaterThan(1);
    expect(readers.filter((p) => !ALLOWED.has(p))).toEqual([]);
  });

  it("and its read reaches only the game log's own modules, never a prompt builder", () => {
    // `deck-opponents-read.ts` is the deck page's Games tab read (R3 PR 1): it hands the seats and the matchups to
    // the page and sends neither to a model.
    // `deck-opponents-read.ts` is the deck page's Games tab read (R3 PR 1). `game-seats.ts` (PR 2) takes only the
    // `OpponentInput` TYPE. The four below (PR 4) take the seat and matchup TYPES to DRAW the snapshot: the History
    // row, its `vs` line, the Matchups section and its row rules. Each reads no opponent and sends no name to a model.
    const IMPORTERS = new Set([
      "src/app/decks/actions.ts", "src/lib/decks/matchups.ts", "src/lib/decks/deck-opponents-read.ts", "src/lib/decks/game-seats.ts",
      "src/components/decks/game-history-row.tsx", "src/components/decks/game-matchups.tsx", "src/components/decks/game-vs-line.tsx", "src/lib/decks/matchup-rows.ts",
    ]);
    const importers = walk("src").filter((p) => /from\s+["'][^"']*\/(?:game-opponents|matchups)["']/.test(readFileSync(p, "utf8")));
    expect(importers).toContain("src/app/decks/actions.ts");
    expect(importers.filter((p) => !IMPORTERS.has(p))).toEqual([]);
  });
});
