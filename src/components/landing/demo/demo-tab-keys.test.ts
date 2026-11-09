import { describe, expect, it } from "vitest";

import { nextTab } from "./demo-tab-keys";
import { declineRow, liveTicks, toggleTick } from "./demo-top-off-state";

describe("nextTab", () => {
  const ids = ["a", "b", "c"] as const;
  it("steps with the arrows and wraps at both ends", () => {
    expect(nextTab(ids, "a", "ArrowRight")).toBe("b");
    expect(nextTab(ids, "c", "ArrowRight")).toBe("a");
    expect(nextTab(ids, "a", "ArrowLeft")).toBe("c");
  });
  it("jumps with Home and End, and stays on any other key", () => {
    expect(nextTab(ids, "b", "Home")).toBe("a");
    expect(nextTab(ids, "b", "End")).toBe("c");
    expect(nextTab(ids, "b", "x")).toBe("b");
  });
});

describe("the demo's Top off selection", () => {
  const pool = ["a", "b", "c", "d"];
  it("counts ticks in pool order, never past the open slots, never a declined row", () => {
    expect([...liveTicks(pool, new Set(["d", "c", "a"]), new Set(), 2)]).toEqual(["a", "c"]);
    expect([...liveTicks(pool, new Set(["a", "b"]), new Set(["a"]), 3)]).toEqual(["b"]);
  });
  it("a tap unticks a ticked row and ticks another only while a slot is open", () => {
    expect([...toggleTick(new Set(["a"]), "a", 2)]).toEqual([]);
    expect([...toggleTick(new Set(["a"]), "b", 2)]).toEqual(["a", "b"]);
    expect([...toggleTick(new Set(["a", "b"]), "c", 2)]).toEqual(["a", "b"]);
  });
  it("setting a row aside takes its tick with it", () => {
    const next = declineRow(new Set(["a", "b"]), new Set(), "a");
    expect([...next.ticked]).toEqual(["b"]);
    expect([...next.declined]).toEqual(["a"]);
  });
});
