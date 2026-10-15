import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { ENV_VIEW } from "@/test/env-view";
import type { BrowseCard, BrowsePrinting } from "../collection/browse";

const DECK = "11111111-1111-4111-8111-111111111111";
const OWNED = "22222222-2222-4222-8222-222222222222";
const UNOWNED = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  texts: [] as string[],
  params: [] as unknown[][],
  picks: [] as unknown[],
  catalog: [] as unknown[],
  cards: [] as unknown[],
  recorded: [] as unknown[],
  fail: false,
}));

const dialect = new PgDialect();

vi.mock("../../db", () => ({
  db: {
    execute: async (q: unknown) => {
      const { sql: text, params } = dialect.sqlToQuery(q as SQL);
      state.texts.push(text);
      state.params.push(params);
      if (state.fail) throw new Error("down");
      if (text.includes("from deck_printings")) return { rows: state.picks };
      if (text.includes("from cards c")) return { rows: state.catalog };
      if (text.includes("as w(oracle_id")) return { rows: state.recorded };
      return { rows: [] };
    },
  },
}));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: () => {} }));
vi.mock("../collection/browse", async (importActual) => {
  const actual = await importActual<typeof import("../collection/browse")>();
  return { ...actual, aggregateCollection: () => state.cards };
});
vi.mock("../collection/browse-read", () => ({
  selectCollectionRows: async () => {
    if (state.fail) throw new Error("down");
    return [];
  },
}));

