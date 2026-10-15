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
import { DeckPageSwitches } from "./deck-page-switches";
import { OVER_LIMIT_RING } from "./buy-tag";

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

describe("the key's `over $N` item (phone Shopping row option B)", () => {
  const on = (ui: React.ReactNode, rowB = true) => (
    <DeckPageSwitches howItWorks={false} phoneShoppingRowB={rowB}>{withTools(ui)}</DeckPageSwitches>
  );

  it("draws an outlined plate and `over $10` after the buy item, below md", () => {
    render(on(<GotItProvider deckId={DECK}>{head()}</GotItProvider>));
    const item = screen.getByTestId("shopping-key-over");
    expect(item).toHaveTextContent(swapToolsCopy.row.over("$10"));
    expect(item.className).toContain("md:hidden");
    expect((item.firstElementChild as HTMLElement).style.boxShadow).toBe(OVER_LIMIT_RING);
    // After the buy item, in the key's own grid.
    const key = screen.getByTestId("shopping-key");
    expect(Array.from(key.children).at(-1)).toBe(item);
  });

  it("is drawn beside main's ⇄ line when I got it is off", () => {
    render(on(head()));
    expect(screen.getByText(swapToolsCopy.limit.key, { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId("shopping-key-over")).toBeInTheDocument();
  });

  it("is absent with the switch off, and with the swap tools off", () => {
    render(on(<GotItProvider deckId={DECK}>{head()}</GotItProvider>, false));
    expect(screen.queryByTestId("shopping-key-over")).toBeNull();
    cleanup();
    render(
      <DeckPageSwitches howItWorks={false} phoneShoppingRowB>
        <GotItProvider deckId={DECK}>{head()}</GotItProvider>
      </DeckPageSwitches>,
    );
    expect(screen.queryByTestId("shopping-key-over")).toBeNull();
  });
});
