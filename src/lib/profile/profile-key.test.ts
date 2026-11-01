// Admin adoption 6c: the deck profile's cache key. `cachedDeckProfile` (the analysis tab, a commit, a
// declaration) and `profileOfHead` (Suggested changes, Proposed cuts) file under ONE key, so an analysis
// already pressed is reused by the tools. The build reads no switch (roles are always counted by label), so
// the key carries none: readers on different switches share the entry. The cache layer is mocked to
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

// Sentinels holding one registry switch, on and off: never the environment.
const ON = { FLYER_TRIAL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const OFF = { FLYER_TRIAL_ENABLED: "false" } as unknown as NodeJS.ProcessEnv;

beforeEach(() => { keys.seen = []; });

describe("the deck profile's cache key", () => {
  it("is the same key from cachedDeckProfile and profileOfHead under one env", async () => {
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, ON);
    await profileOfHead(HEAD, ON);
    expect(keys.seen).toHaveLength(2);
    expect(keys.seen[0]).toEqual(keys.seen[1]);
  });

  it("is the same key whatever the reader's switches, from either reader", async () => {
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, ON);
    await cachedDeckProfile(HEAD.deckId, HEAD.userId, OFF);
    await profileOfHead(HEAD, ON);
    await profileOfHead(HEAD, OFF);
    const [cachedOn, cachedOff, headOn, headOff] = keys.seen;
    expect(cachedOn).toEqual(cachedOff);
    expect(headOn).toEqual(headOff);
    expect(cachedOff).toEqual(headOff);
    expect(cachedOn).toEqual(["deck-profile", HEAD.deckId, expect.any(String)]);
  });
});
