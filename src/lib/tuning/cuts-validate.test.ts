import { describe, expect, it } from "vitest";
import { deckCutsCopy } from "../copy/deck-cuts";

import { cutFacts } from "./cuts";
import { profile, row, support, deck } from "./cuts-fixture";
import { buildCutsPack, type CutsPack } from "./cuts-evidence";
import type { CutCite, CutsResponse } from "./cuts-schema";
import { MAX_CUTS_PER_RUN } from "./cuts-ask";
import { citeHolds, validateCuts } from "./cuts-validate";

// 102 cards, 2 over. bear1 is off the list, ramp0 is at 41 percent, one bear is a Game Changer.
const mk = (intent: string | null = "Big fliers"): CutsPack =>
  buildCutsPack({
    facts: cutFacts({
      profile: profile({ gameChangerIds: new Set(["bear2"]) }, deck(50, [row({ oracleId: "x" })].slice(0, 0))),
      locked: new Set(), support: support([["ramp0", 41], ["ramp1", 50]]), declaredBracket: 2,
    }),
    commanderName: "Gishath", keyCards: ["ramp1"], intent,
  });

const resolve = (name: string) => (name === "Nope" ? null : { oracleId: name });
const run = (cuts: CutsResponse["cuts"], pack = mk()) => validateCuts({ reply: { cuts }, pack, resolveName: resolve });
const c = (name: string, cites: CutCite[], reason = "Off the list.") => ({ name, reason, cites });
const OFF: CutCite = { kind: "offList" };

