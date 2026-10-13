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
  // the deck readers that start it. Its callers elsewhere in lib take no env for it yet (6f).
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
 * environment, so a caller that omits it compiles and reads the environment alone. Every call to
 * `loadAvailability` must name `env` in its options object, and every call to `loadDeckBuyRows` must pass
 * its fourth argument (and `loadCart`, which starts both, its second), except in the modules below, left for admin PR 6f. The list only shrinks: a module
 * on it whose every call passes an env fails until it is taken off.
 */
const CLAIM_PENDING = [
  "src/lib/collection/arrivals-write.ts",
  "src/lib/collection/card-detail.ts",
  "src/lib/collection/summary-read.ts",
  "src/lib/collection/write.ts",
  "src/lib/commander-change/candidates.ts",
  "src/lib/commanders/rankings.ts",
  "src/lib/discovery/list.ts",
  "src/lib/intake/fill-facts.ts",
  "src/lib/intake/rows.ts",
  "src/lib/intake/search.ts",
  "src/lib/intake/trial.ts",
  "src/lib/lineup/load.ts",
  "src/lib/recs/free-ranking.ts",
  "src/lib/social/spares.ts",
  "src/lib/swaps/fits.ts",
  "src/lib/swaps/gather.ts",
  "src/lib/swaps/take.ts",
  "src/lib/tuning/answer.ts",
  "src/lib/tuning/mana-staples.ts",
  "src/lib/tuning/owned-candidates.ts",
];

/** Each call to a claim reader in `code`, and whether it hands the reader an env. */
async function claimCalls(path: string, code: string): Promise<{ call: string; env: boolean }[]> {
  const { default: ts } = await import("typescript");
  const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: { call: string; env: boolean }[] = [];
  const visit = (node: import("typescript").Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      if (name === "loadAvailability") {
        const opts = node.arguments[1];
        const env = !!opts && ts.isObjectLiteralExpression(opts) && opts.properties.some((p) =>
          (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText(file) === "env");
        out.push({ call: `${path}:${line}: loadAvailability`, env });
      } else if (name === "loadDeckBuyRows") {
        out.push({ call: `${path}:${line}: loadDeckBuyRows`, env: node.arguments.length >= 4 });
      } else if (name === "loadCart") {
        // The cart's whole read, inside the cached Shopping page's load: its env is the one the key holds.
        out.push({ call: `${path}:${line}: loadCart`, env: node.arguments.length >= 2 });
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
    ].join("\n");
    expect((await claimCalls("x.ts", code)).map((c) => c.env)).toEqual([false, false, true, true, false, true, false, true]);
  });

  it("names no call without one outside the 6f modules, and no 6f module that has been converted", async () => {
    const { readFileSync, readdirSync, statSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    expect(CLAIM_PENDING.filter((path) => !existsSync(path))).toEqual([]);
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
    const all = (await Promise.all(walk("src").map((path) => claimCalls(path, readFileSync(path, "utf8"))))).flat();
    // A scan that found nothing would pass over everything: the deck page, Home and the pull all read claims.
    expect(all.filter((c) => c.env).length).toBeGreaterThan(20);
    const bare = all.filter((c) => !c.env);
    expect(bare.filter((c) => !CLAIM_PENDING.some((p) => c.call.startsWith(`${p}:`))).map((c) => c.call)).toEqual([]);
    expect(CLAIM_PENDING.filter((p) => !bare.some((c) => c.call.startsWith(`${p}:`)))).toEqual([]);
  });
});
