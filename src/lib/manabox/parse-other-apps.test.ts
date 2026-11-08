import { describe, expect, it } from "vitest";
import { looksLikeCsv, parseCollectionCsv } from "./parse";

// Layouts for the three apps the landing page names beside ManaBox, Moxfield, Archidekt and Deckbox. Every card and
// quantity here is made up. NO published specification of any of these exports could be fetched (the vendors' help
// pages answered 403 or did not list columns), so each layout below follows the author's recollection of a real export
// and is UNCONFIRMED: see the PR body for the columns and quirks that need a real file to settle. The parser reads
// headers by name and needs only Name and Quantity, so a layout that differs in column order or in extra columns
// still imports; what these tests pin is that the columns we do read are found, and that the one structural quirk
// recalled for Dragon Shield (an Excel `sep=,` line above the header) cannot make the file unreadable.

// TCGplayer app collection export, as recalled: Quantity first, a "Simple Name" beside "Name", "Set" holding the set
// NAME with "Set Code" beside it, "Card Number", and "Printing" (Normal / Foil).
const TCGPLAYER = [
  "Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU,Price,Price Each",
  '2,"Ember Warden, Hollow Crown",Ember Warden Hollow Crown,Test Set Alpha,12,TSA,Normal,Near Mint,English,Rare,100001,200001,1.50,0.75',
  "1,Lanternlight Totem,Lanternlight Totem,Test Set Alpha,213,TSA,Foil,Lightly Played,English,Uncommon,100002,200002,0.60,0.60",
  "4,Moss Cairn,Moss Cairn,Test Set Beta,88,TSB,Normal,Near Mint,English,Common,100003,200003,0.40,0.10",
].join("\n");

// Dragon Shield MTG Card Manager export, as recalled: a `sep=,` line first, then Folder Name / Quantity /
// Trade Quantity / Card Name / Set Code / Set Name / Card Number / Condition / Printing / Language / prices.
const DRAGON_SHIELD = [
  "sep=,",
  "Folder Name,Quantity,Trade Quantity,Card Name,Set Code,Set Name,Card Number,Condition,Printing,Language,Price Bought,Date Bought,LOW,MID,MARKET",
  'Binder One,3,0,"Ember Warden, Hollow Crown",TSA,Test Set Alpha,12,NearMint,Normal,English,0.50,2026-01-02,0.40,0.70,0.75',
  "Binder One,1,1,Lanternlight Totem,TSA,Test Set Alpha,213,NearMint,Foil,English,0.00,2026-01-02,0.50,0.60,0.62",
  "Trade Box,2,0,Moss Cairn,TSB,Test Set Beta,88,Played,Normal,English,0.10,2026-02-03,0.05,0.10,0.12",
].join("\n");

// Delver Lens CSV export, as recalled (the least certain of the three): Quantity, Name, Foil, Condition, Language,
// Edition (the name), Edition code, Collector number.
const DELVER = [
  "Quantity,Name,Foil,Condition,Language,Edition,Edition code,Collector number",
  '2,"Ember Warden, Hollow Crown",,NM,English,Test Set Alpha,TSA,12',
  "1,Lanternlight Totem,Foil,NM,English,Test Set Alpha,TSA,213",
  "4,Moss Cairn,,LP,English,Test Set Beta,TSB,88",
].join("\n");

describe("collection exports from TCGplayer, Dragon Shield and Delver Lens (made-up cards, unconfirmed layouts)", () => {
  const expected = [
    { name: "Ember Warden, Hollow Crown", setCode: "tsa", collectorNumber: "12", finish: "nonfoil" },
    { name: "Lanternlight Totem", setCode: "tsa", collectorNumber: "213", finish: "foil" },
    { name: "Moss Cairn", setCode: "tsb", collectorNumber: "88", finish: "nonfoil" },
  ];

  for (const [app, csv, quantities] of [
    ["TCGplayer", TCGPLAYER, [2, 1, 4]],
    ["Dragon Shield", DRAGON_SHIELD, [3, 1, 2]],
    ["Delver Lens", DELVER, [2, 1, 4]],
  ] as const) {
    it(`reads ${app}: name, quantity, set code, collector number and finish`, () => {
      const { rows, errors } = parseCollectionCsv(csv);
      expect(errors).toEqual([]);
      expect(rows.map(({ name, setCode, collectorNumber, finish }) => ({ name, setCode, collectorNumber, finish }))).toEqual(expected);
      expect(rows.map((r) => r.quantity)).toEqual(quantities);
    });

    it(`recognizes ${app} as a CSV, so a paste of it never falls through to the list parser`, () => {
      expect(looksLikeCsv(csv)).toBe(true);
    });
  }

  it("does not read Dragon Shield's Trade Quantity as the Quantity column", () => {
    expect(parseCollectionCsv(DRAGON_SHIELD).rows[1].quantity).toBe(1);
  });

  it("numbers rows from the file's first line when a `sep=,` line sits above the header", () => {
    const { rows } = parseCollectionCsv(DRAGON_SHIELD);
    expect(rows.map((r) => r.line)).toEqual([3, 4, 5]);
  });

  it("reports a missing column on the header's own line, past a `sep=,` line", () => {
    const { errors } = parseCollectionCsv("sep=,\nCard Name,Set Code\nSol Ring,LTC\n");
    expect(errors).toEqual([{ line: 2, raw: "Card Name,Set Code", reason: "header missing Quantity column" }]);
  });

  it("reads a file that starts with a byte-order mark", () => {
    const { rows, errors } = parseCollectionCsv("﻿Name,Quantity\nMoss Cairn,2\n");
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(["Moss Cairn"]);
  });

  it("still takes a lone line that merely starts with sep= as a header of its own", () => {
    expect(parseCollectionCsv("sep=,").errors).toEqual([{ line: 1, raw: "sep=,", reason: "header missing Name column" }]);
  });
});
