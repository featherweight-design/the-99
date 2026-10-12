// `check:list-cache`'s failure paths, each written as the shape that would let a stale page pass.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  listCacheProblems, loaderFiles, schemaTables, socialKeyProblems, tablesRead, triggeredTables, unrecordedCatches,
} from "./list-cache-tables.mjs";

const create = (table: string, column: string, deferred = true) =>
  `CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "${table}"\n  ` +
  `${deferred ? "DEFERRABLE INITIALLY DEFERRED " : ""}FOR EACH ROW EXECUTE FUNCTION user_data_touch('${column}');`;

describe("schemaTables", () => {
  it("names a table per-user by its own owner column, and catalog-wide without one", () => {
    const tables = schemaTables(`
export const decks = pgTable("decks", { id: uuid("id"), userId: text("user_id") });
export const deckCards = pgTable("deck_cards", { deckId: uuid("deck_id").references(() => decks.id) });
export const cards = pgTable("cards", { oracleId: uuid("oracle_id") }, (t) => [index("user_id_lookup").on(t.oracleId)]);
`);
    expect(tables.get("decks")).toEqual({ name: "decks", owner: "user_id" });
    expect(tables.get("deckCards")).toEqual({ name: "deck_cards", owner: "deck_id" });
    // A table whose body only MENTIONS an owner column's name (here inside an index name) is
    // still catalog-wide: the owner is a column of its own, declared as `("user_id")`.
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

describe("unrecordedCatches", () => {
  const file = (source: string) => {
    const path = join(mkdtempSync(join(tmpdir(), "list-cache-")), "loader.ts");
    writeFileSync(path, source);
    return path;
  };

  it("reports a .catch that hands back a value without recording it", () => {
    expect(unrecordedCatches([file("const x = await read().catch(() => null);")])).toHaveLength(1);
  });

  it("reports a catch statement that falls back without recording it", () => {
    expect(unrecordedCatches([file("try { a(); } catch (err) {\n  log(err);\n  return new Map();\n}")])).toHaveLength(1);
  });

  it("does not count a conditional rethrow as recording: the other branch still falls back", () => {
    expect(unrecordedCatches([file("try { a(); } catch (err) {\n  if (strict) throw err;\n  return [];\n}")])).toHaveLength(1);
  });

  it("accepts a fallback that records itself, and a catch that says why it is not one", () => {
    expect(unrecordedCatches([file([
      "const x = await read().catch(() => {\n  recordSoftFailure();\n  return null;\n});",
      "try { a(); } catch {\n  // not a fallback: the key alone is affected.\n  return KEY;\n}",
    ].join("\n"))])).toEqual([]);
  });

  it("reads a catch body to its own closing brace, not past it", () => {
    // The marker belongs to the SECOND catch; the first must still be reported.
    expect(unrecordedCatches([file(
      "try { a(); } catch { return null; }\ntry { b(); } catch {\n  // not a fallback: rethrown.\n  throw e;\n}",
    )])).toHaveLength(1);
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

  it("reads the stamp, and never counts it as a table the stamp must cover", () => {
    expect(loaderFiles()).toContain("src/lib/cache/user-data-stamp.ts");
    expect(tablesRead().perUser.map((t) => t.name)).not.toContain("user_data_stamps");
  });

  it("has no table the pages read that the stamp does not cover", () => {
    expect(listCacheProblems()).toEqual([]);
  });

  it("has no fallback on the pages' path that the cache would store", () => {
    expect(unrecordedCatches()).toEqual([]);
  });
});

describe("socialKeyProblems", () => {
  const page = "src/app/decks/shopping/page.tsx";
  const reach = (files: string[]) => () => [page, ...files];

  it("fails a cached page that reaches src/lib/social without friendGeneration in its key", () => {
    const problems = socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => "cachePageForUser(userId, 'cart', [], load)");
    expect(problems).toEqual([expect.stringContaining(`FRIEND KEY ${page} reaches src/lib/social/spares.ts`)]);
  });

  it("passes it once the key carries friendGeneration", () => {
    const src = "cachePageForUser(userId, 'cart', [await friendGeneration(userId)], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toEqual([]);
  });

  it("fails a friendGeneration that is not in the key: a comment, an unused call, or inside the loader", () => {
    for (const src of [
      "// friendGeneration(userId)\ncachePageForUser(userId, 'cart', [], load)",
      "const g = await friendGeneration(userId);\ncachePageForUser(userId, 'cart', [], load)",
      "cachePageForUser(userId, 'cart', [], async () => ({ value: await friendGeneration(userId) }))",
      "cachePageForUser(userId, 'cart', [\"friendGeneration(\"], load)",
      "cachePageForUser(userId, 'cart', [`friendGeneration(`], load)",
    ]) {
      expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
    }
  });

  it("fails a page where one cache call carries it and another does not", () => {
    const src = "cachePageForUser(userId, 'a', [await friendGeneration(userId)], load)\ncachePageForUser(userId, 'b', [], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
  });

  it("counts a friendGeneration inside a template interpolation, which is code", () => {
    const src = "cachePageForUser(userId, 'cart', [`f:${await friendGeneration(userId)}`], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toEqual([]);
  });

  it("reads the key past a string holding a comma or a paren", () => {
    const src = "cachePageForUser(userId, 'a,(b', [await friendGeneration(userId)], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toEqual([]);
  });

  it("holds no page that reaches no social module", () => {
    expect(socialKeyProblems([page], reach(["src/lib/decks/cart.ts"]), () => "")).toEqual([]);
  });

  it("holds the shipped tree's cached pages", () => {
    expect(socialKeyProblems()).toEqual([]);
  });
});

