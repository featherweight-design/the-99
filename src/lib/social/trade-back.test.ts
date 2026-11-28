// The friend head's way back (friend trades PR 8, FromDeck D4): a deck must be the reader's own, else `‹ Friends`.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../decks/read", () => ({ requireDeck: vi.fn() }));

import { requireDeck } from "../decks/read";
import { tradeCopy } from "../copy/trades";
import { resolveTradeBack } from "./trade-back";

const DECK = "4b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resolveTradeBack", () => {
  it("names All shopping without a read", async () => {
    expect(await resolveTradeBack("v", "shopping")).toEqual({ href: "/decks/shopping", label: tradeCopy.from.shopping });
    expect(requireDeck).not.toHaveBeenCalled();
  });

  it("names a deck of the reader's own, read for the reader", async () => {
    vi.mocked(requireDeck).mockResolvedValue({ id: DECK, userId: "v", name: "Lathliss Dragons" } as never);
    expect(await resolveTradeBack("v", `deck/${DECK}`)).toEqual({ href: `/decks/${DECK}`, label: "Lathliss Dragons" });
    expect(requireDeck).toHaveBeenCalledWith(DECK, "v");
  });

  it("draws the plain way back for a deck that is not the reader's", async () => {
    vi.mocked(requireDeck).mockRejectedValue(new Error("deck not found"));
    expect(await resolveTradeBack("v", `deck/${DECK}`)).toBeNull();
  });

  it("passes on a failed read, for the page to report", async () => {
    vi.mocked(requireDeck).mockRejectedValue(new Error("connection reset"));
    await expect(resolveTradeBack("v", `deck/${DECK}`)).rejects.toThrow("connection reset");
  });

  it("reads nothing for an origin outside the closed set", async () => {
    expect(await resolveTradeBack("v", "https://evil.example")).toBeNull();
    expect(await resolveTradeBack("v", `deck/nope`)).toBeNull();
    expect(await resolveTradeBack("v", undefined)).toBeNull();
    expect(requireDeck).not.toHaveBeenCalled();
  });
});
