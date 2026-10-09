import { describe, expect, it } from "vitest";
import {
  resolveArtCropUri,
  backImageIsOwn,
  resolveBackImageUri,
  aggregateCollection,
  cssUrl,
  filterCards,
  formatLastUpdated,
  printedFaceName,
  printedNameOf,
  printingCaption,
  resolveImageUri,
  resolveFlavorName,
  sortCards,
  toListCards,
  type BrowseCard,
  type BrowseListCard,
  type BrowsePrinting,
  type RawCollectionRow,
} from "./browse";

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "C21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  quantity: 1, finishes: { nonfoil: 1 }, imageUri: null, flavorName: null, ...over,
});

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}", cmc: 2,
  oracleText: "Tap: Add {C}{C}.",
  keywords: [],
  rarity: "uncommon",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 1,
  printings: [printing()],
  setCodes: ["C21"],
  primarySetCode: "C21",
  preferredPrinting: null,
  ...over,
});

/** The same card as the browse list carries it — through the real trimmer. */
// A `setCodes` override with no printings is given printings in those sets, since that is what
// the loader derives `setCodes` from, and the list's set filter reads the printings' codes.
const listCard = (over: Partial<BrowseCard> = {}): BrowseListCard =>
  toListCards([card(
    over.setCodes && !over.printings
      ? { ...over, printings: over.setCodes.map((setCode) => printing({ setCode })) }
      : over,
  )])[0];

const raw = (over: Partial<RawCollectionRow> = {}): RawCollectionRow => ({
  oracleId: "o-1", quantity: 1, setCode: "c21", collectorNumber: "263", finish: "nonfoil",
  setName: "Commander 2021", releasedAt: "2021-04-23",
  preferredSetCode: null, preferredCollectorNumber: null,
  exactBackImageUri: null, representativeBackImageUri: null,
  exactArtCropUri: null, representativeArtCropUri: null, cardArtCropUri: null,
  name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 2, oracleText: null,
  gameChanger: false,
  keywords: [], rarity: "uncommon", colorIdentity: [],
  layout: "normal", backImageUri: null,
  scryfallId: null,
  exactImageUri: null, representativeImageUri: null, cardImageUri: null,
  flavorName: null, representativeFlavorName: null,
  ...over,
});

// The printed name has to fall through the same three tiers the art does, or a
// collection row with no scryfall_id shows Secret Lair art under the oracle name.
describe("resolveFlavorName — the name follows the art, tier for tier", () => {
  it("tier 1: takes the exact printing's name when the exact art was used", () => {
    expect(resolveFlavorName({ exactImageUri: "exact.png", representativeImageUri: "rep.png",
                               flavorName: "Battle of Olympus", representativeFlavorName: null }))
      .toBe("Battle of Olympus");
  });
  it("tier 2: takes the representative printing's name when its art was used", () => {
    // A holding with no scryfall_id misses the exact join entirely. This is the
    // common path on any collection imported without printing ids.
    expect(resolveFlavorName({ exactImageUri: null, representativeImageUri: "rep.png",
                               flavorName: null, representativeFlavorName: "Battle of Olympus" }))
      .toBe("Battle of Olympus");
  });
  it("never captions fallback art with the exact printing's name", () => {
    // The exact row joined but carries no image, so the art fell to tier 2.
    // Its name must not travel without it.
    expect(resolveFlavorName({ exactImageUri: null, representativeImageUri: "rep.png",
                               flavorName: "Battle of Olympus", representativeFlavorName: null }))
      .toBeNull();
  });
  it("tier 3 prints no name — cards.imageUri belongs to no printing", () => {
    expect(resolveFlavorName({ exactImageUri: null, representativeImageUri: null,
                               flavorName: "Battle of Olympus",
                               representativeFlavorName: "Battle of Olympus" }))
      .toBeNull();
  });
});

// Both faces off one printing, or a flip turns to another printing's back — the failure
// this tier order exists to close.
describe("backImageIsOwn — provenance, for the one reader that needs it", () => {
  // `resolveBackImageUri` answers what to DRAW; this answers whose back it is. The card
  // modal's turn control needs the second, because a printing handed the oracle's back has
  // no second side of its own and a control there turns to another printing's picture.
  const base = {
    exactImageUri: null, representativeImageUri: null,
    exactBackImageUri: null, representativeBackImageUri: null,
  };
  it("is true only when the tier that supplied the FRONT had its own back", () => {
    expect(backImageIsOwn({ ...base, exactImageUri: "e.png", exactBackImageUri: "eb.png" }))
      .toBe(true);
    expect(backImageIsOwn({
      ...base, representativeImageUri: "r.png", representativeBackImageUri: "rb.png",
    })).toBe(true);
  });
  it("is false where the oracle fallback is what `resolveBackImageUri` would return", () => {
    // Each of these three is a case that function answers with `backImageUri`, and the
    // whole point is that a caller cannot tell from the returned string which it got.
    expect(backImageIsOwn({ ...base, exactImageUri: "e.png" })).toBe(false);
    expect(backImageIsOwn({ ...base, representativeImageUri: "r.png" })).toBe(false);
    expect(backImageIsOwn(base)).toBe(false);
  });
  it("does not borrow a lower tier's back, exactly as the resolver does not", () => {
    // Drifting from the resolver is the failure mode: one printing's front against
    // another's back, and now with a control inviting the reader to look.
    expect(backImageIsOwn({
      ...base, exactImageUri: "e.png", representativeImageUri: "r.png",
      representativeBackImageUri: "rb.png",
    })).toBe(false);
  });
});

