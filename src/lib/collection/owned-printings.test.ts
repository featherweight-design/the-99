import { describe, expect, it, vi } from "vitest";

// The collection reader is mocked, because what these cases are about is the TRANSFER —
// which field of an owned printing lands on which field of a row, and what happens to a
// row the lookup does not name. The reader itself is proved against a real Postgres by
// `pnpm probe:commander-art`.
const selectCollectionRows = vi.fn<(userId: string, ids: string[]) => Promise<unknown[]>>();
const aggregateCollection = vi.fn<(rows: unknown[]) => unknown[]>();
const resolvedPrinting = vi.fn<(card: unknown) => unknown>();
vi.mock("./browse", () => ({ selectCollectionRows, aggregateCollection, resolvedPrinting }));

const { commanderDisplayName, withOwnedCardArt } = await import("./owned-printings");

describe("commanderDisplayName", () => {
  // The whole point of the helper: the art beside this name is the owned printing's, so a
  // renamed copy has to be captioned with the name printed on it.
  it("takes the name printed on the copy the player owns", () => {
    expect(commanderDisplayName({
      name: "Iroas, God of Victory",
      printedName: "Freya, Queen of the Valkyries",
    })).toBe("Freya, Queen of the Valkyries");
  });

  it("falls back to the oracle name when the copy prints it", () => {
    expect(commanderDisplayName({ name: "Atraxa, Praetors' Voice", printedName: null }))
      .toBe("Atraxa, Praetors' Voice");
  });

  // ABSENT is a state, not a gap: every commander fixture in the suite omits the field, and
  // so does any payload built before it existed. It has to read as the oracle name rather
  // than as `undefined` on screen.
  it("reads an absent printed name as the oracle name", () => {
    expect(commanderDisplayName({ name: "Muldrotha, the Gravetide" }))
      .toBe("Muldrotha, the Gravetide");
  });
});

describe("withOwnedCardArt", () => {
  const row = (over: Record<string, unknown> = {}): {
    oracleId: string;
    imageUri: string | null;
    artCropUri: string | null;
    printedName?: string | null;
  } => ({
    oracleId: "o-1",
    imageUri: "oracle.jpg",
    artCropUri: "oracle-crop.jpg",
    ...over,
  });

  /** One owned printing, as `aggregateCollection` + `resolvedPrinting` hand it over. */
  const owns = (printing: Record<string, unknown>, printedName: string | null = null) => {
    selectCollectionRows.mockResolvedValue([{}]);
    aggregateCollection.mockReturnValue([{ oracleId: "o-1", printedName }]);
    resolvedPrinting.mockReturnValue({ setCode: "SLD", collectorNumber: "2215", ...printing });
  };

  const ownsNothing = () => {
    selectCollectionRows.mockResolvedValue([]);
    aggregateCollection.mockReturnValue([]);
  };

  it("moves the owned printing's image, crop and printed name onto the row", async () => {
    owns({ imageUri: "owned.jpg", artCropUri: "owned-crop.jpg" }, "Freya, Queen of the Valkyries");

    const [out] = await withOwnedCardArt("user_1", [row()]);

    expect(out.imageUri).toBe("owned.jpg");
    expect(out.artCropUri).toBe("owned-crop.jpg");
    expect(out.printedName).toBe("Freya, Queen of the Valkyries");
  });

  // EACH FIELD FALLS BACK ON ITS OWN. A printing ingested before `printings.art_crop_uri`
  // existed has a front image and no crop, and the pair must not travel together: the front
  // is theirs, the crop is the oracle's until the next catalog refresh fills the column.
  it("keeps the oracle crop when the owned printing has none", async () => {
    owns({ imageUri: "owned.jpg", artCropUri: null });

    const [out] = await withOwnedCardArt("user_1", [row()]);

    expect(out.imageUri).toBe("owned.jpg");
    expect(out.artCropUri).toBe("oracle-crop.jpg");
  });

  // The state every unowned commander is in — `/discover` links to the detail page too —
  // and the state a failed lookup leaves every row in, since `resolveOwnedPrintings`
  // swallows its own failure and returns an empty map.
  it("leaves a row the collection does not name exactly as it was", async () => {
    ownsNothing();

    const [out] = await withOwnedCardArt("user_1", [row()]);

    expect(out.imageUri).toBe("oracle.jpg");
    expect(out.artCropUri).toBe("oracle-crop.jpg");
    expect(out.printedName).toBeUndefined();
  });

  // Never an empty `inArray`: a SQL error in some drivers and a full scan in others.
  it("asks the collection nothing when there are no rows to draw", async () => {
    selectCollectionRows.mockClear();

    expect(await withOwnedCardArt("user_1", [])).toEqual([]);
    expect(selectCollectionRows).not.toHaveBeenCalled();
  });
});
