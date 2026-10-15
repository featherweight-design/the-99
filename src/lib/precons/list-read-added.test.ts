import { beforeEach, describe, expect, it, vi } from "vitest";

// The pick's added marks (no-collection entry S17) come from ONE read of the player's standing precon adds for the
// whole list, in the list's own snapshot, and never from a read per row. The plain list reads none.
const h = vi.hoisted(() => {
  // Every query chain, whatever its shape, resolves to no rows.
  const chain: unknown = new Proxy(function () {}, {
    get: (_t, key) => (key === "then" ? (ok: (v: unknown[]) => void) => ok([]) : chain),
    apply: () => chain,
  });
  return { tx: chain, standing: vi.fn<(user: string, runner: unknown) => Promise<{ id: string; fileName: string; createdAt: Date; tokens: [] }[]>>(async () => []) };
});
vi.mock("../../db", () => ({ db: { transaction: async (fn: (tx: unknown) => unknown) => fn(h.tx) } }));
vi.mock("./added", () => ({ standingPreconAdds: h.standing }));

import { loadPreconList } from "./list-read";

beforeEach(() => h.standing.mockClear());

describe("loadPreconList: the pick's standing adds", () => {
  it("reads the standing adds once for the whole list, in the list's transaction", async () => {
    h.standing.mockResolvedValueOnce([{ id: "e1", fileName: "Abzan", createdAt: new Date("2026-06-30T12:00:00Z"), tokens: [] }]);
    const list = await loadPreconList("user_1", { boxes: true });
    expect(h.standing).toHaveBeenCalledTimes(1);
    const [user, runner] = h.standing.mock.calls[0] as unknown[];
    expect(user).toBe("user_1");
    expect(runner === h.tx).toBe(true);
    expect(list.added).toEqual({});
  });

  it("reads none for the plain list", async () => {
    const list = await loadPreconList("user_1");
    expect(h.standing).not.toHaveBeenCalled();
    expect(list.added).toBeUndefined();
  });
});