describe("resolveBackImageUri — the back follows the art, tier for tier", () => {
  const base = {
    exactImageUri: null, representativeImageUri: null,
    exactBackImageUri: null, representativeBackImageUri: null,
    backImageUri: "oracle-back.png",
  };
  it("tier 1: takes the exact printing's back when the exact art was used", () => {
    expect(resolveBackImageUri({ ...base, exactImageUri: "exact.png",
                                 representativeImageUri: "rep.png",
                                 exactBackImageUri: "exact-back.png",
                                 representativeBackImageUri: "rep-back.png" }))
      .toBe("exact-back.png");
  });
  it("tier 2: takes the representative printing's back when its art was used", () => {
    expect(resolveBackImageUri({ ...base, representativeImageUri: "rep.png",
                                 exactBackImageUri: "exact-back.png",
                                 representativeBackImageUri: "rep-back.png" }))
      .toBe("rep-back.png");
  });
  // The direction the first pass got wrong: the exact printing supplied the front and had
  // no back of its own, so the representative's back was borrowed — one printing's front
  // against another's back, which is this column's own defect reached from the far side.
  it("never borrows a lower tier's back for a higher tier's front", () => {
    expect(resolveBackImageUri({ ...base, exactImageUri: "exact.png",
                                 representativeImageUri: "rep.png",
                                 representativeBackImageUri: "rep-back.png" }))
      .toBe("oracle-back.png");
  });
  it("never turns fallback art to the exact printing's back", () => {
    // The exact row joined but carries no image, so the front fell to tier 2. Its back
    // must not travel without it — that pairing is two printings on one card.
    expect(resolveBackImageUri({ ...base, representativeImageUri: "rep.png",
                                 exactBackImageUri: "exact-back.png" }))
      .toBe("oracle-back.png");
  });
  // The state every printing is in until the catalog is re-seeded against the new column:
  // the front resolves off a real printing row whose back is null, and the flip has to go
  // on working exactly as it did before.
  it("falls back to the oracle-level back when the printing carries none", () => {
    expect(resolveBackImageUri({ ...base, exactImageUri: "exact.png" }))
      .toBe("oracle-back.png");
  });
  it("is null for a single-faced card, which has no back anywhere", () => {
    expect(resolveBackImageUri({ ...base, exactImageUri: "exact.png", backImageUri: null }))
      .toBeNull();
  });
});

describe("resolveArtCropUri — the crop follows the art, tier for tier", () => {
  const base = {
    exactImageUri: null, representativeImageUri: null,
    exactArtCropUri: null, representativeArtCropUri: null,
    cardArtCropUri: "oracle-crop.png",
  };
  it("tier 1: takes the exact printing's crop when the exact art was used", () => {
    expect(resolveArtCropUri({ ...base, exactImageUri: "exact.png",
                               representativeImageUri: "rep.png",
                               exactArtCropUri: "exact-crop.png",
                               representativeArtCropUri: "rep-crop.png" }))
      .toBe("exact-crop.png");
  });
  it("tier 2: takes the representative printing's crop when its art was used", () => {
    expect(resolveArtCropUri({ ...base, representativeImageUri: "rep.png",
                               exactArtCropUri: "exact-crop.png",
                               representativeArtCropUri: "rep-crop.png" }))
      .toBe("rep-crop.png");
  });
  // The same direction `resolveBackImageUri` had to be corrected in: a lower tier's crop
  // under a higher tier's front is two printings on one card, which is the defect this
  // whole column closes reached from the far side.
  it("never borrows a lower tier's crop for a higher tier's front", () => {
    expect(resolveArtCropUri({ ...base, exactImageUri: "exact.png",
                               representativeImageUri: "rep.png",
                               representativeArtCropUri: "rep-crop.png" }))
      .toBe("oracle-crop.png");
  });
  // The state EVERY printing is in until the catalog is re-seeded against the new column,
  // which is why it is the case that matters most on the day this ships.
  it("falls back to the oracle-level crop when the printing carries none", () => {
    expect(resolveArtCropUri({ ...base, exactImageUri: "exact.png" }))
      .toBe("oracle-crop.png");
  });
  it("is null when no tier has a crop at all", () => {
    expect(resolveArtCropUri({ ...base, exactImageUri: "exact.png", cardArtCropUri: null }))
      .toBeNull();
  });
});

describe("resolveImageUri (§3.5 — COALESCE on value, not on match)", () => {
  it("tier 1: the exact printing owned wins", () => {
    expect(resolveImageUri({ exactImageUri: "exact.png", representativeImageUri: "rep.png", cardImageUri: "card.png" }))
      .toBe("exact.png");
  });
  it("tier 2: the representative printing when no exact printing is joined", () => {
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: "rep.png", cardImageUri: "card.png" }))
      .toBe("rep.png");
  });
  it("tier 3: a double-faced card whose printing row exists but carries a NULL image falls to the oracle image", () => {
    // The join SUCCEEDED here — transform/modal_dfc printings have no top-level image_uris.
    // Selecting on match success rather than on a non-null value would blank this tile.
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: null, cardImageUri: "card.png" }))
      .toBe("card.png");
  });
  it("tier 4: all three null hands off to the identity gradient downstream", () => {
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: null, cardImageUri: null }))
      .toBeNull();
  });
});

