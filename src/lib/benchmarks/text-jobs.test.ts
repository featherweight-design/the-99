import { describe, expect, it } from "vitest";
import { jobsFromText } from "./text-jobs";

const kinds = (typeLine: string, oracleText: string) => jobsFromText({ typeLine, oracleText, keywords: [] }).map((j) => j.kind);

describe("jobsFromText", () => {
  it("reads a counterspell as a counterspell and never as removal", () => {
    expect(kinds("Instant", "Counter target spell.")).toEqual(["counterspell"]);
  });
  it("keeps removal on a card that also counters", () => {
    expect(kinds("Instant", "Choose one — Counter target spell; or destroy target creature.")).toEqual(["removal", "counterspell"]);
  });
  it("reads no draw for an opponent's draw", () => {
    expect(kinds("Creature", "When this enters, its owner draws a card.")).toEqual([]);
  });
  it("reads no draw when the sentence that draws names an opponent", () => {
    expect(kinds("Legendary Creature", "{G}{W}{U}: Target opponent may draw a card.")).toEqual([]);
  });
  it("reads a draw when an opponent is named but the controller draws", () => {
    expect(kinds("Enchantment", "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.")).toEqual(["draw"]);
  });
  it("reads a controller's draw as a one-time draw for the controller", () => {
    expect(jobsFromText({ typeLine: "Sorcery", oracleText: "Draw two cards.", keywords: [] })).toMatchObject([{ kind: "draw", affects: "self", recurrence: "oneShot" }]);
  });
  it("reads ramp with no kind, so it is weighed by mana value alone", () => {
    expect(jobsFromText({ typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", keywords: [] })).toMatchObject([{ kind: "ramp", rampKind: null }]);
  });
});