describe("validateCuts", () => {
  it("keeps a well-formed cut", () => {
    const { kept, dropped, report } = run([c("bear1", [OFF])]);
    expect(kept.map((k) => k.oracleId)).toEqual(["bear1"]);
    expect(dropped).toEqual([]);
    expect(report).toMatchObject({ askedCount: 1, survivedCount: 1, keptCount: 1, over: 2 });
  });

  it("drops a name that does not resolve", () => {
    expect(run([c("Nope", [OFF])]).dropped[0]).toMatchObject({ rule: "cardExists", name: "Nope" });
  });

  it("drops a card not in the deck pack (commander, locked, or elsewhere)", () => {
    expect(run([c("cmd", [OFF])]).dropped[0].rule).toBe("notInDeck");
  });

  it("drops a Key card", () => {
    expect(run([c("ramp1", [{ kind: "inclusion", pct: 50 }])]).dropped[0].rule).toBe("keyCard");
  });

  it("drops a duplicate", () => {
    const r = run([c("bear1", [OFF]), c("bear1", [OFF])]);
    expect(r.kept).toHaveLength(1);
    expect(r.dropped[0]).toMatchObject({ rule: "duplicate", position: 1 });
  });

  it("caps the count at over and names the extras", () => {
    const r = run([c("bear1", [OFF]), c("bear3", [OFF]), c("bear4", [OFF])]);
    expect(r.kept).toHaveLength(2);
    expect(r.dropped[0].rule).toBe("tooMany");
    expect(r.report).toMatchObject({ survivedCount: 3, keptCount: 2 });
  });

  it("reports every drop at the reply's own index, a tooMany one included", () => {
    const r = run([c("nope", [OFF]), c("bear1", [OFF]), c("bear3", [OFF]), c("bear4", [OFF])]);
    expect(r.dropped.map((d) => [d.rule, d.position])).toEqual([["notInDeck", 0], ["tooMany", 3]]);
  });

  describe("cite equality", () => {
    const pack = mk();
    const card = (id: string) => pack.cards.find((x) => x.oracleId === id)!;

    it("inclusion pct must equal the card's", () => {
      expect(citeHolds({ kind: "inclusion", pct: 41 }, card("ramp0"), pack)).toBe(true);
      expect(citeHolds({ kind: "inclusion", pct: 40 }, card("ramp0"), pack)).toBe(false);
      expect(run([c("ramp0", [{ kind: "inclusion", pct: 40 }])]).report.softened?.[0]).toMatchObject({ rule: "citeMismatch", cite: "inclusion" });
    });

    it("offList only for an off-list card", () => {
      expect(citeHolds(OFF, card("ramp0"), pack)).toBe(false);
      expect(citeHolds(OFF, card("bear1"), pack)).toBe(true);
    });

    it("role have and target must equal the pack's, and the card must fill the role", () => {
      expect(citeHolds({ kind: "role", role: "ramp", have: 12, target: 10 }, card("ramp0"), pack)).toBe(true);
      expect(citeHolds({ kind: "role", role: "ramp", have: 11, target: 10 }, card("ramp0"), pack)).toBe(false);
      expect(citeHolds({ kind: "role", role: "ramp", have: 12, target: 9 }, card("ramp0"), pack)).toBe(false);
      expect(citeHolds({ kind: "role", role: "ramp", have: 12, target: 10 }, card("bear1"), pack)).toBe(false);
    });

    it("curve cmc and have must equal the card's crowding fact", () => {
      const withCurve = pack.cards.find((x) => x.curve);
      if (withCurve?.curve) {
        const { cmc, have } = withCurve.curve;
        expect(citeHolds({ kind: "curve", cmc, have }, withCurve, pack)).toBe(true);
        expect(citeHolds({ kind: "curve", cmc, have: have + 1 }, withCurve, pack)).toBe(false);
      }
      expect(citeHolds({ kind: "curve", cmc: 3, have: 30 }, { ...card("bear1"), curve: undefined }, pack)).toBe(false);
    });

    it("a flag must be one the card bears", () => {
      const flagged = pack.cards.find((x) => x.flags);
      expect(flagged?.flags).toContain("gameChanger");
      expect(citeHolds({ kind: "flag", flag: "gameChanger" }, flagged!, pack)).toBe(true);
      expect(citeHolds({ kind: "flag", flag: "combo" }, flagged!, pack)).toBe(false);
      expect(citeHolds({ kind: "flag", flag: "gameChanger" }, card("bear1"), pack)).toBe(false);
    });

    it("intent only if one was given", () => {
      expect(citeHolds({ kind: "intent" }, card("bear1"), pack)).toBe(true);
      expect(citeHolds({ kind: "intent" }, card("bear1"), mk(null))).toBe(false);
    });

    it("one false cite removes that cite and the model's words, and keeps the cut with the cites that held", () => {
      const r = run([c("bear1", [OFF, { kind: "inclusion", pct: 5 }], "Nobody plays it.")]);
      expect(r.dropped).toEqual([]);
      expect(r.kept).toHaveLength(1);
      expect(r.kept[0].cites).toEqual([OFF]);
      expect(r.kept[0].reason).toBe(deckCutsCopy.unchecked);
      expect(r.report.softened).toEqual([{ position: 0, name: r.kept[0].name, rule: "citeMismatch", cite: "inclusion" }]);
    });

    it("a cut with no cite that held shows the card's own counts, never the claim", () => {
      const r = run([c("bear1", [{ kind: "inclusion", pct: 5 }])]);
      expect(r.kept).toHaveLength(1);
      expect(r.kept[0].cites).toContainEqual({ kind: "cost", mv: card("bear1").mv });
      expect(r.kept[0].cites.every((x) => citeHolds(x, card("bear1"), pack))).toBe(true);
      expect(r.kept[0].cites).not.toContainEqual({ kind: "inclusion", pct: 5 });
    });

    it("a cut that was not softened carries no softened entry", () => {
      expect(run([c("bear1", [OFF])]).report.softened).toBeUndefined();
    });

    it("a card that is not a valid cut is still dropped whatever its cites say", () => {
      expect(run([c("Nope", [OFF])]).dropped[0].rule).toBe("cardExists");
      expect(run([c("nobody", [OFF])]).dropped[0].rule).toBe("notInDeck");
      expect(run([c("ramp1", [OFF])]).dropped[0].rule).toBe("keyCard");
    });
  });

  it("replaces a reason that names a bracket or promises a result, and keeps the cut and its cites", () => {
    const a = run([c("bear1", [OFF], "Too strong for a bracket 2 deck.")]);
    expect([a.dropped, a.kept[0].reason, a.kept[0].cites, a.report.softened?.[0].rule]).toEqual([[], deckCutsCopy.unchecked, [OFF], "noBracketClaim"]);
    const b = run([c("bear1", [OFF], "Cutting it will make the deck stronger.")]);
    expect([b.dropped, b.kept[0].reason, b.report.softened?.[0].rule]).toEqual([[], deckCutsCopy.unchecked, "noResultClaim"]);
  });
});

describe("the per-run cap", () => {
  const big = () => buildCutsPack({
    facts: cutFacts({ profile: profile({}, deck(70)), locked: new Set(), support: null, declaredBracket: null }),
    commanderName: "Gishath", keyCards: [], intent: null,
  });
  it("asks for no more than the cap of a deck 22 over, and keeps no more than that", () => {
    const pack = big();
    expect([pack.over, pack.ask]).toEqual([22, MAX_CUTS_PER_RUN]);
    const cuts = Array.from({ length: 22 }, (_, i) => c(`bear${i}`, [{ kind: "cost", mv: 3 }]));
    const r = run(cuts, pack);
    expect(r.kept).toHaveLength(MAX_CUTS_PER_RUN);
    expect(r.dropped.map((d) => d.rule)).toEqual(Array(22 - MAX_CUTS_PER_RUN).fill("tooMany"));
    expect(r.report).toMatchObject({ over: MAX_CUTS_PER_RUN, keptCount: MAX_CUTS_PER_RUN });
  });
});

