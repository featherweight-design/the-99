// Where a trade sheet opened from (friend trades PR 8, FromDeck D4): a closed set, never echoed into an href as given.
import { describe, expect, it } from "vitest";
import { parseTradeFrom, tradeFromHref, tradeFromParam, tradeHref } from "./trade-from";

const DECK = "4b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const FRIEND = "6b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";

describe("parseTradeFrom", () => {
  it("takes the closed set: All shopping, or a deck by uuid", () => {
    expect(parseTradeFrom("shopping")).toEqual({ kind: "shopping" });
    expect(parseTradeFrom(`deck/${DECK}`)).toEqual({ kind: "deck", deckId: DECK });
    expect(parseTradeFrom(`deck/${DECK.toUpperCase()}`)).toEqual({ kind: "deck", deckId: DECK });
  });

  it.each([
    undefined, null, 7, ["shopping"], "", "Shopping", "shopping/", "deck/", "deck/nope", `deck/${DECK}/x`, `deck/${DECK}?a=1`,
    `/decks/${DECK}`, "https://evil.example", "//evil.example", "javascript:alert(1)", `deck/../${DECK}`,
  ])("ignores anything else: %j", (raw) => {
    expect(parseTradeFrom(raw)).toBeNull();
  });
});

describe("the hrefs", () => {
  it("are rebuilt from the parsed parts, never the raw text", () => {
    expect(tradeFromHref({ kind: "shopping" })).toBe("/decks/shopping");
    expect(tradeFromHref({ kind: "deck", deckId: DECK })).toBe(`/decks/${DECK}`);
    expect(tradeFromParam({ kind: "deck", deckId: DECK })).toBe(`deck/${DECK}`);
    // Round trip: what Open the trade writes is what the tab parses.
    const href = tradeHref(FRIEND, "t1", { kind: "deck", deckId: DECK });
    expect(href).toBe(`/friends/${FRIEND}/spares?trade=t1&from=deck%2F${DECK}`);
    const from = new URL(href, "https://x.test").searchParams.get("from");
    expect(parseTradeFrom(from)).toEqual({ kind: "deck", deckId: DECK });
    expect(tradeHref(FRIEND, "t1", { kind: "shopping" })).toBe(`/friends/${FRIEND}/spares?trade=t1&from=shopping`);
  });
});
