// Admin adoption 6c: the deck profile's cache key. `cachedDeckProfile` (the analysis tab, a commit, a
// declaration) and `profileOfHead` (Suggested changes, Proposed cuts) file under ONE key, so an analysis
// already pressed is reused by the tools, and that key carries the reader's resolved switch bits, so a
// profile built on one role basis is never served to a reader on the other. The cache layer is mocked to
// capture the keys; nothing is built.
import { beforeEach, describe, expect, it, vi } from "vitest";

const HEAD = vi.hoisted(() => ({
  deckId: "deck-1", userId: "user-1", commanderOracleId: "cmd", partnerOracleId: null, declaredBracket: null,
  cards: [{ oracleId: "card-a", quantity: 1 }],
}));
const keys = vi.hoisted(() => ({ seen: [] as unknown[][] }));

// `loadProfileHead`'s one transaction answers the head; nothing else reaches the database.
vi.mock("../../db", () => ({ db: { transaction: async () => HEAD } }));
vi.mock("../cache/user-lists", () => ({
  cacheForUser: async (_userId: string, key: unknown[]) => { keys.seen.push(key); return null; },
}));

const { cachedDeckProfile } = await import("./load");
const { profileOfHead } = await import("../decks/tuning-read");

// Sentinels holding only the switch that decides the role basis: never the environment.
const LABELS = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const CLASSIFIER = { LABEL_ROLE_COUNTS_ENABLED: "false" } as unknown as NodeJS.ProcessEnv;

beforeEach(() => { keys.seen = []; });

describe("the deck profile's cache key", () => {
  it("is the same key from cachedDeckProfile and profileOfHead under one env", async () => {
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, LABELS);
    await profileOfHead(HEAD, LABELS);
    expect(keys.seen).toHaveLength(2);
    expect(keys.seen[0]).toEqual(keys.seen[1]);
  });

  it("differs when the reader's role-basis switch differs, from either reader", async () => {
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, LABELS);
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, CLASSIFIER);
    await profileOfHead(HEAD, LABELS);
    await profileOfHead(HEAD, CLASSIFIER);
    const [cachedOn, cachedOff, headOn, headOff] = keys.seen;
    expect(cachedOn).not.toEqual(cachedOff);
    expect(headOn).not.toEqual(headOff);
    expect(cachedOff).toEqual(headOff);
  });
});
