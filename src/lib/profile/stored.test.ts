// Ruling 1's test, the one piece of `stored.ts` that is pure. Everything else there is SQL, and
// `probe:profile-store` proves it against a real Postgres.
import { describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { roleBasisFromEnv } from "../decks/label-counts-flag";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./load", () => ({ cachedDeckProfile: vi.fn(), loadDeckProfile: vi.fn(), readProfileHead: vi.fn() }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: vi.fn() }));

const { deckLegality, storedBasisMoved, pressMustRecompute, requestProfileDeps } = await import("./stored");
const { cachedDeckProfile, loadDeckProfile } = await import("./load");

const cards = (n: number) => Array.from({ length: n }, (_, i) => ({ oracleId: `c${i}`, quantity: 1 }));

describe("deckLegality", () => {
  it("is legal at exactly the body size, 99 alone and 98 with a partner", () => {
    expect(deckLegality({ partnerOracleId: null, cards: cards(99) })).toEqual({ legal: true, built: 99, size: 99 });
    expect(deckLegality({ partnerOracleId: "p", cards: cards(98) })).toEqual({ legal: true, built: 98, size: 98 });
  });

  // Exact, not `>=`: past its size the deck is Over, and an analysis of 104 cards is a reading of
  // a list that cannot be played.
  it("is illegal short of the size and past it", () => {
    expect(deckLegality({ partnerOracleId: null, cards: cards(98) }).legal).toBe(false);
    expect(deckLegality({ partnerOracleId: null, cards: cards(100) }).legal).toBe(false);
    expect(deckLegality({ partnerOracleId: "p", cards: cards(99) }).legal).toBe(false);
  });

  // The body is COPIES, not rows: basics are one row of many.
  it("counts copies rather than rows", () => {
    const basics = [{ oracleId: "swamp", quantity: 30 }, ...cards(69)];
    expect(deckLegality({ partnerOracleId: null, cards: basics })).toEqual({ legal: true, built: 99, size: 99 });
  });
});

describe("storedBasisMoved", () => {
  const classifier = { skeleton: {} } as never;
  const labels = { skeleton: { roleBasis: "labels" } } as never;

  it("reads a reading with no basis marker as the classifier's, which every pre-switch row is", () => {
    expect(storedBasisMoved(classifier, "classifier")).toBe(false);
    expect(storedBasisMoved(classifier, "labels")).toBe(true);
  });

  it("moves in both directions, so a rollback recomputes as a flip on does", () => {
    expect(storedBasisMoved(labels, "labels")).toBe(false);
    expect(storedBasisMoved(labels, "classifier")).toBe(true);
  });
});

describe("pressMustRecompute", () => {
  const classifier = { skeleton: {} } as never;
  const labels = { skeleton: { roleBasis: "labels" } } as never;
  const base = { isPress: true, sameAnswer: true, noticesOn: false, logMoved: async () => false };

  it("recomputes a press on an unchanged list whose stored basis differs from the deployment's", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: classifier })).toBe(true);
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: labels })).toBe(true);
    vi.unstubAllEnvs();
  });

  it("answers from the store when the basis matches and the log has not moved", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: labels })).toBe(false);
    vi.unstubAllEnvs();
  });

  it("never recomputes a pin or a rebuild (not a press), or a list that changed (not the same answer)", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), isPress: false, storedProfile: classifier })).toBe(false);
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), sameAnswer: false, storedProfile: classifier })).toBe(false);
    vi.unstubAllEnvs();
  });

  it("keeps the change-log recompute behind the notices switch, and skips its read once the basis said yes", async () => {
    const logMoved = vi.fn(async () => true);
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: classifier, noticesOn: false, logMoved })).toBe(false);
    expect(await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: classifier, noticesOn: true, logMoved })).toBe(true);
    logMoved.mockClear();
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    await pressMustRecompute({ ...base, basis: roleBasisFromEnv(ENV_VIEW), storedProfile: classifier, noticesOn: true, logMoved });
    expect(logMoved).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

// Admin adoption 6c: the stored-read path builds under the reader's resolved switches, so the cached build
// keys on the reader's switch bits, the same key `profileOfHead` files under. A sentinel env, compared by
// identity, so a failing diff prints nothing real.
describe("requestProfileDeps", () => {
  const ENV = { SENTINEL: "resolved" } as unknown as NodeJS.ProcessEnv;

  it("hands the reader's env to both builds and carries it for the press's switches", async () => {
    const deps = requestProfileDeps(ENV);
    await deps.compute("deck", "user");
    await deps.computeFresh?.("deck", "user");
    expect(vi.mocked(cachedDeckProfile).mock.calls[0]?.[2]).toBe(ENV);
    expect(vi.mocked(loadDeckProfile).mock.calls[0]?.[2]).toBe(ENV);
    expect(deps.env).toBe(ENV);
  });
});
