import { beforeEach, describe, expect, it, vi } from "vitest";

// THE ENRICHMENT HAD NO BEHAVIOUR TEST — only the cache constants were pinned,
// and the payload probe counts bytes and rows. So a regression in any of the
// three reads, or in the missing-metadata fallbacks, would have served wrong
// prose, gap slots, deck counts or prices with the suite green. Found by the
// pre-open review.
//
// Mocked at the module boundary rather than against a database: what is under
// test is the JOIN this function performs between four sources, and every one of
// them is proved elsewhere (`loadSupportMeta` by its own query shape,
// `gapSlotFor` by `gap-slot.test.ts`, the prices by `price.test.ts`).
vi.mock("../recs/ranked-list", () => ({ getRankedList: vi.fn() }));
vi.mock("../recs/recommend", () => ({ loadCollectionPool: vi.fn() }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn() }));
vi.mock("../recs/free-ranking", () => ({ rankFree: vi.fn() }));
vi.mock("../edhrec/support-read", () => ({ loadSupportMeta: vi.fn() }));
vi.mock("../discovery/novelty", () => ({ loadPlayedTags: vi.fn() }));
// The owned-printing enrichment, which the lane applies itself: `getRankedList` is shared
// with callers that draw no card at all, so the join belongs at the draw, not in it.
vi.mock("../collection/owned-printings", () => ({ withOwnedCardArt: vi.fn() }));

import { commanderRankingsKey, loadCommanderRankings } from "./rankings";
import { discoveryKey } from "../discovery/list";
import { getRankedList } from "../recs/ranked-list";
import { loadCollectionPool } from "../recs/recommend";
import { loadAvailability } from "../decks/availability-query";
import { rankFree } from "../recs/free-ranking";
import { loadSupportMeta } from "../edhrec/support-read";
import { loadPlayedTags } from "../discovery/novelty";
import { withOwnedCardArt } from "../collection/owned-printings";

const item = (oracleId: string, over: Record<string, unknown> = {}) => ({
  oracleId, slug: oracleId, name: oracleId.toUpperCase(),
  typeLine: "Legendary Creature", colorIdentity: ["G"],
  colorPoolSize: 100, roleCounts: { ramp: 1, draw: 1, removal: 1, wipes: 1 },
  edhrecOwnedCount: 10, edhrecTotal: 100,
  fitPool: 8, fitRoles: 5, fitSynergy: 6, synergyState: "ok" as const,
  score: 19, rankScore: 19, measurableTotal: 100,
  imageUri: null, artCropUri: null, receipts: "", ...over,
});

