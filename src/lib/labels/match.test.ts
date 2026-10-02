import { describe, expect, it } from "vitest";

import type { DeckLens } from "../swaps/honest";
import { hasLabelledJob, heldCardTypes, labelPatterns, matchLabels, relevant, type JobRef } from "./match";
import type { Job } from "./types";

/** A job with every limit at its "says nothing" value, overridden per case. */
const job = (over: Record<string, unknown>): Job => ({
  restrictedTo: null, affects: null, to: null, method: null, trigger: "none", recurrence: "oneShot",
  threshold: null, modal: false, ...over,
}) as Job;
const removal = (over: Record<string, unknown> = {}) => job({ space: "role", kind: "removal", method: "destroy", ...over });
const draw = (over: Record<string, unknown> = {}) => job({ space: "role", kind: "draw", affects: "self", ...over });

const TYPES = new Set(["Elf", "Goblin"]);
const isType = (w: string) => TYPES.has(w);
const lens = (over: Partial<DeckLens> = {}): DeckLens => ({
  keyType: "Elf", isSubtype: (w) => w === "Equipment" || w === "Aura", held: new Set(), heldTypes: new Set(["creature"]), ...over,
});

describe("relevant: a job on your own cards counts only for what the deck plays", () => {
  it("keeps a creature type only when it is the deck's key type", () => {
    const pump = job({ space: "theme", kind: "pump", affects: "self", restrictedTo: "Elf" });
    expect(relevant(pump, lens(), isType)).toBe(true);
    expect(relevant(pump, lens({ keyType: "Goblin" }), isType)).toBe(false);
  });

  it("keeps a noncreature subtype only when the deck holds one", () => {
    const tutor = job({ space: "theme", kind: "recursion", affects: "self", restrictedTo: "Equipment" });
    expect(relevant(tutor, lens(), isType)).toBe(false);
    expect(relevant(tutor, lens({ held: new Set(["Equipment"]) }), isType)).toBe(true);
  });

  it("keeps a card type only when the deck's other cards carry it", () => {
    const recur = job({ space: "theme", kind: "recursion", affects: "self", restrictedTo: "artifact" });
    expect(relevant(recur, lens(), isType)).toBe(false);
    expect(relevant(recur, lens({ heldTypes: new Set(["artifact"]) }), isType)).toBe(true);
    expect(relevant(recur, null, isType)).toBe(false);
  });

  it("keeps a restriction it cannot read, and never drops a job aimed at opponents for its target", () => {
    expect(relevant(draw({ restrictedTo: "something odd" }), lens(), isType)).toBe(true);
    expect(relevant(removal({ affects: "opponents", restrictedTo: "artifact" }), lens(), isType)).toBe(true);
    expect(relevant(removal({ affects: "each", restrictedTo: "Goblin" }), lens({ keyType: "Elf" }), isType)).toBe(true);
  });
});

