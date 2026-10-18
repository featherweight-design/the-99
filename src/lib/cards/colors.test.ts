import { describe, expect, it } from "vitest";
import { inWubrgOrder } from "./colors";

describe("inWubrgOrder", () => {
  it("writes an identity in WUBRG order whatever order the catalog stored it in", () => {
    expect(inWubrgOrder(["R", "U"])).toEqual(["U", "R"]);
    expect(inWubrgOrder(["G", "W", "B"])).toEqual(["W", "B", "G"]);
    expect(inWubrgOrder([])).toEqual([]);
  });
});
