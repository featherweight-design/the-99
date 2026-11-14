import { describe, expect, it } from "vitest";
import { looksLikeCsv, missingRequiredColumn, parseCollectionCsv, parseFinish } from "./parse";

// Layouts for the apps the landing page names (Dragon Shield, TCGplayer and Delver Lens also carry real rows below) beside ManaBox, Moxfield, Archidekt and Deckbox. Every card and
// quantity in the made-up layouts is invented. NO published specification of any of these exports could be fetched (the vendors' help
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

// Dragon Shield web export, REAL rows (Chazmus/dragonshield-converter and StepKie/MtgCsvHelper samples, audited 2026-11-14):
// CRLF line ends, a QUOTED `"sep=,"` line first, camel-case conditions, and treatments in the Printing column.
const DRAGON_SHIELD = [
  '"sep=,"',
  "Folder Name,Quantity,Trade Quantity,Card Name,Set Code,Set Name,Card Number,Condition,Printing,Language,Price Bought,Date Bought,LOW,MID,MARKET",
  'Test,1,1,"Aragorn, the Uniter",LTR,The Lord of the Rings: Tales of Middle-earth,741z,NearMint,Double Rainbow Foil,English,0.00,2026-05-15,,,',
  "Test,1,1,Disciplined Duelist,SNC,Streets of New Capenna,369,NearMint,Gilded Foil,English,0.00,2026-05-15,0.09,0.40,0.32",
  "Test,1,1,Brazen Borrower // Petty Theft,ELD,Throne of Eldraine,39,NearMint,Normal,English,0.00,2026-05-15,1.99,4.11,3.94",
  "Rares,1,0,Teysa Karlov,MUL,Multiverse Legends,126,NearMint,Etched Foil,English,3.39,2024-04-15,1.00,2.42,2.39",
  'Spaceman Binder,1,0,Altar of Bhaal // Bone Offering,PCLB,"Battle for Baldur\'s Gate Promos",109s,NearMint,,English,0.00,2022-10-31,,,',
].join("\r\n");

// TCGplayer app exports, REAL rows (MtgCsvHelper collection samples): the default header and the minimal variant.
const TCGPLAYER_REAL = [
  "Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU",
  '1,"Anim Pakal, Thousandth Moon (Showcase)","Anim Pakal, Thousandth Moon",The Lost Caverns of Ixalan,300,LCI,Normal,Near Mint,English,Rare,526135,7542137',
  "1,Another Chance,Another Chance,The Lost Caverns of Ixalan,90,LCI,Foil,Near Mint,English,Common,526312,7549287",
  "1,Life // Death,Life,Apocalypse,130,APC,Normal,Near Mint,English,Uncommon,7983,21423",
  "1,Abzan Charm,Abzan Charm,The List Reprints,C16-177,LIST,Normal,Near Mint,English,Uncommon,203116,4267948",
  "1,Artist's Talent,Artist's Talent,Promo Pack: Bloomburrow,124,PPBLB,Normal,Near Mint,English,Rare,560964,8072752",
].join("\n");
const TCGPLAYER_MINIMAL = ["Quantity,Name,Set Code,Printing,Language", "1,Sanguine Bond,IMA,Foil,English"].join("\n");

// Delver Lens custom-columns export, REAL rows (EchoMTG example_datasets/delver, 2023): every cell quoted.
const DELVER_2023 = [
  "Name,Acquired Price,Language,Set Code,TCGPlayer Product ID,Number,Foil,Quantity",
  '"Mondrak, Glory Dominus","$26.45","","ONE","478276","23","Foil","1"',
  '"Monster Manual // Zoological Study","$2.65","","CLB","272732","242","Foil","1"',
].join("\n");

