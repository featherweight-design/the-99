// `check:list-cache`'s failure paths, each written as the shape that would let a stale page pass.
import { describe, expect, it } from "vitest";

import {
  listCacheProblems, loaderFiles, schemaTables, tablesRead, triggeredTables,
} from "./list-cache-tables.mjs";

const create = (table: string, column: string, deferred = true) =>
  `CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "${table}"\n  ` +
  `${deferred ? "DEFERRABLE INITIALLY DEFERRED " : ""}FOR EACH ROW EXECUTE FUNCTION user_data_touch('${column}');`;

describe("schemaTables", () => {
  it("names a table per-user by its own owner column, and catalog-wide without one", () => {
    const tables = schemaTables(`
export const decks = pgTable("decks", { id: uuid("id"), userId: text("user_id") });
export const deckCards = pgTable("deck_cards", { deckId: uuid("deck_id").references(() => decks.id) });
export const cards = pgTable("cards", { oracleId: uuid("oracle_id") });
`);
    expect(tables.get("decks")).toEqual({ name: "decks", owner: "user_id" });
    expect(tables.get("deckCards")).toEqual({ name: "deck_cards", owner: "deck_id" });
    // A table whose body only MENTIONS another table's owner column in a reference is still
    // catalog-wide: the owner is a column of its own, in a `("...")` declaration.
    expect(tables.get("cards")).toEqual({ name: "cards", owner: null });
  });
});

describe("triggeredTables", () => {
  it("reads a deferred trigger and the column it was keyed on", () => {
    expect(triggeredTables([create("decks", "user_id")])).toEqual(new Map([["decks", "user_id"]]));
  });

  it("does not count a trigger that fires per statement, which is the one that can deadlock", () => {
    expect(triggeredTables([create("decks", "user_id", false)]).has("decks")).toBe(false);
  });

  it("lets a later migration's drop retire an earlier create", () => {
    expect(triggeredTables([create("decks", "user_id"), `DROP TRIGGER IF EXISTS user_data_touch ON "decks";`]).size).toBe(0);
  });

  it("keeps a create that follows a drop in the same migration", () => {
    expect(triggeredTables([`DROP TRIGGER IF EXISTS user_data_touch ON "decks";\n${create("decks", "user_id")}`]).get("decks")).toBe("user_id");
  });
});

describe("listCacheProblems", () => {
  const read = [{ name: "decks", owner: "user_id" }, { name: "deck_cards", owner: "deck_id" }];

  it("reports a table the pages read with no trigger", () => {
    expect(listCacheProblems(read, new Map([["decks", "user_id"]]))).toEqual([
      expect.stringMatching(/^MISSING deck_cards/),
    ]);
  });

  it("reports a trigger keyed on a column the table does not own", () => {
    expect(listCacheProblems(read, new Map([["decks", "user_id"], ["deck_cards", "user_id"]]))).toEqual([
      expect.stringMatching(/^WRONG {3}deck_cards/),
    ]);
  });
});

describe("the shipped tree", () => {
  it("follows the loaders and not the components", () => {
    const files = loaderFiles();
    expect(files).toContain("src/lib/decks/read.ts");
    expect(files.some((f) => f.startsWith("src/components/"))).toBe(false);
  });

  it("finds the tables the pages are known to read, including ones named only in raw SQL", () => {
    const names = tablesRead().perUser.map((t) => t.name);
    // The last four are named ONLY in the claim model's raw SQL, never by their Drizzle binding,
    // so a scan of bindings alone would miss them and pass a page that goes stale on a pull.
    for (const table of ["decks", "deck_cards", "collection_items", "deck_games", "commander_scores",
      "card_assignments", "deck_locks", "deck_proxies", "pull_releases"]) {
      expect(names).toContain(table);
    }
  });

  it("has no table the pages read that the stamp does not cover", () => {
    expect(listCacheProblems()).toEqual([]);
  });
});