describe("loadCommanderRankings · the row's four joined fields", () => {
  beforeEach(() => {
    // Implementations alone are not enough: without this the CALL COUNTS
    // accumulate across cases, and the no-candidates case read 5 calls from
    // its predecessors while asserting none.
    vi.clearAllMocks();
    vi.mocked(getRankedList).mockResolvedValue({
      items: [item("a"), item("b")],
      degraded: false, uniqueCardsRead: 10, candidateCount: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(loadCollectionPool).mockResolvedValue({ collection: [] as never[] } as never);
    vi.mocked(loadAvailability).mockResolvedValue(new Map());
    vi.mocked(rankFree).mockResolvedValue({ ok: false } as never);
    vi.mocked(loadPlayedTags).mockResolvedValue([
      { deckName: "Zur", colorIdentity: ["W"], slugs: new Set(["blink"]) },
    ]);
    vi.mocked(loadSupportMeta).mockResolvedValue(new Map());
    // Pass-through by default, so every case above reads what it always did.
    vi.mocked(withOwnedCardArt).mockImplementation(async (_userId, rows) => rows);
  });

  it("carries the sentence, the deck count and the gap slot off the metadata", async () => {
    vi.mocked(loadSupportMeta).mockResolvedValue(
      new Map([
        ["a", { prose: "A grinds counters.", deckCount: 1000,
                tags: [{ slug: "counters-matter", label: "Counters Matter", count: 500 }] }],
      ]),
    );

    const { items } = await loadCommanderRankings("user_1");

    expect(items[0].prose).toBe("A grinds counters.");
    expect(items[0].deckCount).toBe(1000);
    expect(items[0].gapSlot).toEqual({ kind: "unplayed", labels: ["Counters Matter"] });
  });

  // THE FALLBACK PATH, and the reason it is not a `?? {}` at the call site: a
  // commander scored but absent from `commander_support` is a real state — the
  // score comes from a per-user cache and the index is rebuilt monthly. Its gap
  // slot must be `noMechanics`, decided by the classifier from an empty tag
  // list, never `allPlayed` — which would assert the reader plays everything a
  // commander with nothing on file leans on.
  it("draws noMechanics for a commander with no support row", async () => {
    const { items } = await loadCommanderRankings("user_1");

    expect(items[0].prose).toBeNull();
    expect(items[0].deckCount).toBeNull();
    expect(items[0].gapSlot).toEqual({ kind: "noMechanics" });
  });

  it("reads the gap slot against THIS reader's played tags", async () => {
    vi.mocked(loadSupportMeta).mockResolvedValue(
      new Map([
        ["a", { prose: null, deckCount: 1000,
                tags: [{ slug: "blink", label: "Blink", count: 500 }] }],
      ]),
    );

    const { items } = await loadCommanderRankings("user_1");

    // `blink` is the fixture deck's tag, so the reader already plays it — and
    // the state carries the commander's own theme, which is what the row prints
    // now that it no longer claims coverage.
    expect(items[0].gapSlot).toEqual({
      kind: "allPlayed",
      labels: ["Blink"],
      capped: false,
    });
  });

  // NO PRICE ON THIS LANE AT ALL. §7.4 row 5 unmounts the slot for an owned
  // commander, and every row here is owned by construction — so the payload
  // carries no price field and the lane reads no feed. The cases that asserted
  // a per-commander slot and a `priceOk` flag went with it; the row component's
  // own tests cover the slot, on the lane that has one.
  it("carries no price field, because every commander here is owned", async () => {
    const { items } = await loadCommanderRankings("user_1");

    expect(items[0]).not.toHaveProperty("price");
    expect(items[0]).not.toHaveProperty("priceOk");
  });

  // Every read is keyed on the listed commanders, so a list of two must not ask
  // for the whole catalogue.
  it("asks for metadata and prices by the ids it is about to draw", async () => {
    await loadCommanderRankings("user_1");

    expect(vi.mocked(loadSupportMeta)).toHaveBeenCalledWith(["a", "b"]);
  });

  // No candidates means the page draws its empty state, and the three reads are
  // skipped rather than made against an empty id list.
  it("makes no row reads when there are no candidates", async () => {
    vi.mocked(getRankedList).mockResolvedValue({
      items: [], degraded: false, uniqueCardsRead: 0, candidateCount: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { items } = await loadCommanderRankings("user_1");

    expect(items).toEqual([]);
    expect(vi.mocked(loadSupportMeta)).not.toHaveBeenCalled();
  });
});


// BOTH CACHE VERSIONS, PINNED TOGETHER, and that pairing is the whole point.
//
// The two payloads are cached under separate constants in separate modules and
// are dropped independently, which `rankings.ts` itself calls "the state nobody
// thinks to check" — a release that changes the row's shape and bumps one leaves
// warm entries of the other decoding into items with no sentence, no gap slot
// and no headline figure.
//
// Nothing else asserts the owned lane's version. `discoveryKey` had its literal
// pinned in `discovery/list.test.ts` and `commanderRankingsKey` had nothing, so
// reverting that half would have failed no test — found by the pre-open review.
// Asserting the pair in one case means a reader editing either sees both lines
// and has to decide about both.
//
// This is a CHANGE DETECTOR on purpose, of the same kind as `about.test.ts`'s
// content hash: there is no invariant relating these two numbers, and the value
// of the case is that a bump cannot be incidental.
//
// IT HAS ALREADY EARNED ITSELF. #702 took `commanderRankingsKey` to v6 while
// this branch was in review, and this case is what forced the collision to be
// noticed and resolved as v7 — rather than both releases sharing a key, which
// would have served every reader whose entry #702 wrote a payload with no
// sentence, no gap slot and no headline figure.
// The lane draws every row, so it pays for the printings itself — and it has to pay
// BEFORE the free ranking, or the two modes disagree about the art.
describe("loadCommanderRankings · the owned printing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRankedList).mockResolvedValue({
      items: [item("a"), item("b")],
      degraded: false, uniqueCardsRead: 10, candidateCount: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(loadCollectionPool).mockResolvedValue({ collection: [] as never[] } as never);
    vi.mocked(loadAvailability).mockResolvedValue(new Map());
    vi.mocked(rankFree).mockResolvedValue({ ok: false } as never);
    vi.mocked(loadPlayedTags).mockResolvedValue([]);
    vi.mocked(loadSupportMeta).mockResolvedValue(new Map());
    vi.mocked(withOwnedCardArt).mockImplementation(async (_userId, rows) =>
      rows.map((r) => ({ ...r, imageUri: "owned.jpg", printedName: "Freya" })),
    );
  });

  it("enriches the rows it is about to draw", async () => {
    const { items } = await loadCommanderRankings("user_1");

    expect(items.map((i) => i.imageUri)).toEqual(["owned.jpg", "owned.jpg"]);
    expect(items[0].printedName).toBe("Freya");
  });

  // `rankFree` rebuilds its rows out of the collection pool, whose art is oracle-level,
  // and `toFreeDelta` diffs field by field — so handing it the UNenriched list would send
  // `imageUri` back as changed and the free-mode flip would repaint the oracle art under
  // the owned printing's name.
  it("hands the free ranking the enriched list, not the raw one", async () => {
    vi.mocked(rankFree).mockResolvedValue({ ok: true, items: [] } as never);

    await loadCommanderRankings("user_1");

    const [, canonical] = vi.mocked(rankFree).mock.calls[0];
    expect((canonical as { imageUri: string | null }[]).every((c) => c.imageUri === "owned.jpg"))
      .toBe(true);
  });
});

describe("the list caches' payload versions", () => {
  it("pins both, so a pair bumped half-way fails", () => {
    expect(commanderRankingsKey).toEqual(["commander-rankings", "v11"]);
    expect(discoveryKey("fit")).toEqual(["discovery", "fit", "v9"]);
  });

  // The sort rides in the key beside the version, so two sorts cannot share an
  // entry — a property of the key's shape rather than of either number.
  it("keeps the two discovery sorts apart at the same version", () => {
    expect(discoveryKey("new")).not.toEqual(discoveryKey("fit"));
    expect(discoveryKey("new")).toContain("v9");
  });
});
