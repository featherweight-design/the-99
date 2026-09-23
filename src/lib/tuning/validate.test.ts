import { describe, expect, it } from "vitest";

import type { DeckGame } from "../decks/games";
import { buildPlayGroup } from "../profile/play";
import type { EvidencePack } from "./evidence";
import type { TuningResponse, TuningSuggestion } from "./response-schema";
import { validateSuggestions, type ResolvedCard } from "./validate";

const game = (id: string, over: Partial<DeckGame> = {}): DeckGame => ({
  id, result: "loss", podSize: 4, playedAt: new Date("2026-09-01T20:00:00Z"),
  versionNumber: null, note: null, worked: [], hurt: [], ...over,
});

const pack: EvidencePack = {
  commanders: [{ oracleId: "cmd", name: "Commander" }],
  colorIdentity: ["G"],
  cards: [
    { oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true },
    { oracleId: "bear", name: "Grizzly Bears", typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false },
    { oracleId: "ox", name: "Oxen", typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false },
  ],
  targets: { roles: [], thin: false },
  staples: [],
  play: buildPlayGroup([
    game("g1", { hurt: ["mana"], note: "flooded out on turn six" }),
    game("g2", { hurt: ["mana"] }),
    game("g3", { hurt: ["mana"] }),
    game("g4"), game("g5"),
  ]),
  intent: null,
};

const CATALOG: Record<string, ResolvedCard> = {
  "Cultivate": { oracleId: "cult", colorIdentity: ["G"], commanderLegal: true },
  "Rampant Growth": { oracleId: "rg", colorIdentity: ["G"], commanderLegal: true },
  "Lightning Bolt": { oracleId: "bolt", colorIdentity: ["R"], commanderLegal: true },
  "Banned Thing": { oracleId: "ban", colorIdentity: ["G"], commanderLegal: false },
  "Grizzly Bears": { oracleId: "bear", colorIdentity: ["G"], commanderLegal: true },
  "Oxen": { oracleId: "ox", colorIdentity: ["G"], commanderLegal: true },
  "Commander": { oracleId: "cmd", colorIdentity: ["G"], commanderLegal: true },
  "Not In Deck": { oracleId: "nid", colorIdentity: ["G"], commanderLegal: true },
};
const resolveName = (name: string) => CATALOG[name] ?? null;

const good: TuningSuggestion = {
  add: "Cultivate", cut: "Grizzly Bears",
  rationale: "Mana was marked as hurting in 3 of 5 games.",
  rationaleShort: "Mana hurt in 3 of 5",
  evidence: [{ kind: "games", value: "Mana: 3 of 5 games" }],
};
const run = (...suggestions: TuningSuggestion[]) =>
  validateSuggestions({ response: { suggestions } as TuningResponse, pack, resolveName });

describe("validateSuggestions", () => {
  it("keeps a grounded suggestion", () => {
    const out = run(good);
    expect(out.droppedCount).toBe(0);
    expect(out.kept[0]).toMatchObject({ addOracleId: "cult", cutOracleId: "bear", position: 0, bracketAfter: null });
  });

  it("drops a card that is not in the catalog, and counts the drop", () => {
    expect(run({ ...good, add: "Nonesuch" })).toMatchObject({ kept: [], droppedCount: 1, drops: [{ rule: "cardExists" }] });
  });

  it("drops a cut that is not in the deck", () => {
    expect(run({ ...good, cut: "Not In Deck" }).drops).toEqual([{ position: 0, rule: "cutInDeck" }]);
  });

  it("drops a cut that names a commander", () => {
    expect(run({ ...good, cut: "Commander" }).drops).toEqual([{ position: 0, rule: "cutInDeck" }]);
  });

  it("drops an add outside the colour identity", () => {
    expect(run({ ...good, add: "Lightning Bolt" }).drops).toEqual([{ position: 0, rule: "colourIdentity" }]);
  });

  it("drops an add that is not commander-legal, or is already in the deck", () => {
    expect(run({ ...good, add: "Banned Thing" }).drops).toEqual([{ position: 0, rule: "addNotLegal" }]);
    expect(run({ ...good, add: "Oxen" }).drops).toEqual([{ position: 0, rule: "addNotLegal" }]);
  });

  it("drops a games citation whose denominator is not the games read", () => {
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana: 9 of 12 games" }] }).drops).toEqual([{ position: 0, rule: "citation" }]);
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana: 6 of 5 games" }] }).drops).toEqual([{ position: 0, rule: "citation" }]);
  });

  it("drops a games citation when no games were read", () => {
    const out = validateSuggestions({
      response: { suggestions: [good] }, pack: { ...pack, play: buildPlayGroup([]) }, resolveName,
    });
    expect(out.drops).toEqual([{ position: 0, rule: "citation" }]);
  });

  it("drops a note citation that quotes nothing the player wrote, and an intent that was never stated", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: '"flooded on turn six"' }] }).drops[0].rule).toBe("citation");
    expect(run({ ...good, evidence: [{ kind: "intent", value: "go wide" }] }).drops[0].rule).toBe("citation");
  });

  it("keeps an intent citation only when it cites the intent's own words", () => {
    const withIntent = { ...pack, intent: "grind it out" };
    const cite = (value: string) => validateSuggestions({
      response: { suggestions: [{ ...good, evidence: [{ kind: "intent", value }] }] }, pack: withIntent, resolveName,
    });
    expect(cite('"grind it out"').droppedCount).toBe(0);
    expect(cite("go wide").drops[0].rule).toBe("citation");
  });

  it("keeps a note cited verbatim, in quotation marks, with its date", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: '2026-09-01: "flooded out on turn six"' }] }).droppedCount).toBe(0);
  });

  it("drops a note citation without its quotation marks or without its date", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: "2026-09-01: flooded out on turn six" }] }).drops[0].rule).toBe("citation");
    expect(run({ ...good, evidence: [{ kind: "note", value: '"flooded out on turn six"' }] }).drops[0].rule).toBe("citation");
  });

  it("drops a suggestion that breaks a presentation rule, naming the rule", () => {
    expect(run({ ...good, rationale: "Mana hurt in 60% of games." }).drops).toEqual([{ position: 0, rule: "noPercentage" }]);
    expect(run({ ...good, rationaleShort: "Mana hurt 3 games" }).drops).toEqual([{ position: 0, rule: "denominator" }]);
  });

  it("drops a second suggestion adding the same card", () => {
    expect(run(good, { ...good, cut: "Oxen" }).drops).toEqual([{ position: 1, rule: "duplicate" }]);
  });

  it("drops a second suggestion cutting the same card", () => {
    expect(run(good, { ...good, add: "Rampant Growth" }).drops).toEqual([{ position: 1, rule: "duplicate" }]);
  });

  it("renumbers position over the survivors so the card list has no holes", () => {
    const out = run(good, { ...good, add: "Nonesuch" }, { ...good, add: "Rampant Growth", cut: "Oxen" });
    expect(out.kept.map((s) => [s.addOracleId, s.position])).toEqual([["cult", 0], ["rg", 1]]);
    expect(out.droppedCount).toBe(1);
  });
});
