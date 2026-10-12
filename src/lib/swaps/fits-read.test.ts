import { describe, expect, it } from "vitest";

import {
  buildFitsReadPrompt, fitsReadCandidates, FITS_READ_SENTENCE_MAX_CHARS, FITS_READ_TOP, validFitsRead,
  type FitsDeckBlock, type FitsReadInputs, type FitsReadReply,
} from "./fits-read";
import { leadingThemes, planText } from "./fits-read-load";
import type { FitDeck, FitsRead } from "./fits";
import type { Job } from "../labels/types";

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const SUBJECT = id(1);
const KRENKO = id(10);
const KRATOS = id(20);

const card = (n: number, name: string, kinds: string[] = ["tokens"]) => ({ oracleId: id(n), name, typeLine: "Creature — Goblin", kinds });

function deck(deckId: string, commander: string, commanderId: string, list: ReturnType<typeof card>[], extra: Partial<FitsDeckBlock> = {}): FitsDeckBlock {
  return {
    deckId,
    commanders: [{ oracleId: commanderId, name: commander, typeLine: "Legendary Creature", oracleText: "Make goblins.", kinds: ["tokens"] }],
    plan: { source: "v2", text: "Go wide with goblins, then swing with haste." },
    themes: [],
    list,
    keyCardIds: [],
    lockedIds: [],
    ...extra,
  };
}

const goblins = deck("deck-goblins", "Krenko, Mob Boss", KRENKO, [
  card(11, "Goblin Instigator"), card(12, "Skirk Prospector", ["sacOutlet"]), card(13, "Beastmaster Ascension", ["pump"]), card(14, "Mountain", []),
], { keyCardIds: [id(13)], lockedIds: [id(14)] });
const kratos = deck("deck-kratos", "Kratos, God of War", KRATOS, [card(21, "Guttersnipe", ["spellslinger", "drain"]), card(22, "Lightning Greaves", ["protection"])]);
const omnath = deck("deck-omnath", "Omnath", id(30), [card(31, "Rampant Growth", ["ramp"])], { plan: null, themes: [{ kind: "landfall", n: 9 }] });

const subject = { oracleId: SUBJECT, name: "Ajani Unrelenting", typeLine: "Legendary Planeswalker — Ajani", oracleText: "+1: Create a token.", kinds: ["tokens", "draw"] };

function inputs(candidates = ["deck-goblins", "deck-kratos"]): FitsReadInputs {
  return {
    card: subject,
    decks: [goblins, kratos, omnath],
    candidates: candidates.map((deckId) => ({ deckId, need: { role: "draw", have: 2, target: 5 }, inclusion: null })),
  };
}

const pick = (over: Partial<FitsReadReply["picks"][number]> = {}): FitsReadReply["picks"][number] => ({
  deck: "D1", sentence: "Every loyalty turn adds a body for {C1} to double.", cut: "C3", cites: [{ key: "C1", job: "tokens" }], ...over,
});

function run(picks: FitsReadReply["picks"], layout: "per-press" | "cached-decks" = "per-press", inp = inputs()) {
  const prompt = buildFitsReadPrompt(inp, layout);
  return { prompt, ...validFitsRead({ reply: { picks }, prompt, inputs: inp }) };
}

