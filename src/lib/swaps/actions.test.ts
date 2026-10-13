import { beforeEach, describe, expect, it, vi } from "vitest";

// The reader's resolved switches: a sentinel holding no variable at all (the flags are mocked below), so a
// write is seen to receive exactly the env the action resolved, and a failing diff prints nothing real.
const ENV = vi.hoisted(() => ({ SENTINEL: "resolved" }) as unknown as NodeJS.ProcessEnv);
vi.mock("../switches/request", () => ({ requestSwitchEnv: vi.fn(async () => ENV) }));

// The two Fits actions are PUBLIC ENDPOINTS: every gate is re-checked here, and the add's
// revalidation waits for `after()` rather than shipping the caller's page back.
const state = vi.hoisted(() => ({ afters: [] as (() => unknown)[], enabled: true, readEnabled: true }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => state.afters.push(fn) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("./flag", () => ({ swapToolsEnabled: () => state.enabled, findADeckReadEnabled: () => state.readEnabled }));
vi.mock("../decks/revalidate-claims", () => ({ revalidateClaims: vi.fn() }));
vi.mock("../decks/read", () => ({ requireDeck: vi.fn(async () => ({ id: "deck" })) }));
vi.mock("../decks/remove-card", () => ({ removeOneCopy: vi.fn(async () => true) }));
vi.mock("./fits", () => ({ loadFits: vi.fn(async () => ({ fits: [] })) }));
vi.mock("./gather", () => ({ loadStandIns: vi.fn() }));
vi.mock("./take", () => ({ setShoppingLimit: vi.fn(), takeStandIn: vi.fn(), undoSwap: vi.fn() }));
vi.mock("../decks/add-card", () => ({
  addCardToDeckFor: vi.fn(async () => ({ result: { ok: true }, wrote: "added" })),
  revalidateAdd: vi.fn(),
}));

const {
  addFromFits, loadFitsAction, loadStandInsAction, swapFromReadAction, takeStandInAction, undoReadAddAction,
  undoReadSwapAction, undoSwapAction,
} = await import("./actions");
const { loadStandIns } = await import("./gather");
const { takeStandIn, undoSwap } = await import("./take");
const { revalidateClaims } = await import("../decks/revalidate-claims");
const { requireDeck } = await import("../decks/read");
const { removeOneCopy } = await import("../decks/remove-card");
const { addCardToDeckFor, revalidateAdd } = await import("../decks/add-card");
const { loadFits } = await import("./fits");

const DECK = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.afters = [];
  state.enabled = true;
  state.readEnabled = true;
  vi.clearAllMocks();
});

describe("addFromFits", () => {
  it("adds through the deck page's own add, for the signed-in reader, with relock off", async () => {
    expect(await addFromFits(DECK, CARD)).toEqual({ ok: true });
    expect(addCardToDeckFor).toHaveBeenCalledWith("user_1", DECK, CARD, { relock: false });
  });

  it("says so when the deck already held the card, so the picker stamps no add", async () => {
    vi.mocked(addCardToDeckFor).mockResolvedValueOnce({ result: { ok: true }, wrote: "held" });
    expect(await addFromFits(DECK, CARD)).toEqual({ ok: true, held: true });
  });

  it("defers its revalidation to after(), so the caller's page is not the reply", async () => {
    await addFromFits(DECK, CARD);
    expect(revalidateAdd).not.toHaveBeenCalled();
    expect(state.afters).toHaveLength(1);
    await state.afters[0]();
    expect(revalidateAdd).toHaveBeenCalledWith(DECK, "user_1", { result: { ok: true }, wrote: "added" });
  });

  it("refuses with the flag off or a malformed id, writing nothing", async () => {
    state.enabled = false;
    expect((await addFromFits(DECK, CARD)).ok).toBe(false);
    state.enabled = true;
    expect((await addFromFits("not-a-uuid", CARD)).ok).toBe(false);
    expect((await addFromFits(DECK, "x")).ok).toBe(false);
    expect(addCardToDeckFor).not.toHaveBeenCalled();
    expect(state.afters).toHaveLength(0);
  });
});

describe("loadFitsAction", () => {
  it("reads for the signed-in reader", async () => {
    await loadFitsAction(CARD);
    expect(loadFits).toHaveBeenCalledWith("user_1", CARD);
  });

  it("answers null with the flag off or a malformed id", async () => {
    state.enabled = false;
    expect(await loadFitsAction(CARD)).toBeNull();
    state.enabled = true;
    expect(await loadFitsAction("nope")).toBeNull();
    expect(loadFits).not.toHaveBeenCalled();
  });
});

// Find a deck read's row actions: the same gates, a take and its undo, and Add only's undo, each
// revalidating in after() because the caller is whatever route the card was opened on.
const CUT = "33333333-3333-4333-8333-333333333333";
const SWAP = "44444444-4444-4444-8444-444444444444";

