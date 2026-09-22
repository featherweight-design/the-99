import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `loadDeckComboMap` — the Server Action the quick-add bar reads its combo map through.
 *
 * Its argument is a runtime value from the client, so the three things worth pinning are the
 * ones a caller cannot be trusted with: a malformed id never reaches the uuid column, a deck
 * belonging to someone else reads as absent, and the commanders go to the reader as
 * COMMANDERS (§4.3b rule 3) rather than being folded into the card list or dropped.
 */
const requireUserId = vi.fn(async () => "user-1");
const loadCompletionPartners = vi.fn();
const results = new Map<unknown, unknown[]>();
const whereCalls: unknown[] = [];

vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/combos/near-miss", () => ({ loadCompletionPartners }));
vi.mock("../../../db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: (cond: unknown) => {
          whereCalls.push(cond);
          return Promise.resolve(results.get(table) ?? []);
        },
      }),
    }),
  },
}));

const { decks, deckCards } = await import("../../../db/schema");
const { loadDeckComboMap } = await import("./combo-map-action");

const DECK_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  vi.clearAllMocks();
  results.clear();
  whereCalls.length = 0;
  results.set(decks, [{ commanderOracleId: "cmd", partnerOracleId: "partner" }]);
  results.set(deckCards, [{ oracleId: "card-a" }, { oracleId: "card-b" }]);
  loadCompletionPartners.mockResolvedValue(
    new Map([
      ["exquisite-blood", { oracleId: "exquisite-blood", partnerOracleId: "sanguine-bond", partnerName: "Sanguine Bond", popularity: 1, variantId: "v1" }],
    ]),
  );
});

describe("loadDeckComboMap", () => {
  it("asks for EVERY completion, with the commanders passed as commanders", async () => {
    const out = await loadDeckComboMap(DECK_ID);
    expect(loadCompletionPartners).toHaveBeenCalledWith({
      deckOracleIds: ["card-a", "card-b"],
      commanderOracleIds: ["cmd", "partner"],
      candidateOracleIds: null,
    });
    // The deck read is scoped to the signed-in reader in its WHERE — the only thing that
    // makes "a deck you do not own reads as absent" true rather than merely tested.
    const deckWhere = new PgDialect().sqlToQuery(whereCalls[0] as SQL);
    expect(deckWhere.sql).toContain('"decks"."user_id"');
    expect(deckWhere.params).toEqual([DECK_ID, "user-1"]);
    // A plain record keyed by the candidate, naming the card already in the deck.
    expect(out).toEqual({ "exquisite-blood": { oracleId: "sanguine-bond", name: "Sanguine Bond" } });
  });

  it("a single-commander deck passes one commander, not a null", async () => {
    results.set(decks, [{ commanderOracleId: "cmd", partnerOracleId: null }]);
    await loadDeckComboMap(DECK_ID);
    expect(loadCompletionPartners.mock.calls[0][0].commanderOracleIds).toEqual(["cmd"]);
  });

  it("a deck the reader does not own reads as absent, and nothing is read about it", async () => {
    results.set(decks, []);
    expect(await loadDeckComboMap(DECK_ID)).toEqual({});
    expect(loadCompletionPartners).not.toHaveBeenCalled();
  });

  it("a malformed id is refused before any query", async () => {
    expect(await loadDeckComboMap("not-a-uuid")).toEqual({});
    expect(whereCalls).toHaveLength(0);
    expect(loadCompletionPartners).not.toHaveBeenCalled();
  });

  it("signs the reader in before anything else", async () => {
    requireUserId.mockRejectedValueOnce(new Error("signed out"));
    await expect(loadDeckComboMap(DECK_ID)).rejects.toThrow("signed out");
    expect(whereCalls).toHaveLength(0);
  });
});
