// Ruling 1's test, the one piece of `stored.ts` that is pure. Everything else there is SQL, and
// `probe:profile-store` proves it against a real Postgres.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./load", () => ({ cachedDeckProfile: vi.fn(), loadDeckProfile: vi.fn(), readProfileHead: vi.fn() }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: vi.fn() }));

const { deckLegality, storedBasisMoved } = await import("./stored");

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

  it("follows the deployment's switch by default", () => {
    expect(storedBasisMoved(classifier)).toBe(process.env.LABEL_ROLE_COUNTS_ENABLED === "true");
  });
});
