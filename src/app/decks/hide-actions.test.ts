// Hidden from friends' action (friend decks G2): `invalid` before any write for a malformed argument or a deck that is not theirs, and both surfaces that draw the mark revalidated.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(), revalidatePath: vi.fn(), setDeckHiddenFromFriends: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/social/deck-visibility", () => ({ setDeckHiddenFromFriends: m.setDeckHiddenFromFriends }));

import { setDeckHiddenFromFriendsAction } from "./hide-actions";

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_me");
  m.setDeckHiddenFromFriends.mockResolvedValue(true);
});

describe("setDeckHiddenFromFriendsAction", () => {
  it("refuses a deck id that is not a uuid, or a value that is not a boolean, before any write", async () => {
    for (const [id, hidden] of [["nope", true], [[DECK], true], [DECK, "true"], [DECK, 1]] as const) {
      expect(await setDeckHiddenFromFriendsAction(id, hidden)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.setDeckHiddenFromFriends).not.toHaveBeenCalled();
  });

  it("calls a deck that is not the reader's invalid, and revalidates nothing", async () => {
    m.setDeckHiddenFromFriends.mockResolvedValue(false);
    expect(await setDeckHiddenFromFriendsAction(DECK, true)).toEqual({ ok: false, reason: "invalid" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes the reader's own deck and revalidates its page and /decks", async () => {
    expect(await setDeckHiddenFromFriendsAction(DECK, false)).toEqual({ ok: true });
    expect(m.setDeckHiddenFromFriends).toHaveBeenCalledWith("user_me", DECK, false);
    expect(m.revalidatePath.mock.calls.map((c) => c[0])).toEqual([`/decks/${DECK}`, "/decks"]);
  });
});
