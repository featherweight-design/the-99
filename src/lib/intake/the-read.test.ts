import { describe, expect, it } from "vitest";

import { PLAYER_TEXT_OPEN } from "../model/player-text";
import { READ_REASON_MAX_CHARS, READ_SHORTLIST_SIZE, READ_TOP } from "./limits";
import {
  describeFilters, JUDGE_SYSTEM, judgeRequest, judgeSchema, parseReason, shortlistSchema, readFingerprint, reorder, shortlistRequest, shortlistSystem,
  validJudgement, validShortlist, type ReadDeck, type ReadFilters,
} from "./the-read";

const none: ReadFilters = { colors: [], match: "contains", themes: [], budgetDollars: null, bracket: null };
const omnath: ReadDeck = { commanderOracleId: "om", commander: "Omnath, Locus of Creation", partner: null, themes: ["Landfall"] };
const teval: ReadDeck = { commanderOracleId: "tv", commander: "Teval, the Balanced Scale", partner: null, themes: ["Reanimator"] };
const decks = [omnath, teval];

describe("the shortlist", () => {
  it("keeps only keys in the player's pool, each once, in the reply's order", () => {
    expect(validShortlist({ keys: [5, 9, 5, 2, 7] }, new Set([2, 5, 7]))).toEqual([5, 2, 7]);
  });

  it("stops at the shortlist size however many the reply holds", () => {
    const keys = Array.from({ length: READ_SHORTLIST_SIZE + 10 }, (_, i) => i + 1);
    expect(validShortlist({ keys }, new Set(keys))).toHaveLength(READ_SHORTLIST_SIZE);
  });

  it("puts the rules and the list in the system prompt, and the filters and words in the request", () => {
    expect(shortlistSystem("1|A|W||Tokens")).toContain("1|A|W||Tokens");
    expect(shortlistSystem("1|A|W||Tokens")).not.toContain("What the player wrote");
    const req = shortlistRequest({ words: "scary horrors", filters: { ...none, colors: ["B"], match: "exactly" }, cards: [] });
    expect(req).toContain("Color identity: exactly B.");
    expect(req).toContain(PLAYER_TEXT_OPEN);
  });

  it("states no filters plainly, and every filter set", () => {
    expect(describeFilters(none)).toEqual(["No filters."]);
    expect(describeFilters({ ...none, pool: "own" })).toEqual(["The 99 is built from cards the player owns only; the commander need not be owned."]);
    expect(describeFilters({ ...none, themes: ["a", "b"], themeJoin: "any", budgetDollars: 50, bracket: 3, sets: ["mh3"] }))
      .toEqual(["Themes (any of): a, b.", "Printed in any of these sets: mh3.", "Budget: about $50 for cards the player does not own.", "Bracket: 3."]);
  });
});

describe("the reply shapes", () => {
  // The API does not enforce a length bound, so one in the schema would fail a whole reply that a
  // single over-long reason or an extra pick should only trim.
  it("accept a reply past every limit, which the validators then trim", () => {
    const picks = Array.from({ length: READ_TOP + 5 }, (_, i) => ({ key: i + 1, reason: i === 0 ? "x".repeat(500) : "" }));
    expect(judgeSchema.safeParse({ picks }).success).toBe(true);
    expect(shortlistSchema.safeParse({ keys: Array.from({ length: READ_SHORTLIST_SIZE * 3 }, (_, i) => i) }).success).toBe(true);
  });
});

describe("a reason line", () => {
  it("keeps one that ties the commander to the words, as text", () => {
    expect(parseReason("Its horrors drain each opponent when they die.", decks)).toEqual([{ text: "Its horrors drain each opponent when they die." }]);
  });

  it("draws a deck token as that deck's commander, by id (F5)", () => {
    expect(parseReason("Lands matter here without the ramp your {D1} deck leans on.", decks)).toEqual([
      { text: "Lands matter here without the ramp your " }, { deck: "om" }, { text: " deck leans on." },
    ]);
  });

  it("refuses a token for a deck it was not shown", () => {
    expect(parseReason("Unlike your {D3} deck.", decks)).toBeNull();
    expect(parseReason("Unlike your {D0} deck.", decks)).toBeNull();
  });

  it("refuses a deck's commander written out rather than as its token (F5)", () => {
    expect(parseReason("Unlike your Omnath deck.", decks)).toBeNull();
    expect(parseReason("Unlike Teval, the Balanced Scale.", decks)).toBeNull();
    // A reason may name its own commander, even when a deck's commander shares the short name,
    // but never the deck's commander in full.
    expect(parseReason("Omnath makes an Elemental on each land.", decks, "Omnath, Locus of Rage")).not.toBeNull();
    expect(parseReason("Unlike Omnath, Locus of Creation.", decks, "Omnath, Locus of Rage")).toBeNull();
    // A name with no comma is its own short name: the pick may still name itself.
    const dragon = { commanderOracleId: "ud", commander: "The Ur-Dragon", partner: null, themes: [] };
    expect(parseReason("The Ur-Dragon pays off every Dragon you cast.", [dragon], "The Ur-Dragon")).not.toBeNull();
    expect(parseReason("Unlike The Ur-Dragon.", [dragon], "Omnath, Locus of Rage")).toBeNull();
    // An apostrophe of either form, and a possessive, still name the deck.
    const krrik = { commanderOracleId: "kr", commander: "K'rrik, Son of Yawgmoth", partner: null, themes: [] };
    expect(parseReason("Unlike K'rrik's deck.", [krrik])).toBeNull();
    expect(parseReason("Unlike K\u2019rrik.", [krrik])).toBeNull();
  });

  it("refuses a digit, a percent sign, a score word, or a stray brace (F3)", () => {
    for (const bad of [
      "Makes 5/3 Elementals on each land.", "Wins most games.%", "The best landfall commander.", "A strong fit for horrors.",
      "A good fit.", "★★★★★", "Unlike your {deck} deck.", "My second choice for horrors.", "The third pick here.",
      "A runner-up to the others.", "Number two on the list.", "My second-choice for horrors.", "A runner\u2011up here.", "The number-two option.", "Top\u2014pick for tokens.",
    ]) {
      expect(parseReason(bad, decks)).toBeNull();
    }
  });

  it("keeps rules words a score list would catch by mistake", () => {
    expect(parseReason("Gives your horrors first strike and digs from the top of your library.", decks)).not.toBeNull();
  });

  it("measures the drawn line, with the deck's short name, against the limit", () => {
    const body = "x".repeat(READ_REASON_MAX_CHARS - "Omnath".length);
    expect(parseReason(`${body}{D1}`, decks)).not.toBeNull();
    expect(parseReason(`${body}x{D1}`, decks)).toBeNull();
  });
});

