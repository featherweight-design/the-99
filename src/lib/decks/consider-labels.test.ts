import { describe, expect, it, vi } from "vitest";

import type { Job } from "../labels/types";
import { applyConsiderLabels, considerLabels, type ConsiderLabelDeps } from "./consider-labels";

const ELF_RAMP: Job = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: "Elf", affects: "self", to: null, method: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};

const deps = (enabled: boolean): ConsiderLabelDeps => ({
  enabled: vi.fn(() => enabled),
  readLabels: vi.fn(async () => new Map([["archdruid", [ELF_RAMP]]])),
  loadCreatureTypes: vi.fn(async () => new Set(["Elf", "Druid", "Dinosaur", "Shaman"])),
  loadNoncreatureSubtypes: vi.fn(async () => new Set(["Treasure"])),
  readLensRows: vi.fn(async () => Array.from({ length: 6 }, (_, i) => ({ oracleId: `dino-${i}`, typeLine: "Creature — Dinosaur", oracleText: null, quantity: 1 }))),
});

const SUGGESTIONS = [
  { oracleId: "archdruid", reasonType: "role" as const, typeLine: "Creature — Elf Druid" },
  { oracleId: "staple", reasonType: "edhrec" as const, typeLine: "Instant" },
];
const ARGS = {
  deckId: "deck-1",
  suggestionIds: SUGGESTIONS.map((s) => s.oracleId),
  commanders: [{ oracleId: "cmdr", typeLine: "Legendary Creature — Dinosaur", oracleText: null }],
};

describe("considerLabels", () => {
  it("off: reads nothing and answers null, so the suggestions pass through as the same list", async () => {
    const d = deps(false);
    const read = await considerLabels(ARGS, d);
    expect(read).toBeNull();
    expect(d.readLabels).not.toHaveBeenCalled();
    expect(d.loadCreatureTypes).not.toHaveBeenCalled();
    expect(d.loadNoncreatureSubtypes).not.toHaveBeenCalled();
    expect(d.readLensRows).not.toHaveBeenCalled();
    expect(applyConsiderLabels(SUGGESTIONS, read)).toBe(SUGGESTIONS);
  });

  it("reads the default switch per request, off unless exactly 'true'", async () => {
    vi.stubEnv("LABEL_SURFACES_ENABLED", "1");
    try {
      expect(await considerLabels({ ...ARGS, suggestionIds: [] })).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("on: calls readLabels once, with exactly the suggestion ids", async () => {
    const d = deps(true);
    await considerLabels(ARGS, d);
    expect(d.readLabels).toHaveBeenCalledTimes(1);
    expect(d.readLabels).toHaveBeenCalledWith(["archdruid", "staple"]);
    expect(d.readLensRows).toHaveBeenCalledWith("deck-1");
  });

  it("on: drops the Elf role pick from a Dinosaur deck and keeps the EDHREC pick", async () => {
    const read = await considerLabels(ARGS, deps(true));
    expect(read?.lens.keyType).toBe("Dinosaur");
    expect(read?.commanderTypes).toEqual(["Dinosaur"]);
    expect(applyConsiderLabels(SUGGESTIONS, read).map((s) => s.oracleId)).toEqual(["staple"]);
  });

  it("on: an Elf commander's own type keeps the Elf pick in a deck with no key type yet", async () => {
    const d = { ...deps(true), readLensRows: vi.fn(async () => []) };
    const read = await considerLabels({ ...ARGS, commanders: [{ oracleId: "lathril", typeLine: "Legendary Creature — Elf Noble", oracleText: null }] }, d);
    expect(read?.lens.keyType).toBeNull();
    expect(applyConsiderLabels(SUGGESTIONS, read).map((s) => s.oracleId)).toEqual(["archdruid", "staple"]);
  });

  it("on: a commander's own token text counts as held, and no deck card is left out", async () => {
    const read = await considerLabels(
      { ...ARGS, commanders: [{ oracleId: "cmdr", typeLine: "Legendary Creature — Dinosaur", oracleText: "Whenever this attacks, create a Treasure token." }] },
      deps(true),
    );
    expect(read?.lens.held.has("Treasure")).toBe(true);
    expect(read?.lens.heldTypes.has("creature")).toBe(true);
  });
});
