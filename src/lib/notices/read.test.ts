import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

const { entryCards } = await import("./read");

// A removed combo keeps `detail.names` so it can still be read by name after its rows are gone.
describe("entryCards", () => {
  it("takes the names the entry was written with, in piece order", () => {
    expect(entryCards(["a", "b"], { names: ["Alpha", "Beta"] })).toEqual([
      { oracleId: "a", name: "Alpha" },
      { oracleId: "b", name: "Beta" },
    ]);
  });

  it("falls back to the id where no name was kept", () => {
    expect(entryCards(["a", "b"], { names: ["Alpha"] })).toEqual([
      { oracleId: "a", name: "Alpha" },
      { oracleId: "b", name: "b" },
    ]);
    expect(entryCards(["a"], {})).toEqual([{ oracleId: "a", name: "a" }]);
    expect(entryCards(["a"], { names: [7] })).toEqual([{ oracleId: "a", name: "a" }]);
  });
});
