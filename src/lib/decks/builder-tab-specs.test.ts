import { describe, expect, it } from "vitest";

import { builderTabSpecs } from "./builder-tab-specs";
import { historyOriginCopy } from "../copy/deck-versioning";
import { addPanelCopy } from "../copy/decks-builder";

const base = {
  built: 99,
  gameCount: 3,
  versionCount: 2,
};

const ids = (o: Partial<typeof base> = {}) =>
  builderTabSpecs({ ...base, ...o }).map((t) => t.id);

describe("which tabs the builder draws", () => {
  it("always draws Analysis, SECOND", () => {
    // ANALYSIS_TAB_ENABLED is retired (always on). Round 0's ruling is a position, not just a presence: fifth would
    // put the newest tab behind the phone row's scroll.
    expect(ids()).toEqual(["deck", "analysis", "tuning", "games", "versions"]);
  });

  it("gives Analysis no count", () => {
    // A figure beside it would read as one of the counts inside it.
    const analysis = builderTabSpecs(base).find((t) => t.id === "analysis");
    expect(analysis?.count).toBeUndefined();
    expect(analysis?.accessibleName).toBeTruthy();
  });

  it("keeps Analysis second on a brew, where Versions is absent", () => {
    // The position is relative to the tabs that DO draw.
    expect(ids({ versionCount: 0 })).toEqual(["deck", "analysis", "tuning", "games"]);
  });

  it("drops Versions on a brew", () => {
    const specs = builderTabSpecs({ ...base, gameCount: 0, versionCount: 0 });
    expect(specs.map((t) => t.id)).not.toContain("versions");
  });

  // Hugh, 2026-11-15: only Your deck draws a count; the others say theirs in the accessible name alone.
  it("draws a count on Your deck alone", () => {
    const specs = builderTabSpecs({ ...base, built: 99, gameCount: 4, versionCount: 3 });
    expect(specs.filter((t) => t.count !== undefined).map((t) => t.id)).toEqual(["deck"]);
    expect(specs.find((t) => t.id === "deck")?.count).toBe(99);
    expect(specs.find((t) => t.id === "tuning")?.accessibleName).toBe(addPanelCopy.tabs.tuningAria);
    expect(specs.find((t) => t.id === "games")?.accessibleName).toContain("4");
  });

  // Precons R3 K14: a brew linked to a precon has v0 in Versions, so the tab is drawn with one row.
  it("draws Versions on a LINKED brew, counting v0, and names v0 apart from committed versions", () => {
    const brew = builderTabSpecs({ ...base, versionCount: 0, hasOrigin: true }).find((t) => t.id === "versions");
    expect(brew?.accessibleName).toBe(historyOriginCopy.tabAria(0));
    const committed = builderTabSpecs({ ...base, versionCount: 2, hasOrigin: true }).find((t) => t.id === "versions");
    expect(committed?.accessibleName).toBe(historyOriginCopy.tabAria(2));
  });
});
