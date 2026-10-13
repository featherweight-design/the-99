import { describe, expect, it, vi } from "vitest";

// The collection reader is mocked, because what these cases are about is the TRANSFER —
// which field of an owned printing lands on which field of a row, and what happens to a
// row the lookup does not name. The reader itself is proved against a real Postgres by
// `pnpm probe:commander-art`.
const selectCollectionRows = vi.fn<(userId: string, ids: string[]) => Promise<unknown[]>>();
const aggregateCollection = vi.fn<(rows: unknown[]) => unknown[]>();
const resolvedPrinting = vi.fn<(card: unknown) => unknown>();
vi.mock("./browse", () => ({ aggregateCollection, resolvedPrinting }));
vi.mock("./browse-read", () => ({ selectCollectionRows }));

const { readOwnedPrintings, resolveOwnedPrintings, withOwnedCardArt } = await import("./owned-printings");

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

// A failed read is two different answers depending on who asks. The art callers fall back to the
// oracle-level picture; the version rows (H31) state ownership, so for them "owns nothing" would
// be a false fact, and the read throws instead.
describe("a failed collection read", () => {
  it("resolves to an empty map for the fail-soft reader", async () => {
    selectCollectionRows.mockRejectedValueOnce(new Error("down"));
    expect((await resolveOwnedPrintings("user_1", ["o-1"])).size).toBe(0);
  });

  it("throws from readOwnedPrintings rather than answering that nothing is owned", async () => {
    selectCollectionRows.mockRejectedValueOnce(new Error("down"));
    await expect(readOwnedPrintings("user_1", ["o-1"])).rejects.toThrow("down");
  });
});
