import { describe, expect, it } from "vitest";
import { standingIds } from "./added";

describe("standingIds", () => {
  it("keeps an entry nothing reverted", () => {
    expect(standingIds([{ id: "add", revertedBy: null }])).toEqual(new Set(["add"]));
  });

  it("drops an entry a standing revert took back", () => {
    expect(standingIds([{ id: "add", revertedBy: "r1" }])).toEqual(new Set());
  });

  it("brings an entry back when its revert is itself reverted, and drops it again a level up", () => {
    const links = [
      { id: "add", revertedBy: "r1" },
      { id: "r1", revertedBy: "r2" },
    ];
    expect(standingIds(links).has("add")).toBe(true);
    expect(standingIds([...links, { id: "r2", revertedBy: "r3" }]).has("add")).toBe(false);
  });

  it("reads two adds on one chain independently", () => {
    const s = standingIds([
      { id: "a", revertedBy: "r1" },
      { id: "b", revertedBy: null },
      { id: "r1", revertedBy: "r2" },
    ]);
    expect([...s].filter((id) => id === "a" || id === "b").sort()).toEqual(["a", "b"]);
  });
});
