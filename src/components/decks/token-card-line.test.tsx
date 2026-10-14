// The card-details tokens line, alone: the press is offered only where the sheet can close to the page.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckToken, DeckTokensRead } from "../../lib/tokens/read";
import { DeckTokensProvider } from "./deck-tokens-context";
import { TokenCardLine } from "./token-card-line";

const food: DeckToken = {
  oracleId: "t1", name: "Food", typeLine: "Token Artifact — Food", colors: [], power: null, toughness: null,
  oracleText: null, makers: [{ oracleId: "m1", name: "Maker", imageUri: null }], state: "not", source: null,
  joined: false, picture: null, printingPick: null, price: null,
};
const read: DeckTokensRead = { status: "ok", read: true, tokens: [food], makerCount: 1, newestPriceAsOf: null };
const draw = (onShowTokens: (() => void) | null) => render(
  <DeckTokensProvider deckId="d1" read={read}><TokenCardLine oracleId="m1" onShowTokens={onShowTokens} /></DeckTokensProvider>,
);

afterEach(cleanup);

describe("TokenCardLine", () => {
  it("offers the Tokens press when the sheet can close to the page", () => {
    draw(vi.fn());
    expect(screen.getByRole("button", { name: "Show this deck’s tokens" })).toBeTruthy();
  });

  it("draws the line with no press where the sheet is stacked over another (no way to close to the page)", () => {
    draw(null);
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
