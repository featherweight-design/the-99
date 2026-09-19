// The pre-filled `/decks/new?commander=…` door. It draws one card at the largest size
// this flow uses, and it arrives from a synergy link rather than from the picker — so it
// misses the list's own resolution and has to do its own. Reverting that left the card
// showing another printing's art with the whole suite green, which is what these pin.
import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
const resolveOwnedPrintings = vi.fn<
  (userId: string, ids: string[]) => Promise<Map<string, unknown>>
>();

vi.mock("../../db", () => ({ db: { select } }));
vi.mock("../collection/owned-printings", () => ({ resolveOwnedPrintings }));

const { loadPreFilledCommander } = await import("./pre-filled-commander");

/** The catalog row, as a single-table select hands it back. */
const catalogRow = (over: Record<string, unknown> = {}) => ({
  oracleId: "o-1",
  name: "Iroas, God of Victory",
  typeLine: "Legendary Creature — God",
  colorIdentity: ["R", "W"],
  imageUri: "oracle.jpg",
  commanderLegal: true,
  oracleText: "Indestructible",
  ...over,
});

const catalogHolds = (row: Record<string, unknown> | null) => {
  select.mockReturnValue({
    from: () => ({ where: async () => (row ? [row] : []) }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveOwnedPrintings.mockResolvedValue(new Map());
});

describe("loadPreFilledCommander", () => {
  it("draws the card from the copy the reader owns", async () => {
    catalogHolds(catalogRow());
    resolveOwnedPrintings.mockResolvedValue(
      new Map([["o-1", {
        printedName: "Freya, Queen of the Valkyries",
        imageUri: "owned.jpg",
        artCropUri: "owned-crop.jpg",
        setCode: "SLD",
        collectorNumber: "2215",
      }]]),
    );

    const commander = await loadPreFilledCommander("user_1", "o-1");

    expect(commander?.name).toBe("Freya, Queen of the Valkyries");
    expect(commander?.imageUri).toBe("owned.jpg");
  });

  // The ordinary case: this door is reached from a synergy link, so the commander is often
  // one the reader does not own at all.
  it("keeps the catalog's name and art for a commander not owned", async () => {
    catalogHolds(catalogRow());

    const commander = await loadPreFilledCommander("user_1", "o-1");

    expect(commander?.name).toBe("Iroas, God of Victory");
    expect(commander?.imageUri).toBe("oracle.jpg");
  });

  // Each field falls back on its own, as it does everywhere else this rule is applied: a
  // renamed copy whose printing carries no image keeps the catalog picture under its own
  // printed name rather than losing both to one missing field.
  it("falls back per field", async () => {
    catalogHolds(catalogRow());
    resolveOwnedPrintings.mockResolvedValue(
      new Map([["o-1", {
        printedName: "Freya, Queen of the Valkyries",
        imageUri: null,
        artCropUri: null,
        setCode: "SLD",
        collectorNumber: "2215",
      }]]),
    );

    const commander = await loadPreFilledCommander("user_1", "o-1");

    expect(commander?.name).toBe("Freya, Queen of the Valkyries");
    expect(commander?.imageUri).toBe("oracle.jpg");
  });

  // The three refusals, which are what send the route to its picker door instead. The
  // legality checks are the reason this read is not just a select: a `?commander=` naming
  // Sol Ring must not pre-fill a deck with it.
  it("refuses a parameter the catalog does not name", async () => {
    catalogHolds(null);
    expect(await loadPreFilledCommander("user_1", "nope")).toBeNull();
  });

  it("refuses a card that is not commander-legal", async () => {
    catalogHolds(catalogRow({ commanderLegal: false }));
    expect(await loadPreFilledCommander("user_1", "o-1")).toBeNull();
  });

  it("refuses a legal card that cannot lead a deck", async () => {
    catalogHolds(catalogRow({ typeLine: "Artifact", oracleText: "Tap: add one mana." }));
    expect(await loadPreFilledCommander("user_1", "o-1")).toBeNull();
  });

  // A refusal must not pay for a collection read it will never use.
  it("asks about printings only once the card has passed every check", async () => {
    catalogHolds(catalogRow({ commanderLegal: false }));
    await loadPreFilledCommander("user_1", "o-1");
    expect(resolveOwnedPrintings).not.toHaveBeenCalled();
  });
});
