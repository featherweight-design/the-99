// `check:list-cache`'s failure paths, each written as the shape that would let a stale page pass.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  KEYED_BY_SWITCHES, listCacheProblems, loaderFiles, schemaTables, socialKeyProblems, switchReaders, tablesRead, triggeredTables, unrecordedCatches,
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

  it("does not ask the stamp to cover the switch overrides, which reach a page through its key", () => {
    const keyed = [...KEYED_BY_SWITCHES].map((name) => ({ name, owner: "user_id" }));
    expect(listCacheProblems([...read, ...keyed], new Map([["decks", "user_id"], ["deck_cards", "deck_id"]]))).toEqual([]);
  });
});

describe("switchReaders", () => {
  it("follows a barrel's value re-export to the snapshot", () => {
    const dir = mkdtempSync(join(process.cwd(), "src/lib/.switch-barrel-"));
    const barrel = join(dir, "barrel.ts");
    const loader = join(dir, "loader.ts");
    writeFileSync(barrel, 'export { resolveSwitchEnv } from "../switches/snapshot";\n');
    writeFileSync(loader, 'import { resolveSwitchEnv } from "./barrel";\nexport const x = resolveSwitchEnv;\n');
    const page = join(dir, "page.tsx");
    writeFileSync(page, 'import { x } from "./loader";\nexport default x;\n');
    const rel = (f: string) => f.slice(process.cwd().length + 1);
    try {
      const files = loaderFiles([rel(page)]);
      expect(files).toEqual(expect.arrayContaining([rel(barrel), "src/lib/switches/snapshot.ts"]));
      expect(switchReaders(files)).toEqual([expect.stringMatching(new RegExp(`^KEYED {3}${rel(barrel)}`))]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("exempts the snapshot alone, not a helper placed beside it", () => {
    const dir = mkdtempSync(join(process.cwd(), "src/lib/switches/.reader-"));
    const file = join(dir, "helper.ts");
    writeFileSync(file, 'import { flagGroupMembers } from "../../../db/schema";\nexport const x = flagGroupMembers;\n');
    try {
      expect(switchReaders([file.slice(process.cwd().length + 1)])).toEqual([expect.stringMatching(/^KEYED/)]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("reports a loader on the pages' path that reads the overrides itself", () => {
    const dir = mkdtempSync(join(process.cwd(), "src/lib/.switch-reader-"));
    const file = join(dir, "loader.ts");
    writeFileSync(file, 'import { resolveSwitchEnv } from "../switches/snapshot";\nexport const x = resolveSwitchEnv;\n');
    const rel = file.slice(process.cwd().length + 1);
    try {
      expect(switchReaders([rel])).toEqual([expect.stringMatching(/^KEYED/)]);
      expect(switchReaders(["src/lib/cache/page-cache.ts"])).toEqual([]);
      // Naming a table directly reads it as surely as the snapshot does.
      writeFileSync(file, 'import { flagOverrides } from "../../db/schema";\nexport const x = flagOverrides;\n');
      expect(switchReaders([rel])).toEqual([expect.stringMatching(/^KEYED/)]);
      writeFileSync(file, 'export const q = "select value from flag_group_members";\n');
      expect(switchReaders([rel])).toEqual([expect.stringMatching(/^KEYED/)]);
      writeFileSync(file, "// flag_overrides is read by page-cache alone\nexport const y = 1;\n");
      expect(switchReaders([rel])).toEqual([]);
      expect(switchReaders(["src/lib/switches/snapshot.ts", "src/lib/switches/resolve.ts", "src/lib/switches/registry.ts"])).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
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

  it("reads the switch overrides only in page-cache.ts, to build the key", () => {
    expect(loaderFiles()).toContain("src/lib/switches/snapshot.ts");
    expect(tablesRead().perUser.map((t) => t.name)).toEqual(expect.arrayContaining([...KEYED_BY_SWITCHES]));
    expect(switchReaders()).toEqual([]);
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

  it("fails an unawaited generation, which keys the string of a Promise", () => {
    const src = "cachePageForUser(userId, 'cart', [`f:${friendGeneration(userId)}`], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
  });

  it("fails a generation taken for another reader than the cache call's", () => {
    const src = "cachePageForUser(userId, 'cart', [await friendGeneration(otherId)], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
  });

  it("fails a page where one cache call carries it and another does not", () => {
    const src = "cachePageForUser(userId, 'a', [await friendGeneration(userId)], load)\ncachePageForUser(userId, 'b', [], load)";
    expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
  });

  it("fails a generation that is not a bare key element: interpolated, or folded into an expression", () => {
    for (const key of ["[`f:${await friendGeneration(userId)}`]", "[(await friendGeneration(userId)) && 'constant']", "[await friendGeneration(userId) && 'c']"]) {
      const src = `cachePageForUser(userId, 'cart', ${key}, load)`;
      expect(socialKeyProblems([page], reach(["src/lib/social/spares.ts"]), () => src)).toHaveLength(1);
    }
  });

  it("passes a bare element beside other key parts", () => {
    const src = "cachePageForUser(userId, 'cart', [sort, await friendGeneration(userId)], load)";
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

