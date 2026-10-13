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
    return { ...process.env, ...stub.override };
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
 * list only ever shrinks by being edited.
 */
const PENDING = ["src/app/decks/[id]/page.tsx", "src/app/decks/[id]/changes/page.tsx"];

describe("no Server Action, route handler, page or layout reads a switch from the environment alone", () => {
  it("finds the directive after a header comment", async () => {
    expect(await isServerModule(`/** A header. */\n// and a line\n"use server";\nexport async function a() {}`)).toBe(true);
    expect(await isServerModule(`import x from "y";\n"use server";`)).toBe(false);
  });

  it("names no bare `fooEnabled()` call in a \"use server\" module, a route handler, a page, a layout, the page cache or a module directly under lib/lineup", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
    let actions = 0;
    let pages = 0;
    const found = (await Promise.all(walk("src").map(async (path) => {
      const src = readFileSync(path, "utf8");
      const isAction = await isServerModule(src);
      const isRoute = /\/route\.ts$/.test(path);
      const isPage = /\/(page|layout)\.tsx$/.test(path);
      const isReader = path === "src/lib/cache/page-cache.ts" || path.startsWith("src/lib/lineup/");
      if (isAction) actions++;
      if (isPage) pages++;
      if (!isAction && !isRoute && !isPage && !isReader) return [];
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      return [...code.matchAll(/\b(\w+Enabled)\(\s*\)/g)].map((m) => ({ path, call: `${path}: ${m[1]}()` }));
    }))).flat();
    // A scan that found no action module, or no page, would pass over anything.
    expect(actions).toBeGreaterThan(20);
    expect(pages).toBeGreaterThan(20);
    expect(found.filter((f) => !PENDING.includes(f.path)).map((f) => f.call)).toEqual([]);
    // A pending page converted is a page to take off the list.
    expect(PENDING.filter((path) => !found.some((f) => f.path === path))).toEqual([]);
  });
});

// Admin PR 6b: the deck page, its review route and the readers they start decide every switch from the
// reader's resolved env. A bare `fooEnabled()` in one of them reads the environment alone.
const DECK_PAGE_FILES = [
  "src/app/decks/[id]/page.tsx",
  "src/app/decks/[id]/changes/page.tsx",
  "src/app/decks/[id]/import/page.tsx",
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
];

describe("the deck page and its readers read no switch from the environment alone", () => {
  it("names no bare `fooEnabled()` or `roleBasisFromEnv()` call in them", async () => {
    const { readFileSync } = await import("node:fs");
    const bare = DECK_PAGE_FILES.flatMap((path) => {
      const code = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      return [...code.matchAll(/\b(\w+Enabled|roleBasisFromEnv)\(\s*\)/g)].map((m) => `${path}: ${m[1]}()`);
    });
    expect(bare).toEqual([]);
  });

  it("finds a bare call (the scan's own failure path)", () => {
    const code = "const a = deckPrintingsEnabled();\nconst b = roleBasisFromEnv( );\nconst c = tuningEnabled(env);";
    expect([...code.matchAll(/\b(\w+Enabled|roleBasisFromEnv)\(\s*\)/g)].map((m) => m[1])).toEqual(["deckPrintingsEnabled", "roleBasisFromEnv"]);
  });
});