describe("aggregateCollection", () => {
  it("sums quantities across variants of the same oracle id", () => {
    const [agg] = aggregateCollection([
      raw({ quantity: 2, setCode: "c21", collectorNumber: "263" }),
      raw({ quantity: 1, setCode: "lea", collectorNumber: "270" }),
    ]);
    expect(agg.quantity).toBe(3);
    expect(agg.setCodes.sort()).toEqual(["C21", "LEA"]);
    expect(agg.primarySetCode).toBe("C21");
  });
  // The exact-id price path rests on this: without the holding's own catalog id on
  // the printing, every owned card falls to the set/number key, and a holding that
  // carries neither goes silent.
  it("carries the holding's own scryfall id onto the printing", () => {
    const [agg] = aggregateCollection([raw({ scryfallId: "s-263" })]);

    expect(agg.printings[0].scryfallId).toBe("s-263");
  });

  // Each entry is one printing and carries that printing's own back, so the modal can turn
  // a picked printing to its own second side rather than to the oracle row's.
  it("carries each printing's own back face", () => {
    const [agg] = aggregateCollection([
      raw({
        setCode: "isd", collectorNumber: "51",
        exactImageUri: "isd-front.png", exactBackImageUri: "isd-back.png",
      }),
      raw({
        setCode: "sld", collectorNumber: "7",
        exactImageUri: "sld-front.png", exactBackImageUri: "sld-back.png",
      }),
    ]);

    expect(agg.printings.map((p) => p.backImageUri)).toEqual(["isd-back.png", "sld-back.png"]);
  });

  it("leaves the id absent where the holding names none", () => {
    // A bare `Name,Qty` import. `undefined` rather than null, so the field reads the
    // same as it does on a fixture that never had one.
    const [agg] = aggregateCollection([raw({ scryfallId: null })]);

    expect(agg.printings[0].scryfallId).toBeUndefined();
  });

  it("keeps one id across the two finishes of one printing", () => {
    // Foil and nonfoil are two collection rows sharing a catalog id, and they
    // collapse into one entry — so the coalesce can only ever meet the same value,
    // and must not drop it when the second row arrives.
    const [agg] = aggregateCollection([
      raw({ scryfallId: "s-263", finish: "nonfoil", quantity: 2 }),
      raw({ scryfallId: "s-263", finish: "foil", quantity: 1 }),
    ]);

    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].scryfallId).toBe("s-263");
    expect(agg.printings[0].quantity).toBe(3);
  });

  it("keeps the back's provenance across the two finishes of one printing", () => {
    // The pair `backImageUri` + `hasOwnBack` has to survive the collapse TOGETHER.
    // Coalescing the art while leaving the flag behind reads as "no second side" on a
    // printing that has one, and the card modal's turn control reads the flag.
    //
    // ASYMMETRIC ON PURPOSE, and synthetic: both finishes of one printing resolve through
    // the same tiers in real data, so the symmetric fixture cannot tell the merge from its
    // absence — it passes with the line deleted, which is a test measuring nothing. This
    // shape is the same belt-and-braces case the `backImageUri ??=` line above it exists
    // for, written so the OR is what carries it. `exactImageUri` is what makes the exact
    // back this printing's own: provenance follows the tier that supplied the FRONT.
    const [agg] = aggregateCollection([
      raw({ finish: "nonfoil", quantity: 2, representativeImageUri: "rep-front.png" }),
      raw({ finish: "foil", quantity: 1,
            exactImageUri: "own-front.png", exactBackImageUri: "own-back.png" }),
    ]);

    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].backImageUri).toBe("own-back.png");
    expect(agg.printings[0].hasOwnBack).toBe(true);
  });

  it("drops the id where two rows of one printing disagree about it", () => {
    // The import path already rules this: rows that share oracle, set, collector
    // number and finish but name different printings cannot both be right, and null
    // is the honest answer (`pending.ts:30-33`). Here it matters more, because this
    // id is what a price is looked up by — the entry falls back to the (set,
    // collector number) identity the rows do agree on.
    const [agg] = aggregateCollection([
      raw({ scryfallId: "s-263", finish: "nonfoil" }),
      raw({ scryfallId: "s-other", finish: "foil" }),
    ]);

    expect(agg.printings[0].scryfallId).toBeUndefined();
  });

  it("does not let a later row heal an id that was dropped for disagreeing", () => {
    const [agg] = aggregateCollection([
      raw({ scryfallId: "s-263", finish: "nonfoil" }),
      raw({ scryfallId: "s-other", finish: "foil" }),
      raw({ scryfallId: "s-263", finish: "etched" }),
    ]);

    expect(agg.printings[0].scryfallId).toBeUndefined();
  });

  it("drops the id where a known one meets a null one, whichever arrives first", () => {
    // A null has two histories here and they cannot be told apart: a name-only
    // import that never named a printing, and a row the import nulled because two
    // sources contradicted each other (`pending.ts:30-33`). Deferring to the known
    // id would resurrect the second. The entry still has its (set, collector
    // number) identity, which names the same printing.
    const [knownFirst] = aggregateCollection([
      raw({ scryfallId: "s-263", finish: "nonfoil" }),
      raw({ scryfallId: null, finish: "foil" }),
    ]);
    const [nullFirst] = aggregateCollection([
      raw({ scryfallId: null, finish: "nonfoil" }),
      raw({ scryfallId: "s-263", finish: "foil" }),
    ]);

    expect(knownFirst.printings[0].scryfallId).toBeUndefined();
    expect(nullFirst.printings[0].scryfallId).toBeUndefined();
  });

  it("keeps oracle metadata from the first row seen", () => {
    const [agg] = aggregateCollection([
      raw({ oracleText: "Tap: Add {C}{C}.", cardImageUri: "img.png" }),
    ]);
    expect(agg.imageUri).toBe("img.png");
    expect(agg.oracleText).toBe("Tap: Add {C}{C}.");
  });
  it("uppercases stored-lowercase set codes for display (§3.3)", () => {
    const [agg] = aggregateCollection([raw({ setCode: "2xm" })]);
    expect(agg.setCodes).toEqual(["2XM"]);
    expect(agg.printings[0].setCode).toBe("2XM");
  });
  it("groups printings on collector number, not on set alone", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600" }), // same set, borderless art
    ]);
    expect(agg.printings.map((p) => p.collectorNumber)).toEqual(["263", "600"]);
    expect(agg.setCodes).toEqual(["C21"]);
  });
  it("collapses the finishes of one printing into a single entry", () => {
    // nonfoil + foil are two collection_items rows but one piece of art.
    const [agg] = aggregateCollection([raw({ quantity: 2 }), raw({ quantity: 1 })]);
    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].quantity).toBe(3);
  });
  it("resolves each printing's image independently", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "a.png" }),
      raw({ collectorNumber: "600", representativeImageUri: "b.png" }),
    ]);
    expect(agg.printings.map((p) => p.imageUri)).toEqual(["a.png", "b.png"]);
  });
  it("sorts printings by set then natural collector number", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "100" }),
      raw({ collectorNumber: "9" }),
      raw({ setCode: "2xm", collectorNumber: "5" }),
    ]);
    expect(agg.printings.map((p) => `${p.setCode}-${p.collectorNumber}`))
      .toEqual(["2XM-5", "C21-9", "C21-100"]);
  });
  it("sorts a numberless collector number last and a prefixed one by its digits", () => {
    // Same rule as the ingest's numericPart, so browse order matches the order the
    // representative printing was chosen by.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "★" }),
      raw({ collectorNumber: "A-12" }),
      raw({ collectorNumber: "9" }),
    ]);
    expect(agg.printings.map((p) => p.collectorNumber)).toEqual(["9", "A-12", "★"]);
  });
  it("picks the card image deterministically — first non-null in printing order, not row order", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "600", exactImageUri: "late.png" }),
      raw({ collectorNumber: "263", exactImageUri: "early.png" }),
    ]);
    expect(agg.imageUri).toBe("early.png");
  });
  it("skips a null-image printing when choosing the card image", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600", exactImageUri: "b.png" }),
    ]);
    expect(agg.imageUri).toBe("b.png");
  });
  it("captions the printing the art came from when the first printing has no image", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600", exactImageUri: "b.png" }),
    ]);
    expect(agg.imageUri).toBe("b.png");
    expect(agg.primarySetCode).toBe("C21");
    expect(printingCaption(agg)).toBe("C21 · 600 +1 more");
  });
  it("carries a printing's flavor name onto the printing it belongs to", () => {
    const [agg] = aggregateCollection([
      raw({
        oracleId: "o1",
        name: "World at War",
        setCode: "sld",
        collectorNumber: "2208",
        // The art has to come off this printing too — a name with no tier to
        // travel on names a printing that put nothing on screen.
        exactImageUri: "sld.png",
        flavorName: "Battle of Olympus",
      }),
    ]);
    expect(agg.printings[0].flavorName).toBe("Battle of Olympus");
  });
  it("leaves flavorName null on an ordinary printing", () => {
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
    ]);
    expect(agg.printings[0].flavorName).toBeNull();
  });
});

