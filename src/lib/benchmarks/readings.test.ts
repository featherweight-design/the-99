import { describe, expect, it } from "vitest";
import { card, job } from "./fixtures";
import { activatedOnBattlefield, makesOwnTokensRepeatably, namesACreatureType, outsideCombat, pumpsOthers, recursionReads, selfMillReads } from "./readings";

const t = (oracleText: string, over = {}) => card("X", { oracleText, ...over });

describe("the spot check's read-side filters", () => {
  it("recursion reads the graveyard, or returns on dying", () => {
    expect(recursionReads(t("Return target creature card from your graveyard to your hand."))).toBe(true);
    expect(recursionReads(t("When this dies, return it to the battlefield."))).toBe(true);
    expect(recursionReads(t("You may put a creature card from your hand onto the battlefield."))).toBe(false);
  });
  it("self-mill actually mills", () => {
    expect(selfMillReads(t("Mill three cards."))).toBe(true);
    expect(selfMillReads(t("Exile the top card of your library."))).toBe(false);
  });
  it("an activated ability counts only on the battlefield", () => {
    expect(activatedOnBattlefield(t("{T}: Add {G}."))).toBe(true);
    expect(activatedOnBattlefield(t("Ninjutsu {1}{U} (Pay, return an unblocked attacker you control to hand: Put this card onto the battlefield.)"))).toBe(false);
    expect(activatedOnBattlefield(t("Whenever a land enters, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")"))).toBe(false);
    expect(activatedOnBattlefield(t("Creatures you control have \"{T}: Add {G}.\""))).toBe(true);
    expect(activatedOnBattlefield(t("{2}{B}: Return this card from your graveyard to the battlefield."))).toBe(false);
  });
  it("a combat trigger is not a route outside combat", () => {
    expect(outsideCombat(job({ kind: "drain", trigger: "combatDamage" }))).toBe(false);
    expect(outsideCombat(job({ kind: "drain", trigger: "upkeep" }))).toBe(true);
  });
  it("pump counts when it reaches other creatures, and never for an Aura or Equipment", () => {
    expect(pumpsOthers(t("Other Elves you control get +1/+1."))).toBe(true);
    expect(pumpsOthers(t("{R}: This creature gets +1/+0 until end of turn."))).toBe(false);
    expect(pumpsOthers(t("Equipped creature gets +2/+2.", { typeLine: "Artifact — Equipment" }))).toBe(false);
  });
  it("tokens count when the deck gets them, repeatably", () => {
    expect(makesOwnTokensRepeatably(t("At the beginning of your upkeep, create a 1/1 Goblin."))).toBe(true);
    expect(makesOwnTokensRepeatably(t("Destroy target creature. Its controller creates a 3/3 Beast."))).toBe(false);
    expect(makesOwnTokensRepeatably(t("When this creature enters, create a 2/2 Zombie."))).toBe(false);
    expect(makesOwnTokensRepeatably(t("Whenever this creature enters or attacks, create a 1/1 Soldier."))).toBe(true);
  });
  it("tribal names a creature type", () => {
    expect(namesACreatureType(job({ kind: "tribal", restrictedTo: "Shrine" }))).toBe(false);
    expect(namesACreatureType(job({ kind: "tribal", restrictedTo: "Elf" }))).toBe(true);
  });
});
