// Admin PR 5 (actions and routes) and 6a (pages, layouts, the page cache): a server action decides its
// switch from the READER's resolved env (`requestSwitchEnv`),
// not from `process.env` alone. Proved on the notes actions, whose guard is `DECK_NOTES_ENABLED`: the
// environment has it off and the reader's override turns it on, so an action reading the environment
// would refuse and one reading the resolved env goes through.
import { beforeEach, describe, expect, it, vi } from "vitest";

const DECK = "22222222-2222-4222-8222-222222222222";
const NOTE = "33333333-3333-4333-8333-333333333333";

const stub = vi.hoisted(() => ({
  override: {} as Record<string, string>,
  resolvedFor: [] as string[],
  removed: [] as unknown[][],
}));

vi.mock("../../lib/switches/request", () => ({
  requestSwitchEnv: vi.fn(async (userId: string) => {
    stub.resolvedFor.push(userId);
    return { ...stub.override };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: async () => ({ id: DECK, commanderOracleId: "c", partnerOracleId: null }) }));
vi.mock("../../lib/decks/notes-read", () => ({ readDeckNotes: async () => ({ open: [], done: [], readAt: 1 }) }));
vi.mock("../../lib/decks/notes-store", () => ({
  currentNames: async () => new Map(),
  insertNote: async () => "ok",
  updateNoteBody: async () => true,
  setNoteDone: async () => true,
  removeNote: async (...args: unknown[]) => (stub.removed.push(args), true),
  searchNoteCards: async () => [],
}));

const { deleteNote, searchNoteCards } = await import("./notes-actions");

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("DECK_NOTES_ENABLED", "false");
  stub.override = {};
  stub.resolvedFor = [];
  stub.removed = [];
});

describe("an action reads the reader's resolved switches", () => {
  it("goes through when the reader's override turns on a switch the environment has off", async () => {
    stub.override = { DECK_NOTES_ENABLED: "true" };
    const result = await deleteNote(DECK, NOTE);
    expect(result.ok).toBe(true);
    expect(stub.removed).toHaveLength(1);
    expect(await searchNoteCards("bolt")).toEqual([]);
    // Resolved for the signed-in reader, once per action.
    expect(stub.resolvedFor).toEqual(["user-1", "user-1"]);
  });

  it("refuses when the resolved env leaves the switch off", async () => {
    const result = await deleteNote(DECK, NOTE);
    expect(result.ok).toBe(false);
    expect(stub.removed).toHaveLength(0);
    expect(await searchNoteCards("bolt")).toBeNull();
  });
});

/** A `"use server"` directive: the module's first statement, whatever comments come before it. */
async function isServerModule(src: string): Promise<boolean> {
  const { default: ts } = await import("typescript");
  const first = ts.createSourceFile("m.tsx", src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX).statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server";
}

/**
 * Pages that still decide a switch from the environment alone, left for the admin plan's later PRs
 * (their readers take no env yet). The scan fails when one of these LOSES its last bare call, so the
 * list only ever shrinks by being edited. Empty since 6b converted the deck page and its review route.
 */
const PENDING: string[] = [];

/**
 * Readers a converted page starts, which decide every switch from the env they are handed (Admin PR
 * 6b: the deck page, its review route and their readers; 6c: locks and tuning reads). A bare call in one reads the environment
 * alone however carefully the page threads its own.
 */
const READERS = [
  "src/lib/cache/page-cache.ts",
  "src/lib/decks/read.ts",
  "src/lib/decks/printings.ts",
  "src/lib/decks/draft-state.ts",
  "src/lib/decks/versions.ts",
  "src/lib/decks/suggestions-read.ts",
  "src/lib/decks/shopping-rollup.ts",
  "src/lib/commander-change/mix-key.ts",
  "src/lib/commander-change/draft-rows.ts",
  "src/lib/commander-change/candidates.ts",
  "src/lib/cards/chain-art.ts",
  "src/lib/decks/notes-read.ts",
  "src/lib/notices/read.ts",
  "src/lib/decks/cuts-read.ts",
  "src/lib/decks/tuning-read.ts",
  "src/lib/profile/load.ts",
  "src/lib/profile/stored.ts",
  "src/lib/swaps/draft-swap.ts",
  "src/lib/swaps/gather.ts",
  "src/lib/swaps/take.ts",
  "src/lib/tuning/cuts-run-store.ts",
  "src/lib/tuning/cuts-verdicts.ts",
  "src/lib/tuning/mana-trade.ts",
  "src/lib/tuning/run-store.ts",
  "src/lib/tuning/verdicts.ts",
  // 6d: the synopsis, benchmarks, card details, arrivals, the Consider filter and the deck mix.
  "src/lib/synopsis/generate.ts",
  "src/lib/synopsis/read.ts",
  "src/lib/synopsis/pin.ts",
  "src/lib/notices/overview.ts",
  "src/lib/benchmarks/reading.ts",
  "src/lib/collection/card-detail.ts",
  "src/lib/collection/arrivals-write.ts",
  "src/lib/decks/consider-labels.ts",
  "src/lib/decks/deck-mix.ts",
  "src/lib/tuning/mana-help-load.ts",
  // Admin PR 6d-2: recs and discovery, which count roles by the reader's LABEL_ROLE_COUNTS_ENABLED.
  "src/lib/recs/pool-role-basis.ts",
  "src/lib/recs/recommend.ts",
  "src/lib/recs/free-ranking.ts",
  "src/lib/recs/ranked-list.ts",
  "src/lib/recs/warm.ts",
  "src/lib/recs/store.ts",
  "src/lib/recs/home-novelty.ts",
  "src/lib/commanders/rankings.ts",
  "src/lib/discovery/list.ts",
  "src/lib/discovery/payload.ts",
  "src/lib/discovery/resolve-slug.ts",
  // Admin PR 6e: the claim model (NEVER_CUT_ENABLED's lock key, CHANGE_COMMANDER_ENABLED's pending clause) and
  // the deck readers that start it. Every caller in src passes the reader's env since 6f-2 (the claim scan below).
  "src/lib/decks/availability-query.ts",
  "src/lib/decks/cart-read.ts",
  "src/lib/decks/fill-plan.ts",
];