describe("printedName", () => {
  it("is the resolved printing's flavor name when it differs from the oracle name", () => {
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "World at War", setCode: "sld",
            collectorNumber: "2208", exactImageUri: "sld.png", flavorName: "Battle of Olympus" }),
    ]);
    expect(agg.printedName).toBe("Battle of Olympus");
    expect(printedNameOf(agg)).toBe("Battle of Olympus");
  });

  it("is null when the printing prints the oracle name", () => {
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
    ]);
    expect(agg.printedName).toBeNull();
    expect(printedNameOf(agg)).toBe("Cultivate");
  });

  it("is null when the flavor name equals the oracle name exactly", () => {
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "Cultivate", setCode: "m21",
            collectorNumber: "177", exactImageUri: "sld.png", flavorName: "Cultivate" }),
    ]);
    expect(agg.printedName).toBeNull();
  });

  it("compares exactly — a case difference is a different name", () => {
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "Cultivate", setCode: "m21",
            collectorNumber: "177", exactImageUri: "sld.png", flavorName: "CULTIVATE" }),
    ]);
    expect(agg.printedName).toBe("CULTIVATE");
  });

  it("follows the art preference, not the first printing owned", () => {
    // The preference is oracle-level, so the real query repeats it on every row.
    const [agg] = aggregateCollection([
      raw({ oracleId: "o1", name: "World at War", setCode: "m21",
            collectorNumber: "177", flavorName: null,
            preferredSetCode: "sld", preferredCollectorNumber: "2208" }),
      raw({ oracleId: "o1", name: "World at War", setCode: "sld",
            collectorNumber: "2208", exactImageUri: "sld.png", flavorName: "Battle of Olympus",
            preferredSetCode: "sld", preferredCollectorNumber: "2208" }),
    ]);
    expect(agg.printedName).toBe("Battle of Olympus");
  });

  it("shows a renamed two-faced card's front face on a row, and the whole string in full", () => {
    const twoFaced = { name: "Delver of Secrets // Insectile Aberration",
                       printedName: "Battle of Olympus // Aftermath", layout: "transform" };
    expect(printedFaceName(twoFaced)).toBe("Battle of Olympus");
    expect(printedNameOf(twoFaced)).toBe("Battle of Olympus // Aftermath");
  });

  it("leaves an unrenamed two-faced card's row string exactly as it is today", () => {
    const twoFaced = { name: "Delver of Secrets // Insectile Aberration",
                       printedName: null, layout: "transform" };
    expect(printedFaceName(twoFaced)).toBe("Delver of Secrets // Insectile Aberration");
  });

  // A split or adventure card carries ` // ` on one piece of card stock, so the
  // front-face cut would drop half a name the row shows whole today. The layout
  // word decides, exactly as `isTwoFaced` does for the `//` mark itself.
  it("keeps both halves of a renamed split card, which has one face", () => {
    const split = { name: "Fire // Ice", printedName: "Flame // Frost", layout: "split" };
    expect(printedFaceName(split)).toBe("Flame // Frost");
  });

  it("keeps both halves of a renamed adventure card", () => {
    const adventure = { name: "Bonecrusher Giant // Stomp",
                        printedName: "Ogre // Smash", layout: "adventure" };
    expect(printedFaceName(adventure)).toBe("Ogre // Smash");
  });

  // The deck route asks for ~99 oracle ids at once and keys the answers by id.
  // `getDeckDetail` is raw SQL no unit test here reaches, so this covers the
  // shape it relies on; the browser probe covers the route.
  it("aggregates a printed name for each of several oracle ids", () => {
    const cards = aggregateCollection([
      raw({ oracleId: "o1", name: "World at War", setCode: "sld",
            collectorNumber: "2208", exactImageUri: "sld.png", flavorName: "Battle of Olympus" }),
      raw({ oracleId: "o2", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
    ]);
    const byOracle = new Map(cards.map((c) => [c.oracleId, c.printedName]));
    expect(byOracle.get("o1")).toBe("Battle of Olympus");
    expect(byOracle.get("o2")).toBeNull();
  });
});

