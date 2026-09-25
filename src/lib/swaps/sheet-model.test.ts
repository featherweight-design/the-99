import { describe, expect, it } from "vitest";

import { swapToolsCopy } from "../copy/swap-tools";
import type { StandInsRead } from "./gather";
import { listWords, loadingStatus, rowGivesUp, sheetModel } from "./sheet-model";
import type { CardRow, MainType, StandIn, StandInGroup } from "./stand-ins";

const copy = swapToolsCopy.sheet;
const card = (name: string, typeLine = "Instant", oracleText = "", cmc = 2): CardRow =>
  ({ oracleId: `id-${name}`, name, typeLine, oracleText, keywords: [], cmc, imageUri: null });
const standIn = (name: string, over: Partial<StandIn> = {}): StandIn => ({
  card: card(name), free: false, soft: 0, owned: 0, cents: 300, foilOnly: false, inclusion: null,
  synergy: null, isUniversal: false, shared: ["removal"], sharedThemes: [], extra: [], missing: [], once: [], rung: null, drawbacks: [], givesUp: [], ...over,
} as StandIn);
const read = (over: Partial<StandInsRead>): StandInsRead => ({
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500,
  groups: [],
  original: card("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: new Date(), ...over,
} as StandInsRead);

/** The original's own type (instant, the fixture's default), or a land's one group. */
const same = (rows: StandIn[], type: MainType = "instant"): StandInGroup => ({ same: true, type, rows, total: rows.length });
const other = (rows: StandIn[]): StandInGroup => ({ same: false, type: "other", rows, total: rows.length });
const lands = (rows: StandIn[]) => [same(rows, "land")];

describe("the stand-ins sheet's model", () => {
  it("joins words the way the copy reads them", () => {
    expect(listWords(["white"], "and")).toBe("white");
    expect(listWords(["white", "red"], "and")).toBe("white and red");
    expect(listWords(["Plains", "Island", "Swamp"], "or")).toBe("Plains, Island or Swamp");
  });

  // Addendum §1b: type groups, each with its order note; Hugh's Q2: no % on any row.
  it("draws the original's own type, then other types, each row with its facts and no figure", () => {
    const m = sheetModel(read({
      groups: [
        same([standIn("Swords", { free: true, synergy: 0.2 }), standIn("Path", { inclusion: 41.6, synergy: 0.1 })]),
        other([standIn("Chaos Warp", { card: card("Chaos Warp", "Sorcery") })]),
      ],
    }));
    expect(m.groups.map((g) => [g.heading, g.order, g.noun])).toEqual([
      [copy.groupSameType("instants"), copy.orderMostShared, "instants"],
      [copy.groupOtherTypes, copy.orderMostShared, copy.groupOtherTypes],
    ]);
    // The lead names the job once, so a row names only what differs from the original.
    expect(m.groups[0].rows[1]).toMatchObject({ body: [copy.mv(2)], muted: [] });
    // An other-types row names its type first: its heading cannot.
    expect(m.groups[1].rows[0]).toMatchObject({ body: ["sorcery", copy.mv(2)], muted: [] });
    expect(m.lead).toBe([copy.leadSpellsJob("removal", 2), copy.leadSpellsTypes("instants"), copy.leadSpellsOrder("Anguished Unmaking", "Gishath")].join(" "));
    expect(m.foot).toBe(true);
  });

  it("drops the types sentence when only one group is drawn", () => {
    const m = sheetModel(read({ groups: [other([standIn("Chaos Warp", { synergy: 0.3 })])] }));
    expect(m.lead).toBe([copy.leadSpellsJob("removal", 2), copy.leadSpellsOrder("Anguished Unmaking", "Gishath")].join(" "));
  });

  it("says staples come last when one is listed, and keeps a staple's clause on its row", () => {
    const m = sheetModel(read({
      groups: [same([standIn("Path", { synergy: 0.1 }), standIn("Sol Ring", { isUniversal: true, free: true })])],
    }));
    expect(m.groups[0].rows[1]).toMatchObject({ body: [copy.mv(2), copy.stapleFact], muted: [] });
    expect(m.lead).toBe([copy.leadSpellsJob("removal", 2), copy.leadSpellsOrder("Anguished Unmaking", "Gishath"), copy.leadSpellsStaples].join(" "));
  });

  it("names a pair as A + B by short name, and drops the commander from the order when nothing is listed (F14)", () => {
    const m = sheetModel(read({ commanders: ["Tymna the Weaver", "Thrasios, Triton Hero"], groups: [same([standIn("Chaos Warp", { synergy: 0.2 })])] }));
    expect(m.lead).toContain(copy.leadSpellsOrder("Anguished Unmaking", "Tymna the Weaver + Thrasios"));
    const unlisted = sheetModel(read({ groups: [same([standIn("Chaos Warp")])] }));
    expect(unlisted.lead).toBe([copy.leadSpellsJob("removal", 2), copy.leadSpellsOrderUnlisted("Anguished Unmaking")].join(" "));
  });

  it("gives a land its colors, drawbacks and what each stand-in gives up (H3)", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "R"] },
      original: card("Plateau", "Land — Mountain Plains"),
      groups: lands([
        standIn("Sacred Foundry", { drawbacks: [{ kind: "entersTappedUnless", condition: "you pay 2 life" }] }),
        standIn("Rugged Prairie", { givesUp: [{ kind: "named", label: "uncounterable creatures" }] }),
        standIn("Battlefield Forge", { givesUp: [{ kind: "quoted", text: "Target player draws…" }] }),
        standIn("Clifftop Retreat"),
      ]),
    }));
    expect(m.job).toBe(`${copy.jobColors("white and red")} · ${copy.givesUpNothing}`);
    // A utility land does something of its own, so its line never says it gives up nothing (H3).
    const cavern = sheetModel(read({
      job: { kind: "land", colors: ["W"] },
      original: card("Cavern of Souls", "Land", "As Cavern of Souls enters, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered."),
      groups: lands([standIn("Plains")]),
    }));
    expect(cavern.job).toBe(copy.jobColors("white"));
    expect(m.lead).toBe(copy.leadLands("white and red"));
    expect(m.groups.map((g) => [g.heading, g.order, g.noun])).toEqual([[copy.groupSameType("lands"), copy.orderBestMana, "lands"]]);
    const lines = m.groups[0].rows.map((r) => [r.body, r.muted]);
    const WR = (state: string) => [copy.mana.line("white and red", state)];
    // A condition that is a price is the condition itself: no second segment (addendum §1a).
    expect(lines[0]).toEqual([WR(copy.mana.untappedIf("you pay 2 life")), []]);
    expect(lines[1]).toEqual([WR(copy.mana.untapped), [copy.givesUp("uncounterable creatures")]]);
    // Close-out ruling 6: a row never quotes; an ability no pattern names is counted instead.
    expect(lines[2]).toEqual([WR(copy.mana.untapped), [copy.givesUp(copy.otherAbilities(1, false))]]);
    // A mana line says what the land does, so a row with no cost says nothing more (the addendum's Sacred Foundry).
    expect(lines[3]).toEqual([WR(copy.mana.untapped), []]);
  });

  it("says a row's give-ups in one clause, named, then counts the ones no pattern names, never quoting them", () => {
    expect(rowGivesUp([
      { kind: "quoted", text: "You may choose not to untap this land…" },
      { kind: "named", label: "storing mana" },
      { kind: "quoted", text: "At the beginning of your upkeep…" },
    ])).toEqual([copy.givesUp(`storing mana and ${copy.otherAbilities(2, true)}`)]);
    expect(rowGivesUp([])).toEqual([]);
  });

  // Addendum §1a: the four forms of the mana line, and a one-shot color named in the cost segment.
  it("writes each land's mana line from how it enters, and names a color it makes only once", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "R"] },
      original: card("Plateau", "Land — Mountain Plains"),
      groups: lands([
        standIn("Clifftop Retreat", { drawbacks: [{ kind: "entersTappedUnless", condition: "you control a mountain or a plains" }] }),
        standIn("Battlefield Forge", { drawbacks: [{ kind: "damage", amount: 1, colors: ["R", "W"] }] }),
        standIn("Mana Confluence", { drawbacks: [{ kind: "life", amount: 1, colors: ["W", "U", "B", "R", "G"] }] }),
        standIn("Ravaged Highlands", { once: ["W"], drawbacks: [{ kind: "entersTapped" }] }),
      ]),
    }));
    const [retreat, forge, confluence, highlands] = m.groups[0].rows;
    // Close-out ruling 6: paid for every color the mana line names, so the cost does not repeat them.
    expect(confluence.muted).toEqual([copy.drawback.lifeFetch(1)]);
    expect(retreat.body).toEqual([copy.mana.line("white and red", copy.mana.untappedWith("a Mountain or a Plains"))]);
    expect(forge).toMatchObject({ body: [copy.mana.line("white and red", copy.mana.untapped)], muted: [copy.drawback.damageAny(1)] });
    expect(highlands).toMatchObject({ body: [copy.mana.line("red", copy.mana.tapped)], muted: [copy.mana.once("white")] });
  });

  it("names every job all the stand-ins lack in the lead, uncapped", () => {
    const m = sheetModel(read({
      groups: [same([standIn("A", { synergy: 0.2, missing: ["castFree", "counters", "haste"] }), standIn("B", { missing: ["castFree", "counters", "haste"] })])],
    }));
    expect(m.lead).toContain(copy.leadSpellsGivesUp("Anguished Unmaking", `${copy.job.castFree}, ${copy.job.counters} and ${copy.job.haste}`));
  });

  // Close-out ruling 6: a cost for only some of the line's colors still names them, and one-shot colors share a clause.
  it("names a cost's colors when it covers only some of the line's, and says every one-shot color in one clause", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "U", "B", "R", "G"] },
      original: card("City of Brass", "Land", "{T}: Add one mana of any color. City of Brass deals 1 damage to you."),
      groups: lands([
        standIn("Tarnished Citadel", { drawbacks: [{ kind: "damage", amount: 3, colors: ["W", "U"] }] }),
        standIn("Lotus Bloom Land", { once: ["U", "B", "R", "G"], drawbacks: [{ kind: "entersTapped" }] }),
      ]),
    }));
    const [citadel, bloom] = m.groups[0].rows;
    expect(citadel.muted).toEqual([copy.drawback.damage(3, "white and blue")]);
    // Every color the line did not name, once: said as the rest of them.
    expect(bloom.muted).toEqual([copy.mana.once(copy.everyOtherColor)]);
    const two = sheetModel(read({
      job: { kind: "land", colors: ["W", "U", "B"] },
      original: card("Crumbling Necropolis", "Land", "{T}: Add {U}, {B}, or {R}."),
      groups: lands([standIn("Two Once", { once: ["U", "B"], drawbacks: [{ kind: "entersTapped" }] })]),
    }));
    expect(two.groups[0].rows[0].muted).toEqual([copy.mana.once("blue and black")]);
  });

  it("writes a condition's count as a figure", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["R"] },
      original: card("Mountain Hold", "Land", "{T}: Add {R}."),
      groups: lands([
        standIn("Arena Land", { drawbacks: [{ kind: "entersTappedUnless", condition: "your opponents control eight or more lands" }] }),
        standIn("Few Land", { drawbacks: [{ kind: "entersTappedUnless", condition: "you control two or fewer other lands" }] }),
      ]),
    }));
    expect(m.groups[0].rows.map((r) => r.body[0])).toEqual([
      copy.mana.line("red", copy.mana.untappedIf("your opponents control 8 or more lands")),
      copy.mana.line("red", copy.mana.untappedWith("2 or fewer other lands")),
    ]);
  });

  it("says a reveal land's condition as the type in hand or play", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "U"] },
      original: card("Tundra", "Land — Plains Island", "({T}: Add {W} or {U}.)"),
      groups: lands([standIn("Fortified Beachhead", {
        drawbacks: [{ kind: "entersTappedUnless", condition: "you revealed a soldier card this way or you control a soldier" }],
      })]),
    }));
    expect(m.groups[0].rows[0].body).toEqual([copy.mana.line("white and blue", copy.mana.untappedWith(copy.mana.inHandOrPlay("Soldier")))]);
  });

  it("says all five colors as every color, and the Starting Town condition short", () => {
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W", "U", "B", "R", "G"] },
      original: card("City of Brass", "Land", "{T}: Add one mana of any color. City of Brass deals 1 damage to you."),
      groups: lands([standIn("Starting Town", {
        drawbacks: [{ kind: "entersTappedUnless", condition: "it's your first, second, or third turn of the game" }],
      })]),
    }));
    expect(m.groups[0].rows[0].body).toEqual([copy.mana.line(copy.everyColor, copy.mana.untappedEarly)]);
    expect(m.lead).toBe(copy.leadLands(copy.everyColor));
  });

  it("names what a land makes again and again when every job color is made only once", () => {
    const highlands = { ...card("Ravaged Highlands", "Land", "This land enters tapped.\n{T}: Add {R}.\n{T}, Sacrifice this land: Add one mana of any color.") };
    const m = sheetModel(read({
      job: { kind: "land", colors: ["W"] },
      original: card("Plains-ish", "Land"),
      groups: lands([standIn("Ravaged Highlands", { card: highlands, once: ["W"], drawbacks: [{ kind: "entersTapped" }] })]),
    }));
    expect(m.groups[0].rows[0].body).toEqual([copy.mana.line("red", copy.mana.tapped)]);
  });

  it("says a job every stand-in lacks once, in the lead, and not on each row", () => {
    const m = sheetModel(read({
      groups: [same([
        standIn("A", { synergy: 0.2, missing: ["castFree", "counters"] }),
        standIn("B", { missing: ["castFree"] }),
      ])],
    }));
    expect(m.lead).toContain(copy.leadSpellsGivesUp("Anguished Unmaking", copy.job.castFree));
    expect(m.groups[0].rows.map((r) => r.muted)).toEqual([[copy.givesUp(copy.job.counters)], []]);
  });

  // Addendum R1: a spell row's jobs beyond the original's (`also`), and the original's it lacks, two at most.
  it("names a spell's extra jobs and what it gives up, a word once, two of each at most", () => {
    const m = sheetModel(read({
      // A second row that keeps the job, so the first row's give-up is its own rather than every row's.
      groups: [same([standIn("Mulldrifter-ish", { extra: ["draw", "draw", "evasion", "blink"], missing: ["counters"] }), standIn("Keeps it")])],
    }));
    expect(m.groups[0].rows[0]).toMatchObject({
      body: [copy.mv(2), copy.also(`${copy.job.draw} and ${copy.job.evasion}`)],
      muted: [copy.givesUp(copy.job.counters)],
    });
  });

  it("reads a fetch by the types it finds", () => {
    const m = sheetModel(read({
      job: { kind: "fetch", types: ["mountain", "forest"], basicOnly: false },
      original: card("Wooded Foothills", "Land", "{T}, Pay 1 life, Sacrifice Wooded Foothills: Search your library for a Mountain or Forest card"),
      // In the engine's own order, costs first: the model puts `finds only a basic` ahead of them.
      groups: lands([standIn("Evolving Wilds", { drawbacks: [{ kind: "entersTapped" }, { kind: "basicOnly" }] })]),
    }));
    expect(m.job.startsWith(copy.jobFinds("a Mountain or Forest"))).toBe(true);
    expect(m.lead).toBe(copy.leadFetch("a Mountain or a Forest"));
    // A fetch keeps its `finds …` reading: no mana line (addendum §1a).
    expect(m.groups[0].rows[0]).toMatchObject({ body: [], muted: [copy.drawback.basicOnly, copy.drawback.entersTapped] });
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
    const some = sheetModel(read({ originalCents: null, groups: [same([standIn("Swords", { free: true })])] }));
    expect(some.lead).toBe(copy.leadSoldOut);
    expect(some.groups.map((g) => g.heading)).toEqual([copy.groupSameType("instants")]);
    expect(sheetModel(read({ originalCents: null })).sentence).toBe(copy.soldOutNone("Anguished Unmaking"));
  });

  it("gives each basic type its own article: a Plains, an Island", () => {
      const m = sheetModel(read({
        job: { kind: "fetch", types: ["plains", "island"], basicOnly: false },
        original: card("Flooded Strand", "Land"),
        groups: lands([standIn("A", { givesUp: [] })]),
      }));
      expect(m.job).toContain(copy.jobFinds("a Plains or Island"));
      expect(m.lead).toBe(copy.leadFetch("a Plains or an Island"));
      const island = sheetModel(read({
        job: { kind: "fetch", types: ["island", "forest"], basicOnly: false },
        original: card("Misty Rainforest", "Land"),
        groups: lands([standIn("A", { givesUp: [] })]),
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
        groups: lands([
          standIn("Command Tower", { free: true, givesUp: [uncounterable] }),
          standIn("Azorius Chancery", { givesUp: [uncounterable], drawbacks: [{ kind: "entersTapped" }] }),
        ]),
      }));
      expect(m.lead).toBe(copy.leadLandsGivesUp("white and blue", "uncounterable spells"));
      expect(m.groups[0].rows.map((r) => [r.body, r.muted])).toEqual([
        [[copy.mana.line("white and blue", copy.mana.untapped)], []],
        [[copy.mana.line("white and blue", copy.mana.tapped)], []],
      ]);
    });

    it("quotes a shared unnamed ability in the lead too, and says a fetch's the same way", () => {
      const quoted = { kind: "quoted", text: "Threshold — {U}, {T}…" } as const;
      const m = sheetModel(read({
        job: { kind: "fetch", types: ["island"], basicOnly: false },
        original: card("Some Fetch", "Land"),
        groups: lands([standIn("A", { givesUp: [quoted] }), standIn("B", { givesUp: [quoted] })]),
      }));
      expect(m.lead).toBe(copy.leadFetchGivesUp("an Island", "“Threshold — {U}, {T}…”"));
      expect(m.groups[0].rows.every((r) => r.body.length === 0 && r.muted.length === 0)).toBe(true);
    });

    it("keeps each row's own clause on a sold-out sheet, whose lead names no give-up", () => {
      const m = sheetModel(read({
        job: { kind: "land", colors: ["W", "U"] },
        original: cavern,
        originalCents: null,
        groups: lands([standIn("Command Tower", { free: true, givesUp: [uncounterable] })]),
      }));
      expect(m.lead).toBe(copy.leadSoldOut);
      expect(m.groups[0].rows[0].muted).toEqual([copy.givesUp("uncounterable spells")]);
    });

    it("keeps each row's own clause when the stand-ins give up different things", () => {
      const m = sheetModel(read({
        job: { kind: "land", colors: ["W"] },
        original: cavern,
        groups: lands([
          standIn("A", { givesUp: [uncounterable] }),
          standIn("B", { givesUp: [{ kind: "named", label: "card draw" }] }),
        ]),
      }));
      expect(m.lead).toBe(copy.leadLands("white"));
      expect(m.groups[0].rows.map((r) => r.muted)).toEqual([[copy.givesUp("uncounterable spells")], [copy.givesUp("card draw")]]);
    });
  });
});
