// Settings › Wishlist's actions (cart on your wishlist, call 1 and M1): what each refuses before it writes, and that a
// write refreshes Settings, every deck page and Wishlist, and a Keep off runs the sync pass before it returns (#3441).
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ sync: vi.fn(), now: vi.fn(), off: vi.fn(), revalidatePath: vi.fn(), order: [] as string[] }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/wishlist/sync", () => ({ setWishlistSync: m.sync, syncWishlistNow: m.now }));
vi.mock("../../lib/wishlist/sync-settings", () => ({ setDecksOffWishlist: m.off }));
vi.mock("../../lib/wishlist/deck-write-cap", () => ({ MAX_DECKS_PER_WRITE: 3 }));

import { setDecksOffWishlistAction, setWishlistSyncAction } from "./wishlist-actions";

const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  m.order.length = 0;
  m.off.mockResolvedValue(true);
  m.now.mockImplementation(async () => { m.order.push("pass"); });
  m.revalidatePath.mockImplementation((path: string) => { m.order.push(path); });
});

describe("setWishlistSyncAction", () => {
  it("writes a boolean and refreshes Settings, the deck pages and Wishlist", async () => {
    expect(await setWishlistSyncAction(true)).toEqual({ ok: true });
    expect(m.sync).toHaveBeenCalledWith("u1", true);
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(m.revalidatePath).toHaveBeenCalledWith("/decks", "layout");
    expect(m.revalidatePath).toHaveBeenCalledWith("/collection/wishlist");
  });

  it("refuses anything but a boolean, writing nothing", async () => {
    expect(await setWishlistSyncAction("true")).toEqual({ ok: false, reason: "invalid" });
    expect(m.sync).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setDecksOffWishlistAction", () => {
  it("writes the reader's decks and refreshes", async () => {
    expect(await setDecksOffWishlistAction([D1, D2], true)).toEqual({ ok: true });
    expect(m.off).toHaveBeenCalledWith("u1", [D1, D2], true);
    expect(m.revalidatePath).toHaveBeenCalledWith("/decks", "layout");
    expect(m.revalidatePath).toHaveBeenCalledWith("/collection/wishlist");
  });

  it("runs the sync pass before it revalidates, so Back to Wishlist reads the deck's lines gone (#3441)", async () => {
    await setDecksOffWishlistAction([D1], true);
    expect(m.now).toHaveBeenCalledWith("u1");
    expect(m.order[0]).toBe("pass");
  });

  it.each([
    ["an empty list", [], true],
    ["a list over the cap", [D1, D2, D1, D2], true],
    ["a non-uuid", [D1, "nope"], true],
    ["a non-array", D1, true],
    ["a non-boolean", [D1], "yes"],
  ])("refuses %s before any write", async (_name, ids, off) => {
    expect(await setDecksOffWishlistAction(ids, off)).toEqual({ ok: false, reason: "invalid" });
    expect(m.off).not.toHaveBeenCalled();
    expect(m.now).not.toHaveBeenCalled();
  });

  it("says invalid, and refreshes nothing, when a deck is not the reader's", async () => {
    m.off.mockResolvedValue(false);
    expect(await setDecksOffWishlistAction([D1], false)).toEqual({ ok: false, reason: "invalid" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
