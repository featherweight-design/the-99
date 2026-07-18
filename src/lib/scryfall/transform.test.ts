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
    });
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

  it("skips entries without an oracle_id", () => {
    expect(toCardRow({ ...solRing, oracle_id: undefined })).toBeNull();
  });

  it("skips token/emblem/art-series layouts", () => {
    expect(toCardRow({ ...solRing, layout: "token" })).toBeNull();
    expect(toCardRow({ ...solRing, layout: "art_series" })).toBeNull();
  });
});
