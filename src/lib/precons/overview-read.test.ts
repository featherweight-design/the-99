// Small items 5 (`Precon-Overview` §1): which stored precon Overview its page shows, and at which key.
import { describe, expect, it } from "vitest";
import { overviewForList, preconOverviewKey, renderedPreconList, showsPreconOverview } from "./overview-read";
import { listFingerprint } from "../profile/fingerprint";
import { synopsisContractVersion } from "../synopsis/limits";
import type { CheckedSynopsis } from "../synopsis/types";

const content = { overview: "Go wide." } as CheckedSynopsis;

describe("showsPreconOverview", () => {
  it("shows a current row with an Overview paragraph", () => {
    expect(showsPreconOverview({ current: true, content })).toBe(true);
  });
  it("shows no row, a row that is not current, or one whose Overview section was refused: no block", () => {
    expect(showsPreconOverview(null)).toBe(false);
    expect(showsPreconOverview({ current: false, content })).toBe(false);
    expect(showsPreconOverview({ current: true, content: { ...content, overview: undefined } as unknown as CheckedSynopsis })).toBe(false);
  });
});

describe("preconOverviewKey", () => {
  it("is the reader's own contract and role basis, the row a start would carry", () => {
    const env = { OVERVIEW_V2_ENABLED: "true", DECK_BENCHMARKS_ENABLED: "true", LABEL_ROLE_COUNTS_ENABLED: "" } as unknown as NodeJS.ProcessEnv;
    expect(preconOverviewKey(env)).toEqual({ contract: synopsisContractVersion(true, true), basis: "classifier" });
    expect(preconOverviewKey({ ...env, LABEL_ROLE_COUNTS_ENABLED: "true" } as NodeJS.ProcessEnv).basis).toBe("labels");
  });
});

// Round 1 (PR 6): the precon ingest can replace a precon's list without clearing `current`, so the page
// shows the Overview only beside the very list it was written for.
describe("renderedPreconList and overviewForList", () => {
  const precon = {
    row: { commanders: [{ oracleId: "lead" }, { oracleId: "partner" }] },
    cards: [
      { oracleId: "lead", quantity: 1, isCommander: true },
      { oracleId: "partner", quantity: 1, isCommander: true },
      { oracleId: "sol", quantity: 1, isCommander: false },
      { oracleId: "sol", quantity: 1, isCommander: false },
      { oracleId: "wastes", quantity: 10, isCommander: false },
    ],
  };
  it("is the fingerprint of the list a start writes: the lead, the partner and the body summed per card", () => {
    expect(renderedPreconList(precon)).toBe(listFingerprint({ commanderOracleId: "lead", partnerOracleId: "partner", cards: [{ oracleId: "sol", quantity: 2 }, { oracleId: "wastes", quantity: 10 }] }));
  });
  it("shows an Overview written for the rendered list, and hides one written for another", () => {
    const list = renderedPreconList(precon);
    const o = { listFingerprint: list, content: "x" };
    expect(overviewForList(o, list)).toBe(o);
    const moved = renderedPreconList({ ...precon, cards: [...precon.cards, { oracleId: "new-map", quantity: 1, isCommander: false }] });
    expect(overviewForList(o, moved)).toBeNull();
    expect(overviewForList(null, list)).toBeNull();
  });
});
