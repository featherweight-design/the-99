// Admin PR 5: a server action decides its switch from the READER's resolved env (`requestSwitchEnv`),
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
