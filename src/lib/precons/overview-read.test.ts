// Small items 5 (`Precon-Overview` §1): which stored precon Overview its page shows, and at which key.
import { describe, expect, it } from "vitest";
import { preconOverviewKey, showsPreconOverview } from "./overview-read";
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
