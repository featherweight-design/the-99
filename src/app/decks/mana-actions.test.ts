import { beforeEach, describe, expect, it, vi } from "vitest";

import { NO_TAPPED_LANDS } from "../../lib/mana/lands-tapped";
import type { ManaSupplyCardRow } from "../../lib/mana/supply";
import { readManaBalance as engine, type ManaBalance } from "../../lib/tuning/mana-balance";

const state = vi.hoisted(() => ({
  enabled: true,
  deck: null as unknown,
  head: null as unknown,
  balance: null as unknown,
  recorded: [] as unknown[],
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/tuning/flag", () => ({ manaBalanceEnabled: () => state.enabled }));
vi.mock("../../lib/decks/read", () => ({ getDeckDetail: async () => state.deck }));
vi.mock("../../lib/profile/load", () => ({ loadProfileHead: async () => state.head }));
vi.mock("../../lib/profile/fingerprint", () => ({ listFingerprint: () => "list-fp" }));
vi.mock("../../lib/tuning/mana-balance-load", () => ({ loadManaBalance: async () => state.balance }));
vi.mock("../../lib/tuning/tool-counts", () => ({ recordToolCount: async (row: unknown) => { state.recorded.push(row); } }));

import { readManaBalance } from "./mana-actions";

const DECK = "11111111-1111-4111-8111-111111111111";
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const balance: ManaBalance = engine({
  rows: [spell("Archdruid", "{1}{G}{G}", 2), spell("Elf", "{G}"), { id: "forest", typeLine: "Land", manaCost: null, quantity: 30, produces: ["G"] }],
  nameOf: (id) => id,
  tapped: NO_TAPPED_LANDS,
  identity: ["G"],
});

beforeEach(() => {
  state.enabled = true;
  state.recorded = [];
  state.balance = balance;
  state.head = { deckId: DECK, userId: "user_1", commanderOracleId: "c", partnerOracleId: null, declaredBracket: null, cards: [] };
  state.deck = {
    commander: { oracleId: "cmd", name: "Avatar Aang // Aang", colorIdentity: ["G"], manaCost: null },
    partner: null,
    cards: [
      { oracleId: "o-arch", name: "Archdruid", quantity: 2 },
      { oracleId: "o-elf", name: "Elf", quantity: 1 },
      { oracleId: "o-forest", name: "Forest", quantity: 30 },
      { oracleId: "o-other", name: "Unpipped", quantity: 1 },
    ],
  };
});

describe("readManaBalance (the action)", () => {
  it("refuses with the switch off or an id that is not a uuid, and records nothing", async () => {
    state.enabled = false;
    expect(await readManaBalance(DECK)).toBeNull();
    state.enabled = true;
    expect(await readManaBalance("not-a-deck")).toBeNull();
    expect(state.recorded).toEqual([]);
  });

  it("is null when the deck is not the reader's or a catalog read failed, and records nothing", async () => {
    state.deck = null;
    expect(await readManaBalance(DECK)).toBeNull();
    state.deck = { commander: { name: "x" }, partner: null, cards: [] };
    state.balance = null;
    expect(await readManaBalance(DECK)).toBeNull();
    expect(state.recorded).toEqual([]);
  });

  it("ships the count without the per-copy source ids, the commander's front face, and ids only for named cards", async () => {
    const data = (await readManaBalance(DECK))!;
    expect("sources" in data.balance.supply).toBe(false);
    expect(data.commander).toBe("Avatar Aang");
    expect(data.cards).toBe(35);
    expect(data.ids).toEqual({ Archdruid: "o-arch", Elf: "o-elf" });
  });

  it("records the free count once per list, keyed on the list fingerprint, with the Colors card's totals", async () => {
    await readManaBalance(DECK);
    expect(state.recorded).toEqual([
      { deckId: DECK, userId: "user_1", tool: "mana_balance", listFingerprint: "list-fp", readVersion: null, summary: { pips: 5, sources: 30 } },
    ]);
  });
});

describe("readManaBalance with a partner", () => {
  it("names every commander the without figure leaves out, by front face", async () => {
    state.deck = { ...(state.deck as object), partner: { oracleId: "p", name: "Thrasios, Triton Hero", colorIdentity: ["G"], manaCost: null } };
    const data = (await readManaBalance(DECK))!;
    expect(data.commander).toBe("Avatar Aang and Thrasios");
    expect(data.commanders).toBe(2);
    expect(data.cards).toBe(36);
  });
});
