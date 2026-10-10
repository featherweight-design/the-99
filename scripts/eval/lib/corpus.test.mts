import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { claimsOf, gradeClaim, loadCorpus, renderMetrics, scoreCase, type CorpusCase, type Reply } from "./corpus.mjs";

const CORPUS = join(process.cwd(), "docs/superpowers/eval/corpus");
const base = (gold: Partial<CorpusCase["gold"]>): CorpusCase => ({
  id: "t", deck: { name: "t", deckId: null, source: "staging", listFingerprint: null },
  gold: { combos: [], keyCards: [], weaknesses: [], mulliganPieces: [], wrong: [], right: [], ...gold },
});
const reply = (r: Partial<Omit<Reply, "primer">> & { primer?: Partial<Reply["primer"]> }): Reply => ({
  overview: "", keyCards: [], weaknesses: [], ...r,
  primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [], ...r.primer },
});

describe("the shipped corpus", () => {
  const cases = loadCorpus(CORPUS);
  it("holds the nine decks of the comparison, each parsing against the schema", () => {
    expect(cases.map((c) => c.id).sort()).toEqual(["aang", "counter-intelligence", "eldrazi", "gishath", "goblins", "gods", "imotekh", "wizards", "yuriko"]);
  });
  it("gives every wrong-claim rule a reason, and every id once per deck", () => {
    for (const c of cases) {
      const ids = [...c.gold.wrong.map((w) => w.id), ...c.gold.right.map((r) => r.id)];
      expect(new Set(ids).size, c.id).toBe(ids.length);
      for (const w of c.gold.wrong) expect(w.why.length, `${c.id}/${w.id}`).toBeGreaterThan(10);
    }
  });
  it("is scorable on an empty answer: every gold item missed, nothing graded wrong", () => {
    for (const c of cases) {
      const s = scoreCase(c, reply({}));
      expect(s.claims.wrong, c.id).toBe(0);
      expect(s.combos.named, c.id).toBe(0);
    }
  });
});

describe("combo recall", () => {
  const c = base({ combos: [{ cards: ["Ghostly Flicker", "Naru Meha"], produces: "infinite mana", forced: false }] });
  it("counts a combo named in the overview or a strategy line, both cards required", () => {
    expect(scoreCase(c, reply({ overview: "Win with [[Ghostly Flicker]] and [[Naru Meha]]." })).combos.named).toBe(1);
    expect(scoreCase(c, reply({ primer: { strategy: ["[[Naru Meha]] copies things.", "[[Ghostly Flicker]] resets."] } })).combos.named).toBe(0);
  });
  it("does not count a combo named only in a tip, which is the plan's definition", () => {
    const r = reply({ primer: { tips: [{ cards: ["Ghostly Flicker", "Naru Meha"], text: "[[Ghostly Flicker]] with [[Naru Meha]] loops." }] } });
    expect(scoreCase(c, r).combos.named).toBe(0);
    expect(scoreCase(c, r).missed.combos).toEqual(["Ghostly Flicker + Naru Meha"]);
  });
  it("reports a forced loop named in a weakness separately", () => {
    const l = base({ combos: [{ cards: ["Marauding Raptor", "Polyraptor"], produces: "loop", forced: true }] });
    const s = scoreCase(l, reply({ overview: "[[Marauding Raptor]] and [[Polyraptor]] loop.", weaknesses: ["Without an outlet, [[Marauding Raptor]] with [[Polyraptor]] draws you out."] }));
    expect(s.combos).toMatchObject({ named: 1, forcedGold: 1, forcedInWeaknesses: 1 });
  });
});

