import { describe, expect, it } from "vitest";
import { canPair, isCommanderEligible, secondLineRole, type CommanderFacts } from "./pairing";

const card = (name: string, typeLine: string, oracleText = ""): CommanderFacts => ({ name, typeLine, oracleText });
const legend = (name: string, oracleText = "") => card(name, "Legendary Creature — Human", oracleText);

const picard = legend("Jean-Luc Picard, Luminary", "Whenever you attack, put a +1/+1 counter on target creature.");
const janeway = legend("Captain Janeway, Endgame", "Vigilance");
const alwaysWatching = card("Always Watching", "Enchantment", "Nontoken creatures you control get +1/+1 and have vigilance.");

describe("canPair", () => {
  it.each<[string, CommanderFacts, CommanderFacts, boolean]>([
    ["Partner, both", legend("Thrasios", "Partner (You can have two commanders if both have partner.)"), legend("Tymna", "Partner (You can have two commanders if both have partner.)"), true],
    ["Partner, one side only", legend("Thrasios", "Partner (You can have two…)"), janeway, false],
    ["Partner—same group", legend("A", "Partner—Survivors (You can have…)"), legend("B", "Partner—Survivors"), true],
    ["Partner—different groups", legend("A", "Partner—Survivors"), legend("B", "Partner—Father & son"), false],
    ["Partner—group with plain Partner", legend("A", "Partner—Survivors"), legend("B", "Partner"), false],
    ["Partner with, named", legend("Pir, Imaginative Rascal", "Partner with Toothy, Imaginary Friend (When this…)"), legend("Toothy, Imaginary Friend", "Partner with Pir, Imaginative Rascal"), true],
    ["Partner with, someone else", legend("Pir, Imaginative Rascal", "Partner with Toothy, Imaginary Friend"), janeway, false],
    ["Friends forever, both", legend("A", "Flying\nFriends forever (You can have…)"), legend("B", "Friends forever"), true],
    ["Choose a Background + Background", legend("Wilson", "Choose a Background (You can have…)"), card("Raised by Giants", "Legendary Enchantment — Background"), true],
    ["Background either way round", card("Raised by Giants", "Legendary Enchantment — Background"), legend("Wilson", "Choose a Background"), true],
    ["Choose a Background + a non-Background", legend("Wilson", "Choose a Background"), janeway, false],
    ["Doctor's companion + Doctor", legend("Sarah Jane Smith", "Doctor's companion (You can have…)"), card("The Fourth Doctor", "Legendary Creature — Time Lord Doctor"), true],
    ["Doctor's companion + non-Doctor", legend("Sarah Jane Smith", "Doctor's companion"), janeway, false],
    ["two ordinary legends", picard, janeway, false],
  ])("%s", (_n, a, b, v) => {
    expect(canPair(a, b)).toBe(v);
  });
});

describe("secondLineRole", () => {
  it("Star Trek: an unpaired legend is the alternate commander", () => {
    expect(secondLineRole(picard, janeway)).toBe("alternate");
  });
  it("a legal pair is co-commander", () => {
    expect(secondLineRole(legend("Sarah Jane Smith", "Doctor's companion"), card("The Fourth Doctor", "Legendary Creature — Time Lord Doctor"))).toBe("co-commander");
  });
  it("Foundations: a non-commander second line is nothing", () => {
    expect(secondLineRole(picard, alwaysWatching)).toBeNull();
  });
  it("an unmatched card on either line is nothing", () => {
    expect(secondLineRole(null, janeway)).toBeNull();
    expect(secondLineRole(picard, null)).toBeNull();
  });
});

describe("isCommanderEligible", () => {
  it.each<[CommanderFacts, boolean]>([
    [janeway, true],
    [card("Inspirit, Flagship Vessel", "Legendary Artifact — Spacecraft", "Inspirit can be your commander."), true],
    // A legendary Vehicle or Spacecraft leads with no "can be your commander" text (rule 903.3a as amended).
    [card("Hearthhull, the Worldseed", "Legendary Artifact — Spacecraft"), true],
    [card("Weatherlight", "Legendary Artifact — Vehicle"), true],
    [card("Smuggler's Copter", "Artifact — Vehicle"), false],
    [card("Grist, the Hunger Tide", "Legendary Planeswalker — Grist", "Grist, the Hunger Tide can be your commander."), true],
    [card("Llanowar Elves", "Creature — Elf Druid"), false],
    [card("Raised by Giants", "Legendary Enchantment — Background"), false],
    // the front face decides: a melded back is not a commander from the front
    [card("Brisela", "Legendary Artifact // Legendary Creature — Eldrazi"), false],
    [alwaysWatching, false],
  ])("%s → %s", (c, v) => expect(isCommanderEligible(c)).toBe(v));
});
