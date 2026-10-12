// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const stub = vi.hoisted(() => ({ held: vi.fn(), joined: vi.fn(), open: vi.fn() }));

vi.mock("../../app/decks/token-actions", () => ({ setTokenHeld: stub.held, setTokenJoined: stub.joined }));
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ open: stub.open }),
  useCardIntent: () => ({}),
}));

import { DeckTokensProvider } from "./deck-tokens-context";
import { TokensGroup } from "./tokens-group";
import { makerColumns } from "./token-makers";
import type { DeckToken, DeckTokensRead, TokenMaker } from "../../lib/tokens/read";

const DECK = "00000000-0000-4000-8000-0000000000d1";
const maker = (n: number): TokenMaker => ({ oracleId: `m${String(n).padStart(3, "0")}`, name: `Maker ${String(n).padStart(2, "0")}`, imageUri: null });
const makers = (n: number) => Array.from({ length: n }, (_, i) => maker(i + 1));

const token = (over: Partial<DeckToken> = {}): DeckToken => ({
  oracleId: "t1", name: "Food", typeLine: "Token Artifact — Food", colors: [], power: null, toughness: null,
  oracleText: null, makers: makers(1), state: "not", source: null, joined: false, picture: null, price: null, ...over,
});

const ok = (tokens: DeckToken[], over: Partial<Extract<DeckTokensRead, { status: "ok" }>> = {}): DeckTokensRead =>
  ({ status: "ok", read: true, tokens, makerCount: 6, newestPriceAsOf: null, ...over });

const draw = (read: DeckTokensRead) => render(<DeckTokensProvider deckId={DECK} read={read}><TokensGroup /></DeckTokensProvider>);

beforeEach(() => {
  for (const f of Object.values(stub)) f.mockReset();
  stub.held.mockResolvedValue({ ok: true });
  stub.joined.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("TokensGroup presence", () => {
  it("draws nothing outside a provider, for an absent read, and says so for a failed one", () => {
    const { container, rerender } = render(<TokensGroup />);
    expect(container.innerHTML).toBe("");
    rerender(<DeckTokensProvider deckId={DECK} read={{ status: "absent" }}><TokensGroup /></DeckTokensProvider>);
    expect(container.innerHTML).toBe("");
    rerender(<DeckTokensProvider deckId={DECK} read={{ status: "failed" }}><TokensGroup /></DeckTokensProvider>);
    expect(screen.getByText("Tokens couldn’t be read just now.")).toBeTruthy();
    // The header's note (desktop) and the phone's sub-line are both drawn.
    expect(screen.getAllByText("not in the 99").length).toBe(2);
    // A failed group has no honest count to give, so none is drawn.
    expect(screen.getByRole("heading", { name: "Tokens" })).toBeTruthy();
  });

  it("heads the rows with their count and the cards that make them", () => {
    draw(ok([token({ oracleId: "a", name: "Ally" }), token({ oracleId: "b", name: "Food" })], { makerCount: 6 }));
    expect(screen.getByRole("heading", { name: "Tokens · 2" })).toBeTruthy();
    expect(screen.getAllByText("not in the 99 · from 6 cards").length).toBeGreaterThan(0);
  });
});

describe("the unknown band", () => {
  it("shows once, with the upload link, when the account has not been read", () => {
    draw(ok([token({ state: "unknown" }), token({ oracleId: "b", state: "unknown" })], { read: false }));
    expect(screen.getAllByText(/hasn’t been read for tokens yet/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Upload your collection" }).getAttribute("href")).toBe("/collection");
  });
  it("is absent once the account has been read", () => {
    draw(ok([token()]));
    expect(screen.queryByText(/hasn’t been read for tokens yet/)).toBeNull();
  });
});

describe("a row's states", () => {
  it("upload-owned: the fact and a filled dot, no controls", () => {
    draw(ok([token({ state: "owned", source: "upload" })]));
    expect(screen.getByText("in your collection")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mark the Food token|Unmark the Food token|Add the Food token/ })).toBeNull();
    expect(document.querySelector('[data-token-dot="owned"]')).toBeTruthy();
  });

  it("marked by hand: held control, no fact, no Shopping control", () => {
    draw(ok([token({ state: "owned", source: "manual" })]));
    expect(screen.getByRole("button", { name: "Unmark the Food token" }).textContent).toBe("✓ I have one");
    expect(screen.queryByText("in your collection")).toBeNull();
    expect(screen.queryByRole("button", { name: /Add the Food token/ })).toBeNull();
  });

  it("not owned: a dashed dot, no fact, and both controls", () => {
    draw(ok([token()]));
    expect(document.querySelector('[data-token-dot="not"]')).toBeTruthy();
    expect(screen.queryByText("in your collection")).toBeNull();
    expect(screen.getByRole("button", { name: "Mark the Food token as in your collection" }).textContent).toBe("I have one");
    expect(screen.getByRole("button", { name: "Add the Food token to this deck’s Shopping list" }).textContent).toBe("Add to Shopping");
  });

  it("not known: no dot is drawn as owned or not, and the same two controls stay", () => {
    draw(ok([token({ state: "unknown" })], { read: false }));
    expect(document.querySelector('[data-token-dot="unknown"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /Mark the Food token/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add the Food token/ })).toBeTruthy();
  });

  it("joined: the hold state, and both controls", () => {
    draw(ok([token({ joined: true })]));
    expect(screen.getByRole("button", { name: "Take the Food token off this deck’s Shopping list" }).textContent).toBe("✓ In Shopping");
    expect(screen.getByRole("button", { name: /Mark the Food token/ })).toBeTruthy();
  });

  it("says the type line with its P/T, and shows rules text only when the loader attached it", () => {
    draw(ok([token({ name: "Goblin", typeLine: "Token Creature — Goblin", power: "1", toughness: "1", colors: ["R"], oracleText: "Haste" })]));
    expect(screen.getByText("Token Creature — Goblin · 1/1")).toBeTruthy();
    expect(screen.getByText("Haste")).toBeTruthy();
  });

  it("never uses a verdict word on ownership", () => {
    draw(ok([token(), token({ oracleId: "b", state: "owned", source: "upload" })]));
    expect(document.body.textContent).not.toMatch(/missing|short|need|not in your collection/i);
  });
});

describe("pressing", () => {
  it("I have one writes the hold for this deck's token; pressed again it unholds", async () => {
    draw(ok([token()]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Mark the Food token/ })); });
    expect(stub.held).toHaveBeenCalledWith(DECK, "t1", true);
    cleanup();
    draw(ok([token({ state: "owned", source: "manual" })]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Unmark the Food token/ })); });
    expect(stub.held).toHaveBeenLastCalledWith(DECK, "t1", false);
  });

  it("Add to Shopping joins; a joined row leaves", async () => {
    draw(ok([token()]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Add the Food token/ })); });
    expect(stub.joined).toHaveBeenCalledWith(DECK, "t1", true);
    cleanup();
    draw(ok([token({ joined: true })]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Take the Food token off/ })); });
    expect(stub.joined).toHaveBeenLastCalledWith(DECK, "t1", false);
  });

  it("says so when a press was refused, and the row is unchanged", async () => {
    stub.joined.mockResolvedValue({ ok: false, reason: "notThisDeck" });
    draw(ok([token()]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Add the Food token/ })); });
    expect(screen.getByRole("alert").textContent).toBe("We couldn’t save that. The token is unchanged.");
  });
});

