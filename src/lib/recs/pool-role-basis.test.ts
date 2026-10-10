import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { loadPoolRoleBasis } from "./pool-role-basis";

const cards = [{ oracleId: "a" }, { oracleId: "b" }];

describe("loadPoolRoleBasis", () => {
  it("reads nothing and counts by the classifier when the switch is off", async () => {
    const read = vi.fn();
    const got = await loadPoolRoleBasis(cards, false, read);
    expect(got).toEqual({ basis: "classifier", roleSets: undefined, fellBack: false });
    expect(read).not.toHaveBeenCalled();
  });

  it("returns the label sets and the labels basis together when on", async () => {
    const sets = new Map([["a", ["ramp" as const]]]);
    const read = vi.fn().mockResolvedValue(sets);
    const got = await loadPoolRoleBasis(cards, true, read);
    expect(got.basis).toBe("labels");
    expect(got.roleSets).toBe(sets);
    expect(got.fellBack).toBe(false);
    expect(read).toHaveBeenCalledWith(["a", "b"]);
  });

  it("falls to the classifier on BOTH sides when the read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const got = await loadPoolRoleBasis(cards, true, vi.fn().mockRejectedValue(new Error("down")));
    expect(got).toEqual({ basis: "classifier", roleSets: undefined, fellBack: true });
  });
});
