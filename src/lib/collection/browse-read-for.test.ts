// `loadBrowseCardsFor`: the fields route's bounded read. Same passes as the whole list, over the
// rows of the named cards only, and nothing of another reader's.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawCollectionRow } from "./browse";

const rowsByUser: Record<string, RawCollectionRow[]> = {};
const asked: { userId: string; ids: string | string[] | undefined }[] = [];
vi.mock("./browse-rows-query", () => ({
  // Stands in for the SQL: the reader's rows, narrowed by the ids as the WHERE would.
  collectionRowsQuery: (_db: unknown, userId: string, ids?: string | string[]) => {
    asked.push({ userId, ids });
    const want = ids === undefined ? null : new Set(Array.isArray(ids) ? ids : [ids]);
    return Promise.resolve((rowsByUser[userId] ?? []).filter((r) => !want || want.has(r.oracleId)));
  },
}));
vi.mock("../../db", () => ({ db: {} }));
const flagsRead = vi.fn(async (_ids: string[]) => new Map());
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: (ids: string[]) => flagsRead(ids) }));
const partnersRead = vi.fn();
vi.mock("../combos/near-miss", () => ({ loadOwnBothPartners: (a: unknown) => partnersRead(a) }));
vi.mock("../cards/prices", () => ({ loadOwnedPrintingPrices: async () => new Map() }));

const { loadBrowseCards, loadBrowseCardsFor } = await import("./browse-read");
const { collectionDrawFieldsFor } = await import("./list-wire");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const row = (oracleId: string, over: Partial<RawCollectionRow> = {}): RawCollectionRow => ({
  oracleId, quantity: 1, setCode: "c21", collectorNumber: "1", finish: "nonfoil", name: oracleId, typeLine: "Instant",
  manaCost: "{U}", cmc: 1, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["U"], gameChanger: false,
  layout: "normal", backImageUri: null, setName: "Commander 2021", releasedAt: "2021-04-23",
  preferredSetCode: null, preferredCollectorNumber: null, scryfallId: null, exactImageUri: `https://x/${oracleId}-e.jpg`,
  representativeImageUri: null, cardImageUri: null, exactArtCropUri: null, representativeArtCropUri: null,
  cardArtCropUri: null, flavorName: null, representativeFlavorName: null, exactBackImageUri: null,
  representativeBackImageUri: null, ...over,
});

beforeEach(() => {
  for (const k of Object.keys(rowsByUser)) delete rowsByUser[k];
  asked.length = 0;
  flagsRead.mockClear();
  partnersRead.mockReset();
  partnersRead.mockResolvedValue(new Map());
  rowsByUser.u1 = [row(A), row(B, { gameChanger: true }), row(C, { finish: "foil" }), row(C, { setCode: "lea", collectorNumber: "9" })];
  rowsByUser.u2 = [row(A, { exactImageUri: "https://x/other-reader.jpg" })];
  partnersRead.mockImplementation(async ({ oracleIds }: { oracleIds?: string[] }) => {
    const out = new Map<string, { partnerOracleId: string; partnerName: string; otherPartners: number }>();
    if (!oracleIds || oracleIds.includes(A)) out.set(A, { partnerOracleId: B, partnerName: "Bee", otherPartners: 2 });
    return out;
  });
});

describe("loadBrowseCardsFor", () => {
  it("answers the same fields the whole-list path would, for the same ids", async () => {
    const ids = new Set([A, B, C]);
    const whole = await loadBrowseCards("u1", async () => new Map());
    const bounded = await loadBrowseCardsFor("u1", [A, B, C]);
    expect(collectionDrawFieldsFor(bounded, ids)).toEqual(collectionDrawFieldsFor(whole.cards, ids));
    // And it is not vacuous: the combo clause, the facts and the art all came through.
    const fields = collectionDrawFieldsFor(bounded, ids);
    expect(fields[A].comboPartner).toEqual({ name: "Bee" });
    expect(fields[A].comboOtherPartners).toBe(2);
    expect(fields[B].facts).toEqual(["gameChanger"]);
    expect(fields[A].imageUri).toBe(`https://x/${A}-e.jpg`);
  });

  it("matches the whole list for a subset too, reading only that subset", async () => {
    const whole = await loadBrowseCards("u1", async () => new Map());
    const bounded = await loadBrowseCardsFor("u1", [C]);
    expect(collectionDrawFieldsFor(bounded, new Set([C]))).toEqual(collectionDrawFieldsFor(whole.cards, new Set([C])));
    expect(bounded.map((c) => c.oracleId)).toEqual([C]);
    // The batch's ids reach the three reads, and the rows read are the reader's, narrowed.
    expect(asked.at(-1)).toEqual({ userId: "u1", ids: [C] });
    expect(flagsRead).toHaveBeenLastCalledWith([C]);
    expect(partnersRead).toHaveBeenLastCalledWith({ userId: "u1", oracleIds: [C] });
  });

  it("never reads another reader's rows: the user id is the session's, and a shared id answers with the reader's own copy", async () => {
    const [mine] = await loadBrowseCardsFor("u1", [A]);
    const [theirs] = await loadBrowseCardsFor("u2", [A]);
    expect(mine.imageUri).toBe(`https://x/${A}-e.jpg`);
    expect(theirs.imageUri).toBe("https://x/other-reader.jpg");
    expect(asked.map((a) => a.userId)).toEqual(["u1", "u2"]);
  });

  it("omits an id the reader does not hold", async () => {
    expect(await loadBrowseCardsFor("u2", [B, C])).toEqual([]);
    expect((await loadBrowseCardsFor("u2", [A, B])).map((c) => c.oracleId)).toEqual([A]);
  });

  it("reads nothing for no ids", async () => {
    expect(await loadBrowseCardsFor("u1", [])).toEqual([]);
    expect(asked).toEqual([]);
  });

  it("reads no prices: a price is not a draw field", async () => {
    const cards = await loadBrowseCardsFor("u1", [A]);
    expect(Object.hasOwn(cards[0], "price")).toBe(false);
  });
});
