import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setShoppingLimitAction = vi.fn(async () => ({ ok: true }));
vi.mock("../../lib/swaps/actions", () => ({ setShoppingLimitAction: (...a: unknown[]) => setShoppingLimitAction(...(a as [])) }));

import { swapToolsCopy as copy } from "../../lib/copy/swap-tools";
import { SwapToolsProvider } from "../../lib/swaps/context";
import { StandInLimit } from "./stand-in-limit";

const DECK = "00000000-0000-4000-8000-000000000001";
const draw = (stored: number | null, over = 4, count = 9) =>
  render(
    <SwapToolsProvider deckId={DECK} deckName="Test deck" storedLimitCents={stored}>
      <StandInLimit shoppingCount={count} overCount={over} />
    </SwapToolsProvider>,
  );

beforeEach(() => setShoppingLimitAction.mockClear());

describe("the Shopping limit line", () => {
  it("draws nothing with the tools off, or on an empty Shopping list", () => {
    const { container } = render(<StandInLimit shoppingCount={9} overCount={4} />);
    expect(container).toBeEmptyDOMElement();
    draw(null, 0, 0);
    expect(screen.queryByTestId("stand-in-limit")).toBeNull();
  });

  it("reads an unset deck as $10, with the default chip and the count", () => {
    draw(null);
    expect(screen.getByRole("button", { name: copy.limit.editAria("$10") })).toHaveTextContent("$10");
    expect(screen.getByText(copy.limit.defaultChip)).toBeInTheDocument();
    expect(screen.getByText(copy.limit.overCount(4))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.limit.reset("$10") })).toBeNull();
  });

  it("reads a set limit with reset in the chip's place, and says none over at zero", () => {
    draw(2500, 0);
    expect(screen.getByRole("button", { name: copy.limit.editAria("$25") })).toBeInTheDocument();
    expect(screen.queryByText(copy.limit.defaultChip)).toBeNull();
    expect(screen.getByRole("button", { name: copy.limit.reset("$10") })).toBeInTheDocument();
    expect(screen.getByText(copy.limit.noneOver("$25"))).toBeInTheDocument();
  });

  it("saves a whole-dollar figure, and announces it", async () => {
    draw(null);
    fireEvent.click(screen.getByRole("button", { name: copy.limit.editAria("$10") }));
    fireEvent.change(screen.getByRole("textbox", { name: copy.limit.fieldAria }), { target: { value: "25" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.limit.save })); });
    expect(setShoppingLimitAction).toHaveBeenCalledWith(DECK, 2500);
    expect(screen.getByRole("status")).toHaveTextContent(copy.announce.limitSaved("$25"));
  });

  it("refuses a figure that is not a whole dollar, and saves nothing", async () => {
    draw(null);
    fireEvent.click(screen.getByRole("button", { name: copy.limit.editAria("$10") }));
    fireEvent.change(screen.getByRole("textbox", { name: copy.limit.fieldAria }), { target: { value: "2.50" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.limit.save })); });
    expect(setShoppingLimitAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.limit.invalid);
  });

  it("resets a set limit to the default", async () => {
    draw(2500);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.limit.reset("$10") })); });
    expect(setShoppingLimitAction).toHaveBeenCalledWith(DECK, null);
  });
});