describe("printingCaption", () => {
  it("reads set · collector number for a single printing", () => {
    expect(printingCaption(card())).toBe("C21 · 263");
  });
  it("appends a count of the other printings owned", () => {
    expect(printingCaption(card({
      printings: [printing(), printing({ collectorNumber: "600" }), printing({ setCode: "LEA", collectorNumber: "270" })],
    }))).toBe("C21 · 263 +2 more");
  });
  it("falls back to the set code alone when the export carried no collector number", () => {
    expect(printingCaption(card({ printings: [printing({ collectorNumber: "" })] }))).toBe("C21");
  });
  it("takes even the bare set code off the pick, not the server's primarySetCode", () => {
    // The modal captions an optimistic pick before the revalidate lands, so primarySetCode
    // still names the printing being replaced.
    expect(printingCaption(card({
      primarySetCode: "C21",
      preferredPrinting: { setCode: "LEA", collectorNumber: "" },
      printings: [printing(), printing({ setCode: "LEA", collectorNumber: "" })],
    }))).toBe("LEA +1 more");
  });
});

describe("art preference (#105 — tier 0)", () => {
  const twoPrintings = [printing(), printing({ setCode: "LEA", collectorNumber: "270" })];
  /** A stored pick of LEA · 270, as the query returns it: on every row of the card. */
  const picked = { preferredSetCode: "lea", preferredCollectorNumber: "270" };

  it("represents the card by the chosen printing, not the sort-order first", () => {
    // The preference is oracle-level, so the join repeats it on every row of the card.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "first.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: "chosen.png", ...picked }),
    ]);
    expect(agg.imageUri).toBe("chosen.png");
    expect(agg.primarySetCode).toBe("LEA");
    expect(printingCaption(agg)).toBe("LEA · 270 +1 more");
  });

  it("uppercases the stored set code so the lowercase preference still matches", () => {
    // The join-time trap from the printings epic: preferences are stored lowercase while
    // BrowsePrinting.setCode is uppercased, so comparing them raw would never match.
    const [agg] = aggregateCollection([
      raw({ preferredSetCode: "c21", preferredCollectorNumber: "263" }),
    ]);
    expect(agg.preferredPrinting).toEqual({ setCode: "C21", collectorNumber: "263" });
  });

  it("captions the chosen printing even when that printing has no art", () => {
    // The caption states the user's intent, which stays true when the art cannot render.
    // Only the image falls back — losing the caption too would make the choice vanish.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "has-art.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: null, ...picked }),
    ]);
    expect(printingCaption(agg)).toBe("LEA · 270 +1 more");
    expect(agg.imageUri).toBeNull();
  });

  it("falls back silently when the chosen printing is no longer owned", () => {
    // Decision 5 — the pick outlives the holding, so it stays on the card for the dormant
    // tile, but the art resolves as though no pick existed.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "owned.png", preferredSetCode: "unowned", preferredCollectorNumber: "5" }),
    ]);
    expect(agg.imageUri).toBe("owned.png");
    expect(agg.preferredPrinting).toEqual({ setCode: "UNOWNED", collectorNumber: "5" });
  });

  it("leaves preferredPrinting null when the user has never chosen", () => {
    const [agg] = aggregateCollection([raw()]);
    expect(agg.preferredPrinting).toBeNull();
  });

  it("does not paint every printing with the chosen printing's art", () => {
    // Tier 0 selects WHICH printing represents the card; it is not an arm of the per-printing
    // resolver. Injecting it there would render every tile in the picker as the same image.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "a.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: "b.png", ...picked }),
    ]);
    expect(agg.printings.map((p) => p.imageUri)).toEqual(["a.png", "b.png"]);
  });

  it("captions the first printing when no preference is stored", () => {
    expect(printingCaption(card({ printings: twoPrintings }))).toBe("C21 · 263 +1 more");
  });

  it("captions the fallback printing when the stored pick is no longer owned", () => {
    // The art has already fallen back per decision 5, so the caption follows it. Naming the
    // dormant pick here would label the fallback art with a set that is not on screen.
    expect(
      printingCaption(card({
        printings: twoPrintings,
        preferredPrinting: { setCode: "MMQ", collectorNumber: "9" },
      })),
    ).toBe("C21 · 263 +1 more");
  });
});

describe("finish aggregation (#105 decision 9)", () => {
  it("sums copies per finish across the rows that collapse into one printing", () => {
    // Foil and nonfoil share one Scryfall image, so they are one entry — but the picker
    // still names the split, or "×4" would hide that one of them is the foil.
    const [agg] = aggregateCollection([
      raw({ finish: "nonfoil", quantity: 3 }),
      raw({ finish: "foil", quantity: 1 }),
    ]);
    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].quantity).toBe(4);
    expect(agg.printings[0].finishes).toEqual({ nonfoil: 3, foil: 1 });
  });

  it("keeps finishes separate per printing", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", finish: "foil", quantity: 2 }),
      raw({ setCode: "lea", collectorNumber: "270", finish: "etched", quantity: 1 }),
    ]);
    expect(agg.printings.map((p) => p.finishes)).toEqual([{ foil: 2 }, { etched: 1 }]);
  });

  it("carries the set name and release date from the sets catalog", () => {
    const [agg] = aggregateCollection([raw({ setName: "Commander 2021", releasedAt: "2021-04-23" })]);
    expect(agg.printings[0].setName).toBe("Commander 2021");
    expect(agg.printings[0].releasedAt).toBe("2021-04-23");
  });

  it("tolerates a set with no catalog row", () => {
    const [agg] = aggregateCollection([raw({ setName: null, releasedAt: null })]);
    expect(agg.printings[0].setName).toBeNull();
  });
});

describe("toListCards", () => {
  it("sums a card's printings into one entry per set", () => {
    const [list] = toListCards([
      card({
        printings: [
          printing({ setCode: "C21", quantity: 2 }),
          printing({ setCode: "C21", collectorNumber: "264", quantity: 1 }),
          printing({ setCode: "2XM", quantity: 3 }),
        ],
      }),
    ]);
    expect(list.setCounts).toEqual([["C21", 3], ["2XM", 3]]);
  });

  it("uppercases set codes, which is what buildSetOptions looks them up by", () => {
    const [list] = toListCards([card({ printings: [printing({ setCode: "c21", quantity: 2 })] })]);
    expect(list.setCounts).toEqual([["C21", 2]]);
  });
});

