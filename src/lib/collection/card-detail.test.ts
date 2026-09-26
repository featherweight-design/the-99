import { describe, expect, it, vi } from "vitest";

// Only the two reads are stood in for; the aggregation they feed is the real one, so a
// change to how a collection row becomes a BrowseCard still shows up here.
const selectCollectionRows = vi.fn();
vi.mock("./browse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./browse")>()),
  selectCollectionRows: (...args: unknown[]) => selectCollectionRows(...args),
}));
const loadAvailability = vi.fn();
vi.mock("../decks/availability-query", () => ({
  loadAvailability: (...args: unknown[]) => loadAvailability(...args),
}));
// Stood in for the same reason the two reads above are: `loadCardDetail` now asks
// the feed for this card's printings, and the real one opens a connection the test
// setup forbids. Its `.catch` would swallow that into a null price and the test
// would still pass, having proved nothing about the snapshot it attaches.
const loadPrintingPrices = vi.fn();
vi.mock("../cards/prices", () => ({
  loadPrintingPrices: (...args: unknown[]) => loadPrintingPrices(...args),
}));

import {
  catalogCard,
  loadCardDetail,
  type CatalogCardRow,
  type CatalogPrintingRow,
} from "./card-detail";

const card = (over: Partial<CatalogCardRow> = {}): CatalogCardRow => ({
  oracleId: "o-1",
  scryfallId: "s-default",
  name: "Arcane Signet",
  typeLine: "Artifact",
  manaCost: "{2}", cmc: 2,
  oracleText: "{T}: Add one mana of any color in your commander's identity.",
  keywords: [],
  rarity: "common",
  colorIdentity: [],
  imageUri: "https://img/oracle.jpg",
  layout: "normal",
  backImageUri: null,
  ...over,
});

// The default id is deliberately NOT the card's: most of these cases exercise the
// fallback, which is what a card whose default printing never ingested falls to.
const printing = (over: Partial<CatalogPrintingRow> = {}): CatalogPrintingRow => ({
  scryfallId: "s-other",
  setCode: "c21",
  setName: "Commander 2021",
  backImageUri: null,
  collectorNumber: "263",
  releasedAt: "2021-04-23",
  imageUri: "https://img/c21-263.jpg",
  flavorName: null,
  ...over,
});

