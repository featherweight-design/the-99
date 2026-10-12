import { beforeEach, describe, expect, it, vi } from "vitest";

import { NO_TAPPED_LANDS } from "../../lib/mana/lands-tapped";
import type { ManaSupplyCardRow } from "../../lib/mana/supply";
import { readManaBalance as engine, type ManaBalance } from "../../lib/tuning/mana-balance";

const state = vi.hoisted(() => ({
  enabled: true,
  deck: null as unknown,
  balance: null as unknown,
  recorded: [] as unknown[],
  fingerprinted: null as unknown,
  staples: [] as { oracleId: string; imageUri: string | null }[],
  art: new Map<string, string>(),
  artCalls: [] as unknown[][],
  trades: [] as unknown[],
  applied: null as string | null,
  undone: null as string | null,
  writes: [] as unknown[][],
  revalidated: [] as unknown[][],
  helpRows: [] as unknown[],
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/tuning/flag", () => ({ manaBalanceEnabled: () => state.enabled }));
vi.mock("../../lib/decks/read", () => ({ getDeckDetail: async () => state.deck }));
vi.mock("../../lib/profile/fingerprint", () => ({ listFingerprint: (list: unknown) => { state.fingerprinted = list; return "list-fp"; } }));
vi.mock("../../lib/tuning/mana-balance-load", () => ({ loadManaBalance: async () => state.balance }));
vi.mock("../../lib/tuning/mana-help-load", () => ({ loadManaHelp: async (_d: unknown, _u: string, c: string) => ({ color: c, inIdentity: true, staples: state.staples, trades: state.trades }) }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => state.helpRows }) }) }) } }));
vi.mock("../../lib/tuning/mana-trade", () => ({
  applyTrade: async (deckId: string, userId: string, trade: { cutOracleId: string; addOracleId: string }, listKey: string) => {
    state.writes.push(["apply", deckId, userId, trade.cutOracleId, trade.addOracleId, listKey]);
    return state.applied;
  },
  undoTrade: async (...args: unknown[]) => { state.writes.push(["undo", ...args]); return state.undone; },
}));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: (...args: unknown[]) => { state.revalidated.push(args); } }));
vi.mock("../../lib/cards/chain-art", () => ({ chainArt: async (...args: unknown[]) => { state.artCalls.push(args); return state.art; } }));
vi.mock("../../lib/tuning/tool-counts", () => ({ recordToolCount: async (row: unknown) => { state.recorded.push(row); } }));