describe("filterCards", () => {
  it("type filter reads the front face only: Shatterskull Smashing is a Sorcery, not a Land", () => {
    const mdfc = [listCard({ oracleId: "m", typeLine: "Sorcery // Land" })];
    const ids = (types: string[]) =>
      filterCards(mdfc, { search: "", colors: [], types, setCodes: [] }).map((c) => c.oracleId);
    expect(ids(["land"])).toEqual([]);
    expect(ids(["sorcery"])).toEqual(["m"]);
  });
  const list = [
    listCard({ oracleId: "a", name: "Sol Ring", colorIdentity: [], typeLine: "Artifact", setCodes: ["C21"], primarySetCode: "C21" }),
    listCard({ oracleId: "b", name: "Lightning Bolt", colorIdentity: ["R"], typeLine: "Instant", setCodes: ["2XM"], primarySetCode: "2XM" }),
    listCard({ oracleId: "c", name: "Cyclonic Rift", colorIdentity: ["U"], typeLine: "Instant", setCodes: ["RTR"], primarySetCode: "RTR" }),
    listCard({ oracleId: "d", name: "Shockingly Boring", colorIdentity: ["R", "U"], typeLine: "Sorcery", setCodes: ["MID"], primarySetCode: "MID" }),
  ];

  it("substring search is case-insensitive on name", () => {
    expect(filterCards(list, { search: "cyclonic", colors: [], types: [], setCodes: [] }).map((c) => c.oracleId)).toEqual(["c"]);
  });

  // A Secret Lair rename is the name ON the card and the name on screen, so a search
  // reading the oracle name alone found nothing for what the reader was looking at.
  // `sld/2214` draws `Mimir's Ancient Wisdom`; `Teferi's Ageless Insight` is printed
  // nowhere on it.
  const renamed = [
    ...list,
    listCard({
      oracleId: "e",
      name: "Teferi's Ageless Insight",
      printedName: "Mimir's Ancient Wisdom",
      colorIdentity: ["U"],
      typeLine: "Legendary Enchantment",
      setCodes: ["SLD"],
      primarySetCode: "SLD",
    }),
  ];
  const found = (search: string) =>
    filterCards(renamed, { search, colors: [], types: [], setCodes: [] }).map((c) => c.oracleId);

  it("finds a renamed card by the name printed on it", () => {
    expect(found("mimir")).toEqual(["e"]);
  });

  it("still finds it by its oracle name, which every other printing carries", () => {
    // Not a replacement: the oracle name is what the card is called everywhere else, what
    // its rules text is filed under, and what a player who knows the card will type.
    expect(found("teferi")).toEqual(["e"]);
  });

  it("sorts a renamed card by the name it DRAWS, not the one it is filed under", () => {
    // Its oracle name starts with T and the row reads `Mimir's Ancient Wisdom`, so the
    // oracle sort put it after Sol Ring and Shockingly Boring — past where a reader
    // scanning for M would stop looking.
    const order = sortCards(renamed, "name", "asc").map((c) => c.printedName ?? c.name);
    expect(order.indexOf("Mimir's Ancient Wisdom")).toBeLessThan(order.indexOf("Shockingly Boring"));
    expect(order.indexOf("Lightning Bolt")).toBeLessThan(order.indexOf("Mimir's Ancient Wisdom"));
  });

  it("breaks a tie on the drawn name too, where the primary key is equal", () => {
    // The tiebreak is a SECOND call site and was asserted by nothing: every other case
    // sorts on `name`, where the primary comparator already resolves the printed name, so
    // the tiebreak is never reached with unequal names. Sorting on quantity with the
    // quantities equal is what reaches it.
    // The two names have to order DIFFERENTLY or the case cannot tell the versions apart:
    // `Mimir's` < `Sol Ring` < `Teferi's`, so the drawn name puts the rename first and the
    // oracle name puts it last. A first version paired it with `Zzz Placeholder`, where
    // both orders agree, and passed with the tiebreak reverted.
    const tied = [
      listCard({ oracleId: "a", name: "Sol Ring", quantity: 4 }),
      listCard({
        oracleId: "e",
        name: "Teferi's Ageless Insight",
        printedName: "Mimir's Ancient Wisdom",
        quantity: 4,
      }),
    ];
    const order = sortCards(tied, "quantity", "desc").map((c) => c.oracleId);
    expect(order).toEqual(["e", "a"]);
  });

  it("sorts a renamed TWO-FACED card by its front face, which is all the row draws", () => {
    // A row draws `printedFaceName` — the front half where the layout has two faces — so
    // keying the sort on the whole `A // B` string lets text on NEITHER ROW decide the
    // order of both.
    //
    // The discriminating shape is two cards whose DRAWN LABELS ARE EQUAL: a reader sees
    // `Bolt` twice and no reason for either to come first, so the input order must stand.
    // Keyed on the joined string, the hidden back halves sort them. Measured before it was
    // written: a prefix pair (`Battle` against `Battle of Olympus // Aftermath`) orders the
    // same either way on this collation, so the obvious fixture passes both versions and a
    // first attempt did.
    const twoFaced = [
      listCard({
        oracleId: "zzz",
        name: "Delver of Secrets // Insectile Aberration",
        printedName: "Bolt // Zzz Aftermath",
        layout: "transform",
      }),
      listCard({
        oracleId: "aaa",
        name: "Delver of Secrets // Insectile Aberration",
        printedName: "Bolt // Aaa Aftermath",
        layout: "transform",
      }),
    ];
    expect(twoFaced.map((c) => printedFaceName(c))).toEqual(["Bolt", "Bolt"]);
    expect(sortCards(twoFaced, "name", "asc").map((c) => c.oracleId)).toEqual(["zzz", "aaa"]);
  });

  it("survives a printed name that is ABSENT, not merely null", () => {
    // `printedName` is typed `string | null` and omitted altogether by the card literals
    // ten test files build, so a `!== null` test admits `undefined` and the
    // `.toLowerCase()` after it throws — taking out the whole browser rather than just its
    // search, which is how `browser-clear.test.tsx` caught it. Both shapes are covered
    // here. (The nineteen-file figure next door counts `BrowsePrinting` literals, which is
    // a different set.)
    const absent = { ...listCard({ oracleId: "f", name: "Birds of Paradise" }) };
    delete (absent as { printedName?: string | null }).printedName;
    const withAbsent = [...renamed, absent];
    const ids = (search: string) =>
      filterCards(withAbsent, { search, colors: [], types: [], setCodes: [] })
        .map((c) => c.oracleId);

    // The RENAMED card is searched in the same pass, so this case also fails when the
    // printed name is not consulted at all — without that clause it passes with the whole
    // change reverted, pinning an intermediate implementation nobody shipped.
    expect(ids("mimir")).toEqual(["e"]);
    expect(ids("birds")).toEqual(["f"]);
    expect(ids("sol")).toEqual(["a"]);
    expect(ids("zzz")).toEqual([]);
  });
  it("no filters returns everything (identity when empty search + no chips)", () => {
    expect(filterCards(list, { search: "", colors: [], types: [], setCodes: [] })).toHaveLength(4);
  });
  it("colors filter matches when EVERY selected color is in the card identity", () => {
    // R + U selected → only the R/U card matches
    expect(filterCards(list, { search: "", colors: ["R", "U"], types: [], setCodes: [] }).map((c) => c.oracleId)).toEqual(["d"]);
    // R alone matches both R and R/U cards
    expect(filterCards(list, { search: "", colors: ["R"], types: [], setCodes: [] }).map((c) => c.oracleId).sort()).toEqual(["b", "d"]);
  });
  // H10: the lanes' Exactly, through the same rule (`matchesColors`).
  it("Exactly keeps a card whose identity IS the selection, and nothing wider", () => {
    expect(filterCards(list, { search: "", colors: ["R"], match: "exactly", types: [], setCodes: [] }).map((c) => c.oracleId)).toEqual(["b"]);
    expect(filterCards(list, { search: "", colors: ["R", "U"], match: "exactly", types: [], setCodes: [] }).map((c) => c.oracleId)).toEqual(["d"]);
    // Nothing lit is no filter under either mode, never "colorless only".
    expect(filterCards(list, { search: "", colors: [], match: "exactly", types: [], setCodes: [] })).toHaveLength(4);
  });
  it("an absent match reads as contains, as every caller before the mode did", () => {
    expect(filterCards(list, { search: "", colors: ["R"], match: "contains", types: [], setCodes: [] }).map((c) => c.oracleId).sort()).toEqual(["b", "d"]);
  });
  it("type filter is case-insensitive substring on typeLine", () => {
    expect(filterCards(list, { search: "", colors: [], types: ["instant"], setCodes: [] }).map((c) => c.oracleId).sort()).toEqual(["b", "c"]);
  });
  it("many selected types OR with each other", () => {
    expect(
      filterCards(list, { search: "", colors: [], types: ["Instant", "Sorcery"], setCodes: [] })
        .map((c) => c.oracleId).sort(),
    ).toEqual(["b", "c", "d"]);
  });
  it("no selected type is no type filter at all", () => {
    expect(filterCards(list, { search: "", colors: [], types: [], setCodes: [] })).toHaveLength(4);
  });
  it("types AND with the other filters", () => {
    expect(
      filterCards(list, { search: "", colors: ["R"], types: ["Instant", "Artifact"], setCodes: [] })
        .map((c) => c.oracleId),
    ).toEqual(["b"]);
  });
  it("one selected set matches ANY of a card's variant sets, case-insensitive", () => {
    expect(filterCards(list, { search: "", colors: [], types: [], setCodes: ["rtr"] }).map((c) => c.oracleId)).toEqual(["c"]);
    expect(filterCards(list, { search: "", colors: [], types: [], setCodes: ["RTR"] }).map((c) => c.oracleId)).toEqual(["c"]);
  });
  it("many selected sets OR with each other", () => {
    expect(
      filterCards(list, { search: "", colors: [], types: [], setCodes: ["RTR", "2xm", "MID"] })
        .map((c) => c.oracleId).sort(),
    ).toEqual(["b", "c", "d"]);
  });
  it("no selected set is no set filter at all", () => {
    expect(filterCards(list, { search: "", colors: [], types: [], setCodes: [] })).toHaveLength(4);
  });
  it("a card owned in several sets matches on any one of them", () => {
    const multi = [listCard({ oracleId: "m", name: "Sol Ring", setCodes: ["C21", "LEA"], primarySetCode: "C21" })];
    expect(filterCards(multi, { search: "", colors: [], types: [], setCodes: ["lea"] })).toHaveLength(1);
    expect(filterCards(multi, { search: "", colors: [], types: [], setCodes: ["c21"] })).toHaveLength(1);
    expect(filterCards(multi, { search: "", colors: [], types: [], setCodes: ["mid"] })).toHaveLength(0);
  });
  it("sets AND with the other filters", () => {
    expect(
      filterCards(list, { search: "", colors: ["U"], types: ["instant"], setCodes: ["RTR", "2XM"] })
        .map((c) => c.oracleId),
    ).toEqual(["c"]);
  });
});