describe("catalogCard", () => {
  it("carries the oracle fields through", () => {
    const c = catalogCard(card(), [printing()]);
    expect(c).toMatchObject({
      oracleId: "o-1",
      name: "Arcane Signet",
      typeLine: "Artifact",
      manaCost: "{2}",
      keywords: [],
      colorIdentity: [],
      rarity: "common",
    });
  });

  it("reports zero owned copies and no art preference", () => {
    const c = catalogCard(card(), [printing(), printing({ collectorNumber: "264" })]);
    expect(c.quantity).toBe(0);
    expect(c.preferredPrinting).toBeNull();
    expect(c.printings.every((p) => p.quantity === 0)).toBe(true);
    expect(c.printings.every((p) => Object.keys(p.finishes).length === 0)).toBe(true);
  });

  it("uppercases set codes for display, as owned printings are", () => {
    const c = catalogCard(card(), [printing({ setCode: "znr" })]);
    expect(c.printings[0].setCode).toBe("ZNR");
    expect(c.setCodes).toEqual(["ZNR"]);
  });

  it("sorts printings and de-duplicates set codes", () => {
    const c = catalogCard(card(), [
      printing({ setCode: "znr", collectorNumber: "12" }),
      printing({ setCode: "c21", collectorNumber: "263" }),
      printing({ setCode: "c21", collectorNumber: "9" }),
    ]);
    expect(c.printings.map((p) => `${p.setCode}-${p.collectorNumber}`))
      .toEqual(["C21-9", "C21-263", "ZNR-12"]);
    expect(c.setCodes).toEqual(["C21", "ZNR"]);
  });

  it("falls a printing with no art back to the oracle-level image", () => {
    const c = catalogCard(card(), [printing({ imageUri: null })]);
    expect(c.printings[0].imageUri).toBe("https://img/oracle.jpg");
  });

  // A card nobody owns is still flipped in the modal, and the printing the reader is
  // looking at owns its own back.
  it("carries each printing's own back face", () => {
    const c = catalogCard(card(), [
      printing({ setCode: "isd", imageUri: "https://img/isd.jpg", backImageUri: "https://img/isd-back.jpg" }),
      printing({ scryfallId: "s-2", setCode: "sld", imageUri: "https://img/sld.jpg", backImageUri: "https://img/sld-back.jpg" }),
    ]);
    expect(c.printings.map((p) => p.backImageUri))
      .toEqual(["https://img/isd-back.jpg", "https://img/sld-back.jpg"]);
  });

  // The state every printing is in until the catalog is re-seeded against the new column.
  it("falls a printing with no back of its own to the oracle-level one", () => {
    const c = catalogCard(
      { ...card(), backImageUri: "https://img/oracle-back.jpg" },
      [printing({ imageUri: "https://img/isd.jpg" })],
    );
    expect(c.printings[0].backImageUri).toBe("https://img/oracle-back.jpg");
  });

  // The tile that opened this modal draws the oracle-level image, so the modal has to
  // land on the printing that image came from — not on whichever set code sorts first.
  it("takes art and primary set from the printing the oracle image came from", () => {
    const c = catalogCard(card(), [
      printing({ setCode: "aaa", imageUri: "https://img/aaa.jpg" }),
      printing({ scryfallId: "s-default", setCode: "znr", imageUri: "https://img/znr.jpg" }),
    ]);
    expect(c.imageUri).toBe("https://img/znr.jpg");
    expect(c.primarySetCode).toBe("ZNR");
  });

  it("takes art and primary set from the first printing that has art", () => {
    const c = catalogCard(card({ imageUri: null }), [
      printing({ setCode: "aaa", imageUri: null }),
      printing({ setCode: "bbb", imageUri: "https://img/bbb.jpg" }),
    ]);
    expect(c.imageUri).toBe("https://img/bbb.jpg");
    expect(c.primarySetCode).toBe("BBB");
  });

  // The modal's price tag belongs to the printing it opens on, so an unowned card opens on
  // one the shop carries NOW (Zul Ashur opened on FDC #135, never stocked, over five live
  // printings). Live is a non-foil price at the newest as_of.
  describe("the printing an unowned card opens on", () => {
    const NEWEST = new Date("2026-09-22T01:20:25Z");
    const fact = (cents: number | null, over: { foilCents?: number | null; asOf?: Date } = {}) =>
      ({ cents, foilCents: over.foilCents ?? null, etchedCents: null, asOf: over.asOf ?? NEWEST });
    const prices = (by: Record<string, ReturnType<typeof fact>>) => ({
      byScryfallId: by, byPrintingKey: {}, ambiguousKeys: [], catalogIds: Object.keys(by), catalogKeys: [], newestAsOf: NEWEST,
    });
    const rows = () => [
      printing({ scryfallId: "s-fdc", setCode: "fdc", collectorNumber: "135", imageUri: "https://img/fdc.jpg" }),
      printing({ scryfallId: "s-cheap", setCode: "fdn", collectorNumber: "77", imageUri: "https://img/fdn77.jpg" }),
      printing({ scryfallId: "s-dear", setCode: "fdn", collectorNumber: "326", imageUri: "https://img/fdn326.jpg" }),
    ];

    it("opens on the oracle's own printing when it is live, first in the list", () => {
      const c = catalogCard(card({ scryfallId: "s-dear" }), rows(), prices({ "s-cheap": fact(32), "s-dear": fact(203) }));
      expect(c.printings[0].collectorNumber).toBe("326");
      expect(c.imageUri).toBe("https://img/fdn326.jpg");
    });

    it("otherwise opens on the cheapest live printing with art, not the one that sorts first", () => {
      const c = catalogCard(card({ scryfallId: "s-fdc" }), rows(), prices({ "s-cheap": fact(32), "s-dear": fact(203) }));
      expect(c.printings[0].collectorNumber).toBe("77");
      expect(c.primarySetCode).toBe("FDN");
      // The rest keep their order.
      expect(c.printings.map((p) => p.collectorNumber)).toEqual(["77", "135", "326"]);
    });

    // Each case below leaves ONE disqualified printing cheaper than the live winner, so counting
    // it would move that printing to the front.
    it("does not count a stale row as live", () => {
      const c = catalogCard(card({ scryfallId: "s-fdc" }), rows(), prices({
        "s-cheap": fact(5, { asOf: new Date("2026-09-01T00:00:00Z") }),
        "s-dear": fact(203),
      }));
      expect(c.printings[0].collectorNumber).toBe("326");
    });

    it("does not count a foil-only row as live", () => {
      const c = catalogCard(card({ scryfallId: "s-fdc" }), rows(), prices({
        "s-cheap": fact(null, { foilCents: 4 }),
        "s-dear": fact(203),
      }));
      expect(c.printings[0].collectorNumber).toBe("326");
    });

    it("skips a live printing drawn only in the oracle's fallback art", () => {
      const r = rows();
      r[1] = { ...r[1], imageUri: null };
      // The card itself has art, so the printing still resolves a picture: just not its own.
      const c = catalogCard(card({ scryfallId: "s-fdc" }), r, prices({ "s-cheap": fact(10), "s-dear": fact(203) }));
      expect(c.printings.find((p) => p.collectorNumber === "77")?.imageUri).not.toBeNull();
      expect(c.printings[0].collectorNumber).toBe("326");
    });

    it("passes over a live oracle printing drawn only in fallback art", () => {
      const r = rows();
      r[2] = { ...r[2], imageUri: null };
      const c = catalogCard(card({ scryfallId: "s-dear" }), r, prices({ "s-cheap": fact(32), "s-dear": fact(20) }));
      expect(c.printings[0].collectorNumber).toBe("77");
    });

    it("keeps today's order when no printing is live", () => {
      const c = catalogCard(card({ scryfallId: "s-fdc" }), rows(), prices({}));
      expect(c.printings.map((p) => p.collectorNumber)).toEqual(["135", "77", "326"]);
    });
  });

  // A `cards` row whose printings never ingested still has to open — the modal
  // falls through to the identity gradient rather than rendering nothing.
  it("survives a card with no printings", () => {
    const c = catalogCard(card({ imageUri: null }), []);
    expect(c.printings).toEqual([]);
    expect(c.setCodes).toEqual([]);
    expect(c.primarySetCode).toBe("");
    expect(c.imageUri).toBeNull();
  });

  it("coerces a rarity outside the known vocabulary to common", () => {
    expect(catalogCard(card({ rarity: "bonus" }), []).rarity).toBe("common");
    expect(catalogCard(card({ rarity: "mythic" }), []).rarity).toBe("mythic");
  });
});

