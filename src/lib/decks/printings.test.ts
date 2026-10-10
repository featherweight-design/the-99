import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { BrowseCard, BrowsePrinting } from "../collection/browse";

const DECK = "11111111-1111-4111-8111-111111111111";
const OWNED = "22222222-2222-4222-8222-222222222222";
const UNOWNED = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  texts: [] as string[],
  picks: [] as unknown[],
  catalog: [] as unknown[],
  cards: [] as unknown[],
  fail: false,
}));

const dialect = new PgDialect();

vi.mock("../../db", () => ({
  db: {
    execute: async (q: unknown) => {
      const text = dialect.sqlToQuery(q as SQL).sql;
      state.texts.push(text);
      if (state.fail) throw new Error("down");
      if (text.includes("from deck_printings")) return { rows: state.picks };
      if (text.includes("from cards c")) return { rows: state.catalog };
      return { rows: [] };
    },
  },
}));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: () => {} }));
vi.mock("../collection/browse", async (importActual) => {
  const actual = await importActual<typeof import("../collection/browse")>();
  return {
    ...actual,
    selectCollectionRows: async () => {
      if (state.fail) throw new Error("down");
      return [];
    },
    aggregateCollection: () => state.cards,
  };
});

import { heldPrintingFor, readDeckPrintings, resolveDeckPrintings } from "./printings";

function printing(setCode: string, collectorNumber: string, extra: Partial<BrowsePrinting> = {}): BrowsePrinting {
  return {
    setCode, collectorNumber, setName: null, releasedAt: null, quantity: 1, finishes: { nonfoil: 1 },
    imageUri: `img-${setCode}-${collectorNumber}`, artCropUri: `crop-${setCode}-${collectorNumber}`,
    flavorName: null, ...extra,
  } as BrowsePrinting;
}

function ownedCard(printings: BrowsePrinting[], preferred: { setCode: string; collectorNumber: string } | null = null) {
  return {
    oracleId: OWNED, name: "Sol Ring", quantity: 3, printedName: null, printings,
    preferredPrinting: preferred,
  } as unknown as BrowseCard;
}

beforeEach(() => {
  state.texts = [];
  state.picks = [];
  state.catalog = [];
  state.cards = [];
  state.fail = false;
});

describe("heldPrintingFor", () => {
  it("matches a lowercase stored pick against the uppercased display printing", () => {
    const p = printing("KHM", "31");
    expect(heldPrintingFor([printing("C21", "263"), p], { setCode: "khm", collectorNumber: "31" })).toBe(p);
  });

  it("answers nothing for no pick, or a pick the player no longer holds", () => {
    expect(heldPrintingFor([printing("KHM", "31")], undefined)).toBeUndefined();
    expect(heldPrintingFor([printing("KHM", "31")], { setCode: "khm", collectorNumber: "32" })).toBeUndefined();
  });
});

describe("readDeckPrintings", () => {
  it("takes the deck's pick first when it is held, and reports it held", async () => {
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")], { setCode: "C21", collectorNumber: "263" })];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    const { printings, heldPicks } = await readDeckPrintings("u", DECK, [OWNED], { usePicks: true });
    expect(printings.get(OWNED)).toMatchObject({ setCode: "KHM", collectorNumber: "31", source: "deck", imageUri: "img-KHM-31" });
    expect(heldPicks.get(OWNED)).toEqual({ setCode: "khm", collectorNumber: "31" });
  });

  it("ignores a pick the player no longer holds and falls to the Collection's pick", async () => {
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")], { setCode: "KHM", collectorNumber: "31" })];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "lea", collector_number: "270" }];
    const { printings, heldPicks } = await readDeckPrintings("u", DECK, [OWNED], { usePicks: true });
    expect(printings.get(OWNED)).toMatchObject({ setCode: "KHM", collectorNumber: "31", source: "collection" });
    expect(heldPicks.size).toBe(0);
  });

  it("skips the deck's step entirely with picks off", async () => {
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")])];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    const { printings, heldPicks } = await readDeckPrintings("u", DECK, [OWNED], { usePicks: false });
    expect(printings.get(OWNED)).toMatchObject({ setCode: "C21", source: "collection" });
    expect(heldPicks.size).toBe(0);
    expect(state.texts.some((t) => t.includes("from deck_printings"))).toBe(false);
  });

  it("resolves a card the player does not own to its oracle-level printing", async () => {
    state.catalog = [{
      oracle_id: UNOWNED, name: "Cultivate", set_code: "m21", collector_number: "177",
      image_uri: "img-u", art_crop_uri: "crop-u", flavor_name: null,
    }];
    const { printings } = await readDeckPrintings("u", DECK, [UNOWNED], { usePicks: true });
    expect(printings.get(UNOWNED)).toEqual({
      quantity: 0, printedName: null, imageUri: "img-u", artCropUri: "crop-u",
      setCode: "M21", collectorNumber: "177", source: "catalog",
    });
  });

  it("keeps a card whose catalog lists no printing, with its oracle-level art and no printing named", async () => {
    state.catalog = [{
      oracle_id: UNOWNED, name: "Brain Freeze", set_code: null, collector_number: null,
      image_uri: "img-oracle", art_crop_uri: null, flavor_name: null,
    }];
    const { printings } = await readDeckPrintings("u", DECK, [UNOWNED], { usePicks: true });
    expect(printings.get(UNOWNED)).toMatchObject({ setCode: "", collectorNumber: "", imageUri: "img-oracle", source: "catalog" });
  });

  it("falls back to another printing of the card when its oracle-level printing is missing", async () => {
    await readDeckPrintings("u", DECK, [UNOWNED], { usePicks: true });
    const read = state.texts.find((t) => t.includes("from cards c"));
    expect(read).toContain("left join lateral");
    expect(read).toContain("pr.oracle_id = c.oracle_id");
  });

  it("scopes the pick read to the player's decks and to current membership", async () => {
    state.cards = [ownedCard([printing("KHM", "31")])];
    await readDeckPrintings("u", DECK, [OWNED], { usePicks: true });
    const read = state.texts.find((t) => t.includes("from deck_printings"));
    expect(read).toContain("d.user_id =");
    expect(read).toContain("dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id");
    expect(read).toContain("d.commander_oracle_id = dp.oracle_id");
    expect(read).toContain("d.partner_oracle_id = dp.oracle_id");
  });

  it("throws on a failed read, and the soft form answers empty", async () => {
    state.fail = true;
    await expect(readDeckPrintings("u", DECK, [OWNED], { usePicks: true })).rejects.toThrow("down");
    const soft = await resolveDeckPrintings("u", DECK, [OWNED], { usePicks: true });
    expect(soft.printings.size).toBe(0);
    expect(soft.heldPicks.size).toBe(0);
  });
});