// Delver Lens CSV export, as recalled (the least certain of the three): Quantity, Name, Foil, Condition, Language,
// Edition (the name), Edition code, Collector number.
const DELVER = [
  "Quantity,Name,Foil,Condition,Language,Edition,Edition code,Collector number",
  '2,"Ember Warden, Hollow Crown",,NM,English,Test Set Alpha,TSA,12',
  "1,Lanternlight Totem,Foil,NM,English,Test Set Alpha,TSA,213",
  "4,Moss Cairn,,LP,English,Test Set Beta,TSB,88",
].join("\n");

describe("collection exports from TCGplayer and Delver Lens (made-up cards, unconfirmed layouts)", () => {
  const expected = [
    { name: "Ember Warden, Hollow Crown", setCode: "tsa", collectorNumber: "12", finish: "nonfoil" },
    { name: "Lanternlight Totem", setCode: "tsa", collectorNumber: "213", finish: "foil" },
    { name: "Moss Cairn", setCode: "tsb", collectorNumber: "88", finish: "nonfoil" },
  ];

  for (const [app, csv, quantities] of [
    ["TCGplayer", TCGPLAYER, [2, 1, 4]],
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

  it("reads a real Dragon Shield export, whose first line is a QUOTED sep line", () => {
    const { rows, errors } = parseCollectionCsv(DRAGON_SHIELD);
    expect(errors).toEqual([]);
    expect(rows.map(({ name, setCode, collectorNumber, finish, quantity }) => ({ name, setCode, collectorNumber, finish, quantity }))).toEqual([
      { name: "Aragorn, the Uniter", setCode: "ltr", collectorNumber: "741z", finish: "foil", quantity: 1 },
      { name: "Disciplined Duelist", setCode: "snc", collectorNumber: "369", finish: "foil", quantity: 1 },
      { name: "Brazen Borrower // Petty Theft", setCode: "eld", collectorNumber: "39", finish: "nonfoil", quantity: 1 },
      { name: "Teysa Karlov", setCode: "mul", collectorNumber: "126", finish: "etched", quantity: 1 },
      { name: "Altar of Bhaal // Bone Offering", setCode: "pclb", collectorNumber: "109s", finish: "nonfoil", quantity: 1 },
    ]);
    expect(looksLikeCsv(DRAGON_SHIELD)).toBe(true);
    expect(missingRequiredColumn(DRAGON_SHIELD)).toBeNull();
  });

  it("still reads the bare `sep=,` form", () => {
    expect(parseCollectionCsv(DRAGON_SHIELD.replace('"sep=,"', "sep=,")).rows).toHaveLength(5);
  });

  it("does not read Dragon Shield's Trade Quantity as the Quantity column", () => {
    const csv = '"sep=,"\r\nFolder Name,Quantity,Trade Quantity,Card Name,Set Code\r\nBinder,3,5,Moss Cairn,TSB\r\n';
    expect(parseCollectionCsv(csv).rows[0].quantity).toBe(3);
  });

  it("numbers rows from the file's first line when a quoted `sep=,` line sits above the header", () => {
    expect(parseCollectionCsv(DRAGON_SHIELD).rows.map((r) => r.line)).toEqual([3, 4, 5, 6, 7]);
  });

  it("reports a missing column on the header's own line, past a `sep=,` line (quoted or bare)", () => {
    for (const sep of ["sep=,", '"sep=,"']) {
      const { errors } = parseCollectionCsv(`${sep}\nCard Name,Set Code\nSol Ring,LTC\n`);
      expect(errors).toEqual([{ line: 2, raw: "Card Name,Set Code", reason: "header missing Quantity column" }]);
    }
  });

  it("reads the real TCGplayer default header: Name first, set code, finish from Printing", () => {
    const { rows, errors } = parseCollectionCsv(TCGPLAYER_REAL);
    expect(errors).toEqual([]);
    expect(rows.map(({ name, setCode, collectorNumber, finish }) => ({ name, setCode, collectorNumber, finish }))).toEqual([
      // REPORTED, not changed: Name is read before Simple Name, so a decorated name reaches the resolver as written.
      { name: "Anim Pakal, Thousandth Moon (Showcase)", setCode: "lci", collectorNumber: "300", finish: "nonfoil" },
      { name: "Another Chance", setCode: "lci", collectorNumber: "90", finish: "foil" },
      { name: "Life // Death", setCode: "apc", collectorNumber: "130", finish: "nonfoil" },
      // REPORTED, not changed: LIST and PPBLB are TCGplayer's own codes, not Scryfall's.
      { name: "Abzan Charm", setCode: "list", collectorNumber: "C16-177", finish: "nonfoil" },
      { name: "Artist's Talent", setCode: "ppblb", collectorNumber: "124", finish: "nonfoil" },
    ]);
  });

  it("reads the real TCGplayer minimal header", () => {
    const { rows, errors } = parseCollectionCsv(TCGPLAYER_MINIMAL);
    expect(errors).toEqual([]);
    expect(rows).toMatchObject([{ name: "Sanguine Bond", setCode: "ima", finish: "foil", quantity: 1 }]);
  });

  it("reads the real Delver Lens 2023 custom-columns export, every cell quoted", () => {
    const { rows, errors } = parseCollectionCsv(DELVER_2023);
    expect(errors).toEqual([]);
    expect(rows).toMatchObject([
      { name: "Mondrak, Glory Dominus", setCode: "one", collectorNumber: "23", finish: "foil", quantity: 1 },
      { name: "Monster Manual // Zoological Study", setCode: "clb", collectorNumber: "242", finish: "foil", quantity: 1 },
    ]);
  });

  it("refuses EchoMTG's preset header (Reg Qty, Foil Qty) as a missing Quantity column", () => {
    const { rows, errors } = parseCollectionCsv("Reg Qty,Foil Qty,Name,Set,Acquired,Language\n1,0,Sol Ring,Commander Legends,1.00,English\n");
    expect(rows).toEqual([]);
    expect(errors).toEqual([{ line: 1, raw: "Reg Qty,Foil Qty,Name,Set,Acquired,Language", reason: "header missing Quantity column" }]);
  });

  it("reads every foil treatment's word as foil, etched as etched, and nonfoil spellings as nonfoil", () => {
    for (const v of ["Rainbow Foil", "Double Rainbow Foil", "Gilded Foil", "Surge Foil", "Step and Compleat Foil", "Galaxy Foil", "FOIL"]) {
      expect(parseFinish(v), v).toBe("foil");
    }
    for (const v of ["Etched Foil", "Etched", "Foil Etched", "Textured Etched Foil"]) expect(parseFinish(v), v).toBe("etched");
    for (const v of ["Normal", "", "Nonfoil", "Non-foil", "non foil"]) expect(parseFinish(v), v).toBe("nonfoil");
  });

  it("keeps a leading byte-order mark out of an error's raw header line", () => {
    const { errors } = parseCollectionCsv("\uFEFFCard Name,Set\nMoss Cairn,TSB\n");
    expect(errors).toEqual([{ line: 1, raw: "Card Name,Set", reason: "header missing Quantity column" }]);
  });

  it("takes Card Number as the collector number only beside a set CODE column", () => {
    const code = parseCollectionCsv("Count,Name,Set Code,Card Number\n1,Moss Cairn,TSB,88\n").rows[0];
    expect(code.collectorNumber).toBe("88");
    const name = parseCollectionCsv("Count,Name,Edition,Card Number\n1,Moss Cairn,Test Set Beta,88\n").rows[0];
    expect(name.collectorNumber).toBe("");
  });

  it("reads Holofoil as foil", () => {
    expect(parseCollectionCsv("Quantity,Name,Printing\n1,Moss Cairn,Holofoil\n").rows[0].finish).toBe("foil");
  });

  it("still takes a lone line that merely starts with sep= as a header of its own", () => {
    expect(parseCollectionCsv("sep=,").errors).toEqual([{ line: 1, raw: "sep=,", reason: "header missing Name column" }]);
  });
});
