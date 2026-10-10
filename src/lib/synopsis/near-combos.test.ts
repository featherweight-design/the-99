import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("../../db", () => ({ db: { execute: (...a: unknown[]) => execute(...a) } }));
vi.mock("../combos/near-miss", () => ({
  pairsWithOnePiece: () => "pairs-query",
  castableCandidates: (rows: unknown[]) => rows,
}));

import { loadNearComboFacts } from "./near-combos";

const profile = {
  cards: [{ oracleId: "have-1", name: "Have One" }],
  commanderOracleIds: ["cmd"],
  colours: { identity: ["U", "R"] },
} as never;

const pair = (missing: string, name: string) => ({
  variant_id: `v-${missing}`, produces: ["Infinite mana"], present_id: "have-1", missing_id: missing, missing_name: name, missing_must_be_commander: false,
});

describe("loadNearComboFacts", () => {
  beforeEach(() => execute.mockReset());

  it("drops a banned or off-colour missing piece and keeps a legal in-identity one", async () => {
    execute
      .mockResolvedValueOnce({ rows: [pair("ok", "Legal Card"), pair("banned", "Banned Card"), pair("green", "Green Card")] })
      // The legality read returns only commander-legal cards: `banned` is absent, as the SQL leaves it.
      .mockResolvedValueOnce({ rows: [{ oracle_id: "ok", color_identity: ["U"] }, { oracle_id: "green", color_identity: ["G"] }] });
    const out = await loadNearComboFacts(profile);
    expect(out).toEqual([{ have: "Have One", missing: "Legal Card", produces: ["Infinite mana"] }]);
  });

  it("returns nothing, rather than throwing, when a read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockRejectedValueOnce(new Error("boom"));
    expect(await loadNearComboFacts(profile)).toEqual([]);
  });
});
