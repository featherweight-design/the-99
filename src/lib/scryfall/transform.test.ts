import { describe, expect, it } from "vitest";
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
      layout: "normal", backImageUri: null,
    });
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

  it("skips entries without an oracle_id", () => {
    expect(toCardRow({ ...solRing, oracle_id: undefined })).toBeNull();
  });

  it("skips token/emblem/art-series layouts", () => {
    expect(toCardRow({ ...solRing, layout: "token" })).toBeNull();
    expect(toCardRow({ ...solRing, layout: "art_series" })).toBeNull();
  });
});
