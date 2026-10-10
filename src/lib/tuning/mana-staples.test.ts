import { describe, expect, it } from "vitest";
import { rankStaples, type StapleCandidate } from "./mana-staples";

const c = (name: string, over: Partial<StapleCandidate> = {}): StapleCandidate => ({
  oracleId: name,
  name,
  typeLine: "Artifact",
  manaCost: "{2}",
  produces: ["G"],
  fact: { kind: "commander", inclusion: 50 },
  free: 0,
  priceCents: null,
  ...over,
});

describe("rankStaples", () => {
  it("offers only cards that add a color the deck needs", () => {
    const out = rankStaples([c("Forest-ish"), c("Island-ish", { produces: ["U"] }), c("Rainbow", { produces: ["U", "G"] })], ["G"]);
    expect(out.map((x) => x.name)).toEqual(["Forest-ish", "Rainbow"]);
  });

  it("puts an owned copy first, even against a card more commanders run", () => {
    const out = rankStaples([c("Popular", { fact: { kind: "commander", inclusion: 90 } }), c("Owned", { free: 1, fact: { kind: "commander", inclusion: 20 } })], ["G"]);
    expect(out.map((x) => x.name)).toEqual(["Owned", "Popular"]);
  });

  it("orders by inclusion within owned and within not owned, a missing figure last, then by name", () => {
    const out = rankStaples(
      [
        c("B", { fact: { kind: "commander", inclusion: 40 } }),
        c("A", { fact: { kind: "commander", inclusion: 40 } }),
        c("None", { fact: { kind: "commander", inclusion: null } }),
        c("Top", { fact: { kind: "commander", inclusion: 70 } }),
      ],
      ["G"],
    );
    expect(out.map((x) => x.name)).toEqual(["Top", "A", "B", "None"]);
  });

  it("ranks an identity-bucket fact by the share of commanders that recommend it", () => {
    const id = (commanders: number) => ({ kind: "identity" as const, condition: "RGW", commanders, commanderTotal: 100, avgInclusion: 10 });
    const out = rankStaples([c("Low", { fact: id(20) }), c("High", { fact: id(60) })], ["G"]);
    expect(out.map((x) => x.name)).toEqual(["High", "Low"]);
  });

  it("caps the list", () => {
    expect(rankStaples(Array.from({ length: 9 }, (_, i) => c(`C${i}`)), ["G"], 3)).toHaveLength(3);
  });

  it("does not mutate its input", () => {
    const input = [c("B"), c("A")];
    rankStaples(input, ["G"]);
    expect(input.map((x) => x.name)).toEqual(["B", "A"]);
  });
});
