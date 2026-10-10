import { beforeEach, describe, expect, it, vi } from "vitest";

const where = vi.fn();
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: (w: unknown) => where(w) }) }) } }));
vi.mock("drizzle-orm", async (orig) => ({ ...(await orig<typeof import("drizzle-orm")>()), inArray: (_c: unknown, ids: string[]) => ids }));

import { loadLandMana } from "./land-mana";

describe("loadLandMana", () => {
  beforeEach(() => {
    where.mockReset();
  });

  it("reads lands only and converts each row to the colors it adds", async () => {
    where.mockResolvedValue([{ oracleId: "tower", typeLine: "Land", oracleText: "{T}: Add one mana of any color in your commander's color identity." }]);
    const out = await loadLandMana(
      [{ oracleId: "tower", typeLine: "Land" }, { oracleId: "rock", typeLine: "Artifact" }],
      ["R", "G"],
    );
    expect(where).toHaveBeenCalledWith(["tower"]);
    expect(out).toEqual({ tower: ["R", "G"] });
  });

  it("skips the read for a deck with no lands", async () => {
    expect(await loadLandMana([{ oracleId: "rock", typeLine: "Artifact" }], ["R"])).toEqual({});
    expect(where).not.toHaveBeenCalled();
  });

  it("returns null, not an empty record, when the read fails", async () => {
    where.mockRejectedValue(new Error("db down"));
    expect(await loadLandMana([{ oracleId: "x", typeLine: "Land" }], [])).toBeNull();
  });
});