describe("swapFromReadAction", () => {
  it("takes the card for the read's cut, for the signed-in reader, and revalidates in after()", async () => {
    vi.mocked(takeStandIn).mockResolvedValueOnce({ ok: true, swapId: SWAP, addWasFree: true, cutLeft: 0 });
    expect(await swapFromReadAction(DECK, CUT, CARD)).toEqual({ ok: true, swapId: SWAP, addWasFree: true, cutLeft: 0 });
    expect(takeStandIn).toHaveBeenCalledWith(DECK, "user_1", CUT, CARD, ENV);
    expect(revalidateClaims).not.toHaveBeenCalled();
    await state.afters[0]();
    expect(revalidateClaims).toHaveBeenCalledWith(DECK, "user_1");
  });

  it("refuses with the read's switch off or a malformed id, writing nothing", async () => {
    state.readEnabled = false;
    expect(await swapFromReadAction(DECK, CUT, CARD)).toEqual({ ok: false, reason: "notFound" });
    state.readEnabled = true;
    expect(await swapFromReadAction(DECK, "x", CARD)).toEqual({ ok: false, reason: "notFound" });
    expect(takeStandIn).not.toHaveBeenCalled();
  });

  it("revalidates nothing when the take is refused", async () => {
    vi.mocked(takeStandIn).mockResolvedValueOnce({ ok: false, reason: "notFound" });
    await swapFromReadAction(DECK, CUT, CARD);
    expect(state.afters).toHaveLength(0);
  });
});

describe("undoReadSwapAction", () => {
  it("undoes the reader's own swap and revalidates its deck in after()", async () => {
    vi.mocked(undoSwap).mockResolvedValueOnce(DECK);
    expect(await undoReadSwapAction(SWAP)).toEqual({ ok: true });
    expect(undoSwap).toHaveBeenCalledWith(SWAP, "user_1", ENV);
    await state.afters[0]();
    expect(revalidateClaims).toHaveBeenCalledWith(DECK, "user_1");
  });

  it("is refused for a swap that is not the reader's or already undone, and gated", async () => {
    vi.mocked(undoSwap).mockResolvedValueOnce(null);
    expect(await undoReadSwapAction(SWAP)).toEqual({ ok: false });
    expect(state.afters).toHaveLength(0);
    state.readEnabled = false;
    expect(await undoReadSwapAction(SWAP)).toEqual({ ok: false });
    expect(undoSwap).toHaveBeenCalledTimes(1);
  });
});

describe("undoReadAddAction", () => {
  it("takes one copy out of the reader's own deck and revalidates in after()", async () => {
    expect(await undoReadAddAction(DECK, CARD)).toEqual({ ok: true });
    expect(requireDeck).toHaveBeenCalledWith(DECK, "user_1");
    expect(removeOneCopy).toHaveBeenCalledWith(DECK, CARD);
    await state.afters[0]();
    expect(revalidateClaims).toHaveBeenCalledWith(DECK, "user_1");
  });

  it("refuses a deck that is not the reader's, writing nothing", async () => {
    vi.mocked(requireDeck).mockRejectedValueOnce(new Error("deck not found"));
    expect(await undoReadAddAction(DECK, CARD)).toEqual({ ok: false });
    expect(removeOneCopy).not.toHaveBeenCalled();
  });

  it("is refused with the switch off or a malformed id, and when nothing was there to take out", async () => {
    state.readEnabled = false;
    expect(await undoReadAddAction(DECK, CARD)).toEqual({ ok: false });
    state.readEnabled = true;
    expect(await undoReadAddAction("x", CARD)).toEqual({ ok: false });
    expect(removeOneCopy).not.toHaveBeenCalled();
    vi.mocked(removeOneCopy).mockResolvedValueOnce(false);
    expect(await undoReadAddAction(DECK, CARD)).toEqual({ ok: false });
    expect(state.afters).toHaveLength(0);
  });
});

// Admin adoption 6c: the Shopping sheet's swap tools hand the env they resolved for the reader to the take,
// its undo and the stand-ins read. Identity with the sentinel, so a failing diff prints nothing real.
describe("the swap tools' reads and writes take the reader's resolved env", () => {
  const CUT = "33333333-3333-4333-8333-333333333333";
  const SWAP = "44444444-4444-4444-8444-444444444444";

  it("takeStandInAction hands it to the take", async () => {
    vi.mocked(takeStandIn).mockResolvedValueOnce({ ok: true, swapId: SWAP, addWasFree: true, cutLeft: 0 });
    await takeStandInAction(DECK, CUT, CARD);
    expect(vi.mocked(takeStandIn).mock.calls[0]?.slice(0, 4)).toEqual([DECK, "user_1", CUT, CARD]);
    expect(vi.mocked(takeStandIn).mock.calls[0]?.[4] === ENV).toBe(true);
  });

  it("undoSwapAction hands it to the undo", async () => {
    vi.mocked(undoSwap).mockResolvedValueOnce(DECK);
    expect(await undoSwapAction(SWAP)).toEqual({ ok: true });
    expect(vi.mocked(undoSwap).mock.calls[0]?.slice(0, 2)).toEqual([SWAP, "user_1"]);
    expect(vi.mocked(undoSwap).mock.calls[0]?.[2] === ENV).toBe(true);
  });

  it("loadStandInsAction hands it to the stand-ins read", async () => {
    vi.mocked(loadStandIns).mockResolvedValueOnce(null);
    await loadStandInsAction(DECK, CUT, true);
    expect(vi.mocked(loadStandIns).mock.calls[0]?.slice(0, 4)).toEqual([DECK, "user_1", CUT, true]);
    expect(vi.mocked(loadStandIns).mock.calls[0]?.[4] === ENV).toBe(true);
  });
});
