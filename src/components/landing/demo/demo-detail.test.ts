import { describe, expect, it } from "vitest";

import type { DemoCardDetail } from "../../../lib/demo/project-cards";
import { detailFor } from "./demo-detail";

const detail = (oracleId: string) => ({ oracleId, name: oracleId }) as unknown as DemoCardDetail;

describe("detailFor", () => {
  it("returns the card's exported details, whatever deck the press came from, until a deck's overlay joins", () => {
    const data = { cardDetails: { o1: detail("o1") } };
    for (const role of [null, "played", "over", "under"] as const) expect(detailFor(data, "o1", role)).toBe(data.cardDetails.o1);
  });

  it("returns nothing for a card the data holds no details for, and for a file with none", () => {
    expect(detailFor({ cardDetails: { o1: detail("o1") } }, "o2", null)).toBeUndefined();
    expect(detailFor({}, "o1", "played")).toBeUndefined();
  });
});
