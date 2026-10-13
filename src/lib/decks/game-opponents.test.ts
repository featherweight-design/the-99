import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleOpponents, gameOpponentsQuery } from "./game-opponents";

const A = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const B = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

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
    ]);
    expect(out.get("g1")![0].friend).toEqual({ key: "f1", name: "Dave" });
    expect(out.get("g2")!.map((s) => s.friend)).toEqual([{ key: "f1", name: "David" }, { key: "n:Gone", name: "Gone" }]);
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
  const ALLOWED = new Set([
    "src/db/schema.ts",
    "src/lib/decks/game-opponents.ts",
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
    const IMPORTERS = new Set(["src/lib/decks/matchups.ts"]);
    const importers = walk("src").filter((p) => /from\s+["'][^"']*\/(?:game-opponents|matchups)["']/.test(readFileSync(p, "utf8")));
    expect(importers).toContain("src/lib/decks/matchups.ts");
    expect(importers.filter((p) => !IMPORTERS.has(p))).toEqual([]);
  });
});
