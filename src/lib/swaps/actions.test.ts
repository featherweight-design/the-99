import { beforeEach, describe, expect, it, vi } from "vitest";

// The two Fits actions are PUBLIC ENDPOINTS: every gate is re-checked here, and the add's
// revalidation waits for `after()` rather than shipping the caller's page back.
const state = vi.hoisted(() => ({ afters: [] as (() => unknown)[], enabled: true }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => state.afters.push(fn) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("./flag", () => ({ swapToolsEnabled: () => state.enabled }));
vi.mock("./fits", () => ({ loadFits: vi.fn(async () => ({ fits: [] })) }));
vi.mock("./gather", () => ({ loadStandIns: vi.fn() }));
vi.mock("./take", () => ({ setShoppingLimit: vi.fn(), takeStandIn: vi.fn(), undoSwap: vi.fn() }));
vi.mock("../decks/add-card", () => ({
  addCardToDeckFor: vi.fn(async () => ({ result: { ok: true }, wrote: "added" })),
  revalidateAdd: vi.fn(),
}));

const { addFromFits, loadFitsAction } = await import("./actions");
const { addCardToDeckFor, revalidateAdd } = await import("../decks/add-card");
const { loadFits } = await import("./fits");

const DECK = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.afters = [];
  state.enabled = true;
  vi.clearAllMocks();
});

describe("addFromFits", () => {
  it("adds through the deck page's own add, for the signed-in reader, with relock off", async () => {
    expect(await addFromFits(DECK, CARD)).toEqual({ ok: true });
    expect(addCardToDeckFor).toHaveBeenCalledWith("user_1", DECK, CARD, { relock: false });
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
