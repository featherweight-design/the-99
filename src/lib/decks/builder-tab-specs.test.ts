import { describe, expect, it } from "vitest";

import { builderTabSpecs } from "./builder-tab-specs";

const base = {
  built: 99,
  suggestionCount: 12,
  gameCount: 3,
  versionCount: 2,
  analysisEnabled: false,
};

const ids = (o: Partial<typeof base> = {}) =>
  builderTabSpecs({ ...base, ...o }).map((t) => t.id);

describe("which tabs the builder draws", () => {
  it("draws no Analysis tab when the flag is off", () => {
    // The state production is in until the variable is set deliberately.
    expect(ids()).toEqual(["deck", "consider", "games", "versions"]);
  });

  it("draws Analysis SECOND when the flag is on", () => {
    // Round 0's ruling is a position, not just a presence — fifth would put the newest tab
    // behind the phone row's scroll.
    expect(ids({ analysisEnabled: true })).toEqual([
      "deck",
      "analysis",
      "consider",
      "games",
      "versions",
    ]);
  });

  it("gives Analysis no count", () => {
    // A figure beside it would read as one of the counts inside it.
    const analysis = builderTabSpecs({ ...base, analysisEnabled: true }).find(
      (t) => t.id === "analysis",
    );
    expect(analysis?.count).toBeUndefined();
    expect(analysis?.accessibleName).toBeTruthy();
  });

  it("keeps Analysis second on a brew, where Versions is absent", () => {
    // Two conditional cells at once: the position is relative to the tabs that DO draw.
    expect(ids({ analysisEnabled: true, versionCount: 0 })).toEqual([
      "deck",
      "analysis",
      "consider",
      "games",
    ]);
  });

  it("still drops the Games count at zero, and Versions on a brew", () => {
    const specs = builderTabSpecs({ ...base, gameCount: 0, versionCount: 0 });
    expect(specs.find((t) => t.id === "games")?.count).toBeUndefined();
    expect(specs.map((t) => t.id)).not.toContain("versions");
  });
});
