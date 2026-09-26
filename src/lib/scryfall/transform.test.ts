import { describe, expect, it } from "vitest";
import { faceCosts, frontFaceCost } from "../cards/faces";
import { toCardRow } from "./transform";

const solRing = {
  oracle_id: "5f00ca0a-b5b0-44b4-9d95-3e8e79b0f7ff",
  id: "83f43730-1c1f-4150-8771-d901c54bedd4",
  name: "Sol Ring", mana_cost: "{1}", cmc: 1, color_identity: [],
  type_line: "Artifact", oracle_text: "{T}: Add {C}{C}.", keywords: [],
  legalities: { commander: "legal" }, rarity: "uncommon",
  image_uris: { normal: "https://cards.scryfall.io/normal/x.jpg" },
};

describe("toCardRow", () => {
  it("maps a scryfall bulk entry to a cards row", () => {
    expect(toCardRow(solRing)).toEqual({
      oracleId: "5f00ca0a-b5b0-44b4-9d95-3e8e79b0f7ff",
      scryfallId: "83f43730-1c1f-4150-8771-d901c54bedd4",
      name: "Sol Ring", manaCost: "{1}", cmc: 1, colorIdentity: [],
      typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", keywords: [],
      commanderLegal: true, rarity: "uncommon",
      imageUri: "https://cards.scryfall.io/normal/x.jpg",
      artCropUri: null,
      layout: "normal", backImageUri: null,
      gameChanger: false,
    });
  });

  it("reads game_changer as a strict true", () => {
    expect(toCardRow({ ...solRing, game_changer: true })!.gameChanger).toBe(true);
  });

  // Defensive parsing of an untyped bulk: anything absent or non-boolean reads false, which
  // UNDER-claims — a card that is a Game Changer and reads false loses a mark, where the
  // reverse invents one. Same direction as `commanderLegal`'s `=== "legal"`.
  it("defaults game_changer false when absent or non-boolean", () => {
    expect(toCardRow(solRing)!.gameChanger).toBe(false);
    expect(toCardRow({ ...solRing, game_changer: "yes" })!.gameChanger).toBe(false);
    expect(toCardRow({ ...solRing, game_changer: 1 })!.gameChanger).toBe(false);
  });

  it("stores the art crop, not the framed card image", () => {
    const row = toCardRow({
      ...solRing,
      image_uris: {
        normal: "https://cards.scryfall.io/normal/front/a/b/id.jpg",
        art_crop: "https://cards.scryfall.io/art_crop/front/a/b/id.jpg",
      },
    });
    expect(row?.artCropUri).toBe("https://cards.scryfall.io/art_crop/front/a/b/id.jpg");
    expect(row?.imageUri).toBe("https://cards.scryfall.io/normal/front/a/b/id.jpg");
  });

  it("takes the front face's crop on a modal double-faced card", () => {
    const row = toCardRow({
      ...solRing, image_uris: undefined,
      card_faces: [
        { image_uris: { normal: "front-normal.jpg", art_crop: "front-crop.jpg" } },
        { image_uris: { normal: "back-normal.jpg", art_crop: "back-crop.jpg" } },
      ],
    });
    expect(row?.artCropUri).toBe("front-crop.jpg");
  });

  it("leaves the crop null when Scryfall has none", () => {
    expect(toCardRow({ ...solRing, image_uris: { normal: "n.jpg" } })?.artCropUri).toBeNull();
  });

  it("defaults a layoutless entry to normal rather than dropping the column", () => {
    expect(toCardRow({ ...solRing, layout: undefined })?.layout).toBe("normal");
  });

  it("marks banned cards commanderLegal=false", () => {
    const row = toCardRow({ ...solRing, legalities: { commander: "banned" } });
    expect(row?.commanderLegal).toBe(false);
  });

  it("uses card_faces for oracle text and image on double-faced cards", () => {
    const dfc = {
      ...solRing, oracle_text: undefined, image_uris: undefined,
      card_faces: [
        { oracle_text: "Front text", image_uris: { normal: "https://x/front.jpg" } },
        { oracle_text: "Back text" },
      ],
    };
    const row = toCardRow(dfc);
    expect(row?.oracleText).toBe("Front text\n//\nBack text");
    expect(row?.imageUri).toBe("https://x/front.jpg");
  });

  it("keeps the back face's art when the second face has one", () => {
    const row = toCardRow({
      ...solRing, layout: "transform", image_uris: undefined,
      card_faces: [
        { oracle_text: "Front", image_uris: { normal: "https://x/front.jpg" } },
        { oracle_text: "Back", image_uris: { normal: "https://x/back.jpg" } },
      ],
    });
    expect(row?.layout).toBe("transform");
    expect(row?.imageUri).toBe("https://x/front.jpg");
    expect(row?.backImageUri).toBe("https://x/back.jpg");
  });

  it("gives a split card no back, though it has two faces and two `//`s", () => {
    // Fire // Ice is one piece of card stock. A `//` heuristic would promise a
    // flip here; the layout and the absent per-face art both refuse it.
    const row = toCardRow({
      ...solRing, name: "Fire // Ice", layout: "split", type_line: "Instant // Instant",
      card_faces: [{ oracle_text: "Fire" }, { oracle_text: "Ice" }],
    });
    expect(row?.layout).toBe("split");
    expect(row?.backImageUri).toBeNull();
  });

  it("takes the front face's cost when the two-sided layouts omit the top-level one", () => {
    // Scryfall prints no top-level `mana_cost` on transform or modal_dfc, so a
    // row stored from that field alone has no cost — and the decklist then draws
    // no pips for exactly the cards that carry the `//` mark.
    const row = toCardRow({
      ...solRing, name: "Delver of Secrets // Insectile Aberration",
      layout: "transform", mana_cost: undefined,
      card_faces: [{ mana_cost: "{U}" }, { mana_cost: "" }],
    });
    expect(row?.manaCost).toBe("{U}");
  });

  it("keeps the joined top-level cost a split card already carries", () => {
    // The front face alone would answer `{1}{R}`, which is half the card's cost.
    const row = toCardRow({
      ...solRing, name: "Fire // Ice", layout: "split", mana_cost: "{1}{R} // {1}{U}",
      card_faces: [{ mana_cost: "{1}{R}" }, { mana_cost: "{1}{U}" }],
    });
    expect(row?.manaCost).toBe("{1}{R} // {1}{U}");
  });

  it("leaves a genuinely costless card null rather than storing an empty string", () => {
    expect(toCardRow({ ...solRing, mana_cost: "" })?.manaCost).toBeNull();
  });

  it("skips entries without an oracle_id", () => {
    expect(toCardRow({ ...solRing, oracle_id: undefined })).toBeNull();
  });

  it("skips token/emblem/art-series layouts", () => {
    expect(toCardRow({ ...solRing, layout: "token" })).toBeNull();
    expect(toCardRow({ ...solRing, layout: "art_series" })).toBeNull();
  });

  // The theme fronts, planes, schemes and avatars are not cards either; a front named "Lands"
  // resolved a pasted section header into a deck.
  it("skips every other layout that is not a card", () => {
    for (const layout of ["front_card", "planar", "scheme", "vanguard", "host", "augment"]) {
      expect(toCardRow({ ...solRing, layout })).toBeNull();
    }
  });

  // `normal` in layout: the Experience counter, and an Unfinity sticker sheet.
  it("skips a normal object whose type line names no card type", () => {
    expect(toCardRow({ ...solRing, type_line: "Card" })).toBeNull();
    expect(toCardRow({ ...solRing, type_line: "Stickers" })).toBeNull();
  });
});