describe("fitsReadCandidates", () => {
  const fit = (id: string): FitDeck => ({ id, name: id, commanders: [], need: null, reason: null });
  const read = (legal: boolean): Pick<FitsRead, "card" | "fits"> => ({
    card: { oracleId: SUBJECT, name: "x", colorIdentity: [], commanderLegal: legal, role: "other" },
    fits: [fit("a"), fit("b")],
  });
  it("is loadFits' open set, in its order", () => {
    expect(fitsReadCandidates(read(true)).map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("is empty when the card is not commander-legal", () => {
    expect(fitsReadCandidates(read(false))).toEqual([]);
  });
});

describe("buildFitsReadPrompt", () => {
  it("per-press: rules alone in the system prompt, candidates' blocks in the user message, no deck names", () => {
    const p = buildFitsReadPrompt(inputs(), "per-press");
    expect(p.cacheSystem).toBe(false);
    expect(p.system).not.toContain("Krenko");
    expect(p.user).toContain("D1\nCommander C1 Krenko, Mob Boss");
    expect(p.user).not.toContain("deck-goblins");
    expect(p.user).not.toContain("Omnath");
    expect([...p.deckOf]).toEqual([["D1", "deck-goblins"], ["D2", "deck-kratos"]]);
    expect(p.user).toContain("Key cards: C4.");
    expect(p.user).toContain("Never cut: C5.");
  });
  it("cached-decks: every deck in a byte-stable system prompt, the candidates by key in the user message", () => {
    const a = buildFitsReadPrompt(inputs(), "cached-decks");
    const b = buildFitsReadPrompt(inputs(["deck-kratos"]), "cached-decks");
    expect(a.cacheSystem).toBe(true);
    expect(a.system).toContain("Omnath");
    expect(a.system).toContain("Plan: none written. Leading themes among its cards: landfall (9).");
    expect(a.system).toBe(b.system);
    expect(a.user).toContain("Candidate decks: D1, D2.");
    expect(b.user).toContain("Candidate decks: D2.");
  });
});

describe("validFitsRead", () => {
  it("keeps a pick citing a deck card by key, with the cut and cites resolved", () => {
    const r = run([pick()]);
    expect(r.drops).toEqual({});
    expect(r.picks).toEqual([{
      deckId: "deck-goblins",
      parts: [{ text: "Every loyalty turn adds a body for " }, { card: KRENKO }, { text: " to double." }],
      cut: id(12),
      cites: [{ oracleId: KRENKO, job: "tokens" }],
    }]);
  });

  it("says picks, a no-fit when the model named no deck, and failed when every named deck failed (F5)", () => {
    expect(run([pick()]).outcome).toBe("picks");
    expect(run([]).outcome).toBe("noFit");
    expect(run([pick({ deck: "D9" })]).outcome).toBe("failed");
  });

  it("1: drops a deck key never shown, a shown non-candidate, and a repeat", () => {
    expect(run([pick({ deck: "D9" })]).drops).toEqual({ unknownDeck: 1 });
    // Cached layout shows Omnath (D3) but it is not a candidate.
    expect(run([pick({ deck: "D3", sentence: "Lands {C9} love it.", cut: null, cites: [] })], "cached-decks").drops).toEqual({ notCandidate: 1 });
    expect(run([pick(), pick()]).drops).toEqual({ duplicateDeck: 1 });
  });

  it("2: drops a card key from another deck, in the sentence, the cut or a cite, or by name", () => {
    // C6 is Kratos, D2's commander.
    expect(run([pick({ sentence: "Pairs with {C6}." })]).drops).toEqual({ cardOutsideDeck: 1 });
    expect(run([pick({ cut: "C7" })]).drops).toEqual({ cardOutsideDeck: 1 });
    expect(run([pick({ cites: [{ key: "C7", job: "spellslinger" }] })]).drops).toEqual({ cardOutsideDeck: 1 });
    expect(run([pick({ sentence: "With {C1} and Guttersnipe it drains." })]).drops).toEqual({ cardOutsideDeck: 1 });
    // The card itself may be named by key.
    expect(run([pick({ sentence: "{C9} makes a goblin for {C1}." })]).drops).toEqual({});
  });

  it("3: drops a cut that is the commander, the card, a Key card, a never-cut card", () => {
    expect(run([pick({ cut: "C1" })]).drops).toEqual({ cutCommander: 1 });
    expect(run([pick({ cut: "C9" })]).drops).toEqual({ cutSelf: 1 });
    expect(run([pick({ cut: "C4" })]).drops).toEqual({ cutKeyCard: 1 });
    expect(run([pick({ cut: "C5" })]).drops).toEqual({ cutLocked: 1 });
    expect(run([pick({ cut: null })]).drops).toEqual({});
  });

  it("3: drops a basic land as the cut, which changes the mana rather than the plan", () => {
    const base = inputs();
    const forest = { oracleId: id(15), name: "Forest", typeLine: "Basic Land — Forest", kinds: [] };
    const inp = { ...base, decks: [{ ...base.decks[0], list: [...base.decks[0].list, forest] }, ...base.decks.slice(1)] };
    // C-keys follow the blocks: find the Forest's key from the prompt itself.
    const prompt = buildFitsReadPrompt(inp, "per-press");
    const key = [...prompt.cardOf.entries()].find(([, v]) => v === id(15))![0];
    expect(validFitsRead({ reply: { picks: [pick({ cut: key })] }, prompt, inputs: inp }).drops).toEqual({ cutBasicLand: 1 });
  });

  it("4: drops a quote the deck's plan does not hold", () => {
    expect(run([pick({ sentence: "It helps the deck \"go wide with goblins\" through {C1}." })]).drops).toEqual({ falseQuote: 1 });
    expect(run([pick({ sentence: "It helps the deck \"Go wide with goblins\"." })]).drops).toEqual({});
    expect(run([pick({ sentence: "It helps the deck “swing with haste” turn after turn." })]).drops).toEqual({});
  });

  it("4: a deck with no plan has nothing to quote", () => {
    const inp = inputs(["deck-goblins"]);
    inp.decks = [{ ...goblins, plan: null }, kratos, omnath];
    expect(run([pick({ sentence: "It helps the deck \"Go wide with goblins\"." })], "per-press", inp).drops).toEqual({ falseQuote: 1 });
  });

  it("5: drops a sentence citing neither a deck card nor the plan", () => {
    expect(run([pick({ sentence: "It makes tokens every turn." })]).drops).toEqual({ noCitation: 1 });
    // The card itself alone is not a citation of the deck.
    expect(run([pick({ sentence: "{C9} makes tokens every turn." })]).drops).toEqual({ noCitation: 1 });
  });

  it("6: drops a digit, a percentage, a score word, a rank, a stray brace, or an over-long sentence", () => {
    expect(run([pick({ sentence: "Adds 2 bodies for {C1}." })]).drops).toEqual({ figureOrScore: 1 });
    expect(run([pick({ sentence: "A great partner for {C1}." })]).drops).toEqual({ figureOrScore: 1 });
    expect(run([pick({ sentence: "The top pick for {C1}." })]).drops).toEqual({ figureOrScore: 1 });
    expect(run([pick({ sentence: "Feeds {C1} and {D2}." })]).drops).toEqual({ malformed: 1 });
    const long = `Feeds {C1} ${"and keeps feeding ".repeat(20)}`.slice(0, FITS_READ_SENTENCE_MAX_CHARS + 10);
    expect(run([pick({ sentence: long })]).drops).toEqual({ tooLong: 1 });
  });

  it("7: drops a cite whose job the card's labels lack", () => {
    expect(run([pick({ cites: [{ key: "C1", job: "removal" }] })]).drops).toEqual({ jobMismatch: 1 });
    // The card itself is checked against its own labels.
    expect(run([pick({ cites: [{ key: "C9", job: "draw" }] })]).drops).toEqual({});
    expect(run([pick({ cites: [{ key: "C9", job: "ramp" }] })]).drops).toEqual({ jobMismatch: 1 });
  });

  it("keeps at most the top, the rest counted", () => {
    const decks = Array.from({ length: FITS_READ_TOP + 1 }, (_, i) => deck(`d${i}`, `Cmd ${i}`, id(100 + i), [card(200 + i, `Card ${i}`)]));
    const inp: FitsReadInputs = { card: subject, decks, candidates: decks.map((d) => ({ deckId: d.deckId, need: null, inclusion: null })) };
    const prompt = buildFitsReadPrompt(inp, "per-press");
    const picks = decks.map((_, i) => pick({ deck: `D${i + 1}`, sentence: `Feeds {C${2 * i + 1}}.`, cut: null, cites: [] }));
    const r = validFitsRead({ reply: { picks }, prompt, inputs: inp });
    expect(r.picks).toHaveLength(FITS_READ_TOP);
    expect(r.drops).toEqual({ tooMany: 1 });
  });
});

describe("planText and leadingThemes", () => {
  it("draws marks as names and appends the strategy", () => {
    expect(planText({ overview: "Go wide with [[Krenko, Mob Boss]].", primer: { strategy: ["Cast [[Sol Ring]]."], mulligan: { keep: [], sendBack: [] }, tips: [] } }))
      .toBe("Go wide with Krenko, Mob Boss. Strategy: Cast Sol Ring.");
    expect(planText({ overview: null, primer: null })).toBeNull();
  });
  it("counts theme labels over the deck, most first, roles ignored", () => {
    const job = (space: "role" | "theme", kind: string) => ({ space, kind }) as unknown as Job;
    const labels = new Map([
      ["a", [job("theme", "tokens"), job("role", "draw")]],
      ["b", [job("theme", "tokens"), job("theme", "haste")]],
    ]);
    expect(leadingThemes([{ oracleId: "a" }, { oracleId: "b" }], labels)).toEqual([{ kind: "tokens", n: 2 }, { kind: "haste", n: 1 }]);
  });
});
