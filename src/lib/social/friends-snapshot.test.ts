// /friends reads its friends and open links from one snapshot, so a redraw never holds a redeemed link's absence
// beside the old friend list.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ transaction: vi.fn(), tx: { tag: "tx" } }));
vi.mock("../../db", () => ({ db: { transaction: stub.transaction } }));
const reads = vi.hoisted(() => ({ friends: vi.fn(), links: vi.fn() }));
vi.mock("./access", () => ({ listFriends: reads.friends, resolveFriend: vi.fn() }));

import { loadFriendsAndLinks } from "./friends";

describe("loadFriendsAndLinks", () => {
  it("reads both lists inside one repeatable-read transaction", async () => {
    stub.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(stub.tx));
    reads.friends.mockResolvedValue([{ publicId: "p-mo" }]);
    const where = vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([{ token: "t" }]) });
    const tx = { select: () => ({ from: () => ({ where }) }) };
    stub.tx = tx as unknown as typeof stub.tx;
    const out = await loadFriendsAndLinks("user_1", new Date("2026-10-15T12:00:00Z"));
    expect(stub.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "repeatable read" });
    expect(reads.friends).toHaveBeenCalledWith("user_1", tx);
    expect(where).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ friends: [{ publicId: "p-mo" }], links: [{ token: "t" }] });
  });
});