// The modal renders availability, and every surface but /collection opens it holding
// nothing but an oracle id — so the query has to carry it or the same card shows its
// claims in one place and hides them in another.
describe("loadCardDetail availability", () => {
  const row = {
    oracleId: "o-1",
    quantity: 2,
    setCode: "c21",
    collectorNumber: "263",
    finish: "nonfoil",
    setName: "Commander 2021",
    releasedAt: "2021-04-23",
    preferredSetCode: null,
    preferredCollectorNumber: null,
    name: "Arcane Signet",
    typeLine: "Artifact",
    manaCost: "{2}",
    oracleText: null,
    keywords: [],
    rarity: "common",
    colorIdentity: [],
    cardImageUri: "https://img/oracle.jpg",
    exactImageUri: null,
    representativeImageUri: null,
  };
  const EMPTY_PRICES = { byScryfallId: {}, byPrintingKey: {}, ambiguousKeys: [], catalogIds: [], catalogKeys: [], newestAsOf: null };
  const PRICES = {
    byScryfallId: { "s-1": { cents: 241, foilCents: null, etchedCents: null, asOf: new Date("2026-09-08T09:00:00Z") } },
    byPrintingKey: {},
    ambiguousKeys: [],
    catalogIds: ["s-1"],
    catalogKeys: ["C21|263"],
    newestAsOf: new Date("2026-09-08T09:00:00Z"),
  };
  const availability = {
    owned: 2,
    hard: 2,
    soft: 0,
    free: 0,
    claims: [{ id: "d-1", name: "Atraxa", quantity: 2, mature: true, pending: false, commander: false }],
  };

  it("joins the owned card's availability at the default vantage", async () => {
    selectCollectionRows.mockResolvedValue([row]);
    loadAvailability.mockResolvedValue(new Map([["o-1", availability]]));
    loadPrintingPrices.mockResolvedValue(EMPTY_PRICES);
    const card = await loadCardDetail("user_1", "o-1");
    expect(card?.availability).toEqual(availability);
    // Row 1.5: card detail is off any deck's own decklist, so no deck is excluded —
    // passing one here would silently switch the surface to the other `free` formula.
    expect(loadAvailability).toHaveBeenCalledWith("user_1", { oracleIds: ["o-1"] });
  });

  // /collection fails quiet on this read; the modal must too. Losing the card because
  // its claims could not be counted is the worse failure.
  it("keeps the card when the availability read fails", async () => {
    selectCollectionRows.mockResolvedValue([row]);
    loadAvailability.mockRejectedValue(new Error("down"));
    loadPrintingPrices.mockResolvedValue(EMPTY_PRICES);
    const card = await loadCardDetail("user_1", "o-1");
    expect(card?.name).toBe("Arcane Signet");
    expect(card?.availability).toBeNull();
  });

  it("attaches the card's price snapshot", async () => {
    selectCollectionRows.mockResolvedValue([row]);
    loadAvailability.mockResolvedValue(new Map());
    loadPrintingPrices.mockResolvedValue(PRICES);
    const card = await loadCardDetail("user_1", "o-1");
    expect(card?.prices).toEqual(PRICES);
    expect(loadPrintingPrices).toHaveBeenCalledWith("o-1");
  });

  // The live-printing rule is the UNOWNED branch's alone. An owned card opens on the reader's
  // own copy and their saved pick, whatever the shop is carrying.
  it("leaves an owned card's printings and saved preference as they were", async () => {
    selectCollectionRows.mockResolvedValue([
      { ...row, preferredSetCode: "c21", preferredCollectorNumber: "263" },
      { ...row, setCode: "znr", collectorNumber: "1", setName: "Zendikar Rising", preferredSetCode: "c21", preferredCollectorNumber: "263" },
    ]);
    loadAvailability.mockResolvedValue(new Map());
    loadPrintingPrices.mockResolvedValue({
      ...PRICES,
      byScryfallId: {},
      byPrintingKey: { "ZNR|1": { cents: 5, foilCents: null, etchedCents: null, asOf: PRICES.newestAsOf } },
    });
    const card = await loadCardDetail("user_1", "o-1");
    expect(card?.preferredPrinting).toEqual({ setCode: "C21", collectorNumber: "263" });
    const { resolvedPrinting } = await import("./browse");
    expect(resolvedPrinting(card!)?.collectorNumber).toBe("263");
  });

  // The unowned card is the whole point of the feature — it is the case with no
  // printing region for a figure to sit beside — so its loader path gets its own
  // case rather than riding the owned one's.
  it("attaches the snapshot on the unowned path too", async () => {
    selectCollectionRows.mockResolvedValue([]);
    loadPrintingPrices.mockResolvedValue(PRICES);
    const rows = [{ oracleId: "o-1", scryfallId: "s-1", name: "Arcane Signet" }];
    vi.doMock("../../db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: async () => rows,
            leftJoin: () => ({ where: async () => [] }),
          }),
        }),
        // The proxy read runs on both branches of this loader, so every stub of
        // the db has to answer it. It returns no decks here, which is the state
        // every case in this file is about.
        execute: async () => ({ rows: [] }),
      },
    }));

    // The db stub above is scoped to this case; the real module is restored after.
    vi.resetModules();
    const { loadCardDetail: fresh } = await import("./card-detail");
    const card = await fresh("user_1", "o-1");
    vi.doUnmock("../../db");

    expect(card?.prices).toEqual(PRICES);
  });

  // Both branches load it, and the UNOWNED branch is the one that matters: the
  // headline proxy is a card the player owns no copy of, so a receipt that could
  // only name printing decks for owned cards would miss every case the feature
  // exists for.
  it("names the decks printing an unowned card", async () => {
    selectCollectionRows.mockResolvedValue([]);
    loadPrintingPrices.mockResolvedValue(PRICES);
    const rows = [{ oracleId: "o-1", scryfallId: "s-1", name: "Arcane Signet" }];
    vi.doMock("../../db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: async () => rows,
            leftJoin: () => ({ where: async () => [] }),
          }),
        }),
        execute: async () => ({ rows: [{ id: "d-1", name: "HD Gods" }] }),
      },
    }));
    vi.resetModules();
    const { loadCardDetail: fresh } = await import("./card-detail");
    const card = await fresh("user_1", "o-1");
    vi.doUnmock("../../db");

    expect(card?.proxiedBy).toEqual([{ id: "d-1", name: "HD Gods" }]);
  });

  // The OWNED branch, which is a different code path: availability, prices and
  // this read start together there. Without a case here, dropping
  // `proxyingDecks` from that `Promise.all` would leave every test green — the
  // unowned case below would still pass, and it is the only other one asserting
  // a non-empty list.
  it("names the decks printing a card the player also owns", async () => {
    selectCollectionRows.mockResolvedValue([row]);
    loadAvailability.mockResolvedValue(new Map());
    loadPrintingPrices.mockResolvedValue(PRICES);
    vi.doMock("../../db", () => ({
      db: { execute: async () => ({ rows: [{ id: "d-2", name: "Prismari Artistry" }] }) },
    }));
    vi.resetModules();
    const { loadCardDetail: fresh } = await import("./card-detail");
    const card = await fresh("user_1", "o-1");
    vi.doUnmock("../../db");

    expect(card?.proxiedBy).toEqual([{ id: "d-2", name: "Prismari Artistry" }]);
  });

  // A failed proxy read costs the block, never the card — the same bargain the
  // availability and price reads beside it make.
  it("keeps the card when the proxy read fails", async () => {
    selectCollectionRows.mockResolvedValue([]);
    loadPrintingPrices.mockResolvedValue(PRICES);
    const rows = [{ oracleId: "o-1", scryfallId: "s-1", name: "Arcane Signet" }];
    vi.doMock("../../db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: async () => rows,
            leftJoin: () => ({ where: async () => [] }),
          }),
        }),
        execute: async () => { throw new Error("proxy read down"); },
      },
    }));
    vi.resetModules();
    const { loadCardDetail: fresh } = await import("./card-detail");
    const card = await fresh("user_1", "o-1");
    vi.doUnmock("../../db");

    expect(card?.oracleId).toBe("o-1");
    // NULL, not `[]`. An empty list says "no deck prints this", which a failed
    // read cannot claim — and the sheet would then draw an unchecked toggle over
    // an already-proxied card, leaving no way to unmark it.
    expect(card?.proxiedBy).toBeNull();
  });

  // The figure is the one thing on this card the reader can live without. A feed
  // that cannot be reached costs them a number, never the card — and null is not
  // `no stock`: nobody asked the store anything.
  it("keeps the card when the price read fails, with a null snapshot", async () => {
    selectCollectionRows.mockResolvedValue([row]);
    loadAvailability.mockResolvedValue(new Map());
    loadPrintingPrices.mockRejectedValue(new Error("feed down"));
    const card = await loadCardDetail("user_1", "o-1");
    expect(card?.name).toBe("Arcane Signet");
    expect(card?.prices).toBeNull();
  });
});