describe("the makers fold", () => {
  const open = () => {
    fireEvent.click(screen.getByRole("button", { name: /Food token, made by/ }));
  };

  it("is closed until the row is pressed, then names its cards A to Z with the count", () => {
    draw(ok([token({ makers: makers(3) })]));
    expect(screen.queryByText("Generated by 3 cards")).toBeNull();
    open();
    expect(screen.getByText("Generated by 3 cards")).toBeTruthy();
    const names = screen.getAllByRole("button", { name: /^Maker 0[123]$/ }).map((b) => b.textContent);
    expect(names).toEqual(["Maker 01", "Maker 02", "Maker 03"]);
  });

  it("opens a maker's card details, with the token's makers as the paging list", () => {
    draw(ok([token({ makers: makers(2) })]));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Maker 02" }));
    const [id, siblings] = stub.open.mock.calls[0];
    expect(id).toBe("m002");
    expect((siblings as { oracleId: string }[]).map((s) => s.oracleId)).toEqual(["m001", "m002"]);
  });

  it("scrolls past 5 names on a phone and past 9 from md up, and says so", () => {
    draw(ok([token({ makers: makers(7) })]));
    open();
    expect(screen.getByText("A–Z · scrolls").className).toContain("md:hidden");
    cleanup();
    draw(ok([token({ makers: makers(12) })]));
    open();
    expect(screen.getByText("A–Z · scrolls").className).not.toContain("md:hidden");
    cleanup();
    draw(ok([token({ makers: makers(4) })]));
    open();
    expect(screen.queryByText("A–Z · scrolls")).toBeNull();
  });

  it("draws the box's fade only where the box scrolls", () => {
    draw(ok([token({ makers: makers(7) })]));
    open();
    expect(document.querySelector("li[aria-hidden]")?.className).toContain("md:hidden");
    cleanup();
    draw(ok([token({ makers: makers(12) })]));
    open();
    expect(document.querySelector("li[aria-hidden]")?.className).not.toMatch(/md:hidden|max-md:hidden/);
    cleanup();
    draw(ok([token({ makers: makers(4) })]));
    open();
    expect(document.querySelector("li[aria-hidden]")).toBeNull();
  });

  it("uses one column for one maker, two for 2 to 6, three from 7", () => {
    expect([1, 2, 6, 7, 19].map(makerColumns)).toEqual([1, 2, 2, 3, 3]);
  });
});
