// The notes actions' wire contract. `probe:deck-notes-actions` proves the QUERIES against a real Postgres;
// this proves what the action layer owns: the flag, the runtime shape checks (an action is a public
// endpoint), honest tags, the refusals, and that a write revalidates the deck's surfaces.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => process.env) }));

const ID = "6d0a5f7e-1111-4222-8333-444455556666";
const DECK = "22222222-2222-4222-8222-222222222222";
const NOTE = "33333333-3333-4333-8333-333333333333";

const stub = vi.hoisted(() => ({
  paths: [] as string[],
  calls: [] as { fn: string; args: unknown[] }[],
  names: new Map<string, string>(),
  insert: "ok" as "ok" | "cap",
  namesThrow: false,
  readThrows: false,
  view: { open: [], done: [], readAt: 42 },
  found: true,
}));

vi.mock("next/cache", () => ({ revalidatePath: (p: string) => void stub.paths.push(p) }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: async () => ({ id: DECK, commanderOracleId: "c", partnerOracleId: null }) }));
vi.mock("../../lib/decks/notes-read", () => ({
  readDeckNotes: async () => {
    if (stub.readThrows) throw new Error("db down");
    return stub.view;
  },
}));
vi.mock("../../lib/decks/notes-store", () => ({
  currentNames: async () => {
    if (stub.namesThrow) throw new Error("db down");
    return stub.names;
  },
  insertNote: async (...args: unknown[]) => (stub.calls.push({ fn: "insertNote", args }), stub.insert),
  updateNoteBody: async (...args: unknown[]) => (stub.calls.push({ fn: "updateNoteBody", args }), stub.found),
  setNoteDone: async (...args: unknown[]) => (stub.calls.push({ fn: "setNoteDone", args }), stub.found),
  removeNote: async (...args: unknown[]) => (stub.calls.push({ fn: "removeNote", args }), stub.found),
  searchNoteCards: async () => [],
}));

const { addNote, editNote, setNoteDone, deleteNote, searchNoteCards } = await import("./notes-actions");

const on = () => vi.stubEnv("DECK_NOTES_ENABLED", "true");
beforeEach(() => {
  vi.unstubAllEnvs();
  stub.paths = [];
  stub.calls = [];
  stub.names = new Map();
  stub.insert = "ok";
  stub.found = true;
  stub.namesThrow = false;
  stub.readThrows = false;
});

describe("with the switch off", () => {
  it("answers every action with a refusal and touches nothing", async () => {
    expect((await addNote(DECK, "a")).ok).toBe(false);
    expect((await editNote(DECK, NOTE, "a")).ok).toBe(false);
    expect((await setNoteDone(DECK, NOTE, true)).ok).toBe(false);
    expect((await deleteNote(DECK, NOTE)).ok).toBe(false);
    expect(await searchNoteCards("sol")).toBeNull();
    expect(stub.calls).toEqual([]);
    expect(stub.paths).toEqual([]);
  });
});

