import { describe, expect, it } from "vitest";

import { buildPlayGroup } from "../../../src/lib/profile/play";
import type { EvidencePack } from "../../../src/lib/tuning/evidence";
import { buildPrompt } from "../../../src/lib/tuning/prompt";
import { applyVariant, setStrategyInput, TUNING_VARIANTS } from "./tuning.mjs";

const pack: EvidencePack = {
  commanders: [{ oracleId: "c", name: "Gisa, Glorious Resurrector" }],
  colorIdentity: ["B"],
  cards: [
    { oracleId: "c", name: "Gisa, Glorious Resurrector", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true },
    { oracleId: "s", name: "Swamp", typeLine: "Basic Land", roles: ["land"], quantity: 35, owned: true, commander: false },
  ],
  targets: { roles: [{ role: "ramp", have: 9, target: 10, advisory: false, measured: true }], thin: false },
  staples: Array.from({ length: 30 }, (_, i) => ({ oracleId: `st${i}`, name: `Staple ${i}`, commanders: 30 - i, commanderTotal: 336, owned: false })),
  play: buildPlayGroup([]),
  intent: null,
  year: 2026,
};

// The strategy variant reads stored per-deck context; the test supplies it rather than a file.
setStrategyInput({ universal: ["Sol Ring"], decks: { "deck-1": { strategy: ["Attack with [[X]]."], keyCards: ["X"] } } });

describe("tuning variants", () => {
  it("base is the app's prompt, byte for byte", () => {
    expect(applyVariant(TUNING_VARIANTS.base, pack, buildPrompt).messages).toEqual(buildPrompt(pack));
  });

  // Every variant must START from the app's own output: a pack transform feeds the real builder,
  // and a prompt transform receives exactly what the real builder returned for the pack it saw.
  for (const v of Object.values(TUNING_VARIANTS)) {
    it(`${v.id} starts from buildPrompt's own output`, () => {
      let received: unknown = null;
      const probe = v.prompt
        ? { ...v, prompt: (m: { system: string; user: string }, p: EvidencePack, d: string) => { received = m; return v.prompt!(m, p, d); } }
        : v;
      const { pack: shown, messages } = applyVariant(probe, pack, buildPrompt, "deck-1");
      if (v.prompt) expect(received).toEqual(buildPrompt(shown));
      else expect(messages).toEqual(buildPrompt(shown));
    });
  }

  it("trim keeps the first staples in rank order and nothing else changes", () => {
    const { pack: shown } = applyVariant(TUNING_VARIANTS.trim, pack, buildPrompt);
    expect(shown.staples.map((s) => s.name)).toEqual(pack.staples.slice(0, 15).map((s) => s.name));
    expect({ ...shown, staples: [] }).toEqual({ ...pack, staples: [] });
  });
});
