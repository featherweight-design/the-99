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
 * Admin PR 6e to 6f-2 held every call to the claim model (`availability-query`) and the wrappers that start
 * it to naming its `env`, because each still defaulted to the environment. Since admin PR 7b their `env` is
 * REQUIRED (`loadAvailability`'s `opts.env`, `loadDeckBuyRows`', `loadCart`'s, `listDecksWithStats`'
 * `opts.env` and `loadShoppingRollup`'s), so leaving it out no longer compiles and they are off this list;
 * handing one `process.env` is `pnpm check:switch-reads`' to catch.
 */

/**
 * The readers whose DEFAULTED env decides a switch, and the position of that env, which a call must reach
 * (`at`). `chainArt` decides
 * DECK_PRINTINGS_ENABLED, the deck's printing picks, and its `env` defaults until admin PR 7d makes it
 * required. A reader deeper than this that takes a defaulted env is not scanned: admin PRs 7c and 7d make
 * `env` required, which catches that whole class at compile time.
 */
const CLAIM_ENV = {
  chainArt: { at: 3 },
} as const satisfies Record<string, { at: number }>;
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
      out.push({ call, env: node.arguments.length > CLAIM_ENV[reader].at });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

describe("every claim read is handed the reader's env (admin PR 6e)", () => {
  it("finds a call that omits the env (the scan's own failure path)", async () => {
    const code = [
      // The art chain's printing picks (DECK_PRINTINGS_ENABLED).
      "chainArt(u, deckId, ids);",
      "chainArt(u, null, ids, env);",
      // Under another name: an injectable parameter by default and by type, a const alias, a property.
      "function f(art = chainArt) { art(u, deckId, ids); }",
      "function g(read: typeof chainArt) { read(u, deckId, ids); read(u, deckId, ids, env); }",
      "const draw = chainArt; draw(u, deckId, ids);",
      "deps.chainArt(u, deckId, ids, env);",
      // A reader whose env is required now is not scanned: the compiler holds it.
      "loadAvailability(u, { oracleIds });",
    ].join("\n");
    expect((await claimCalls("x.ts", code)).map((c) => c.env)).toEqual(
      [false, true, false, false, true, false, true],
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
    // A scan that found nothing would pass over everything: the cart, the deck page and the lineup all draw art.
    expect(all.filter((c) => c.env).length).toBeGreaterThan(10);
    expect(all.filter((c) => !c.env).map((c) => c.call)).toEqual([]);
  });
});
