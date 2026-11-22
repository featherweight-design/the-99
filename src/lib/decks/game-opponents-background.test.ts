import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => rows.current }) }) },
}));

import { opponentCommandersValid, type ParsedOpponent } from "./game-opponents";

const card = (oracleId: string, name: string, typeLine: string, oracleText: string | null) => ({
  oracleId, name, typeLine, oracleText, manaCost: null, layout: "normal", commanderLegal: true,
});
const wilson = card("wilson", "Wilson, Refined Grizzly", "Legendary Creature — Bear Warrior", "Choose a Background");
const cultist = card("cultist", "Cultist of the Absolute", "Legendary Enchantment — Background", "Commander creatures you own have deathtouch.");
const plain = card("plain", "Plain Legend", "Legendary Creature — Human", "Flying");

const other = (commander: string, partner: string | null): ParsedOpponent => ({
  kind: "other", commander, partner, label: null, won: false,
});

describe("opponentCommandersValid with a Background (#491)", () => {
  beforeEach(() => {
    rows.current = [wilson, cultist, plain];
  });

  it("accepts a commander that chooses a Background beside one", async () => {
    expect(await opponentCommandersValid([other("wilson", "cultist")])).toBe(true);
  });
  it("refuses a Background beside a commander that does not choose one", async () => {
    expect(await opponentCommandersValid([other("plain", "cultist")])).toBe(false);
  });
  it("never lets a Background lead", async () => {
    expect(await opponentCommandersValid([other("cultist", null)])).toBe(false);
  });
});
