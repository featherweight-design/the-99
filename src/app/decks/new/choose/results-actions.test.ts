// The results screen's actions, at their wire boundary. What only this file catches: the trial
// fill runs for a commander the search could list and for nothing else, since its ids arrive from
// the client. The candidate rule itself is the search's (`isCandidate`); this proves the action
// asks it, and that an id it does not return is answered null with no fill run.

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ execute: vi.fn(), trial: vi.fn(), page: vi.fn() }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => true }));
vi.mock("../../../../db", () => ({ db: { execute: stub.execute } }));
vi.mock("../../../../lib/intake/trial", () => ({ trialFill: stub.trial }));
vi.mock("../../../../lib/intake/rows", () => ({ loadResultsPage: stub.page }));

import { moreRows, trialFillRows } from "./results-actions";

const LEGAL = "0000aaaa-0000-4000-8000-000000000001";
const FORGED = "0000aaaa-0000-4000-8000-000000000002";
const text = (q: SQL) => new PgDialect().sqlToQuery(q).sql;

beforeEach(() => {
  stub.execute.mockReset().mockResolvedValue({ rows: [{ oracle_id: LEGAL, name: "Gishath", color_identity: ["R", "G", "W"] }] });
  stub.page.mockReset().mockResolvedValue({ rows: [] });
  stub.trial.mockReset().mockResolvedValue({ owned: 60, buyCents: 1000, unpricedCard: null });
});

describe("trialFillRows", () => {
  it("reads its commanders through the search's candidate rule", async () => {
    await trialFillRows([LEGAL], "?t=dinosaurs");
    const q = text(stub.execute.mock.calls[0][0]);
    expect(q).toContain("from commander_support cs join cards c");
    expect(q).toContain("c.commander_legal and cs.synergy_state = 'ok'");
  });

  it("answers an id the rule does not return with null, and runs no fill for it", async () => {
    const out = await trialFillRows([LEGAL, FORGED], "?t=dinosaurs");
    expect(out[FORGED]).toBeNull();
    expect(out[LEGAL]).not.toBeNull();
    expect(stub.trial).toHaveBeenCalledTimes(1);
    expect(stub.trial.mock.calls[0][1]).toMatchObject({ oracleId: LEGAL });
  });

  it("fills with a card only when the search's card rule keeps it", async () => {
    const CARD = "0000aaaa-0000-4000-8000-0000000000cc";
    // The card's read comes back empty: a basic, a card that is not legal, or one that is gone.
    stub.execute
      .mockResolvedValueOnce({ rows: [{ oracle_id: LEGAL, name: "Gishath", color_identity: ["R", "G", "W"] }] })
      .mockResolvedValueOnce({ rows: [] });
    await trialFillRows([LEGAL], `?a=${CARD}`);
    expect(stub.trial.mock.calls[0][2]).toMatchObject({ cardOracleId: null });
    stub.execute
      .mockResolvedValueOnce({ rows: [{ oracle_id: LEGAL, name: "Gishath", color_identity: ["R", "G", "W"] }] })
      .mockResolvedValueOnce({ rows: [{ name: "Sol Ring", game_changer: true, type_line: "Artifact", owned: true }] });
    await trialFillRows([LEGAL], `?a=${CARD}`);
    expect(stub.trial.mock.calls[1][2]).toMatchObject({ cardOracleId: CARD });
  });

  it("refuses more than a slice, a non-uuid, or an oversized query before any read", async () => {
    const ids = Array.from({ length: 13 }, (_, i) => `0000aaaa-0000-4000-8000-${String(i).padStart(12, "0")}`);
    await expect(trialFillRows(ids, "")).rejects.toThrow();
    await expect(trialFillRows(["nope"], "")).rejects.toThrow();
    await expect(trialFillRows([LEGAL], "x".repeat(32_001))).rejects.toThrow();
    expect(stub.execute).not.toHaveBeenCalled();
  });
});

describe("moreRows", () => {
  it("hands the parsed answers and the offset to the page loader", async () => {
    await moreRows("?t=dinosaurs&b=150", 12);
    expect(stub.page).toHaveBeenCalledWith("user_1", expect.objectContaining({ themes: ["dinosaurs"], budgetDollars: 150 }), 12);
  });

  it("refuses a forged offset or query before any read", async () => {
    for (const offset of [-1, 1.5, 5001, Number.NaN, "12" as never]) {
      await expect(moreRows("", offset)).rejects.toThrow();
    }
    await expect(moreRows("x".repeat(32_001), 0)).rejects.toThrow();
    await expect(moreRows(42 as never, 0)).rejects.toThrow();
    expect(stub.page).not.toHaveBeenCalled();
  });
});