describe("sortCards", () => {
  it("name A→Z", () => {
    const list = [listCard({ oracleId: "a", name: "Cyclonic Rift" }), listCard({ oracleId: "b", name: "Ancestral Recall" })];
    expect(sortCards(list, "name").map((c) => c.name)).toEqual(["Ancestral Recall", "Cyclonic Rift"]);
  });
  it("quantity: high first", () => {
    const list = [listCard({ oracleId: "a", name: "A", quantity: 1 }), listCard({ oracleId: "b", name: "B", quantity: 4 })];
    expect(sortCards(list, "quantity").map((c) => c.quantity)).toEqual([4, 1]);
  });
  it("set: primarySetCode A→Z then name A→Z", () => {
    const list = [
      listCard({ oracleId: "a", name: "B", primarySetCode: "C21" }),
      listCard({ oracleId: "b", name: "A", primarySetCode: "C21" }),
      listCard({ oracleId: "c", name: "C", primarySetCode: "2XM" }),
    ];
    expect(sortCards(list, "set").map((c) => c.name)).toEqual(["C", "A", "B"]);
  });
  it("rarity: common < uncommon < rare < mythic, then name A→Z", () => {
    const list = [
      listCard({ oracleId: "a", name: "M", rarity: "mythic" }),
      listCard({ oracleId: "b", name: "C", rarity: "common" }),
      listCard({ oracleId: "c", name: "R", rarity: "rare" }),
      listCard({ oracleId: "d", name: "U", rarity: "uncommon" }),
    ];
    expect(sortCards(list, "rarity").map((c) => c.name)).toEqual(["C", "U", "R", "M"]);
  });
  it("color: WUBRG order, then multicolor, then colorless, then name A→Z", () => {
    const list = [
      listCard({ oracleId: "a", name: "Multi", colorIdentity: ["W", "U"] }),
      listCard({ oracleId: "b", name: "Colorless", colorIdentity: [] }),
      listCard({ oracleId: "c", name: "White", colorIdentity: ["W"] }),
      listCard({ oracleId: "d", name: "Blue", colorIdentity: ["U"] }),
      listCard({ oracleId: "e", name: "Red", colorIdentity: ["R"] }),
    ];
    expect(sortCards(list, "color").map((c) => c.name)).toEqual([
      "White", "Blue", "Red", "Multi", "Colorless",
    ]);
  });
  it("reverses the primary key when asked, keeping the name tiebreak A→Z", () => {
    const list = [
      listCard({ oracleId: "a", name: "B", quantity: 4 }),
      listCard({ oracleId: "b", name: "A", quantity: 4 }),
      listCard({ oracleId: "c", name: "C", quantity: 1 }),
    ];
    expect(sortCards(list, "quantity", "asc").map((c) => c.name)).toEqual(["C", "A", "B"]);
    expect(sortCards(list, "quantity", "desc").map((c) => c.name)).toEqual(["A", "B", "C"]);
  });
  it("defaults to each key's natural direction", () => {
    const list = [listCard({ oracleId: "a", name: "A", quantity: 1 }), listCard({ oracleId: "b", name: "B", quantity: 4 })];
    expect(sortCards(list, "quantity")).toEqual(sortCards(list, "quantity", "desc"));
    expect(sortCards(list, "name")).toEqual(sortCards(list, "name", "asc"));
  });
  it("name Z→A", () => {
    const list = [listCard({ oracleId: "a", name: "Cyclonic Rift" }), listCard({ oracleId: "b", name: "Ancestral Recall" })];
    expect(sortCards(list, "name", "desc").map((c) => c.name)).toEqual(["Cyclonic Rift", "Ancestral Recall"]);
  });
  it("returns a new array — does not mutate input", () => {
    const list = [listCard({ oracleId: "a", name: "B" }), listCard({ oracleId: "b", name: "A" })];
    const copy = [...list];
    sortCards(list, "name");
    expect(list).toEqual(copy);
  });
});