// The gate's fail-soft half, with its reader injected: a read that throws, or finds no card, leaves
// both fields absent, which keeps the door shut. The wiring into both branches of `loadCardDetail`
// is `probe:swap-fits-data`'s, against a real database.
describe("fitsGate", () => {
  it("reads both flags off one row", async () => {
    const { fitsGate } = await import("./card-detail");
    const on = { execute: async () => ({ rows: [{ commander_legal: true, has_decks: false }] }) };
    expect(await fitsGate("user_1", "o-1", on, true)).toEqual({ commanderLegal: true, hasDecks: false });
  });

  it("reads nothing while the swap tools are off", async () => {
    const { fitsGate } = await import("./card-detail");
    const execute = vi.fn(async () => ({ rows: [{ commander_legal: true, has_decks: true }] }));
    expect(await fitsGate("user_1", "o-1", { execute }, false)).toEqual({});
    expect(execute).not.toHaveBeenCalled();
  });

  it("is absent for a card it cannot find, and when the read fails", async () => {
    const { fitsGate } = await import("./card-detail");
    expect(await fitsGate("user_1", "o-1", { execute: async () => ({ rows: [] }) }, true)).toEqual({});
    expect(await fitsGate("user_1", "o-1", { execute: async () => { throw new Error("down"); } }, true)).toEqual({});
  });
});
