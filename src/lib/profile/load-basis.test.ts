// The switch-to-loader handoff of labels-everywhere PR 8: `loadDeckProfileFromHead` decides the role
// basis from the deployment and, on the labels basis, reads the labels and hands them to the builder.
// `label-basis.test.ts` builds profiles from a hand-made `ProfileInput.labels`, so it cannot see this
// block removed. This drives the real loader over a fake database and a fake label reader.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

const CARD = {
  oracleId: "ramp-spell", name: "Ramp Spell", typeLine: "Artifact", layout: "normal",
  oracleText: "{T}: Add {G}.", keywords: [], cmc: 2,
  colorIdentity: ["G"], manaCost: "{1}{G}", commanderLegal: true, gameChanger: false,
};
const COMMANDER = { ...CARD, oracleId: "cmd", name: "Cmd", typeLine: "Legendary Creature — Elf", oracleText: "" };

// Every query chain resolves to [] except the loader's own card read, which selects `oracleText`.
function chain(rows: unknown[]) {
  const p: unknown = new Proxy(() => p, {
    get: (_t, prop) => (prop === "then" ? (res: (v: unknown[]) => unknown) => res(rows) : () => p),
  });
  return p;
}
vi.mock("../../db", () => ({
  db: {
    select: (fields: Record<string, unknown>) => chain("oracleText" in fields ? [CARD, COMMANDER] : []),
    execute: async () => ({ rows: [] }),
  },
}));

const readLabelRoleSets = vi.fn(async (ids: string[]) => {
  void ids;
  return new Map<string, string[]>([["ramp-spell", []], ["cmd", ["draw"]]]);
});
vi.mock("../labels/read", () => ({ readLabelRoleSets: (ids: string[]) => readLabelRoleSets(ids) }));

const { loadDeckProfileFromHead } = await import("./load");

const head = {
  deckId: "d", userId: "u", commanderOracleId: "cmd", partnerOracleId: null, declaredBracket: null,
  cards: [{ oracleId: "ramp-spell", quantity: 1 }],
} as never;

afterEach(() => {
  vi.unstubAllEnvs();
  readLabelRoleSets.mockClear();
});

describe("loadDeckProfileFromHead and the role basis", () => {
  it("switch OFF: classifier roles, no label read, no basis marker", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
    const p = await loadDeckProfileFromHead(head, ENV_VIEW);
    expect(readLabelRoleSets).not.toHaveBeenCalled();
    expect(p.skeleton.roleBasis).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain("roleBasis");
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toEqual(["ramp-spell"]);
  });

  it("switch ON: reads labels for every card including the commander and counts by them", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    const p = await loadDeckProfileFromHead(head, ENV_VIEW);
    expect(readLabelRoleSets).toHaveBeenCalledTimes(1);
    expect([...readLabelRoleSets.mock.calls[0][0]].sort()).toEqual(["cmd", "ramp-spell"]);
    expect(p.skeleton.roleBasis).toBe("labels");
    // The label for this card names no role, so the text-ramp classifier no longer counts it.
    expect(p.roles.cards.ramp).toEqual([]);
    expect(p.roles.cards.draw.map((c) => c.oracleId)).toEqual(["cmd"]);
  });
});
