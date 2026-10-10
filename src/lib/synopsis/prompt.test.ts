import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import { CHAR_BUDGETS, EVIDENCE_MAX, SECTION_COUNTS } from "./limits";
import { ASSESSMENT_TOPICS } from "./types";
import { buildSynopsisPrompt, overLengthLines } from "./prompt";
import { figuresIn } from "./validate";
import type { CheckedSynopsis } from "./types";

const FACTS: SynopsisFacts = {
  commanders: ["Kratos", "Atreus"],
  identity: ["R", "G"],
  unproducible: [],
  lands: 36,
  ramp: 10,
  keep: { low: 2, high: 4 },
  sendBack: { none: 0, under: 1, over: 5 },
  commanderManaValues: [],
  figures: [2, 4, 7, 10, 36],
  cards: [
    { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", quantity: 1, categories: ["ramp"], oracleText: "{T}: Add {C}{C}." },
    { oracleId: "b", name: "Forest", typeLine: "Basic Land", quantity: 12, categories: ["land"], oracleText: null },
  ],
};

describe("buildSynopsisPrompt", () => {
  it("states the contract's own figures, so the prompt and the validator read one set", () => {
    const { system } = buildSynopsisPrompt(FACTS);
    expect(system).toContain(`at most ${CHAR_BUDGETS.overview} characters`);
    expect(system).toContain(`${SECTION_COUNTS.keyCards.min} to ${SECTION_COUNTS.keyCards.max} different cards`);
    expect(system).toContain("[[Sol Ring]]");
  });

  it("hands over the computed mulligan figures and every card with its categories", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).toContain("Commander: Kratos and Atreus");
    expect(user).toContain("holds 2 to 4 lands");
    expect(user).toContain("- Sol Ring (Artifact) [ramp]: {T}: Add {C}{C}.");
    expect(user).toContain("- 12x Forest (Basic Land) [land]");
    expect(user).toContain("Decklist (13 cards)");
  });

  // The figures the validator accepts must reach the model, or it states numbers it was never
  // given and is refused for them (the harness's 56 lines).
  it("states the send-back bounds and each commander's mana value", () => {
    const { user } = buildSynopsisPrompt({ ...FACTS, sendBack: { none: 0, under: 1, over: 5 }, commanderManaValues: [4, 3] });
    expect(user).toContain("send back 0 to 1 lands, or 5 or more.");
    expect(user).toContain("Shown by the app, not to be restated");
    expect(user).toContain("Commander mana value (a turn to cast it on is this number): 4 and 3");
  });

  // Hugh's rating, 2026-09-24: the identity by name, and no universal staple as a Key card.
  it("names the identity and marks a universal staple", () => {
    const { system, user } = buildSynopsisPrompt({
      ...FACTS,
      cards: FACTS.cards.map((c) => (c.name === "Sol Ring" ? { ...c, universalStaple: true } : c)),
    });
    expect(user).toContain("Color identity: Gruul");
    expect(user).not.toContain("Color identity: RG");
    expect(user).toContain("- Sol Ring (Artifact) [ramp] (universal staple): {T}: Add {C}{C}.");
    expect(user).not.toContain("Forest (Basic Land) [land] (universal staple)");
    expect(system).toContain('never one marked "universal staple"');
    expect(system).toContain("never by mana letters");
  });

  it("names the colors no land produces rather than spelling their letters", () => {
    expect(buildSynopsisPrompt({ ...FACTS, unproducible: ["R", "G"] }).user).toContain("Colors the spells need that no land produces: red and green");
  });

  it("names facts stored before the identity name existed the same way", () => {
    expect(buildSynopsisPrompt({ ...FACTS, identityName: undefined }).user).toContain("Color identity: Gruul");
    expect(buildSynopsisPrompt({ ...FACTS, identityName: "Temur" }).user).toContain("Color identity: Temur");
  });

  it("states no mana value line when no commander carries one", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).not.toContain("Commander mana value");
  });

  it("shows no bracket and no strength figure", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).not.toMatch(/bracket|power|score/i);
  });

  it("sends a retry the passing sections and names the refused ones", () => {
    const keep = {
      verdicts: [
        { section: "overview", status: "ok", failed: 0, total: 0 },
        { section: "primer", status: "refused", reason: "over_budget", failed: 0, total: 3 },
        { section: "keyCards", status: "refused", reason: "unknown_card", failed: 2, total: 6 },
        { section: "weaknesses", status: "ok", failed: 0, total: 0 },
      ],
      overview: "Kept.", primer: null, keyCards: null, weaknesses: ["Kept too."], cards: {},
    } as CheckedSynopsis;
    const { user } = buildSynopsisPrompt(FACTS, { keep, refused: ["primer", "keyCards"] });
    expect(user).toContain("did not pass checking last time: primer, keyCards.");
    expect(user).toContain('"overview":"Kept."');
    // The repair names each refused section's reason, as the harness measured it (contract B).
    expect(user).toContain(
      "Those sections failed checking for these reasons; fix exactly these: primer: over_budget; keyCards: unknown_card (2 of 6 cards failed checking).",
    );
  });

  // budgets-plus (sub-project 10), shipped as measured: read off the limits and this deck's figures.
  it("carries the length and plus rules, with this deck's own figures", () => {
    const { system } = buildSynopsisPrompt({ ...FACTS, figures: [2, 3, 5] });
    expect(system).toContain(`- a Key card's job: at most ${CHAR_BUDGETS.job} characters`);
    expect(system).toContain("A Key card's job is 4 to 8 words.");
    expect(system).toContain("must be one of: 2, 3, 5.");
    expect(system).toContain("Mark EVERY mention of a card in the decklist");
  });

  it("restates the Mulligan's budget, on a first write and on a repair alike", () => {
    const first = buildSynopsisPrompt(FACTS).system;
    const keep = {
      verdicts: [{ section: "primer", status: "refused", reason: "over_budget", failed: 0, total: 3 }],
      overview: null, primer: null, keyCards: null, weaknesses: null, cards: {},
    } as unknown as CheckedSynopsis;
    const repair = buildSynopsisPrompt(FACTS, { keep, refused: ["primer"] }).system;
    for (const system of [first, repair]) {
      expect(system).toContain(`Mulligan lines are the tightest budget in the answer: at most ${CHAR_BUDGETS.mulligan} characters`);
      expect(system).toContain(`aim for about ${CHAR_BUDGETS.mulligan - 25}. Write 8 to 12 words.`);
      expect(system).toContain("a point on the curve, or a line of play, never a list of cards");
      // Last, after the plus rules, as measured: the harness verified the prompt byte for byte.
      expect(system.endsWith("draw more cards.\" (46).")).toBe(true);
    }
  });

  it("gives worked lines that state no figure, so a model copying them is never refused for one", () => {
    // The first version's examples said "two-drop" and "three-drop": `figuresIn` reads both as
    // figures, and a line copying them on a deck without a 2 or a 3 was dropped silently.
    const system = buildSynopsisPrompt(FACTS).system;
    const worked = [...system.split("\n").at(-1)!.matchAll(/"([^"]+)" \(\d+\)/g)].map((m) => m[1]);
    expect(worked).toHaveLength(2);
    for (const line of worked) {
      expect(figuresIn(line), line).toEqual([]);
      expect(line.replace(/\[\[|\]\]/g, "").length, line).toBeLessThanOrEqual(CHAR_BUDGETS.mulligan);
    }
  });
});