describe("matchLabels: the gates drop, the advice ranks", () => {
  // Keys alone, for reading: every job here is one space but `draw`, which has its own case below.
  const m = (o: Job[], c: Job[], deck: DeckLens | null = lens()) => {
    const r = matchLabels(o, c, deck, isType);
    const keys = (refs: JobRef[]) => refs.map((x) => x.key);
    return { ...r, shared: keys(r.shared), extra: keys(r.extra), missing: keys(r.missing) };
  };

  it("keeps a job of the same key", () => {
    expect(m([removal()], [removal()]).shared).toEqual(["removal"]);
  });

  it("gate 1: ramp only in the same kind", () => {
    const rock = job({ space: "role", kind: "ramp", rampKind: "tapsForMana", affects: "self" });
    const fetch = job({ space: "role", kind: "ramp", rampKind: "fetchesLand", affects: "self" });
    expect(m([rock], [fetch]).shared).toEqual([]);
    expect(m([rock], [rock]).shared).toEqual(["tapsForMana"]);
  });

  it("gate 2: affects must match, and null matches only null", () => {
    expect(m([draw()], [draw({ affects: "each" })]).shared).toEqual([]);
    expect(m([removal({ affects: null })], [removal({ affects: "opponents" })]).shared).toEqual([]);
    expect(m([removal({ affects: null })], [removal({ affects: null })]).shared).toEqual(["removal"]);
  });

  it("gate 3: `to` must match where both cards carry one", () => {
    const regrowth = job({ space: "theme", kind: "recursion", affects: "self", to: "hand" });
    const reanimate = job({ space: "theme", kind: "recursion", affects: "self", to: "battlefield" });
    expect(m([regrowth], [reanimate]).shared).toEqual([]);
    expect(m([regrowth], [job({ space: "theme", kind: "recursion", affects: "self" })]).shared).toEqual(["recursion"]);
  });

  it("gate 4: a stand-in's target is never narrower than the original's", () => {
    const any = removal({ affects: "opponents" });
    const artifactsOnly = removal({ affects: "opponents", restrictedTo: "artifact" });
    expect(m([any], [artifactsOnly]).shared).toEqual([]);
    expect(m([artifactsOnly], [any]).shared).toEqual(["removal"]);
    expect(m([artifactsOnly], [removal({ affects: "opponents", restrictedTo: "Artifact" })]).shared).toEqual(["removal"]);
  });

  it("advice: a different trigger or recurrence ranks lower and is never a drop", () => {
    const r = m([draw()], [draw({ trigger: "etb", recurrence: "repeatable" })]);
    expect(r.shared).toEqual(["draw"]);
    expect(r.advisory).toBe(1);
    expect(m([draw()], [draw()]).advisory).toBe(0);
  });

  it("Q3: a bounce kept for an exile ranks lower and names the method it loses", () => {
    const r = m([removal({ method: "exile" })], [removal({ method: "bounce" })]);
    expect(r.shared).toEqual(["removal"]);
    expect(r.lostMethods).toEqual(["exile"]);
    expect(r.advisory).toBe(1);
    // Only a permanent answer is named: a shrink kept for a bounce loses nothing worth a tag.
    expect(m([removal({ method: "bounce" })], [removal({ method: "shrink" })]).lostMethods).toEqual([]);
  });

  it("prefers the candidate's job that keeps the method, when it has two", () => {
    const r = m([removal({ method: "exile" })], [removal({ method: "bounce" }), removal({ method: "exile" })]);
    expect(r.lostMethods).toEqual([]);
    expect(r.advisory).toBe(0);
  });

  it("rule 7: jobs kept only through modal alternatives count once", () => {
    const charm = [removal({ modal: true }), draw({ modal: true })];
    const r = m([removal(), draw()], charm);
    expect(r.shared).toEqual(["removal", "draw"]);
    expect(r.credit).toBe(1);
    expect(m([removal(), draw()], [removal(), draw()]).credit).toBe(2);
  });

  it("reports the original's jobs it misses and the extra ones it brings", () => {
    const r = m([removal(), draw()], [removal(), job({ space: "theme", kind: "tokens", affects: "self" })]);
    expect(r.missing).toEqual(["draw"]);
    expect(r.extra).toEqual(["tokens"]);
  });

  it("keeps a role draw apart from a theme draw: one is cards in hand, the other rewards drawing", () => {
    const themeDraw = job({ space: "theme", kind: "draw", affects: "self" });
    const r = matchLabels([draw()], [themeDraw], lens(), isType);
    expect(r.shared).toEqual([]);
    expect(r.missing).toEqual([{ space: "role", key: "draw" }]);
    expect(r.extra).toEqual([{ space: "theme", key: "draw" }]);
    expect(matchLabels([draw()], [draw()], lens(), isType).shared).toEqual([{ space: "role", key: "draw" }]);
  });

  it("drops a job this deck does not play from both sides", () => {
    const goblinPump = job({ space: "theme", kind: "pump", affects: "self", restrictedTo: "Goblin" });
    expect(m([goblinPump], [goblinPump]).shared).toEqual([]);
  });
});

describe("the pool's patterns and the deck's types", () => {
  it("one containment pattern per key, a ramp job by its kind", () => {
    const rock = job({ space: "role", kind: "ramp", rampKind: "tapsForMana", affects: "self" });
    expect(labelPatterns([rock, removal(), removal({ method: "exile" }), job({ space: "role", kind: "land" })])).toEqual([
      JSON.stringify([{ space: "role", kind: "ramp", rampKind: "tapsForMana" }]),
      JSON.stringify([{ space: "role", kind: "removal" }]),
    ]);
  });

  it("reads card types off the front of every face, never a subtype", () => {
    expect([...heldCardTypes(["Legendary Artifact Creature — Golem", "Instant // Sorcery", "Enchantment — Aura"])].sort())
      .toEqual(["artifact", "creature", "enchantment", "instant", "sorcery"]);
  });

  it("a labelled card has a job only when one counts for this deck", () => {
    expect(hasLabelledJob([job({ space: "theme", kind: "pump", affects: "self", restrictedTo: "Goblin" })], lens(), isType)).toBe(false);
    expect(hasLabelledJob([removal()], lens(), isType)).toBe(true);
  });
});