import { applyManaTrade, readManaBalance, readManaHelpFor, readManaHelpReview, undoManaTrade } from "./mana-actions";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";

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
  state.deck = {
    id: DECK,
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

  it("keys the record on the very deck it counted, copies summed per card", async () => {
    state.deck = { ...(state.deck as { cards: unknown[] }), cards: [...(state.deck as { cards: unknown[] }).cards, { oracleId: "o-elf", name: "Elf", quantity: 2 }] };
    await readManaBalance(DECK);
    const list = state.fingerprinted as { commanderOracleId: string; partnerOracleId: string | null; cards: { oracleId: string; quantity: number }[] };
    expect(list.commanderOracleId).toBe("cmd");
    expect(list.partnerOracleId).toBeNull();
    expect(list.cards.find((c) => c.oracleId === "o-elf")?.quantity).toBe(3);
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

describe("readManaHelpFor (the action)", () => {
  it("answers a color in the commander's identity, and records that help for History, keyed on the list and the color", async () => {
    const shown = await readManaHelpFor(DECK, "G");
    expect(shown).toEqual({ color: "G", inIdentity: true, staples: [], trades: [] });
    expect(state.recorded).toEqual([{ deckId: DECK, userId: "user_1", tool: "mana_help", listFingerprint: "list-fp:G", readVersion: null, summary: { color: "G", help: shown } }]);
  });

  it("draws each staple with the printing the player's chain gives it, and the catalog's otherwise", async () => {
    state.staples = [{ oracleId: "farmland", imageUri: "catalog-farmland" }, { oracleId: "unowned", imageUri: "catalog-unowned" }];
    state.art = new Map([["farmland", "fra-399"]]);
    const help = await readManaHelpFor(DECK, "G");
    expect(help?.staples.map((s) => s.imageUri)).toEqual(["fra-399", "catalog-unowned"]);
    // The deck's own chain: its pick first, then the player's owned printing.
    expect(state.artCalls.at(-1)).toEqual(["user_1", DECK, ["farmland", "unowned"]]);
    state.staples = [];
    state.art = new Map();
  });

  it("refuses anything but one of the five, a color outside the identity, the switch off, or a bad id", async () => {
    for (const c of ["X", "C", "g", "", "__proto__"]) expect(await readManaHelpFor(DECK, c)).toBeNull();
    expect(await readManaHelpFor(DECK, "R")).toBeNull();
    expect(await readManaHelpFor("nope", "G")).toBeNull();
    state.enabled = false;
    expect(await readManaHelpFor(DECK, "G")).toBeNull();
  });
});

describe("applyManaTrade and undoManaTrade (the actions)", () => {
  const STAPLE = "33333333-3333-4333-8333-333333333333";
  const APPLY = "44444444-4444-4444-8444-444444444444";
  const FOREST = "55555555-5555-4555-8555-555555555555";
  const reset = () => { state.trades = []; state.applied = null; state.undone = null; state.writes = []; state.revalidated = []; };

  it("applies the trade a fresh read offers, cutting the basic the SERVER found, and revalidates the deck", async () => {
    reset();
    state.trades = [{ kind: "trade", out: { id: FOREST, name: "Forest", kind: "basic" }, staple: { oracleId: STAPLE } }];
    state.applied = APPLY;
    expect(await applyManaTrade(DECK, "G", STAPLE, FOREST)).toEqual({ ok: true, applyId: APPLY });
    // The key of the list the offer was read from, for the write to check again under the deck lock.
    expect(state.writes).toEqual([["apply", DECK, "user_1", FOREST, STAPLE, "list-fp"]]);
    expect(state.revalidated).toEqual([[DECK, "user_1"]]);
  });

  it("refuses a staple the fresh read does not offer a trade for, writing nothing", async () => {
    reset();
    state.applied = APPLY;
    const offered = (oracleId: string) => [{ kind: "trade", out: { id: FOREST, name: "Forest", kind: "basic" }, staple: { oracleId } }];
    const refusal = { ok: false, message: deckTuningCopy.card.applyRefused };
    // Each case is refused by its own guard alone: the read offers a trade for exactly the staple named.
    state.trades = offered("other");
    expect(await applyManaTrade(DECK, "G", STAPLE, FOREST)).toEqual(refusal);
    state.trades = offered("not-a-uuid");
    expect(await applyManaTrade(DECK, "G", "not-a-uuid", FOREST)).toEqual(refusal);
    state.trades = offered(STAPLE);
    expect(await applyManaTrade(DECK, "R", STAPLE, FOREST)).toEqual(refusal);
    // The press named a different basic than the fresh offer cuts: the trade made would not be the one read.
    expect(await applyManaTrade(DECK, "G", STAPLE, APPLY)).toEqual(refusal);
    expect(state.writes).toEqual([]);
  });

  it("refuses when the write refuses, and revalidates nothing", async () => {
    reset();
    state.trades = [{ kind: "trade", out: { id: FOREST, name: "Forest", kind: "basic" }, staple: { oracleId: STAPLE } }];
    expect((await applyManaTrade(DECK, "G", STAPLE, FOREST)).ok).toBe(false);
    expect(state.revalidated).toEqual([]);
  });

  it("undoes an apply the reader owns, and refuses a bad id or a refused write", async () => {
    reset();
    state.undone = DECK;
    expect(await undoManaTrade(APPLY)).toEqual({ ok: true });
    expect(state.writes).toEqual([["undo", APPLY, "user_1"]]);
    expect(state.revalidated).toEqual([[DECK, "user_1"]]);
    expect(await undoManaTrade("nope")).toEqual({ ok: false, message: deckTuningCopy.card.undoRefused });
    state.undone = null;
    expect(await undoManaTrade(APPLY)).toEqual({ ok: false, message: deckTuningCopy.card.undoRefused });
    reset();
  });
});

describe("readManaHelpReview (History's re-review)", () => {
  const COUNT = "22222222-2222-4222-8222-222222222222";
  const trade = (stapleId: string, outId: string) => ({ kind: "trade", out: { id: outId, name: outId }, staple: { oracleId: stapleId, name: stapleId }, changes: [] });
  const past = { color: "G", inIdentity: true, sourcesNow: 9, rebalance: [], trades: [trade("s1", "forest"), trade("s2", "forest")], staples: [] };

  it("draws the help as it was shown, each trade re-checked against today's help for that color", async () => {
    state.helpRows = [{ summary: { color: "G", help: past } }];
    state.trades = [trade("s1", "forest")];
    const shown = await readManaHelpReview(DECK, COUNT);
    expect(shown?.trades.map((t) => t.staple.oracleId)).toEqual(["s1", "s2"]);
    expect(shown?.noLonger).toEqual(["s2"]);
  });

  it("is null for an id that names no help read of this reader on this deck, a bad id, or the switch off", async () => {
    state.helpRows = [];
    expect(await readManaHelpReview(DECK, COUNT)).toBeNull();
    state.helpRows = [{ summary: { color: "G", help: past } }];
    expect(await readManaHelpReview(DECK, "nope")).toBeNull();
    state.enabled = false;
    expect(await readManaHelpReview(DECK, COUNT)).toBeNull();
  });
});
