import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const stub = vi.hoisted(() => ({
  on: true,
  join: vi.fn(), leave: vi.fn(), mark: vi.fn(), unmark: vi.fn(), revalidate: vi.fn(), requireDeck: vi.fn(),
  refresh: vi.fn(), makes: vi.fn(), write: vi.fn(), execute: vi.fn(),
  // The printing the token's own lookup returns: none, or one id.
  found: [] as { id: string }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: stub.revalidate, refresh: stub.refresh }));
vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => unknown) => fn({
      execute: stub.execute,
    }),
  },
}));
vi.mock("../../lib/tokens/deck-printings", () => ({
  writeDeckTokenPrintingIn: stub.write,
  deckMakesTokenIn: async () => stub.makes(),
  heldPrintingByNumber: async () => stub.found[0]?.id ?? null,
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/decks/tokens-flag", () => ({ deckTokensEnabled: () => stub.on }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: stub.requireDeck }));
vi.mock("../../lib/tokens/joins", () => ({
  joinToken: stub.join, leaveToken: stub.leave, markOwnedOnDeck: stub.mark, unmarkOwned: stub.unmark,
}));

import { setDeckTokenPrinting, setTokenHeld, setTokenJoined } from "./token-actions";

const DECK = "00000000-0000-4000-8000-0000000000d1";
const TOKEN = "00000000-0000-4000-8000-0000000000a1";

beforeEach(() => {
  stub.on = true;
  for (const f of Object.values(stub)) if (typeof f === "function" && "mockReset" in f) (f as ReturnType<typeof vi.fn>).mockReset();
  stub.join.mockResolvedValue("done");
  stub.mark.mockResolvedValue("done");
  // The deck makes the token unless a test says otherwise.
  stub.makes.mockReturnValue(true);
  stub.write.mockResolvedValue("ok");
  stub.found = [{ id: "p-1" }];
});

describe("setDeckTokenPrinting (token printings TP2)", () => {
  const P = { setCode: "TCLB", collectorNumber: "4" };

  it("does nothing while the switch is off", async () => {
    stub.on = false;
    expect(await setDeckTokenPrinting(DECK, TOKEN, P)).toEqual({ ok: false, reason: "off" });
    expect(stub.requireDeck).not.toHaveBeenCalled();
    expect(stub.write).not.toHaveBeenCalled();
  });

  it("refuses a malformed id or printing before reading the deck", async () => {
    for (const args of [
      ["nope", TOKEN, P], [DECK, 5, P], [DECK, TOKEN, null], [DECK, TOKEN, { setCode: "TCLB" }],
      [DECK, TOKEN, { setCode: "no spaces!", collectorNumber: "4" }], [DECK, TOKEN, { setCode: "tclb", collectorNumber: "a b" }],
    ] as const) {
      expect(await setDeckTokenPrinting(...(args as unknown as [string, string, unknown]))).toEqual({ ok: false, reason: "refused" });
    }
    expect(stub.requireDeck).not.toHaveBeenCalled();
    expect(stub.write).not.toHaveBeenCalled();
  });

  it("refuses a token the deck does not make, read under the deck's lock", async () => {
    stub.makes.mockReturnValue(false);
    expect(await setDeckTokenPrinting(DECK, TOKEN, P)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(stub.requireDeck).toHaveBeenCalledWith(DECK, "user_1");
    expect(stub.write).not.toHaveBeenCalled();
  });

  it("refuses a set and number that is none of this token's printings", async () => {
    stub.found = [];
    expect(await setDeckTokenPrinting(DECK, TOKEN, P)).toEqual({ ok: false, reason: "notHeld" });
    expect(stub.write).not.toHaveBeenCalled();
    expect(stub.refresh).not.toHaveBeenCalled();
  });

  it("writes the found printing through the writer, lowercased, and refreshes", async () => {
    expect(await setDeckTokenPrinting(DECK.toUpperCase(), TOKEN.toUpperCase(), P)).toEqual({ ok: true });
    // The deck's lock, taken inside the write's transaction.
    expect(stub.execute).toHaveBeenCalledTimes(1);
    expect(stub.write).toHaveBeenCalledWith(expect.anything(), { deckId: DECK, userId: "user_1", tokenOracleId: TOKEN, tokenPrintingId: "p-1" });
    expect(stub.refresh).toHaveBeenCalledTimes(1);
  });

  it("answers the writer's refusal as not held, and refreshes nothing", async () => {
    for (const w of ["notHeld", "notOfToken"]) {
      stub.write.mockResolvedValue(w);
      expect(await setDeckTokenPrinting(DECK, TOKEN, P)).toEqual({ ok: false, reason: "notHeld" });
    }
    expect(stub.refresh).not.toHaveBeenCalled();
  });
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

  it("refuse a flag that is not a boolean, before reading the deck", async () => {
    await expect(setTokenJoined(DECK, TOKEN, "false" as never)).rejects.toThrow("bad token input");
    await expect(setTokenHeld(DECK, TOKEN, 0 as never)).rejects.toThrow("bad token input");
    expect(stub.requireDeck).not.toHaveBeenCalled();
    expect(stub.join).not.toHaveBeenCalled();
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
    expect(stub.unmark).toHaveBeenCalledWith("user_1", DECK, TOKEN);
  });

  it("retire the deck page and the cart on a join, never Home or the deck list", async () => {
    await setTokenJoined(DECK, TOKEN, true);
    expect(stub.revalidate.mock.calls).toEqual([[`/decks/${DECK}`], ["/decks/shopping"]]);
  });

  it("retire EVERY deck page on a hand mark or unmark, because the mark is the account's", async () => {
    await setTokenHeld(DECK, TOKEN, true);
    expect(stub.revalidate.mock.calls).toEqual([[`/decks/${DECK}`], ["/decks/shopping"], ["/decks/[id]", "page"]]);
    stub.revalidate.mockReset();
    await setTokenHeld(DECK, TOKEN, false);
    expect(stub.revalidate.mock.calls).toContainEqual(["/decks/[id]", "page"]);
  });

  it("report a token the deck does not make, and revalidate nothing", async () => {
    stub.join.mockResolvedValue("notThisDeck");
    stub.mark.mockResolvedValue("notThisDeck");
    stub.unmark.mockResolvedValue("notThisDeck");
    expect(await setTokenJoined(DECK, TOKEN, true)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(await setTokenHeld(DECK, TOKEN, true)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(await setTokenHeld(DECK, TOKEN, false)).toEqual({ ok: false, reason: "notThisDeck" });
    expect(stub.revalidate).not.toHaveBeenCalled();
  });
});
