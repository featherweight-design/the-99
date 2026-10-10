import { describe, expect, it } from "vitest";

import { edictEntry, isEdict, keywordClaims, nonWeakness, readEvidence, refIndex, refOf } from "./claims";
import type { FactCard } from "./facts";
import { normalizeName } from "./facts";

const card = (name: string, oracleText: string | null, extra: Partial<FactCard> = {}): FactCard => ({
  oracleId: `id-${name}`, name, typeLine: "Creature", quantity: 1, categories: [], oracleText, ...extra,
});

const GISHATH = card("Gishath, Sun's Avatar", "Vigilance, trample, haste\nWhenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put all Dinosaur creature cards revealed this way onto the battlefield and the rest into your graveyard.", { keywords: ["Vigilance", "Trample", "Haste"] });
const ZHULODOK = card("Zhulodok, Void Gorger", "Each colorless spell with mana value 7 or greater you cast from your hand has \"Cascade, cascade.\"", { keywords: [] });
const SHARD = card("Shard of the Void Dragon", "Flying\nSpear of the Void Dragon — Whenever this creature attacks, each opponent sacrifices a nonland permanent of their choice.\nMatter Absorption — Whenever an artifact is put into a graveyard from the battlefield or is put into exile from the battlefield, put two +1/+1 counters on this creature.");
const AYARA = card("Ayara, First of Locthwain", "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life.\n{T}, Sacrifice another black creature: Draw a card.");
const FORGE = card("Mystic Forge", "You may look at the top card of your library any time.");
const RAISE = card("Living Death", "Each player exiles all creature cards from their graveyard, then sacrifices all creatures they control, then puts all cards they exiled this way onto the battlefield.");
const TOKENS = card("Bitterblossom", "At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying.");
const FLYER = card("Brazen Borrower", "Flash\nFlying\nBrazen Borrower can block only creatures with flying.", { keywords: ["Flash", "Flying"] });
const BARE = card("Grizzly Bears", "");

const CARDS = [GISHATH, ZHULODOK, SHARD, AYARA, FORGE, RAISE, TOKENS, FLYER, BARE];
const deck = new Map(CARDS.map((c) => [normalizeName(c.name), c]));

describe("evidence refs", () => {
  const index = refIndex(CARDS);

  it("numbers cards from c1 in list order", () => {
    expect(refOf(0)).toBe("c1");
    expect(index.get("c1")).toBe(GISHATH);
  });

  it("resolves refs to distinct oracle ids and tolerates case and padding", () => {
    expect(readEvidence([" C1 ", "c3", "c1"], index, true)).toMatchObject({ ids: [GISHATH.oracleId, SHARD.oracleId], reason: null });
  });

  it("refuses a ref naming nothing, more than the cap, and no ref where one is required", () => {
    expect(readEvidence(["c99"], index, false).reason).toBe("evidence_not_in_deck");
    expect(readEvidence(["c1", "c2", "c3", "c4", "c5"], index, false).reason).toBe("evidence_not_in_deck");
    expect(readEvidence([], index, true).reason).toBe("evidence_not_in_deck");
    expect(readEvidence([], index, false).reason).toBeNull();
  });
});