describe("formatLastUpdated", () => {
  const now = new Date(2026, 6, 19, 12, 0); // Jul 19, 2026
  it("same day → today", () => {
    expect(formatLastUpdated(new Date(2026, 6, 19, 3, 30), now)).toBe("today");
  });
  it("previous day → yesterday", () => {
    expect(formatLastUpdated(new Date(2026, 6, 18, 23, 59), now)).toBe("yesterday");
  });
  it("same year → short month + day", () => {
    expect(formatLastUpdated(new Date(2026, 6, 12), now)).toBe("Jul 12");
  });
  it("prior year → includes year", () => {
    expect(formatLastUpdated(new Date(2025, 11, 3), now)).toBe("Dec 3, 2025");
  });
});

describe("cssUrl", () => {
  it("wraps a plain Scryfall URI in a quoted url()", () => {
    expect(cssUrl("https://cards.scryfall.io/art_crop/front/a/b/abc.jpg?1234")).toBe(
      'url("https://cards.scryfall.io/art_crop/front/a/b/abc.jpg?1234")',
    );
  });
  it("escapes spaces", () => {
    expect(cssUrl("https://x.test/a b.jpg")).toBe('url("https://x.test/a%20b.jpg")');
  });
  it("escapes double quotes so they cannot terminate the url() string", () => {
    expect(cssUrl('https://x.test/a"b.jpg')).toBe('url("https://x.test/a%22b.jpg")');
  });
  it("escapes non-ASCII", () => {
    expect(cssUrl("https://x.test/Æther.jpg")).toBe('url("https://x.test/%C3%86ther.jpg")');
  });
  it("leaves parentheses literal — legal inside the quoted string", () => {
    expect(cssUrl("https://x.test/a(b).jpg")).toBe('url("https://x.test/a(b).jpg")');
  });
});

describe("bracket facts on the browse payload", () => {
  it("omits the list entirely for a card carrying no fact", () => {
    // The payload rule: this is the largest list in the app and the overwhelming
    // majority of cards carry nothing, so an empty array per card would spend bytes
    // to say nothing. Absent is also what the flags table's own absence means.
    const [card] = aggregateCollection([raw({ gameChanger: false })]);
    expect(card.facts).toBeUndefined();
    // Asserted on the SERIALIZED form, because bytes over the wire are the thing the
    // rule is about — an `undefined` value still leaves a key on the object.
    expect(JSON.stringify(card)).not.toContain("facts");
  });

  it("carries gameChanger straight off the card row", () => {
    const [card] = aggregateCollection([raw({ gameChanger: true })]);
    expect(card.facts).toEqual(["gameChanger"]);
  });

  it("survives the list trimmer, which is what the client actually receives", () => {
    // `toListCards` destructures a handful of fields away and spreads the rest; a
    // field added to BrowseCard and not to that spread would vanish between the
    // server and the row that draws it.
    const [listed] = toListCards(aggregateCollection([raw({ gameChanger: true })]));
    expect(listed.facts).toEqual(["gameChanger"]);
  });
});