describe("the judgement", () => {
  const idOf = new Map([[1, "a"], [2, "b"], [3, "c"], [4, "d"]]);

  it("keeps the shortlist's picks with a valid reason, in order; a refused one falls back and the next moves up (F4)", () => {
    const result = validJudgement({
      reply: { picks: [{ key: 2, reason: "Fine." }, { key: 3, reason: "Makes 3 tokens." }, { key: 9, reason: "Not shortlisted." }, { key: 2, reason: "Again." }, { key: 1, reason: "Also fine." }] },
      shortlist: [1, 2, 3], idOf, decks,
    });
    expect(result.picks.map((p) => p.oracleId)).toEqual(["b", "a"]);
  });

  it("names each deck at most once across the list; a reason naming one again is refused", () => {
    const result = validJudgement({
      reply: { picks: [
        { key: 1, reason: "Unlike {D1}, it wins in the air." },
        { key: 2, reason: "Unlike {D1}, it wins through combat." },
        { key: 3, reason: "Unlike {D2} and {D2}, it attacks." },
        { key: 4, reason: "Unlike {D2}, it attacks." },
      ] },
      shortlist: [1, 2, 3, 4], idOf, decks,
    });
    expect(result.picks.map((p) => p.oracleId)).toEqual(["a", "d"]);
  });

  it("refuses a deck whose commander shares a name with the pick", () => {
    const edgar: ReadDeck = { commanderOracleId: "em", commander: "Edgar Markov", partner: null, themes: ["Vampires"] };
    const result = validJudgement({
      reply: { picks: [{ key: 1, reason: "Unlike {D1}, it marries into the board." }, { key: 2, reason: "Unlike {D1}, it drains." }] },
      shortlist: [1, 2], idOf, decks: [edgar], nameOf: new Map([[1, "Edgar, Charmed Groom"], [2, "Sorin, Vengeful Bloodlord"]]),
    });
    expect(result.picks.map((p) => p.oracleId)).toEqual(["b"]);
  });

  it("states the requirement rule in both steps", () => {
    expect(JUDGE_SYSTEM).toMatch(/requirement, not a mood/);
    expect(JUDGE_SYSTEM).toMatch(/never fill with near misses/);
    expect(shortlistSystem("")).toMatch(/requirement, not a mood/);
  });

  it("carries at most the top ten", () => {
    const keys = Array.from({ length: READ_TOP + 5 }, (_, i) => i + 1);
    const result = validJudgement({
      reply: { picks: keys.map((key) => ({ key, reason: "Fits." })) },
      shortlist: keys, idOf: new Map(keys.map((k) => [k, `id${k}`])), decks,
    });
    expect(result.picks).toHaveLength(READ_TOP);
  });

  it("re-orders the free list without adding or removing a row", () => {
    const rows = ["a", "b", "c", "d"];
    expect(reorder(rows, (r) => r, { picks: [{ oracleId: "c", reason: [] }, { oracleId: "zz", reason: [] }] })).toEqual(["c", "a", "b", "d"]);
  });

  it("shows the decks by number, and says so when there are none", () => {
    const base = { words: "landfall", filters: none, cards: [], candidates: [] };
    expect(judgeRequest({ ...base, decks })).toContain("D1: Omnath, Locus of Creation, themes Landfall");
    expect(judgeRequest({ ...base, decks: [] })).toContain("The player has no decks yet.");
  });
});

describe("the fingerprint", () => {
  const base = { words: "A Landfall  deck", filters: none, listGeneration: "g", pool: ["x", "y"], collection: "c", decks };

  it("is the same ask however the words are spaced or cased, and whatever order the pool is in", () => {
    expect(readFingerprint({ ...base, words: "a landfall deck", pool: ["y", "x"] })).toBe(readFingerprint(base));
  });

  it("moves with every input the answer depends on (lock 7)", () => {
    const fp = readFingerprint(base);
    for (const changed of [
      { words: "a horrors deck" },
      { filters: { ...none, colors: ["G"] } },
      { filters: { ...none, budgetDollars: 50 } },
      { filters: { ...none, sets: ["mh3"] } },
      { filters: { ...none, pool: "own" as const } },
      { listGeneration: "g2" },
      { pool: ["x"] },
      { collection: "c2" },
      { decks: [omnath] },
      { decks: [{ ...omnath, themes: ["Ramp"] }, teval] },
    ]) {
      expect(readFingerprint({ ...base, ...changed })).not.toBe(fp);
    }
  });
});
