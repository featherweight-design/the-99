// The Find a deck call-out's ✕ (tool discovery call 1): the write is the caller's own, never an id the client names.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ close: vi.fn() }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/collection/find-a-deck", () => ({ closeFindADeck: m.close }));

import { closeFindADeckAction } from "./find-a-deck-actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.close.mockResolvedValue(true);
});

describe("closeFindADeckAction", () => {
  it("closes the call-out for the signed-in caller and reports whether it wrote", async () => {
    expect(await closeFindADeckAction()).toEqual({ ok: true, changed: true });
    expect(m.close).toHaveBeenCalledWith("u1", expect.any(Date));
    m.close.mockResolvedValue(false);
    expect(await closeFindADeckAction()).toEqual({ ok: true, changed: false });
  });
});
