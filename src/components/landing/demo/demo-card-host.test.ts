import { describe, expect, it } from "vitest";

import type { DemoCardDetail } from "../../../lib/demo/project-cards";
import type { SiblingCard } from "../../cards/card-detail-context";
import { pageList } from "./demo-card-host";

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
