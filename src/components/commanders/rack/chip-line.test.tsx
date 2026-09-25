import { describe, expect, it } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { chipsFor } from "./chip-line";

// The component is gone: the rack mounts `FilterChassis`, which draws the chip
// row for all four routes. The row's own behaviours — holding its height with
// nothing on, keeping Clear present and inert, naming the value a chip removes
// — are covered once in `src/components/ui/filter-chassis.test.tsx`.
//
// What stayed is the derivation, which is lane-shaped and the chassis cannot do
// for itself: which chips exist, in what order, and what each one unsets.
describe("chipsFor", () => {
  it("gives an untouched lane no chips at all", () => {
    expect(chipsFor(defaultParams("owned"), "owned")).toHaveLength(0);
  });

  it("orders chips by control, search first", () => {
    const chips = chipsFor(
      { ...defaultParams("owned"), q: "druid", colors: ["b", "g"] },
      "owned",
    );
    expect(chips[0].label).toContain('"druid"');
  });

  // One chip per control, not per value: the label collapses two pips to
  // "2 colors" and the swatches inside that one chip say which two.
  it("collapses several hues into one chip carrying a swatch each", () => {
    const chips = chipsFor({ ...defaultParams("owned"), colors: ["b", "g"] }, "owned");
    const colour = chips.filter((c) => c.key === "colors");
    expect(colour).toHaveLength(1);
    expect(colour[0].dots).toHaveLength(2);
  });

  it("names the hues a collapsed colour chip stands for", () => {
    // The swatches are aria-hidden, so past one pip "2 colors" is all a
    // screen reader gets without this.
    const chips = chipsFor({ ...defaultParams("owned"), colors: ["b", "g"] }, "owned");
    expect(chips.find((c) => c.key === "colors")?.spoken).toBe("Black, Green");
  });

  it("leaves a single hue unspoken, since the label already names it", () => {
    const chips = chipsFor({ ...defaultParams("owned"), colors: ["r"] }, "owned");
    const colour = chips.find((c) => c.key === "colors")!;
    expect(colour.label).toBe("Red");
    expect(colour.spoken).toBeUndefined();
  });

  it("hands back the parameters that unset just that chip", () => {
    const params = { ...defaultParams("owned"), q: "druid", colors: ["b"] };
    const search = chipsFor(params, "owned").find((c) => c.label.includes("druid"))!;
    expect({ ...params, ...search.next }).toMatchObject({ q: "", colors: ["b"] });
  });

  it("does not offer an availability chip on the lane that has no availability", () => {
    const discover = chipsFor({ ...defaultParams("discover"), colors: ["r"] }, "discover");
    expect(discover.some((c) => c.key.startsWith("avail"))).toBe(false);
  });
});
