import { describe, expect, it } from "vitest";

import { packJson, unpackJson } from "./packed";

describe("packJson", () => {
  it("round-trips a value exactly, including null, nested arrays and non-ASCII", () => {
    const list = [
      { oracleId: "a", name: "Æther Vial", printedName: null, setCounts: [["m21", 2]], price: 80 },
      { oracleId: "b", name: "Jötun Grunt", printedName: "Jötun", setCounts: [], price: null },
    ];
    expect(unpackJson(packJson(list))).toEqual(list);
  });
});