describe("a two-sided card's back-face cost", () => {
  // A modal DFC's back face is castable and printed with its own cost. Stored
  // front-only, that cost appeared nowhere in the app; joined, the modal draws
  // both halves and a row still draws the face it shows.
  it("joins both faces when the back has a cost of its own", () => {
    const row = toCardRow({
      ...solRing,
      name: "Birgi, God of Storytelling // Harnfel, Horn of Bounty",
      layout: "modal_dfc", mana_cost: undefined,
      // The real figures: Birgi is {2}{R}, Harnfel {4}{R}. A fixture that
      // invents them is a fixture nobody can check against the card.
      card_faces: [{ mana_cost: "{2}{R}" }, { mana_cost: "{4}{R}" }],
    });
    expect(row?.manaCost).toBe("{2}{R} // {4}{R}");
  });

  // The joined string has to keep answering both of its readers: the row draws
  // the face it shows, the modal draws every cost the card prints.
  it("leaves the row on the front face and the modal on both", () => {
    const row = toCardRow({
      ...solRing, name: "Birgi // Harnfel", layout: "modal_dfc", mana_cost: undefined,
      card_faces: [{ mana_cost: "{2}{R}" }, { mana_cost: "{4}{R}" }],
    });
    expect(frontFaceCost(row?.manaCost ?? "")).toBe("{2}{R}");
    expect(faceCosts(row?.manaCost)).toEqual(["{2}{R}", "{4}{R}"]);
  });

  // A transform back is free, so there is no second cost to join — and no
  // trailing separator stored for one.
  it("stores the front alone when the back face is free", () => {
    const row = toCardRow({
      ...solRing, name: "Delver of Secrets // Insectile Aberration",
      layout: "transform", mana_cost: undefined,
      card_faces: [{ mana_cost: "{U}" }, { mana_cost: "" }],
    });
    expect(row?.manaCost).toBe("{U}");
  });

  // A costless FRONT keeps its empty half rather than inheriting the back's, so
  // a row showing that face draws no pips.
  it("keeps an empty front half rather than borrowing the back's cost", () => {
    const row = toCardRow({
      ...solRing, name: "Some Land // Some Spell", layout: "modal_dfc", mana_cost: undefined,
      card_faces: [{ mana_cost: "" }, { mana_cost: "{3}{R}" }],
    });
    expect(row?.manaCost).toBe(" // {3}{R}");
    expect(frontFaceCost(row?.manaCost ?? "")).toBe("");
    expect(faceCosts(row?.manaCost)).toEqual(["{3}{R}"]);
  });

  it("is null when neither face carries a cost", () => {
    const row = toCardRow({
      ...solRing, name: "A Land // Another Land", layout: "modal_dfc", mana_cost: undefined,
      card_faces: [{ mana_cost: "" }, { mana_cost: "" }],
    });
    expect(row?.manaCost).toBeNull();
  });

  // Untouched: a split card's cost is already joined at the top level, so the
  // faces are never consulted for it.
  it("leaves a split card's top-level cost alone", () => {
    const row = toCardRow({
      ...solRing, name: "Fire // Ice", layout: "split", mana_cost: "{1}{R} // {1}{U}",
      card_faces: [{ mana_cost: "{1}{R}" }, { mana_cost: "{1}{U}" }],
    });
    expect(row?.manaCost).toBe("{1}{R} // {1}{U}");
  });
});
