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

/*
 * Admin PR 5 to 6f scanned every action, route, page, layout and listed reader for a BARE switch call
 * (`fooEnabled()`, `roleBasisFromEnv()`, `scoreWriterVersion()`). Since admin PR 7a each of those takes a
 * required `env`, so a bare call no longer compiles and the scan is gone. What still compiles is handing
 * one `process.env`, which reads the environment past every override: `pnpm check:switch-reads`
 * (`scripts/lib/switch-reads.mjs`) holds that, across all of src.
 */

/**
 * Admin PR 6e: the claim model (`availability-query`) decides NEVER_CUT_ENABLED's `locked` key and
 * CHANGE_COMMANDER_ENABLED's pending clause from the env it is handed, and its `env` still defaults to the
 * environment until admin PR 7b makes it required, so a caller that omits it compiles and reads the
 * environment alone. Every call to `loadAvailability` must name `env` in its options object, and every call
 * to `loadDeckBuyRows` must pass its fourth argument (and `loadCart`, which starts both, its second),
 * everywhere in `src`. Admin PR 6f-1 converted the deck, commander, discovery, tuning, lineup, swap and social
 * readers; 6f-2 the collection's writes and contested-card reads, the new-deck search and Fits your decks, and
 * emptied the list of modules left to convert, so there is no exemption.
 */

/**
 * The readers whose DEFAULTED env decides a switch, and where each takes it: in an options object (`opts`,
 * which must name `env`) or as a positional argument (`at`, which must be present). Most are the claim
 * model and the wrappers that start it (NEVER_CUT_ENABLED's `locked` key, CHANGE_COMMANDER_ENABLED's pending
 * clause); `chainArt` decides DECK_PRINTINGS_ENABLED, the deck's printing picks. A reader deeper than these
 * that takes a defaulted env is not scanned: admin PRs 7b to 7d make `env` required, which catches that whole class
 * at compile time. `listDecksWithStats` is a reader by way of its
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
  chainArt: { at: 3 },
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
      // The art chain's printing picks (DECK_PRINTINGS_ENABLED).
      "chainArt(u, deckId, ids);",
      "chainArt(u, null, ids, env);",
    ].join("\n");
    expect((await claimCalls("x.ts", code)).map((c) => c.env)).toEqual(
      [false, false, true, true, false, true, false, true, false, false, true, false, true, false, false, true, false, true, false, true],
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
