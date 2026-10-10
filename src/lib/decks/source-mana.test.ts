import { beforeEach, describe, expect, it, vi } from "vitest";

const where = vi.fn();
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: (w: unknown) => where(w) }) }) } }));
vi.mock("drizzle-orm", async (orig) => ({ ...(await orig<typeof import("drizzle-orm")>()), inArray: (_c: unknown, ids: string[]) => ids }));

import { loadSourceMana } from "./source-mana";

const ramp = (rampKind: string | null) => [{ space: "role", kind: "ramp", rampKind }];
const text = (oracleId: string, oracleText: string, typeLine = "Artifact") => ({ oracleId, name: oracleId, typeLine, oracleText });
const labelsOf = (entries: [string, unknown[]][]) => new Map(entries) as unknown as Map<string, import("../labels/types").Job[]>;
const card = (oracleId: string, role: string | null = null, typeLine = "Artifact") => ({ oracleId, typeLine, role });

describe("loadSourceMana", () => {
  beforeEach(() => {
    where.mockReset();
  });

  it("takes sources from the labels' ramp kinds and leaves out every kind that makes no lasting source", async () => {
    const labels = labelsOf([
      ["signet", ramp("tapsForMana")],
      ["cultivate", ramp("fetchesLand")],
      ["tithe", ramp("makesTreasure")],
      ["ritual", ramp("burstMana")],
      ["helm", ramp("costReduction")],
      ["kindless", ramp(null)],
      ["draw", [{ space: "role", kind: "draw" }]],
    ]);
    where.mockResolvedValue([text("signet", "{1}, {T}: Add {U}{B}."), text("cultivate", "Search your library for a basic land card.", "Sorcery")]);
    const basics = [card("island", null, "Basic Land — Island"), card("swamp", null, "Basic Land — Swamp")];
    const out = await loadSourceMana([...["signet", "cultivate", "tithe", "ritual", "helm", "kindless", "draw"].map((id) => card(id, "ramp")), ...basics], ["U", "B"], labels);
    expect(where).toHaveBeenCalledWith(["signet", "cultivate"]);
    expect(out).toEqual({ signet: ["U", "B"], cultivate: ["U", "B"] });
  });

  it("gives a basic-land search the basics in the deck, not the whole identity", async () => {
    where.mockResolvedValue([text("cultivate", "Search your library for up to two basic land cards.", "Sorcery")]);
    const out = await loadSourceMana(
      [card("cultivate", null, "Sorcery"), card("forest", null, "Basic Land — Forest"), card("swamp", null, "Basic Land — Swamp")],
      ["W", "U", "B", "R", "G"],
      labelsOf([["cultivate", ramp("fetchesLand")]]),
    );
    expect(out).toEqual({ cultivate: ["B", "G"] });
  });

  it("counts Wastes among the basics a search can reach", async () => {
    where.mockResolvedValue([text("cultivate", "Search your library for up to two basic land cards.", "Sorcery")]);
    const out = await loadSourceMana([card("cultivate", null, "Sorcery"), card("wastes", null, "Basic Land")], ["G"], labelsOf([["cultivate", ramp("fetchesLand")]]));
    expect(out).toEqual({ cultivate: ["C"] });
  });

  it("falls back to the classifier's ramp role for a card with no fresh label, and not for a labeled non-ramp one", async () => {
    where.mockResolvedValue([text("unlabeled", "{T}: Add {G}.", "Creature")]);
    const labels = labelsOf([["labeled", [{ space: "role", kind: "removal" }]]]);
    const out = await loadSourceMana([card("unlabeled", "ramp", "Creature"), card("labeled", "ramp")], ["G"], labels);
    expect(where).toHaveBeenCalledWith(["unlabeled"]);
    expect(out).toEqual({ unlabeled: ["G"] });
  });

  it("keeps a source whose text gives no color, with no colors", async () => {
    where.mockResolvedValue([text("x", "{T}: Add an amount of mana equal to this card's power.")]);
    expect(await loadSourceMana([card("x")], ["G"], labelsOf([["x", ramp("tapsForMana")]]))).toEqual({ x: [] });
  });

  it("drops a no-source card (a landcycler here) instead of calling it unreadable, and keeps one that also taps for mana", async () => {
    where.mockResolvedValue([
      text("cycler", "Trample\nForestcycling {2} ({2}, Discard this card: Search your library for a Forest card.)", "Creature"),
      text("both", "{T}: Add {G}.\nBasic landcycling {1}", "Creature"),
    ]);
    const out = await loadSourceMana([card("cycler", null, "Creature"), card("both", null, "Creature")], ["G"], labelsOf([["cycler", ramp("fetchesLand")], ["both", ramp("tapsForMana")]]));
    expect(out).toEqual({ both: ["G"] });
  });

  it("uses the classifier alone when the label read failed", async () => {
    where.mockResolvedValue([text("rock", "{T}: Add {C}.")]);
    expect(await loadSourceMana([card("rock", "ramp")], [], null)).toEqual({ rock: ["C"] });
  });

  it("skips the read for a deck with no source, and ignores lands", async () => {
    expect(await loadSourceMana([card("island", "ramp", "Basic Land — Island")], [], new Map())).toEqual({});
    expect(where).not.toHaveBeenCalled();
  });

  it("returns null, not an empty record, when the text read fails", async () => {
    where.mockRejectedValue(new Error("db down"));
    expect(await loadSourceMana([card("x")], [], labelsOf([["x", ramp("tapsForMana")]]))).toBeNull();
  });
});
