import { describe, expect, it } from "vitest";

import type { DeckLens } from "../swaps/honest";
import { considerIrrelevant, filterConsider } from "./consider";
import type { Job } from "./types";

const CREATURE_TYPES = new Set(["Elf", "Druid", "Dinosaur", "Noble", "Wolf"]);
const isCreatureType = (w: string) => CREATURE_TYPES.has(w);

const lens = (over: Partial<DeckLens> = {}): DeckLens => ({
  keyType: "Dinosaur",
  isSubtype: (w) => w === "Equipment" || w === "Treasure",
  held: new Set(),
  heldTypes: new Set(["creature", "land"]),
  ...over,
});

/** A mana tapper's ramp job, limited to `restrictedTo` and aimed at `affects`. */
const ramp = (restrictedTo: string | null, affects: Job["affects"] = "self"): Job => ({
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo, affects, to: null, method: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
});
const removal = (restrictedTo: string | null, affects: Job["affects"]): Job => ({
  space: "role", kind: "removal", restrictedTo, affects, to: null, method: "destroy",
  trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
});

const SPELL = { typeLine: "Creature — Elf Druid" };

describe("considerIrrelevant", () => {
  it("keeps a card with no fresh label: absence never reads as irrelevant", () => {
    expect(considerIrrelevant(undefined, SPELL, lens(), [], isCreatureType)).toBe(false);
    expect(considerIrrelevant([], SPELL, lens(), [], isCreatureType)).toBe(false);
  });

  it("drops a card whose every job is limited to a creature type a Dinosaur deck does not play", () => {
    expect(considerIrrelevant([ramp("Elf"), ramp("Elf")], SPELL, lens(), ["Dinosaur"], isCreatureType)).toBe(true);
  });

  it("keeps it in a deck with no key type yet whose commander is an Elf (finding 6)", () => {
    expect(considerIrrelevant([ramp("Elf")], SPELL, lens({ keyType: null }), ["Elf", "Druid"], isCreatureType)).toBe(false);
  });

  it("keeps a card with one unrestricted job beside an irrelevant one", () => {
    expect(considerIrrelevant([ramp("Elf"), ramp(null)], SPELL, lens(), [], isCreatureType)).toBe(false);
  });

  it("keeps a job aimed at opponents, whose restriction names the target", () => {
    expect(considerIrrelevant([removal("artifact", "opponents")], SPELL, lens({ heldTypes: new Set() }), [], isCreatureType)).toBe(false);
  });

  it("reads a card-type limit off the cards the deck holds", () => {
    const job = [ramp("artifact")];
    expect(considerIrrelevant(job, SPELL, lens({ heldTypes: new Set(["artifact"]) }), [], isCreatureType)).toBe(false);
    expect(considerIrrelevant(job, SPELL, lens({ heldTypes: new Set(["creature"]) }), [], isCreatureType)).toBe(true);
  });

  it("never drops a land face, whatever its label says", () => {
    expect(considerIrrelevant([ramp("Elf")], { typeLine: "Land — Forest" }, lens(), [], isCreatureType)).toBe(false);
  });
});

describe("filterConsider", () => {
  const ELF = [ramp("Elf")];
  const labels = new Map<string, Job[]>([["role-pick", ELF], ["edhrec-pick", ELF], ["top-pick", ELF]]);
  const pick = (oracleId: string, reasonType: "edhrec" | "role") => ({ oracleId, reasonType, typeLine: SPELL.typeLine });

  it("drops only the role-gap pick; an EDHREC pick and an unowned Top pick stay", () => {
    const out = filterConsider(
      [pick("edhrec-pick", "edhrec"), pick("role-pick", "role"), pick("top-pick", "edhrec"), pick("unlabelled", "role")],
      labels, lens(), ["Dinosaur"], isCreatureType,
    );
    expect(out.map((s) => s.oracleId)).toEqual(["edhrec-pick", "top-pick", "unlabelled"]);
  });

  it("keeps the role-gap pick when a commander's own type makes its label relevant", () => {
    const out = filterConsider([pick("role-pick", "role")], labels, lens({ keyType: null }), ["Elf"], isCreatureType);
    expect(out.map((s) => s.oracleId)).toEqual(["role-pick"]);
  });
});
