import { describe, expect, it } from "vitest";

import { swapToolsCopy } from "../copy/swap-tools";
import type { StandInsRead } from "./gather";
import { listWords, loadingStatus, sheetModel } from "./sheet-model";
import type { CardRow, StandIn } from "./stand-ins";

const copy = swapToolsCopy.sheet;
const card = (name: string, typeLine = "Instant", oracleText = "", cmc = 2): CardRow =>
  ({ oracleId: `id-${name}`, name, typeLine, oracleText, keywords: [], cmc, imageUri: null });
const standIn = (name: string, over: Partial<StandIn> = {}): StandIn => ({
  card: card(name), free: false, soft: 0, owned: 0, cents: 300, foilOnly: false, inclusion: null,
  isUniversal: false, shared: ["removal"], drawbacks: [], givesUp: [], ...over,
} as StandIn);
const read = (over: Partial<StandInsRead>): StandInsRead => ({
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500,
  free: [], cheapest: [], byCommander: [], unlisted: [],
  original: card("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: new Date(), ...over,
} as StandInsRead);

describe("the stand-ins sheet's model", () => {
  it("joins words the way the copy reads them", () => {
    expect(listWords(["white"], "and")).toBe("white");
    expect(listWords(["white", "red"], "and")).toBe("white and red");
    expect(listWords(["Plains", "Island", "Swamp"], "or")).toBe("Plains, Island or Swamp");
  });

  it("orders a spell's groups free, then by the commander, then unlisted, with the figure on listed rows", () => {
    const m = sheetModel(read({
      free: [standIn("Swords", { free: true })],
      byCommander: [standIn("Path", { inclusion: 41.6 })],
      unlisted: [standIn("Chaos Warp")],
    }));
    expect(m.groups.map((g) => g.heading)).toEqual([
      copy.groupFree, copy.groupByCommander("Gishath"), copy.groupUnlisted("Gishath"),
    ]);
    expect(m.groups[1].rows[0].facts).toEqual(["removal", copy.mv(2), copy.figure("42", "Gishath")]);
    expect(m.groups[2].rows[0].facts).toEqual(["removal", copy.mv(2)]);
    expect(m.lead).toBe(copy.leadSpells("removal", 2, "Gishath"));
    expect(m.foot).toBe(true);
  });

  it("names a pair as A + B by short name, and drops the order clause when nothing is listed for it (F14)", () => {
    const m = sheetModel(read({ commanders: ["Tymna the Weaver", "Thrasios, Triton Hero"], unlisted: [standIn("Chaos Warp")] }));
    expect(m.groups.map((g) => g.heading)).toEqual([copy.groupUnlisted("Tymna the Weaver + Thrasios")]);
    expect(m.lead).toBe(copy.leadSpellsUnlisted("removal", 2));
  });

  it("gives a land its colors, drawbacks and what each stand-in gives up (H3)", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "R"] },
      original: card("Plateau", "Land — Mountain Plains"),
      cheapest: [
        standIn("Sacred Foundry", { drawbacks: [{ kind: "entersTappedUnless", condition: "you pay 2 life" }] }),
        standIn("Rugged Prairie", { givesUp: [{ kind: "named", label: "uncounterable creatures" }] }),
        standIn("Battlefield Forge", { givesUp: [{ kind: "quoted", text: "Target player draws…" }] }),
        standIn("Clifftop Retreat"),
      ],
    }));
    expect(m.job).toBe(`${copy.jobColors("white and red")} · ${copy.givesUpNothing}`);
    // A utility land does something of its own, so its line never says it gives up nothing (H3).
    const cavern = sheetModel(read({
      job: { kind: "land", colors: ["W"] },
      original: card("Cavern of Souls", "Land", "As Cavern of Souls enters, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered."),
      cheapest: [standIn("Plains")],
    }));
    expect(cavern.job).toBe(copy.jobColors("white"));
    expect(m.lead).toBe(copy.leadLands("white and red"));
    expect(m.groups.map((g) => g.heading)).toEqual([copy.groupCheapest]);
    const facts = m.groups[0].rows.map((r) => r.facts);
    expect(facts[0]).toEqual([copy.drawback.entersTappedUnless("you pay 2 life")]);
    expect(facts[1]).toEqual([copy.givesUp("uncounterable creatures")]);
    expect(facts[2]).toEqual([copy.givesUp("“Target player draws…”")]);
    // `gives up nothing` only where nothing else was said.
    expect(facts[3]).toEqual([copy.givesUpNothing]);
  });

  it("reads a fetch by the types it finds", () => {
    const m = sheetModel(read({
      job: { kind: "fetch", types: ["mountain", "forest"], basicOnly: false },
      original: card("Wooded Foothills", "Land", "{T}, Pay 1 life, Sacrifice Wooded Foothills: Search your library for a Mountain or Forest card"),
      // In the engine's own order, costs first: the model puts `finds only a basic` ahead of them.
      cheapest: [standIn("Evolving Wilds", { drawbacks: [{ kind: "entersTapped" }, { kind: "basicOnly" }] })],
    }));
    expect(m.job.startsWith(copy.jobFinds("a Mountain or Forest"))).toBe(true);
    expect(m.lead).toBe(copy.leadFetch("a Mountain or a Forest"));
    expect(m.groups[0].rows[0].facts).toEqual([copy.drawback.basicOnly, copy.drawback.entersTapped]);
  });

  it("says why there are no stand-ins for a card with no role, spell or land", () => {
    expect(sheetModel(read({ job: { kind: "none" }, original: card("Smothering Tithe", "Enchantment") })).sentence)
      .toBe(copy.noRole("Smothering Tithe"));
    const land = sheetModel(read({ job: { kind: "none" }, original: card("Strip Mine", "Land") }));
    expect(land.sentence).toBe(copy.noRoleLand("Strip Mine"));
    // The front face decides: a spell whose back face is a land is a spell.
    const mdfc = sheetModel(read({ job: { kind: "none" }, original: card("Some Spell // Some Land", "Sorcery // Land") }));
    expect(mdfc.sentence).toBe(copy.noRole("Some Spell // Some Land"));
    expect(land).toMatchObject({ lead: null, groups: [], foot: false, job: copy.jobNoRole });
  });

  it("says nothing cheaper, citing the original's price, when every group is empty", () => {
    expect(sheetModel(read({})).sentence).toBe(copy.nothingCheaper("removal", 2, "Gishath", "$15.00"));
    const land = sheetModel(read({ job: { kind: "land", colors: ["G"] }, original: card("Gaea's Cradle", "Legendary Land") }));
    expect(land.sentence).toBe(copy.nothingCheaperLand("green", "$15.00"));
  });

  it("lists free copies only for a sold-out original, and cites no price when there are none (F5)", () => {
    const some = sheetModel(read({ originalCents: null, free: [standIn("Swords", { free: true })] }));
    expect(some.lead).toBe(copy.leadSoldOut);
    expect(some.groups.map((g) => g.heading)).toEqual([copy.groupFree]);
    expect(sheetModel(read({ originalCents: null })).sentence).toBe(copy.soldOutNone("Anguished Unmaking"));
  });

  it("gives each basic type its own article: a Plains, an Island", () => {
      const m = sheetModel(read({
        job: { kind: "fetch", types: ["plains", "island"], basicOnly: false },
        original: card("Flooded Strand", "Land"),
        cheapest: [standIn("A", { givesUp: [] })],
      }));
      expect(m.job).toContain(copy.jobFinds("a Plains or Island"));
      expect(m.lead).toBe(copy.leadFetch("a Plains or an Island"));
      const island = sheetModel(read({
        job: { kind: "fetch", types: ["island", "forest"], basicOnly: false },
        original: card("Misty Rainforest", "Land"),
        cheapest: [standIn("A", { givesUp: [] })],
      }));
      expect(island.job).toContain(copy.jobFinds("an Island or Forest"));
      expect(island.lead).toBe(copy.leadFetch("an Island or a Forest"));
  });

  it("names a spell's job while loading, and waits for the read on a land", () => {
    expect(loadingStatus("ramp")).toBe(copy.loadingSpells("ramp"));
    expect(loadingStatus("land")).toBeNull();
    expect(loadingStatus("other")).toBeNull();
  });

  describe("a give-up every stand-in shares (Hugh, 2026-09-24)", () => {
    const cavern = card("Cavern of Souls", "Land");
    const uncounterable = { kind: "named", label: "uncounterable spells" } as const;

    it("says it once, in the lead, and leaves each row only its costs, or nothing", () => {
      const m = sheetModel(read({
        job: { kind: "land", colors: ["W", "U"] },
        original: cavern,
        free: [standIn("Command Tower", { free: true, givesUp: [uncounterable] })],
        cheapest: [standIn("Azorius Chancery", { givesUp: [uncounterable], drawbacks: [{ kind: "entersTapped" }] })],
      }));
      expect(m.lead).toBe(copy.leadLandsGivesUp("white and blue", "uncounterable spells"));
      expect(m.groups.map((g) => g.rows[0].facts)).toEqual([[], [copy.drawback.entersTapped]]);
    });

    it("quotes a shared unnamed ability in the lead too, and says a fetch's the same way", () => {
      const quoted = { kind: "quoted", text: "Threshold — {U}, {T}…" } as const;
      const m = sheetModel(read({
        job: { kind: "fetch", types: ["island"], basicOnly: false },
        original: card("Some Fetch", "Land"),
        cheapest: [standIn("A", { givesUp: [quoted] }), standIn("B", { givesUp: [quoted] })],
      }));
      expect(m.lead).toBe(copy.leadFetchGivesUp("an Island", "“Threshold — {U}, {T}…”"));
      expect(m.groups[0].rows.every((r) => r.facts.length === 0)).toBe(true);
    });

    it("keeps each row's own clause on a sold-out sheet, whose lead names no give-up", () => {
      const m = sheetModel(read({
        job: { kind: "land", colors: ["W", "U"] },
        original: cavern,
        originalCents: null,
        free: [standIn("Command Tower", { free: true, givesUp: [uncounterable] })],
      }));
      expect(m.lead).toBe(copy.leadSoldOut);
      expect(m.groups[0].rows[0].facts).toEqual([copy.givesUp("uncounterable spells")]);
    });

    it("keeps each row's own clause when the stand-ins give up different things", () => {
      const m = sheetModel(read({
        job: { kind: "land", colors: ["W"] },
        original: cavern,
        cheapest: [
          standIn("A", { givesUp: [uncounterable] }),
          standIn("B", { givesUp: [{ kind: "named", label: "card draw" }] }),
        ],
      }));
      expect(m.lead).toBe(copy.leadLands("white"));
      expect(m.groups[0].rows.map((r) => r.facts)).toEqual([[copy.givesUp("uncounterable spells")], [copy.givesUp("card draw")]]);
    });
  });
});
