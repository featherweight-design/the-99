import { describe, expect, it } from "vitest";
import { tokenContractFailures } from "./contract";

async function* of(entries: Record<string, unknown>[]) { for (const e of entries) yield e; }
const tok = (over = {}) => ({ id: "t-1", oracle_id: "to-1", layout: "token", name: "Treasure", type_line: "Token Artifact", set: "x", collector_number: "1", ...over });
const card = (parts: unknown[]) => ({ id: "c-1", oracle_id: "co-1", layout: "normal", all_parts: parts });
const part = (id: string, component = "token") => ({ id, component });

describe("tokenContractFailures", () => {
  it("passes when a card names a token that resolves, in either order", async () => {
    expect(await tokenContractFailures(of([tok(), card([part("t-1")])]))).toEqual([]);
    expect(await tokenContractFailures(of([card([part("t-1")]), tok()]))).toEqual([]);
  });
  it("stops reading at the first proof", async () => {
    let pulled = 0;
    async function* counted() { for (const e of [tok(), card([part("t-1")]), card([part("never")])]) { pulled++; yield e; } }
    await tokenContractFailures(counted());
    expect(pulled).toBe(2);
  });
  it("fails when no entry is a token", async () => {
    expect((await tokenContractFailures(of([card([part("t-1")])]))).join()).toMatch(/no entry has a token layout/);
  });
  it("fails when no card names a token part", async () => {
    expect((await tokenContractFailures(of([tok(), card([part("t-1", "combo_piece")])]))).join()).toMatch(/no card names/);
  });
  it("fails when the part ids resolve to nothing", async () => {
    expect((await tokenContractFailures(of([tok(), card([part("other")])]))).join()).toMatch(/no token part id resolved/);
  });
  it("fails when every token entry has lost a field the ingest needs", async () => {
    expect((await tokenContractFailures(of([tok({ oracle_id: undefined }), card([part("t-1")])]))).join()).toMatch(/required field moved/);
  });
});