describe("buildSynopsisPrompt under the v2 method", () => {
  const V2: SynopsisFacts = {
    ...FACTS,
    combos: [{ pieces: ["Ghostly Flicker", "Naru Meha, Master Wizard"], produces: ["Infinite mana", "Infinite ETB"], usesCommander: false, manaNeeded: 0 }],
    nearCombos: [{ have: "Basalt Monolith", missing: "Rings of Brighthearth", produces: ["Infinite colorless mana"] }],
    stats: { ramp: 10, commanderCastTurn: 4, interaction: { total: 7, instantSpeed: 4, cheap: 3, cheapInstant: 2, wipes: 1 } },
  };

  it("is byte for byte the old prompt with the switch off, whatever the facts carry", () => {
    expect(buildSynopsisPrompt(V2)).toEqual(buildSynopsisPrompt(FACTS));
    expect(buildSynopsisPrompt(V2, undefined, { v2: false })).toEqual(buildSynopsisPrompt(FACTS));
  });

  it("states the assembled combo by name and by what it produces, free of cost", () => {
    const { user, system } = buildSynopsisPrompt(V2, undefined, { v2: true });
    expect(user).toContain("- Ghostly Flicker + Naru Meha, Master Wizard: Infinite mana, Infinite ETB (costs no mana to run)");
    expect(system).toContain("name the primary win condition");
  });

  it("marks a near combo as not in the deck and gives the app's own turn and counts", () => {
    const { user } = buildSynopsisPrompt(V2, undefined, { v2: true });
    expect(user).toContain("Combos one card short (the missing card is NOT in the deck):");
    expect(user).toContain("- has Basalt Monolith, lacks Rings of Brighthearth: Infinite colorless mana");
    expect(user).toContain("Expected commander cast turn: around turn 4");
    expect(user).toContain("7 cards, 4 at instant speed, 3 costing two or less, 2 both; of these, mass removal: 1");
  });

  it("leaves a section out when it has nothing, rather than stating none", () => {
    const { user } = buildSynopsisPrompt({ ...V2, combos: [], nearCombos: [] }, undefined, { v2: true });
    expect(user).not.toContain("Combos this deck assembles");
    expect(user).not.toContain("one card short");
    expect(user).toContain("Deck figures");
  });

  it("carries the same rules in a repair, so the second call is not looser than the first", () => {
    const keep = { overview: "x", primer: {}, keyCards: [], weaknesses: [], verdicts: [] } as unknown as CheckedSynopsis;
    expect(buildSynopsisPrompt(V2, { keep, refused: ["tips"] as never }, { v2: true }).system).toContain("name the primary win condition");
  });
});

