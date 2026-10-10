import { beforeEach, describe, expect, it, vi } from "vitest";

const where = vi.fn();
const readLabels = vi.fn();
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: (w: unknown) => where(w) }) }) } }));
vi.mock("drizzle-orm", async (orig) => ({ ...(await orig<typeof import("drizzle-orm")>()), inArray: (_c: unknown, ids: string[]) => ids }));
vi.mock("../labels/read", () => ({ readLabels: (ids: string[]) => readLabels(ids) }));

import { loadSourceMana } from "./source-mana";

const ramp = (rampKind: string | null) => [{ space: "role", kind: "ramp", rampKind }];
const text = (oracleId: string, oracleText: string, typeLine = "Artifact") => ({ oracleId, name: oracleId, typeLine, oracleText });
const card = (oracleId: string, role: string | null = null, typeLine = "Artifact") => ({ oracleId, typeLine, role });

describe("loadSourceMana", () => {
  beforeEach(() => {
    where.mockReset();
    readLabels.mockReset();
    readLabels.mockResolvedValue(new Map());
  });

  it("takes sources from the labels' ramp kinds and leaves out kinds that make no lasting source", async () => {
    readLabels.mockResolvedValue(new Map<string, unknown[]>([
      ["signet", ramp("tapsForMana")],
      ["tithe", ramp("makesTreasure")],
      ["ritual", ramp("burstMana")],
      ["helm", ramp("costReduction")],
      ["draw", [{ space: "role", kind: "draw" }]],
    ]));
    where.mockResolvedValue([text("signet", "{1}, {T}: Add {U}{B}."), text("tithe", "Whenever an opponent casts a spell, create a Treasure token.")]);
    const out = await loadSourceMana(["signet", "tithe", "ritual", "helm", "draw"].map((id) => card(id)), ["U", "B"]);
    expect(where).toHaveBeenCalledWith(["signet", "tithe"]);
    expect(out).toEqual({ signet: ["U", "B"], tithe: ["U", "B"] });
  });

  it("falls back to the classifier's ramp role for a card with no fresh label, and not for a labeled non-ramp one", async () => {
    readLabels.mockResolvedValue(new Map<string, unknown[]>([["labeled", [{ space: "role", kind: "removal" }]]]));
    where.mockResolvedValue([text("unlabeled", "{T}: Add {G}.", "Creature")]);
    const out = await loadSourceMana([card("unlabeled", "ramp", "Creature"), card("labeled", "ramp")], ["G"]);
    expect(where).toHaveBeenCalledWith(["unlabeled"]);
    expect(out).toEqual({ unlabeled: ["G"] });
  });

  it("keeps a source whose text gives no color, with no colors", async () => {
    readLabels.mockResolvedValue(new Map<string, unknown[]>([["x", ramp("tapsForMana")]]));
    where.mockResolvedValue([text("x", "{T}: Add an amount of mana equal to this card's power.")]);
    expect(await loadSourceMana([card("x")], ["G"])).toEqual({ x: [] });
  });

  it("uses the classifier alone when the label read fails", async () => {
    readLabels.mockRejectedValue(new Error("db down"));
    where.mockResolvedValue([text("rock", "{T}: Add {C}.")]);
    expect(await loadSourceMana([card("rock", "ramp")], [])).toEqual({ rock: ["C"] });
  });

  it("skips the read for a deck with no source, and ignores lands", async () => {
    expect(await loadSourceMana([card("island", "ramp", "Basic Land — Island")], [])).toEqual({});
    expect(where).not.toHaveBeenCalled();
  });

  it("returns null, not an empty record, when the text read fails", async () => {
    readLabels.mockResolvedValue(new Map<string, unknown[]>([["x", ramp("tapsForMana")]]));
    where.mockRejectedValue(new Error("db down"));
    expect(await loadSourceMana([card("x")], [])).toBeNull();
  });
});