describe("claim grades", () => {
  const gold = base({
    wrong: [{ id: "cascade", cards: ["Gishath"], pattern: "cascad", why: "Gishath has no cascade" }, { id: "chain", cards: ["Chain Reaction"], sections: ["keyCard"], why: "wipes its own Goblins" }],
    right: [{ id: "tyrant", cards: ["Trapjaw Tyrant", "Wrathful Raptors"], note: "the line" }],
  }).gold;
  it("grades a claim wrong only when the cards AND the pattern both match", () => {
    expect(gradeClaim({ section: "strategy", text: "[[Gishath]] cascades creatures.", cards: ["Gishath"] }, gold).grade).toBe("wrong");
    expect(gradeClaim({ section: "strategy", text: "[[Gishath]] attacks.", cards: ["Gishath"] }, gold).grade).toBe("ungraded");
    expect(gradeClaim({ section: "strategy", text: "Cascade is strong.", cards: [] }, gold).grade).toBe("ungraded");
  });
  it("judges a rule only in its sections: Chain Reaction is a wrong key card and a fair warning", () => {
    expect(gradeClaim({ section: "keyCard", text: "Chain Reaction: sweeps", cards: ["Chain Reaction"] }, gold).grade).toBe("wrong");
    expect(gradeClaim({ section: "weakness", text: "[[Chain Reaction]] kills your own Goblins.", cards: ["Chain Reaction"] }, gold).grade).toBe("ungraded");
  });
  it("leaves a negated sentence ungraded, and a right rule only grades a tip", () => {
    const neg = base({ wrong: [{ id: "shard", cards: ["Shard", "Ayara"], why: "Shard makes opponents sacrifice" }] }).gold;
    expect(gradeClaim({ section: "tip", text: "[[Shard]] does not trigger [[Ayara]].", cards: ["Shard", "Ayara"] }, neg).grade).toBe("ungraded");
    expect(gradeClaim({ section: "tip", text: "[[Shard]] triggers [[Ayara]].", cards: ["Shard", "Ayara"] }, neg).grade).toBe("wrong");
    const rt = base({ right: [{ id: "r", cards: ["A card", "B card"], note: "n" }] }).gold;
    expect(gradeClaim({ section: "overview", text: "[[A card]] with [[B card]].", cards: ["A card", "B card"] }, rt).grade).toBe("ungraded");
    expect(gradeClaim({ section: "tip", text: "[[A card]] with [[B card]].", cards: ["A card", "B card"] }, rt).grade).toBe("correct");
  });
  it("lets a wrong rule beat a right one on the same sentence", () => {
    const both = base({ wrong: [{ id: "w", cards: ["A card"], pattern: "mill", why: "does not mill, ever" }], right: [{ id: "r", cards: ["A card", "B card"], note: "n" }] }).gold;
    expect(gradeClaim({ section: "tip", text: "[[A card]] mills with [[B card]].", cards: ["A card", "B card"] }, both).grade).toBe("wrong");
  });
  it("marks a lost good claim as an anchor missed, and never grades the ungraded", () => {
    const s = scoreCase(base({ right: [{ id: "tyrant", cards: ["Trapjaw Tyrant", "Wrathful Raptors"], note: "n" }] }), reply({ overview: "One. Two." }));
    expect(s.missed.anchors).toEqual(["tyrant"]);
    expect(s.claims).toEqual({ total: 2, correct: 0, wrong: 0, ungraded: 2 });
  });
  it("splits an overview into sentences and reads marks off every section", () => {
    const cl = claimsOf(reply({ overview: "A [[X]]. B [[Y]]!", keyCards: [{ card: "Z", job: "j" }], weaknesses: ["w [[W]]"] }));
    expect(cl.map((x) => x.section)).toEqual(["overview", "overview", "keyCard", "weakness"]);
    expect(cl[0]!.cards).toEqual(["X"]);
  });
});

describe("the metrics document", () => {
  it("prints counts and recalls, names what was missed, and lists the decks without an answer", () => {
    const c = base({ keyCards: ["Brainstorm"], weaknesses: [{ topic: "wipes", names: ["Farewell"] }], mulliganPieces: ["Brainstorm"] });
    const text = renderMetrics("t", [scoreCase(c, reply({ keyCards: [{ card: "Brainstorm", job: "j" }] }))], ["imotekh"]);
    expect(text).toContain("| t | 1 | 0 | 0 | 1 | n/a | 1/1 | 0/1 | no | none |");
    expect(text).toContain("weaknesses: wipes");
    expect(text).toContain("Skipped (no answer supplied): imotekh.");
  });
});