describe("producesShown", () => {
  it("keeps the counted feature when it sits past the fourth entry", async () => {
    const { producesShown } = await import("./prompt");
    const out = producesShown(["A", "B", "C", "D", "Infinite mana"]);
    expect(out).toHaveLength(4);
    expect(out[0]).toBe("Infinite mana");
  });
});

describe("buildSynopsisPrompt under contract 8", () => {
  const C8 = { v2: true, contract8: true };

  // The shipped prompt, hashed from the implementation before contract 8 existed (cf76c798e), so
  // the assertion fails when any word of it moves, not only when the two branches disagree.
  it("is untouched without the contract: sha256 of the shipped system and user messages", () => {
    const sha = (t: string) => createHash("sha256").update(t).digest("hex");
    for (const opts of [undefined, { v2: false, contract8: false }]) {
      const p = buildSynopsisPrompt(FACTS, undefined, opts);
      expect(sha(p.system)).toBe("bd9e3326c5c4bc40d2ba6d79fd2678c719302b245469a970803c26426706ab80");
      expect(sha(p.user)).toBe("dd4e031f66832cedf387850624ae912db2deb4a7be7534083746b8e012939aa9");
    }
  });

  it("lists the engine candidates in the user message and asks for a weakness when none stands out", () => {
    const facts = { ...FACTS, commanders: ["Kratos"], cards: [
      { oracleId: "k", name: "Kratos", typeLine: "Legendary Creature - God", quantity: 1, categories: [], oracleText: "Whenever a god attacks, create a spirit." },
      { oracleId: "g1", name: "Iroas", typeLine: "Legendary Creature - God", quantity: 1, categories: [], oracleText: "A god." },
      { oracleId: "g2", name: "Purphoros", typeLine: "Legendary Creature - God", quantity: 1, categories: [], oracleText: "A god." },
      ...Array.from({ length: 6 }, (_, i) => ({ oracleId: `f${i}`, name: `Filler ${i}`, typeLine: "Sorcery", quantity: 1, categories: [], oracleText: `Filler ${i}.` })),
    ] };
    const { user, system } = buildSynopsisPrompt(facts, undefined, C8);
    expect(user).toContain("Engine candidates");
    expect(user).toContain("- Iroas: creature, god, legendary");
    expect(user).not.toContain("- Filler");
    expect(system).toContain('give the single least bad applicable one as "minor"');
    expect(buildSynopsisPrompt(FACTS, undefined, C8).user).not.toContain("Engine candidates");
  });

  it("gives every decklist line its ref, in order, as readEvidence resolves them", () => {
    const { user } = buildSynopsisPrompt(FACTS, undefined, C8);
    expect(user).toContain("- c1: Sol Ring (Artifact)");
    expect(user).toContain("- c2: 12x Forest (Basic Land)");
  });

  it("names every checklist topic once and the hate cards the corpus missed", () => {
    const { system } = buildSynopsisPrompt(FACTS, undefined, C8);
    for (const t of ASSESSMENT_TOPICS) expect(system.split(`- ${t}:`).length - 1, t).toBe(1);
    for (const hate of ["Rest in Peace", "Bojuka Bog", "Dauthi Voidwalker", "Null Rod", "Collector Ouphe", "Cursed Totem", "Farewell", "Propaganda"]) {
      expect(system).toContain(`[[${hate}]]`);
    }
    expect(system).toContain(`at most ${EVIDENCE_MAX}`);
  });

  it("keeps the measured Mulligan budget rules, which contract 8 once dropped (85 to 105 characters against 80)", () => {
    expect(buildSynopsisPrompt(FACTS, undefined, C8).system).toContain("Write 8 to 12 words.");
  });

  it("drops the untiered weaknesses list, ties the mulligan to the engine and asks the facts' figures be used", () => {
    const { system } = buildSynopsisPrompt(FACTS, undefined, C8);
    expect(system).not.toContain("untiered and unranked");
    expect(system).toContain("names an engine piece");
    expect(system).toContain("use the interaction figures in the facts exactly as given");
    expect(system).toContain("name the primary win condition");
  });

  it("tells a repair to give kept sections empty evidence", () => {
    const keep = { overview: "x", primer: {}, keyCards: [], weaknesses: [], verdicts: [] } as unknown as CheckedSynopsis;
    const { user } = buildSynopsisPrompt(FACTS, { keep, refused: ["tips"] as never }, C8);
    expect(user).toContain('an empty "evidence" list');
  });

  it("gives contract 8 a strategy length rule and a sized engine example, and leaves contract 7's prompt alone", () => {
    const c8 = buildSynopsisPrompt(FACTS, undefined, C8).system;
    expect(c8).toContain("a strategy step: at most 144");
    expect(c8).toContain("Having");
    expect(c8).toContain("ends with a period");
    expect(buildSynopsisPrompt(FACTS).system).not.toContain("a strategy step: at most");
  });

  const c8Aim = () => buildSynopsisPrompt(FACTS, undefined, C8).system;
  it("states the worked engine example at the length it claims", () => {
    const m = buildSynopsisPrompt(FACTS, undefined, C8).system.match(/"\[\[([^"]+)\]\]([^"]*)" \((\d+)\)/g)!.find((x) => x.includes("engine piece"))!;
    const [, name, rest, n] = m.match(/"\[\[([^\]]+)\]\]([^"]*)" \((\d+)\)/)!;
    expect((name + rest).length).toBe(Number(n));
    expect(c8Aim()).toContain("aim for about 115");
  });

  const longKeep = "An early unblockable creature with [[Yuriko, the Tiger's Shadow]] still in the command zone is strong.";
  const reply = {
    overview: "ok.",
    primer: {
      strategy: [{ text: "x".repeat(148), evidence: [] }, { text: "short.", evidence: [] }],
      mulligan: { keep: [{ text: longKeep, evidence: [] }, { text: "[[Sol Ring]] opens.", evidence: [] }], sendBack: [{ text: "fine.", evidence: [] }] },
      tips: [],
    },
    keyCards: [{ card: "Sol Ring", claims: [], job: "x".repeat(61), evidence: [] }],
  } as never;

  it("names the lines of a refused section that ran over, by rendered length", () => {
    const lines = overLengthLines(reply, ["primer"]);
    expect(lines).toEqual([
      `strategy step 1 is 148 characters, limit 144, write it at about 115: "${"x".repeat(148)}"`,
      `keep line 1 is 98 characters, limit 80, write it at about 64: "${longKeep}"`,
    ]);
  });

  it("reads only the sections being rewritten, and the contract 7 string shape too", () => {
    expect(overLengthLines(reply, ["keyCards"])).toHaveLength(1);
    expect(overLengthLines(reply, ["weaknesses"])).toEqual([]);
    const long = "w".repeat(180);
    expect(overLengthLines({ ...(reply as object), weaknesses: [long] } as never, ["weaknesses"])).toHaveLength(1);
    const v8 = { ...(reply as object), assessment: [{ topic: "mana_and_colors", verdict: "weakness", tier: "critical", line: long }] } as never;
    expect(overLengthLines(v8, ["weaknesses"])[0]).toContain("weakness is 190 characters, limit 176");
    const v7 = { overview: "o".repeat(577), primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] }, keyCards: [] } as never;
    expect(overLengthLines(v7, ["overview"])).toEqual([`the overview is 577 characters, limit 576, write it at about 460: "${"o".repeat(577)}"`]);
  });

  it("puts the over-length lines in the repair message, and nothing when the first answer is not given", () => {
    const keep = { overview: "x", primer: {}, keyCards: [], weaknesses: [], verdicts: [] } as unknown as CheckedSynopsis;
    const withFirst = buildSynopsisPrompt(FACTS, { keep, refused: ["primer"], first: reply }, C8).user;
    expect(withFirst).toContain("Shorten these, which ran over their limit");
    expect(withFirst).toContain("keep line 1 is 98 characters, limit 80, write it at about 64");
    expect(buildSynopsisPrompt(FACTS, { keep, refused: ["primer"] }, C8).user).not.toContain("Shorten these");
  });
});
