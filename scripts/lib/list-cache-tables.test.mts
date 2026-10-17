// `check:list-cache`'s failure paths, each written as the shape that would let a stale page pass.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  KEYED_BY_SWITCHES, listCacheProblems, loaderFiles, perRequestProblems, schemaTables, socialKeyProblems, switchReaders, tablesRead, triggeredTables, unrecordedCatches,
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
      expect(switchReaders(["src/lib/switches/snapshot.ts", "src/lib/switches/request.ts", "src/lib/switches/resolve.ts", "src/lib/switches/registry.ts"])).toEqual([]);
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

describe("perRequestProblems", () => {
  // A page and a listed module that both exist, so `namesImportedFrom` resolves the import as the real guard does.
  const page = "src/app/page.tsx";
  const listedModule = "src/lib/cache/page-cache.ts";
  const listedEntry = { [listedModule]: "read per request beside the cached payload" };
  const none = () => [] as string[];
  const fn = (body: string) => `export default async function Page() {\n${body}\n}`;
  const page_ = (body: string) => () => `import { readFresh } from "../lib/cache/page-cache";\n${fn(body)}`;
  const check = (src: () => string, opts: { perRequest?: Record<string, string>; reach?: string[]; exists?: boolean } = {}) =>
    perRequestProblems([page], opts.perRequest ?? listedEntry, () => opts.reach ?? [], src, () => opts.exists ?? true);

  it("passes a module the page calls only outside cachePageForUser's load", () => {
    const src = page_(`const data = await cachePageForUser(userId, "home", [day], async (env) => load(env));\nconst fresh = await readFresh(userId);`);
    expect(check(src)).toEqual([]);
  });

  const msg = (name: string, why: string) => `PER-REQUEST ${page} uses ${name} (from ${listedModule}) ${why}`;
  const inside = (name: string) => msg(name, "inside cachePageForUser's load, so it would be cached");
  const before = (name: string) => msg(name, "before cachePageForUser's load, where its result could reach the cached payload");
  const outside = (name: string) => msg(name, "outside the page's own function, where the load could call it");
  const unnamed = `PER-REQUEST ${page} imports ${listedModule} without naming what it uses, so its uses cannot be checked`;

  it("fails a call inside the load, naming the page, the export and the module", () => {
    const src = page_(`const data = await cachePageForUser(userId, "home", [day], async (env) => ({ fresh: await readFresh(userId) }));`);
    expect(check(src)).toEqual([inside("readFresh")]);
  });

  it("reads an aliased import by its local name", () => {
    const src = () => `import { readFresh as fresh } from "../lib/cache/page-cache";\n${fn(`const d = await cachePageForUser(u, "home", [], async () => fresh(u));`)}`;
    expect(check(src)).toEqual([inside("fresh")]);
  });

  it("reads a multiline import, and does not count the import itself as a use", () => {
    const src = () => `import {\n  readFresh,\n} from "../lib/cache/page-cache";\n${fn(`const d = await cachePageForUser(u, "home", [], load);\nconst f = await readFresh(u);`)}`;
    expect(check(src)).toEqual([]);
  });

  it("ignores the name in a comment, a string, a property name or a type inside the load", () => {
    const src = page_(`const d = await cachePageForUser(u, "home", [], async (): Promise<readFresh> => {\n  // readFresh(u) is read outside\n  return { readFresh: "readFresh", x: o.readFresh };\n});`);
    expect(check(src)).toEqual([]);
  });

  it("fails when a cached loader also imports the module", () => {
    const src = page_(`const d = await cachePageForUser(u, "home", [], load);\nawait readFresh(u);`);
    expect(check(src, { reach: [listedModule] })).toEqual([`PER-REQUEST ${listedModule} is imported by a loader on ${page}'s cached path, so it is not read per request`]);
  });

  it("fails a namespace or default import, alone or beside named ones", () => {
    const ns = () => `import * as fresh from "../lib/cache/page-cache";\nconst d = await cachePageForUser(u, "home", [], async () => fresh.readFresh(u));`;
    const alone = () => `import readFresh from "../lib/cache/page-cache";\nconst d = await cachePageForUser(u, "home", [], load);`;
    const beside = () => `import D, { readFresh } from "../lib/cache/page-cache";\nconst d = await cachePageForUser(u, "home", [], load);`;
    for (const src of [ns, alone, beside]) expect(check(src)).toEqual([unnamed]);
  });

  it("fails a captured result written before the load", () => {
    const src = page_(`const receipt = await readFresh(u);\nconst d = await cachePageForUser(u, "home", [], async () => ({ value: { receipt }, store: true }));`);
    expect(check(src)).toEqual([before("readFresh")]);
  });

  it("fails a use in any function but the page's own, before or after the call, however it is written", () => {
    const forms = [
      `async function load(u) { return { fresh: await readFresh(u) }; }\nconst d = await cachePageForUser(u, "home", [], load);`,
      `const pick = async (u) => readFresh(u);\nconst d = await cachePageForUser(u, "home", [], async () => ({ x: await pick(u) }));`,
      `const load = async () => ({\n  x: await readFresh(u),\n});\nconst d = await cachePageForUser(u, "home", [], load);`,
      `async function load({ u }) { return readFresh(u); }\nconst d = await cachePageForUser(u, "home", [], load);`,
      `const d = await cachePageForUser(u, "home", [], load);\nasync function load(u) { return readFresh(u); }`,
      `const d = await cachePageForUser(u, "home", [], load);\nasync function load(u): Promise<{ value: unknown; store: boolean }> { return { value: await readFresh(u), store: true }; }`,
      `const d = await cachePageForUser(u, "home", [], load);\nconst load = async () => ({ value: await readFresh(u), store: true });`,
      `const d = await cachePageForUser(u, "home", [], load);\nclass L { async run() { return readFresh(u); } }`,
    ];
    for (const f of forms) expect(check(page_(f)), f).toEqual([outside("readFresh")]);
  });

  it("passes a use after the call inside the page's own function, and a module-scope helper the page does not use the export in", () => {
    const src = page_(`async function load() { return { value: 1, store: true }; }\nexport default async function Page() {\n  const d = await cachePageForUser(u, "home", [], load);\n  let f = null;\n  try { f = await readFresh(u); } catch { f = null; }\n}`);
    expect(check(src)).toEqual([]);
  });

  it("fails a use after the call that sits in a loop around it", () => {
    const src = page_(`export default async function Page() {\n  let r;\n  for (const k of ks) {\n    await cachePageForUser(u, k, [], async () => ({ value: r, store: true }));\n    r = await readFresh(u);\n  }\n}`);
    expect(check(src)).toEqual([msg("readFresh", "in a loop around cachePageForUser's load, where its result could reach the next load")]);
  });

  it("fails a use after a cachePageForUser call that is started and awaited later, since its load may still be running", () => {
    const src = page_(`export default async function Page() {\n  let fresh;\n  const pending = cachePageForUser(u, "home", [], async () => ({ value: await fresh, store: true }));\n  fresh = readFresh(u);\n  await pending;\n}`);
    expect(check(src)).toEqual([msg("readFresh", "in a page that does not await every cachePageForUser call where it is made, so its load could still be running")]);
    const wrapped = page_(`export default async function Page() {\n  const d = await (cachePageForUser(u, "home", [], load));\n  await readFresh(u);\n}`);
    expect(check(wrapped)).toEqual([]);
  });

  const unchecked = msg("readFresh", "in a page whose cachePageForUser calls are not all made directly in one page function, so it cannot be checked");
  const raw = (body: string) => () => `import { readFresh } from "../lib/cache/page-cache";\n${body}`;

  it("fails a page whose cachePageForUser calls are in more than one function", () => {
    const src = raw(`async function a() { return cachePageForUser(u, "a", [], load); }\n${fn(`await cachePageForUser(u, "b", [], load);\nawait readFresh(u);`)}`);
    expect(check(src)).toEqual([unchecked]);
  });

  it("fails a read at module scope, which runs when the module loads rather than per request", () => {
    expect(check(raw(`const d = await cachePageForUser(u, "home", [], load);\nconst f = await readFresh(u);`))).toEqual([unchecked]);
  });

  it("finds a parenthesized or member callee, and fails a page that reaches cachePageForUser any other way", () => {
    const paren = page_(`await cachePageForUser(u, "a", [], load);\nconst fresh = await readFresh(u);\nawait (cachePageForUser)(u, "b", [], async () => ({ value: fresh, store: true }));`);
    expect(check(paren)).toEqual([before("readFresh")]);
    const member = page_(`await cachePageForUser(u, "a", [], load);\nconst fresh = await readFresh(u);\nawait cache.cachePageForUser(u, "b", [], async () => ({ value: fresh, store: true }));`);
    expect(check(member)).toEqual([before("readFresh")]);
    const bound = page_(`const c = cachePageForUser;\nawait cachePageForUser(u, "a", [], load);\nconst fresh = await readFresh(u);\nawait c(u, "b", [], async () => ({ value: fresh, store: true }));`);
    expect(check(bound)).toEqual([unchecked]);
    const aliased = () => `import { cachePageForUser as c } from "../lib/cache/page-cache";\nimport { readFresh } from "../lib/cache/page-cache";\n${fn(`await cachePageForUser(u, "a", [], load);\nconst fresh = await readFresh(u);\nawait c(u, "b", [], async () => ({ value: fresh, store: true }));`)}`;
    // The fixture's listed module is page-cache itself, so the alias is reported as a use of it too.
    expect(check(aliased)).toContain(unchecked);
  });

  it("reports a stale entry: missing, unimported or without a reason", () => {
    expect(check(none as unknown as () => string, { exists: false })).toEqual([`PER-REQUEST ${listedModule} is listed but does not exist`]);
    expect(check(() => "const d = 1;")).toEqual([`PER-REQUEST ${listedModule} is listed but no cached page imports it`]);
    expect(check(page_(""), { perRequest: { [listedModule]: " " } })).toEqual([`PER-REQUEST ${listedModule} is listed with no reason`]);
  });

  it("does not follow a page's own import of a listed module, and still follows it from a loader", () => {
    const full = loaderFiles(["src/app/page.tsx"], {});
    // A listedModule Home imports directly that no other file on its path imports: skipping the page's edge must drop it.
    const pageOnly = full.filter((f) => f.startsWith("src/lib/") && loaderFiles(["src/app/page.tsx"], { [f]: "test" }).includes(f) === false);
    expect(pageOnly.length, "Home imports some listedModule only directly, or this case proves nothing").toBeGreaterThan(0);
    // A listedModule also imported by a loader stays on the path even when listed, which is what rule 4 then reports.
    const shared = full.find((f) => f.startsWith("src/lib/") && loaderFiles(["src/app/page.tsx"], { [f]: "test" }).includes(f));
    expect(shared).toBeDefined();
  });
});

describe("the shipped tree's per-request reads", () => {
  it("holds every PER_REQUEST_READS entry to the four rules", () => {
    expect(perRequestProblems()).toEqual([]);
  });
});

