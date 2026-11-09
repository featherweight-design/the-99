import { describe, expect, it } from "vitest";

import type { DemoCardDetail } from "../../../lib/demo/project-cards";
import type { SiblingCard } from "../../cards/card-detail-context";
import { pageList, plateOf } from "./demo-card-host";

const sib = (oracleId: string, over: Partial<SiblingCard> = {}): SiblingCard => ({ oracleId, name: oracleId, ...over });
const held = (...ids: string[]) => (id: string) => (ids.includes(id) ? ({ oracleId: id }) as unknown as DemoCardDetail : undefined);

describe("pageList", () => {
  it("pages only the cards the data holds details for, each once, in the opener's order", () => {
    const list = pageList([sib("a"), sib("b"), sib("c"), sib("b"), sib("d")], "a", held("a", "c", "d"));
    expect(list.map((s) => s.oracleId)).toEqual(["a", "c", "d"]);
  });

  it("is empty when the open card is not in the list or has nothing beside it (the modal then reads 1 of 1)", () => {
    expect(pageList([sib("a"), sib("b")], "z", held("a", "b"))).toEqual([]);
    expect(pageList([sib("a"), sib("b")], "a", held("a"))).toEqual([]);
    expect(pageList([], "a", held("a"))).toEqual([]);
  });
});

describe("plateOf", () => {
  const card = (over: Record<string, unknown>) => ({
    oracleId: "n", name: "Neighbor", printedName: null, colorIdentity: [], quantity: 1, printings: [{ setCode: "AAA", collectorNumber: "1", imageUri: "https://img/own.jpg", quantity: 1, finishes: { nonfoil: 1 } }],
    preferredPrinting: null, imageUri: "https://img/oracle.jpg", ...over,
  }) as unknown as DemoCardDetail;

  it("draws the printing the neighbor's own details will show, not the opener's art", () => {
    const plate = plateOf(sib("n", { name: "Neighbor", imageUri: "https://img/oracle.jpg" }), () => card({}));
    expect(plate.imageUri).toBe("https://img/own.jpg");
    expect(plate.oracleId).toBe("n");
  });

  it("returns the sibling as it came when it has no details", () => {
    const s = sib("n", { imageUri: "x" });
    expect(plateOf(s, () => undefined)).toBe(s);
  });
});