import {
  heldPrintingFor, readDeckPrintings, readRecordedPrintingArt, recordedColumns, recordedKey,
  readHeldPricePicks, readModalPicks, resolveCommanderPrintingsByDeck, resolveDeckOwnedPrintings, resolveDeckPrintings,
  type DeckPrinting,
} from "./printings";

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
  state.params = [];
  state.picks = [];
  state.catalog = [];
  state.cards = [];
  state.recorded = [];
  state.fail = false;
  process.env.DECK_PRINTINGS_ENABLED = "true";
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

  it("reads the foil film's finish off the printing the deck draws, never another of the card's", async () => {
    state.cards = [ownedCard([printing("C21", "263", { finishes: { foil: 2 }, hasOwnArt: true }), printing("KHM", "31", { finishes: { nonfoil: 1, foil: 1 }, hasOwnArt: true })])];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "c21", collector_number: "263" }];
    expect((await readDeckPrintings("u", DECK, [OWNED], { usePicks: true })).printings.get(OWNED)?.foil).toBe("foil");
    // The mixed printing draws nothing (audit ruling G8).
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    expect((await readDeckPrintings("u", DECK, [OWNED], { usePicks: true })).printings.get(OWNED)?.foil).toBeUndefined();
  });

  it("draws no film when the drawn printing has no art of its own, since the tile draws a fallback picture", async () => {
    state.cards = [ownedCard([printing("C21", "263", { finishes: { foil: 1 }, hasOwnArt: false })])];
    state.picks = [];
    expect((await readDeckPrintings("u", DECK, [OWNED], { usePicks: true })).printings.get(OWNED)?.foil).toBeUndefined();
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

  it("marks a substitute printing, which no surface draws and no version records", async () => {
    state.catalog = [{
      oracle_id: UNOWNED, name: "Brain Freeze", set_code: "soa", collector_number: "78",
      image_uri: "img-sub", art_crop_uri: null, flavor_name: null, exact: false,
    }];
    const { printings } = await readDeckPrintings("u", DECK, [UNOWNED], { usePicks: true });
    expect(printings.get(UNOWNED)?.source).toBe("catalogSubstitute");
    expect(recordedColumns(printings, UNOWNED)).toEqual({ setCode: null, collectorNumber: null });
  });

  it("falls back to another printing of the card when its oracle-level printing is missing", async () => {
    await readDeckPrintings("u", DECK, [UNOWNED], { usePicks: true });
    const read = state.texts.find((t) => t.includes("from cards c"));
    expect(read).toContain("left join lateral");
    expect(read).toContain("pr.oracle_id = c.oracle_id");
    expect(read).toContain("(pr.scryfall_id = c.scryfall_id and pr.image_uri is not null) as exact");
    // The oracle-level printing first, then the first printing with art, and exactly one.
    expect(read).toMatch(/order by \(pr\.scryfall_id = c\.scryfall_id\) desc, \(pr\.image_uri is null\), pr\.scryfall_id\s+limit 1/);
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

const DECK_B = "44444444-4444-4444-8444-444444444444";

describe("resolveDeckOwnedPrintings", () => {
  it("answers owned cards only, so a caller's oracle-level fallback is untouched", async () => {
    state.cards = [ownedCard([printing("KHM", "31")])];
    state.catalog = [{
      oracle_id: UNOWNED, name: "Cultivate", set_code: "m21", collector_number: "177",
      image_uri: "img-u", art_crop_uri: null, flavor_name: null,
    }];
    const owned = await resolveDeckOwnedPrintings("u", DECK, [OWNED, UNOWNED], ENV_VIEW);
    expect([...owned.keys()]).toEqual([OWNED]);
    // And it never asks the catalog, whose answer it would only throw away.
    expect(state.texts.some((t) => t.includes("from cards c"))).toBe(false);
  });

  it("follows the switch for the deck's step", async () => {
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")])];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    expect((await resolveDeckOwnedPrintings("u", DECK, [OWNED], ENV_VIEW)).get(OWNED)?.setCode).toBe("KHM");
    process.env.DECK_PRINTINGS_ENABLED = "";
    expect((await resolveDeckOwnedPrintings("u", DECK, [OWNED], ENV_VIEW)).get(OWNED)?.setCode).toBe("C21");
  });
});

describe("resolveCommanderPrintingsByDeck", () => {
  it("keys by deck, so two decks led by one card draw their own picks", async () => {
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")])];
    state.picks = [
      { deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" },
    ];
    const byDeck = await resolveCommanderPrintingsByDeck("u", [
      { deckId: DECK, commanderOracleId: OWNED },
      { deckId: DECK_B, commanderOracleId: OWNED },
    ], ENV_VIEW);
    expect(byDeck.get(DECK)).toMatchObject({ setCode: "KHM", source: "deck" });
    expect(byDeck.get(DECK_B)).toMatchObject({ setCode: "C21", source: "collection" });
  });

  it("reads no picks with the switch off, and fails soft to an empty map", async () => {
    process.env.DECK_PRINTINGS_ENABLED = "";
    state.cards = [ownedCard([printing("C21", "263"), printing("KHM", "31")])];
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    const off = await resolveCommanderPrintingsByDeck("u", [{ deckId: DECK, commanderOracleId: OWNED }], ENV_VIEW);
    expect(off.get(DECK)?.setCode).toBe("C21");
    expect(state.texts.some((t) => t.includes("from deck_printings"))).toBe(false);
    state.fail = true;
    expect((await resolveCommanderPrintingsByDeck("u", [{ deckId: DECK, commanderOracleId: OWNED }], ENV_VIEW)).size).toBe(0);
  });
});

describe("recordedColumns", () => {
  const shown = new Map<string, DeckPrinting>([
    [OWNED, { quantity: 1, printedName: null, imageUri: null, artCropUri: null, setCode: "KHM", collectorNumber: "31", source: "deck" }],
    [UNOWNED, { quantity: 0, printedName: null, imageUri: "x", artCropUri: null, setCode: "", collectorNumber: "", source: "catalog" }],
  ]);
  it("records the lowercase set code a version stores", () => {
    expect(recordedColumns(shown, OWNED)).toEqual({ setCode: "khm", collectorNumber: "31" });
  });
  it("records nothing for an unresolved card, a card with no printing, or no card", () => {
    expect(recordedColumns(shown, UNOWNED)).toEqual({ setCode: null, collectorNumber: null });
    expect(recordedColumns(shown, "missing")).toEqual({ setCode: null, collectorNumber: null });
    expect(recordedColumns(shown, null)).toEqual({ setCode: null, collectorNumber: null });
  });
});

describe("readRecordedPrintingArt", () => {
  it("looks up each recorded printing once, by its three-part key", async () => {
    state.recorded = [{
      oracle_id: OWNED, set_code: "khm", collector_number: "31", name: "Sol Ring",
      image_uri: "img", art_crop_uri: "crop", flavor_name: "Renamed",
    }];
    const art = await readRecordedPrintingArt([
      { oracleId: OWNED, setCode: "KHM", collectorNumber: "31" },
      { oracleId: OWNED, setCode: "khm", collectorNumber: "31" },
    ]);
    expect(art.get(recordedKey({ oracleId: OWNED, setCode: "KHM", collectorNumber: "31" })))
      .toEqual({ imageUri: "img", artCropUri: "crop", printedName: "Renamed" });
    const at = state.texts.findIndex((t) => t.includes("as w(oracle_id"));
    const read = state.texts[at];
    // Two spellings of one printing are one lookup: each unnest array carries a single entry.
    expect(state.params[at]).toEqual([[OWNED], ["khm"], ["31"]]);
    expect(read).toContain("unnest(");
    // The Collection's three tiers, in order, and the name from the printing the art came from.
    expect(read).toContain("coalesce(e.image_uri, r.image_uri, c.image_uri)");
    expect(read).toContain("r.is_representative");
    expect(read).toContain("when e.image_uri is not null then coalesce(e.art_crop_uri, c.art_crop_uri)");
    expect(read).toContain("where e.oracle_id is not null or r.oracle_id is not null");
    expect(read).toMatch(/when e\.image_uri is not null then e\.flavor_name\s+when r\.image_uri is not null then r\.flavor_name/);
  });
});

describe("readHeldPricePicks", () => {
  it("reads nothing with the switch off, so every figure is today's", async () => {
    process.env.DECK_PRINTINGS_ENABLED = "";
    expect(await readHeldPricePicks("u", [DECK], ENV_VIEW)).toEqual([]);
    expect(state.texts).toEqual([]);
  });

  it("passes only picks the player still holds, of cards still in the deck", async () => {
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    expect(await readHeldPricePicks("u", [DECK], ENV_VIEW)).toEqual([
      { deckId: DECK, oracleId: OWNED, setCode: "khm", collectorNumber: "31" },
    ]);
    const read = state.texts.find((t) => t.includes("from deck_printings"))!;
    expect(read).toContain("dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id");
    expect(read).toContain("d.commander_oracle_id = dp.oracle_id");
    expect(read).toContain("lower(ci.set_code) = dp.set_code");
    expect(read).toContain("ci.quantity > 0");
  });

  it("fails soft to no picks", async () => {
    state.fail = true;
    expect(await readHeldPricePicks("u", [DECK], ENV_VIEW)).toEqual([]);
  });
});

describe("readModalPicks", () => {
  it("is null with the switch off, which keeps the modal's picker as it is", async () => {
    process.env.DECK_PRINTINGS_ENABLED = "";
    expect(await readModalPicks("u", DECK, ENV_VIEW)).toBeNull();
    expect(state.texts).toEqual([]);
  });

  it("keys the held picks by card, in the modal's uppercase display form", async () => {
    state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
    expect(await readModalPicks("u", DECK, ENV_VIEW)).toEqual({ [OWNED]: { setCode: "KHM", collectorNumber: "31" } });
  });

  // Admin PR 6b: the reader's resolved switches decide, not the environment alone. The environment has
  // the switch off and the reader's override turns it on, so a read deciding from the environment would
  // answer null and read nothing.
  it("follows the reader's resolved env over the environment", async () => {
    vi.stubEnv("DECK_PRINTINGS_ENABLED", "false");
    try {
      state.picks = [{ deck_id: DECK, oracle_id: OWNED, set_code: "khm", collector_number: "31" }];
      const env = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
      expect(await readModalPicks("u", DECK, env)).toEqual({ [OWNED]: { setCode: "KHM", collectorNumber: "31" } });
      expect(await readModalPicks("u", DECK, ENV_VIEW)).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
