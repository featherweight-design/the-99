import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/swaps/actions", () => ({ setShoppingLimitAction: vi.fn() }));
vi.mock("../../app/collection/edit-actions", () => ({ loadPrintingChoices: vi.fn(async () => []) }));
vi.mock("../../app/decks/mark-bought-actions", () => ({ markBought: vi.fn() }));

import { gotItCopy } from "../../lib/copy/i-got-it";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { SwapToolsProvider } from "../../lib/swaps/context";
import { GotItProvider } from "./got-it";
import { ShoppingKey } from "./shopping-key";
import { StandInLimit } from "./stand-in-limit";

const DECK = "00000000-0000-4000-8000-000000000001";
const head = (count = 9) => (
  <>
    <StandInLimit shoppingCount={count} overCount={2} />
    <ShoppingKey shoppingCount={count} />
  </>
);
const withTools = (ui: React.ReactNode) => (
  <SwapToolsProvider deckId={DECK} deckName="Test deck" storedLimitCents={null}>{ui}</SwapToolsProvider>
);

afterEach(cleanup);

describe("the Shopping head's key", () => {
  it("is main's ⇄ line with I got it off", () => {
    render(withTools(head()));
    expect(screen.getByText(swapToolsCopy.limit.key, { exact: false })).toBeInTheDocument();
    expect(screen.queryByTestId("shopping-key")).toBeNull();
    expect(screen.queryByText(gotItCopy.row.keyBuy)).toBeNull();
  });

  it("draws both short items with I got it and the swap tools on, and drops the shipped ⇄ line", () => {
    render(withTools(<GotItProvider deckId={DECK}>{head()}</GotItProvider>));
    expect(screen.getByText(gotItCopy.row.keySwap)).toBeInTheDocument();
    expect(screen.getByText(gotItCopy.row.keyBuy)).toBeInTheDocument();
    expect(screen.queryByText(swapToolsCopy.limit.key, { exact: false })).toBeNull();
  });

  it("is a grid on the phone and one row from lg", () => {
    render(<GotItProvider deckId={DECK}>{head()}</GotItProvider>);
    const key = screen.getByTestId("shopping-key");
    expect(key.className).toContain("grid-cols-2");
    expect(key.className).toContain("lg:flex");
    expect(key.className).not.toContain("md:flex");
  });

  it("draws the buy item alone with the swap tools off", () => {
    render(<GotItProvider deckId={DECK}>{head()}</GotItProvider>);
    expect(screen.getByText(gotItCopy.row.keyBuy)).toBeInTheDocument();
    expect(screen.queryByText(gotItCopy.row.keySwap)).toBeNull();
  });

  it("draws nothing on an empty Shopping list", () => {
    render(<GotItProvider deckId={DECK}>{head(0)}</GotItProvider>);
    expect(screen.queryByTestId("shopping-key")).toBeNull();
  });
});