describe("keywordClaims", () => {
  it("catches the Gishath cascade from the corpus", () => {
    const hits = keywordClaims("Attack with [[Gishath, Sun's Avatar]] to cascade more Dinosaurs directly onto the battlefield.", deck);
    expect(hits).toEqual([{ card: GISHATH.name, keyword: "cascade" }]);
  });

  it("passes a card whose text grants the keyword, and one that has it", () => {
    expect(keywordClaims("[[Zhulodok, Void Gorger]] grants cascade twice to big spells.", deck)).toEqual([]);
    expect(keywordClaims("[[Gishath, Sun's Avatar]] has haste and tramples over blockers.", deck)).toEqual([]);
  });

  it("needs a possession cue for an everyday word", () => {
    expect(keywordClaims("[[Grizzly Bears]] has flying and attacks over walls.", deck)).toEqual([{ card: "Grizzly Bears", keyword: "flying" }]);
    // "flying" with no cue is prose about the board, not a claim about the card.
    expect(keywordClaims("[[Grizzly Bears]] is walled by flying blockers.", deck)).toEqual([]);
  });

  it("reads the nearest preceding mark, stops at a sentence end, and skips a denial", () => {
    expect(keywordClaims("[[Grizzly Bears]] ramps. It has flying later.", deck)).toEqual([]);
    expect(keywordClaims("[[Grizzly Bears]] and [[Brazen Borrower]] have flash.", deck)).toEqual([]);
    expect(keywordClaims("[[Grizzly Bears]] has no flying.", deck)).toEqual([]);
  });

  it("stays silent when something else stands between the mark and the keyword (false hits read off stored answers)", () => {
    expect(keywordClaims("Casting [[Bitterblossom]] off cascade from [[Zhulodok, Void Gorger]] can reanimate a creature.", deck)).toEqual([]);
    expect(keywordClaims("Play unblockable creatures like [[Grizzly Bears]] early to enable ninjutsu.", deck)).toEqual([]);
    expect(keywordClaims("Deploy colossal threats such as [[Grizzly Bears]] off cascades.", deck)).toEqual([]);
  });

  it("decides nothing for a card with neither text nor keywords", () => {
    const unknown = card("Mystery", null);
    expect(keywordClaims("[[Mystery]] has haste.", new Map([["mystery", unknown]]))).toEqual([]);
  });

  it("uses the keywords array when the text lacks the word", () => {
    const c = card("Kicker Card", "Does a thing.", { keywords: ["Flying"] });
    expect(keywordClaims("[[Kicker Card]] has flying.", new Map([["kicker card", c]]))).toEqual([]);
  });
});

describe("edictEntry", () => {
  const tip = "Black creatures entering from [[Shard of the Void Dragon]]'s forced sacrifices still trigger [[Ayara, First of Locthwain]]'s drain.";

  it("detects an edict from its text", () => {
    expect(isEdict(SHARD)).toBe(true);
    expect(isEdict(AYARA)).toBe(false);
  });

  it("catches the Shard and Ayara tip from the corpus", () => {
    expect(edictEntry(tip, [SHARD, AYARA], deck)).toBe(true);
  });

  it("passes when another cited card puts creatures onto the battlefield", () => {
    expect(edictEntry(tip, [SHARD, AYARA, RAISE], deck)).toBe(false);
    expect(edictEntry(tip, [SHARD, AYARA, TOKENS], deck)).toBe(false);
  });

  it("passes a sentence that does not say anything enters, and an edict that is also a source", () => {
    expect(edictEntry("[[Shard of the Void Dragon]] strips blockers while [[Ayara, First of Locthwain]] drains.", [SHARD, AYARA], deck)).toBe(false);
    expect(edictEntry("Creatures entering off [[Living Death]] trigger [[Ayara, First of Locthwain]].", [RAISE, AYARA], deck)).toBe(false);
  });
});

describe("nonWeakness", () => {
  const imotekh = "Mana base is entirely Swamps and black-only rocks, limiting color flexibility.";

  it("drops the mono-black color-flexibility line from the corpus", () => {
    expect(nonWeakness(imotekh, ["B"])).toBe(true);
    expect(nonWeakness(imotekh, [])).toBe(true);
  });

  it("is a real worry for two or more colors", () => {
    expect(nonWeakness(imotekh, ["B", "G"])).toBe(false);
  });

  it("leaves other mono-color weaknesses alone", () => {
    expect(nonWeakness("No answer to [[Rest in Peace]] shutting off the graveyard plan.", ["B"])).toBe(false);
    expect(nonWeakness("Splashing is hard.", ["R"])).toBe(true);
  });
});
