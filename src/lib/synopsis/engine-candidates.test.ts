import { describe, expect, it } from "vitest";

import { engineCandidates, ENGINE_CANDIDATES_MAX } from "./engine-candidates";
import type { FactCard } from "./facts";

const card = (name: string, typeLine: string, oracleText: string | null, extra: Partial<FactCard> = {}): FactCard =>
  ({ oracleId: `id-${name}`, name, typeLine, quantity: 1, categories: [], oracleText, ...extra });

const IMOTEKH = card("Imotekh the Stormlord", "Legendary Artifact Creature - Necron", "Whenever an artifact creature you control deals combat damage to a player, you may sacrifice an artifact, then create a Necron token.");
const DECK = [
  IMOTEKH,
  card("Canoptek Spyder", "Artifact Creature - Necron", "Whenever another artifact creature dies, put a counter on this."),
  card("Skorpekh Lord", "Artifact Creature - Necron", "Exile a creature card from your graveyard."),
  card("Ichor Wellspring", "Artifact", "When this enters or is put into a graveyard, draw a card. Sacrifice an artifact: add {B}."),
  card("Deadly Dispute", "Instant", "Additional cost: sacrifice an artifact or creature. Draw two cards."),
  card("Cultivate", "Sorcery", "Search your library for two basic land cards."),
  card("Doom Blade", "Instant", "Destroy target nonblack creature."),
  card("Swamp", "Basic Land - Swamp", null, { quantity: 20 }),
  card("Sol Ring", "Artifact", "{T}: Add {C}{C}.", { universalStaple: true }),
];

describe("engineCandidates", () => {
  const out = engineCandidates(DECK, ["Imotekh the Stormlord"]);

  it("ranks the cards that share the commander's rare words first and names the word", () => {
    expect(out.map((c) => c.name).sort()).toEqual(["Canoptek Spyder", "Deadly Dispute", "Ichor Wellspring", "Skorpekh Lord"]);
    expect(out.find((c) => c.name === "Canoptek Spyder")!.shared).toContain("necron");
    expect(out.find((c) => c.name === "Ichor Wellspring")!.shared).toContain("sacrifice");
  });

  it("leaves out the commander, basics, universal staples and cards that share nothing", () => {
    const names = out.map((c) => c.name);
    for (const n of ["Imotekh the Stormlord", "Swamp", "Sol Ring", "Cultivate", "Doom Blade"]) expect(names).not.toContain(n);
  });

  it("is empty with no commander in the list, rather than guessing", () => {
    expect(engineCandidates(DECK, ["Nobody"])).toEqual([]);
  });

  it("holds the cap", () => {
    const many = [card("Lead", "Creature - Goblin", "Whenever a goblin attacks, create a goblin token."),
      ...Array.from({ length: 40 }, (_, i) => card(`Goblin ${i}`, "Creature - Goblin", "A goblin."))
        .concat(Array.from({ length: 60 }, (_, i) => card(`Filler ${i}`, "Sorcery", `Filler ${i}.`)))];
    expect(engineCandidates(many, ["Lead"]).length).toBeLessThanOrEqual(ENGINE_CANDIDATES_MAX);
  });

  it("counts the commander and one partner as a pair: a word only one other card shares still links it", () => {
    const deck = [card("Lead", "Legendary Creature - Squirrel", "Whenever a squirrel dies, draw."),
      card("Partner", "Creature - Squirrel", "A squirrel."),
      ...Array.from({ length: 9 }, (_, i) => card(`Filler ${i}`, "Sorcery", `Filler ${i}.`))];
    const out = engineCandidates(deck, ["Lead"]);
    expect(out.map((c) => c.name)).toEqual(["Partner"]);
    expect(out[0]!.shared).toContain("squirrel");
  });
});