describe("the plan cites (prompt v2)", () => {
  const plan = {
    combos: [{ pieces: ["bear1", "bear3"], produces: ["Infinite mana"], usesCommander: false, manaNeeded: 0 }],
    nearCombos: [{ have: "bear5", missing: "Elsewhere", produces: ["Infinite mana"] }],
    commanderText: [], colourNeeds: [{ colour: "G", cards: 40 }], basics: [],
    needs: new Map([["bear1", ["G"]], ["bear2", ["G"]]]),
  };
  const withPlan = (p: typeof plan | null = plan): CutsPack =>
    buildCutsPack({
      facts: cutFacts({ profile: profile({}, deck(50)), locked: new Set(), support: null, declaredBracket: null }),
      commanderName: "Gishath", keyCards: [], intent: null, ...(p ? { plan: p } : {}),
    });
  const card = (pack: CutsPack, id: string) => pack.cards.find((x) => x.oracleId === id)!;

  it("holds a combo cite only for the state the card is in", () => {
    const pack = withPlan();
    expect(citeHolds({ kind: "combo", state: "assembled" }, card(pack, "bear1"), pack)).toBe(true);
    expect(citeHolds({ kind: "combo", state: "oneShort" }, card(pack, "bear5"), pack)).toBe(true);
    expect(citeHolds({ kind: "combo", state: "assembled" }, card(pack, "bear5"), pack)).toBe(false);
    expect(citeHolds({ kind: "combo", state: "none" }, card(pack, "bear2"), pack)).toBe(true);
    expect(citeHolds({ kind: "combo", state: "none" }, card(pack, "bear1"), pack)).toBe(false);
  });

  it("refuses 'in no combo' when the combo read failed or there was no plan", () => {
    const failed = withPlan({ ...plan, combos: null as never });
    expect(citeHolds({ kind: "combo", state: "none" }, card(failed, "bear2"), failed)).toBe(false);
    const bare = withPlan(null);
    expect(citeHolds({ kind: "combo", state: "none" }, card(bare, "bear2"), bare)).toBe(false);
  });

  it("refuses 'in no combo' when a combo list is at its cap, since it may omit pieces", () => {
    const full = withPlan({ ...plan, combos: Array.from({ length: 6 }, () => plan.combos[0]) });
    expect(citeHolds({ kind: "combo", state: "none" }, card(full, "bear2"), full)).toBe(false);
  });

  it("holds a cost cite only at the card's mana value", () => {
    const pack = withPlan();
    expect(citeHolds({ kind: "cost", mv: 3 }, card(pack, "bear1"), pack)).toBe(true);
    expect(citeHolds({ kind: "cost", mv: 4 }, card(pack, "bear1"), pack)).toBe(false);
  });

  it("holds a colour cite only for a colour the card needs, at the deck's figure", () => {
    const pack = withPlan();
    expect(citeHolds({ kind: "colour", colour: "G", cards: 40 }, card(pack, "bear1"), pack)).toBe(true);
    expect(citeHolds({ kind: "colour", colour: "G", cards: 39 }, card(pack, "bear1"), pack)).toBe(false);
    expect(citeHolds({ kind: "colour", colour: "R", cards: 40 }, card(pack, "bear1"), pack)).toBe(false);
    expect(citeHolds({ kind: "colour", colour: "G", cards: 40 }, card(pack, "bear3"), pack)).toBe(false);
  });

  it("holds a tapped cite only for a land that enters tapped", () => {
    const pack = withPlan();
    expect(citeHolds({ kind: "tapped" }, card(pack, "bear1"), pack)).toBe(false);
  });

  it("holds a tapped cite for a land whose text enters it tapped, always or under a condition", () => {
    const pack = buildCutsPack({
      facts: cutFacts({
        profile: profile({}, deck(50, [
          row({ oracleId: "temple", typeLine: "Land", cmc: 0, manaCost: null, oracleText: "This land enters tapped." }),
          row({ oracleId: "check", typeLine: "Land", cmc: 0, manaCost: null, oracleText: "This land enters tapped unless you control a Forest." }),
          row({ oracleId: "plain", typeLine: "Land", cmc: 0, manaCost: null, oracleText: "{T}: Add {G}." }),
        ])),
        locked: new Set(), support: null, declaredBracket: null,
      }),
      commanderName: "Gishath", keyCards: [], intent: null,
      texts: new Map([["temple", "This land enters tapped."], ["check", "This land enters tapped unless you control a Forest."], ["plain", "{T}: Add {G}."]]),
    });
    expect(citeHolds({ kind: "tapped" }, card(pack, "temple"), pack)).toBe(true);
    expect(citeHolds({ kind: "tapped" }, card(pack, "check"), pack)).toBe(true);
    expect(citeHolds({ kind: "tapped" }, card(pack, "plain"), pack)).toBe(false);
  });
});