describe("addNote", () => {
  beforeEach(on);

  it("stores one folded line and revalidates the deck's surfaces", async () => {
    expect(await addNote(DECK, "  try\n a second   sweeper ")).toMatchObject({ ok: true });
    expect(stub.calls[0]).toEqual({ fn: "insertNote", args: [DECK, "user-1", "try a second sweeper"] });
    expect(stub.paths).toEqual([`/decks/${DECK}`, "/decks", "/decks/shopping", "/"]);
  });

  it("answers with the notes as they stand after the write, and with null when that read fails (the write stands)", async () => {
    expect(await addNote(DECK, "a")).toEqual({ ok: true, notes: stub.view });
    stub.readThrows = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await addNote(DECK, "b")).toEqual({ ok: true, notes: null });
  });

  it("refuses an empty note, a 141-character note and a non-string", async () => {
    for (const body of ["   ", "a".repeat(141), 7 as unknown as string]) expect((await addNote(DECK, body)).ok).toBe(false);
    expect(await addNote(DECK, "a".repeat(140))).toMatchObject({ ok: true });
  });

  it("refuses a deck id that is not a uuid", async () => {
    expect((await addNote("nope", "a")).ok).toBe(false);
    expect(stub.calls).toEqual([]);
  });

  it("rewrites a tag's stored name to the catalog's and refuses a tag naming no card", async () => {
    stub.names = new Map([[ID, "Thassa's Oracle"]]);
    expect(await addNote(DECK, `try [[${ID}|Whatever the client sent]]`)).toMatchObject({ ok: true });
    expect(stub.calls[0].args[2]).toBe(`try [[${ID}|Thassa's Oracle]]`);

    stub.names = new Map();
    stub.calls = [];
    expect((await addNote(DECK, `try [[${ID}|Ghost]]`)).ok).toBe(false);
    expect(stub.calls).toEqual([]);
  });

  it("answers a failed tag lookup with a refusal, never a rejected action", async () => {
    stub.namesThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await addNote(DECK, `a [[${ID}|x]]`)).ok).toBe(false);
    expect((await editNote(DECK, NOTE, `a [[${ID}|x]]`)).ok).toBe(false);
    expect(stub.calls).toEqual([]);
  });

  it("answers the cap with its own message and revalidates nothing", async () => {
    stub.insert = "cap";
    const r = await addNote(DECK, "one more");
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toMatch(/100 notes/);
    expect(stub.paths).toEqual([]);
  });
});

describe("the other writes", () => {
  beforeEach(on);

  it("edit, done and delete write through the store and revalidate", async () => {
    expect(await editNote(DECK, NOTE, "changed")).toMatchObject({ ok: true });
    expect(await setNoteDone(DECK, NOTE, true)).toMatchObject({ ok: true });
    expect(await setNoteDone(DECK, NOTE, false)).toMatchObject({ ok: true });
    expect(await deleteNote(DECK, NOTE)).toMatchObject({ ok: true });
    expect(stub.calls.map((c) => c.fn)).toEqual(["updateNoteBody", "setNoteDone", "setNoteDone", "removeNote"]);
    expect(stub.calls[1].args).toEqual([DECK, "user-1", NOTE, true]);
    expect(stub.calls[2].args).toEqual([DECK, "user-1", NOTE, false]);
    expect(stub.paths).toHaveLength(16);
  });

  it("refuses a note that is not the player's, and revalidates nothing", async () => {
    stub.found = false;
    expect((await editNote(DECK, NOTE, "x")).ok).toBe(false);
    expect((await setNoteDone(DECK, NOTE, true)).ok).toBe(false);
    expect((await deleteNote(DECK, NOTE)).ok).toBe(false);
    expect(stub.paths).toEqual([]);
  });

  it("keeps the done and reopen refusals distinct", async () => {
    stub.found = false;
    const done = (await setNoteDone(DECK, NOTE, true)) as { message: string };
    const reopen = (await setNoteDone(DECK, NOTE, false)) as { message: string };
    expect(done.message).not.toBe(reopen.message);
  });

  it("refuses ids and flags of the wrong shape before the store", async () => {
    expect((await editNote(DECK, "x", "a")).ok).toBe(false);
    expect((await deleteNote(DECK, ["x"] as unknown as string)).ok).toBe(false);
    expect((await setNoteDone(DECK, NOTE, "true" as unknown as boolean)).ok).toBe(false);
    expect(stub.calls).toEqual([]);
  });
});

describe("the deck page cache (#600)", () => {
  it("is not read through cacheForUser, so a notes write has nothing cached to retire", () => {
    const read = readFileSync(join(process.cwd(), "src/lib/decks/notes-read.ts"), "utf8");
    // Imports and calls, not the word: the file's own header names the cache it stays outside of.
    expect(read).not.toMatch(/from "[^"]*\/cache\/|unstable_cache\(|cacheForUser\(|cachePageForUser\(/);
  });
});
