import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tokensCopy } from "../../lib/copy/tokens";
import type { DeckToken } from "../../lib/tokens/read";
import { TokenShoppingRowView, TokensShoppingFrame, tokenPT } from "./tokens-shopping-view";

// Props only: no provider, no action, no mock. The view is what the landing demo draws.
const token = (over: Partial<DeckToken> = {}): DeckToken => ({
  oracleId: "t1", name: "Soldier", typeLine: "Token Creature — Soldier", colors: [], power: "1", toughness: "1",
  oracleText: null, makers: [{ oracleId: "m1", name: "Maker", imageUri: null }], state: "not", source: null, joined: true,
  picture: null, printingPick: null, price: null, ...over,
});

afterEach(cleanup);

describe("TokenShoppingRowView", () => {
  it("draws the name and the type with its P/T, and routes both presses to its props", () => {
    const onHave = vi.fn();
    const onRemove = vi.fn();
    render(<ul><TokenShoppingRowView token={token()} newestAsOf={null} pending={false} onHave={onHave} onRemove={onRemove} /></ul>);
    expect(screen.getAllByText("Soldier").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText(tokensCopy.row.haveAria("Soldier")));
    fireEvent.click(screen.getByLabelText(tokensCopy.shopping.removeAria("Soldier")));
    expect(onHave).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("draws the tag as a bare price when no card makes the token, and disables both presses while pending", () => {
    const { rerender } = render(<ul><TokenShoppingRowView token={token({ makers: [] })} newestAsOf={null} pending={false} onHave={vi.fn()} onRemove={vi.fn()} /></ul>);
    expect(screen.queryByLabelText(tokensCopy.row.haveAria("Soldier"))).toBeNull();
    rerender(<ul><TokenShoppingRowView token={token()} newestAsOf={null} pending onHave={vi.fn()} onRemove={vi.fn()} /></ul>);
    expect((screen.getByLabelText(tokensCopy.row.haveAria("Soldier")) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText(tokensCopy.shopping.removeAria("Soldier")) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("TokensShoppingFrame and tokenPT", () => {
  it("heads the group with its label and count", () => {
    render(<TokensShoppingFrame count={2}><li>row</li></TokensShoppingFrame>);
    expect(screen.getByText(tokensCopy.group.label)).toBeTruthy();
    expect(screen.getByText("row")).toBeTruthy();
  });

  it("reads P/T only when both halves exist", () => {
    expect(tokenPT({ power: "2", toughness: "3" })).toBe("2/3");
    expect(tokenPT({ power: null, toughness: "3" })).toBeNull();
  });
});