/** A switch read from the environment alone: `fooEnabled()`, `roleBasisFromEnv()` or `scoreWriterVersion()`
 *  (the stored scores' role basis) with no env. */
const BARE_CALL = /\b(\w+Enabled|roleBasisFromEnv|scoreWriterVersion)\(\s*\)/g;

describe("no Server Action, route handler, page, layout or deck-page reader reads a switch from the environment alone", () => {
  it("finds the directive after a header comment", async () => {
    expect(await isServerModule(`/** A header. */\n// and a line\n"use server";\nexport async function a() {}`)).toBe(true);
    expect(await isServerModule(`import x from "y";\n"use server";`)).toBe(false);
  });

  it("finds a bare call (the scan's own failure path)", () => {
    const code = "const a = deckPrintingsEnabled();\nconst b = roleBasisFromEnv( );\nconst c = tuningEnabled(env);\nconst d = scoreWriterVersion();\nconst e = scoreWriterVersion(env);";
    expect([...code.matchAll(BARE_CALL)].map((m) => m[1])).toEqual(["deckPrintingsEnabled", "roleBasisFromEnv", "scoreWriterVersion"]);
  });

  it("names no bare call in a \"use server\" module, a route handler, a page, a layout, a listed reader or a module directly under lib/lineup", async () => {
    const { readFileSync, readdirSync, statSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    // A listed reader that moved would drop out of the scan silently.
    expect(READERS.filter((path) => !existsSync(path))).toEqual([]);
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
    let actions = 0;
    let pages = 0;
    let readers = 0;
    const found = (await Promise.all(walk("src").map(async (path) => {
      const src = readFileSync(path, "utf8");
      const isAction = await isServerModule(src);
      const isRoute = /\/route\.ts$/.test(path);
      const isPage = /\/(page|layout)\.tsx$/.test(path);
      const isReader = READERS.includes(path) || path.startsWith("src/lib/lineup/");
      if (isAction) actions++;
      if (isPage) pages++;
      if (READERS.includes(path)) readers++;
      if (!isAction && !isRoute && !isPage && !isReader) return [];
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      return [...code.matchAll(BARE_CALL)].map((m) => ({ path, call: `${path}: ${m[1]}()` }));
    }))).flat();
    // A scan that found no action module, or no page, would pass over anything.
    expect(actions).toBeGreaterThan(20);
    expect(pages).toBeGreaterThan(20);
    expect(readers).toBe(READERS.length);
    expect(found.filter((f) => !PENDING.includes(f.path)).map((f) => f.call)).toEqual([]);
    // A listed reader that moved or was renamed would drop out of the scan silently.
    expect(READERS.filter((path) => !existsSync(path))).toEqual([]);
    // A pending page converted is a page to take off the list.
    expect(PENDING.filter((path) => !found.some((f) => f.path === path))).toEqual([]);
  });
});

/**
 * Admin PR 6e: the claim model (`availability-query`) decides NEVER_CUT_ENABLED's `locked` key and
 * CHANGE_COMMANDER_ENABLED's pending clause from the env it is handed, and its `env` still defaults to the
 * environment until admin PR 7 makes it required, so a caller that omits it compiles and reads the
 * environment alone. Every call to `loadAvailability` must name `env` in its options object, and every call
 * to `loadDeckBuyRows` must pass its fourth argument (and `loadCart`, which starts both, its second),
 * everywhere in `src`. Admin PR 6f-1 converted the deck, commander, discovery, tuning, lineup, swap and social
 * readers; 6f-2 the collection's writes and contested-card reads, the new-deck search and Fits your decks, and
 * emptied the list of modules left to convert, so there is no exemption.
 */

/**
 * The claim readers and where each takes its env: in an options object (`opts`, which must name `env`) or
 * as a positional argument (`at`, which must be present). `listDecksWithStats` is a reader by way of its
 * seniority read: its own `opts.env` is handed on to `loadDeckBuyRows`, so a call that names none passes
 * `undefined` there and the claim model reads the environment (round 1 of #1635 found the deck page doing it).
 * `loadShoppingRollup` hands its third argument to `loadDeckBuyRows` the same way (round 2).
 */
const CLAIM_ENV = {
  loadAvailability: { opts: 1 },
  loadDeckBuyRows: { at: 3 },
  loadCart: { at: 1 },
  listDecksWithStats: { opts: 2 },
  loadShoppingRollup: { at: 2 },
} as const satisfies Record<string, { opts: number } | { at: number }>;
const CLAIM_READERS = Object.keys(CLAIM_ENV) as (keyof typeof CLAIM_ENV)[];
type ClaimReader = (typeof CLAIM_READERS)[number];

/**
 * Each call to a claim reader in `code`, and whether it hands the reader an env. A reader reached
 * under ANOTHER NAME counts too, because that is how a call slips past a name match: a parameter
 * whose default or `typeof` type names one (an injectable `load = loadAvailability`), a const or let
 * initialized to one, or a property of that name (`deps.loadAvailability(...)`). The alias map is
 * file-wide rather than scoped: a name bound to a claim reader anywhere in a module is held to the
 * reader's rule everywhere in it, which can only over-report.
 */
async function claimCalls(path: string, code: string): Promise<{ call: string; env: boolean }[]> {
  const { default: ts } = await import("typescript");
  type Node = import("typescript").Node;
  const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isReader = (name: string): name is ClaimReader => (CLAIM_READERS as readonly string[]).includes(name);
  // The reader an expression names: a bare identifier, or `typeof X` in a type.
  const named = (node: Node | undefined): ClaimReader | null => {
    if (!node) return null;
    if (ts.isIdentifier(node) && isReader(node.text)) return node.text;
    if (ts.isTypeQueryNode(node) && isReader(node.exprName.getText(file))) return node.exprName.getText(file) as ClaimReader;
    return null;
  };
  const aliases = new Map<string, ClaimReader>();
  const bind = (node: Node) => {
    if ((ts.isParameter(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name) && !isReader(node.name.text)) {
      const reader = named(node.initializer) ?? named(node.type);
      if (reader) aliases.set(node.name.text, reader);
    }
    ts.forEachChild(node, bind);
  };
  bind(file);
  const readerOf = (callee: Node): ClaimReader | null => {
    const id = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
    if (id === null) return null;
    return isReader(id) ? id : aliases.get(id) ?? null;
  };
  const out: { call: string; env: boolean }[] = [];
  const visit = (node: Node) => {
    const reader = ts.isCallExpression(node) ? readerOf(node.expression) : null;
    if (reader && ts.isCallExpression(node)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      const call = `${path}:${line}: ${node.expression.getText(file)} (${reader})`;
      const where: { opts: number } | { at: number } = CLAIM_ENV[reader];
      if ("opts" in where) {
        const opts = node.arguments[where.opts];
        const env = !!opts && ts.isObjectLiteralExpression(opts) && opts.properties.some((p) =>
          (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText(file) === "env");
        out.push({ call, env });
      } else {
        out.push({ call, env: node.arguments.length > where.at });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

describe("every claim read is handed the reader's env (admin PR 6e)", () => {
  it("finds a call that omits the env (the scan's own failure path)", async () => {
    const code = [
      "loadAvailability(u);",
      "loadAvailability(u, { oracleIds });",
      "loadAvailability(u, { oracleIds, env });",
      "loadAvailability(u, { env: opts.env }, tx);",
      "loadDeckBuyRows(u, ids);",
      "loadDeckBuyRows(u, ids, undefined, env);",
      "loadCart(u);",
      "loadCart(u, keyed);",
      // Under another name: an injectable parameter by default and by type, a const alias, a property.
      "function f(load = loadAvailability) { load(u, { oracleIds }); }",
      "function g(read: typeof loadDeckBuyRows) { read(u, ids); read(u, ids, tx, env); }",
      "const bill = loadCart; bill(u);",
      "deps.loadAvailability(u, { env });",
      // The deck list hands its own opts.env to the seniority read.
      "listDecksWithStats(u, \"name\");",
      "listDecksWithStats(u, \"name\", { includeProxyStats: true });",
      "listDecksWithStats(u, \"name\", { env });",
      "loadShoppingRollup(u, ids);",
      "loadShoppingRollup(u, undefined, env);",
    ].join("\n");
    expect((await claimCalls("x.ts", code)).map((c) => c.env)).toEqual(
      [false, false, true, true, false, true, false, true, false, false, true, false, true, false, false, true, false, true],
    );
  });

  it("names no call without one anywhere in src", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
    const all = (await Promise.all(walk("src").map((path) => claimCalls(path, readFileSync(path, "utf8"))))).flat();
    // A scan that found nothing would pass over everything: the deck page, Home and the pull all read claims.
    expect(all.filter((c) => c.env).length).toBeGreaterThan(20);
    expect(all.filter((c) => !c.env).map((c) => c.call)).toEqual([]);
  });
});
