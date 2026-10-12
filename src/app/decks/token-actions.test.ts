import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  on: true,
  join: vi.fn(), leave: vi.fn(), mark: vi.fn(), unmark: vi.fn(), revalidate: vi.fn(), requireDeck: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: stub.revalidate }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/decks/tokens-flag", () => ({ deckTokensEnabled: () => stub.on }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: stub.requireDeck }));
vi.mock("../../lib/tokens/joins", () => ({
  joinToken: stub.join, leaveToken: stub.leave, markOwnedOnDeck: stub.mark, unmarkOwned: stub.unmark,
}));

import { setTokenHeld, setTokenJoined } from "./token-actions";

const DECK = "00000000-0000-4000-8000-0000000000d1";
const TOKEN = "00000000-0000-4000-8000-0000000000a1";

beforeEach(() => {
  stub.on = true;
  for (const f of Object.values(stub)) if (typeof f === "function" && "mockReset" in f) (f as ReturnType<typeof vi.fn>).mockReset();
  stub.join.mockResolvedValue("done");
  stub.mark.mockResolvedValue("done");
});

describe("token actions", () => {
  it("do nothing at all while the switch is off", async () => {
    stub.on = false;
    expect(await setTokenJoined(DECK, TOKEN, true)).toEqual({ ok: false, reason: "off" });
    expect(await setTokenHeld(DECK, TOKEN, true)).toEqual({ ok: false, reason: "off" });
    expect(stub.requireDeck).not.toHaveBeenCalled();
    expect(stub.join).not.toHaveBeenCalled();
    expect(stub.mark).not.toHaveBeenCalled();
    expect(stub.revalidate).not.toHaveBeenCalled();
  });

  it("refuse a malformed id before reading the deck", async () => {
    await expect(setTokenJoined("nope", TOKEN, true)).rejects.toThrow("bad token input");
    await expect(setTokenHeld(DECK, 5 as never, true)).rejects.toThrow("bad token input");
    expect(stub.requireDeck).not.toHaveBeenCalled();
  });

  it("join and leave go to their own writes for the signed-in player, lowercased", async () => {
    await setTokenJoined(DECK.toUpperCase(), TOKEN.toUpperCase(), true);
    expect(stub.join).toHaveBeenCalledWith("user_1", DECK, TOKEN);
    await setTokenJoined(DECK, TOKEN, false);
    expect(stub.leave).toHaveBeenCalledWith("user_1", DECK, TOKEN);
  });

  it("hold and unhold go to their own writes", async () => {
    await setTokenHeld(DECK, TOKEN, true);
    expect(stub.mark).toHaveBeenCalledWith("user_1", DECK, TOKEN);
    await setTokenHeld(DECK, TOKEN, false);
    expect(stub.unmark).toHaveBeenCalledWith("user_1", TOKEN);
  });

  it("retire the deck page and the cart, never Home or the deck list", async () => {
    await setTokenJoined(DECK, TOKEN, true);
    expect(stub.revalidate.mock.calls.map((c) => c[0])).toEqual([`/decks/${DECK}`, "/decks/shopping"]);
  });

  it("report a token the deck does not make, and revalidate nothing", async () => {
    stub.join.mockResolvedValue("notThisDeck");
    stub.mark.mockResolvedValue("notThisDeck");
    expect(await setTokenJoined(DECK, TOKEN, true)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(await setTokenHeld(DECK, TOKEN, true)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(stub.revalidate).not.toHaveBeenCalled();
  });
});
