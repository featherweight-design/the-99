// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const stub = vi.hoisted(() => ({ held: vi.fn(), joined: vi.fn(), open: vi.fn() }));

vi.mock("../../app/decks/token-actions", () => ({ setTokenHeld: stub.held, setTokenJoined: stub.joined }));
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ open: stub.open }),
  useCardDetailIfAny: () => ({ open: stub.open }),
  useCardIntent: () => ({}),
}));

import { DeckTokensProvider } from "./deck-tokens-context";
import { TokensGroup } from "./tokens-group";
import { TokensShoppingGroup } from "./tokens-shopping-group";
import { boxedOnDesktop, boxedOnPhone, makerColumns } from "./token-makers";
import { printingLine } from "./token-row";
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

  it("says so when a press threw, not only when it was refused", async () => {
    stub.joined.mockRejectedValue(new Error("session lapsed"));
    draw(ok([token()]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Add the Food token/ })); });
    expect(screen.getByRole("alert").textContent).toBe("We couldn’t save that. The token is unchanged.");
  });

  it("says so when a press was refused, and the row is unchanged", async () => {
    stub.joined.mockResolvedValue({ ok: false, reason: "notThisDeck" });
    draw(ok([token()]));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Add the Food token/ })); });
    expect(screen.getByRole("alert").textContent).toBe("We couldn’t save that. The token is unchanged.");
  });
});

describe("the makers fold", () => {
  // The phone's chevron and the desktop's: one is display:none at any width, so jsdom holds both.
  const open = () => {
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
  };

  // Bug batch 2026-10-12: the token's name and image open its card details, so the summary is no
  // longer one button; the chevron is the disclosure, named by the disclosure sentence.
  it("is the chevron, named by the disclosure sentence, at both widths", () => {
    draw(ok([token({ name: "Goblin", typeLine: "Token Creature — Goblin", power: "1", toughness: "1", makers: makers(3) })]));
    const toggles = screen.getAllByRole("button", { expanded: false });
    expect(toggles).toHaveLength(2);
    for (const t of toggles) expect(t.getAttribute("aria-label")).toBe("Goblin token, made by 3 cards");
    expect(toggles.map((t) => t.className.match(/\bmd:hidden\b|\bmd:flex\b/)?.[0])).toEqual(["md:hidden", "md:flex"]);
    // A press elsewhere on the row still unfolds it, for a pointer.
    fireEvent.click(screen.getByText("Token Creature — Goblin · 1/1"));
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(2);
  });

  it("opens the token's own card details from its name and its image, and folds nothing", () => {
    draw(ok([token({ name: "Goblin", oracleId: "t-goblin", makers: makers(3) })]));
    const name = screen.getByRole("button", { name: "Goblin" });
    fireEvent.click(name);
    expect(stub.open.mock.calls[0][0]).toBe("t-goblin");
    // No siblings: a token opens alone, so the modal draws no Prev/Next.
    expect(stub.open.mock.calls[0][1]).toBeUndefined();
    expect(stub.open.mock.calls[0][3]).toMatchObject({ opener: name });
    const art = document.querySelector("li button[aria-hidden]") as HTMLElement;
    expect(art.tabIndex).toBe(-1);
    fireEvent.click(art);
    expect(stub.open.mock.calls[1][0]).toBe("t-goblin");
    // The way back is the name, never the image the reader cannot reach.
    expect(stub.open.mock.calls[1][3]).toMatchObject({ opener: name });
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

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
    // The art the row already holds rides with the press, so a phone tap can start its image at once.
    expect(stub.open.mock.calls[0][3]).toMatchObject({ art: null });
    expect((siblings as { oracleId: string }[]).map((s) => s.oracleId)).toEqual(["m001", "m002"]);
  });

  it("scrolls where the list can outgrow its cap, and says so", () => {
    draw(ok([token({ makers: makers(7) })]));
    open();
    expect(screen.getByText("A–Z · scrolls").className).toContain("md:hidden");
    cleanup();
    draw(ok([token({ makers: makers(18) })]));
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
    draw(ok([token({ makers: makers(18) })]));
    open();
    expect(document.querySelector("li[aria-hidden]")?.className).not.toMatch(/md:hidden|max-md:hidden/);
    // In flow, never an overlay: a negative margin would put the fade over the last row.
    expect(document.querySelector("li[aria-hidden]")?.className).not.toMatch(/-mt-/);
    cleanup();
    draw(ok([token({ makers: makers(4) })]));
    open();
    expect(document.querySelector("li[aria-hidden]")).toBeNull();
  });

  it("turns the box on at the count whose rows pass the cap: 6 on a phone, 16 from md up", () => {
    expect([5, 6].map(boxedOnPhone)).toEqual([false, true]);
    expect([9, 10, 15, 16].map(boxedOnDesktop)).toEqual([false, false, false, true]);
  });

  it("uses one column for one maker, two for 2 to 6, three from 7", () => {
    expect([1, 2, 6, 7, 19].map(makerColumns)).toEqual([1, 2, 2, 3, 3]);
  });
});

describe("two tokens of one name", () => {
  it("are told apart for assistive technology by their colors, stats and rules text, on both controls", () => {
    const a = token({ oracleId: "ga", name: "Goblin", typeLine: "Token Creature — Goblin", colors: ["R"], power: "1", toughness: "1", oracleText: "Haste" });
    const b = token({ oracleId: "gb", name: "Goblin", typeLine: "Token Creature — Goblin", colors: ["R"], power: "1", toughness: "1", oracleText: "Menace" });
    draw(ok([a, b]));
    const [haveA, haveB] = screen.getAllByRole("button", { name: /Mark the Goblin token/ });
    const describe_ = (el: HTMLElement) => document.getElementById(el.getAttribute("aria-describedby")!)?.textContent;
    expect(describe_(haveA)).toContain("Haste");
    expect(describe_(haveB)).toContain("Menace");
    expect(describe_(haveA)).toContain("1/1");
    const [joinA, joinB] = screen.getAllByRole("button", { name: /Add the Goblin token/ });
    expect(describe_(joinA)).toContain("Haste");
    expect(describe_(joinB)).toContain("Menace");
  });
});

describe("the line that says what is sent", () => {
  const NEWEST = new Date("2026-10-11");
  const withPrice = (product: { productName: string | null; productSet: string | null; productNumber: string | null }) =>
    token({
      name: "Soldier",
      picture: { scryfallId: "p", setCode: "tla", collectorNumber: "8", imageUriSmall: null, artCropUri: null, printings: 5 },
      price: {
        cents: 15, foilCents: null, etchedCents: null, asOf: NEWEST,
        printing: { scryfallId: "p", setCode: "tla", collectorNumber: "8", ...product },
      },
    });

  it("says pictured and sent only where Mana Pool's product is the printing pictured", () => {
    expect(printingLine(withPrice({ productName: "Soldier", productSet: "tla", productNumber: "8" }), NEWEST))
      .toBe("pictured and sent: TLA 8 · $0.15 · cheapest of 5 printings");
  });

  it("names Mana Pool's own set and number when they are not Scryfall's", () => {
    expect(printingLine(withPrice({ productName: "Soldier // Eldrazi", productSet: "tonc", productNumber: "1-17" }), NEWEST))
      .toBe("sent: TONC 1-17 · $0.15 · cheapest of 5 printings");
  });

  it("says it is sent by name where Mana Pool cannot place the number or the product is unknown", () => {
    expect(printingLine(withPrice({ productName: "Angel // Demon", productSet: "phel", productNumber: "1★" }), NEWEST))
      .toBe("sent by name · $0.15 · cheapest of 5 printings");
    expect(printingLine(withPrice({ productName: null, productSet: null, productNumber: null }), NEWEST))
      .toBe("sent by name · $0.15 · cheapest of 5 printings");
  });

  it("draws no line for a token with no figure", () => {
    expect(printingLine(token(), NEWEST)).toBeNull();
  });
});

describe("the Tokens group on Shopping", () => {
  const NEWEST = new Date("2026-10-11");
  const priced = (cents: number | null, asOf = NEWEST) => ({
    cents, foilCents: null, etchedCents: null, asOf,
    printing: { scryfallId: "p", setCode: "tla", collectorNumber: "8", productName: "Soldier", productSet: "tla", productNumber: "8" },
  });
  const shopping = (tokens: DeckToken[]) => render(
    <DeckTokensProvider deckId={DECK} read={ok(tokens, { newestPriceAsOf: NEWEST })}><TokensShoppingGroup /></DeckTokensProvider>,
  );
  const soldier = token({
    oracleId: "s1", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], power: "1", toughness: "1",
    joined: true, price: priced(15),
    picture: { scryfallId: "p", setCode: "tla", collectorNumber: "8", imageUriSmall: null, artCropUri: null, printings: 5 },
  });

  it("draws nothing without the provider, and nothing when no token is joined", () => {
    const { container } = render(<TokensShoppingGroup />);
    expect(container.innerHTML).toBe("");
    cleanup();
    shopping([token({ joined: false })]);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText(/not in the deck’s count/)).toBeNull();
  });

  it("heads only the JOINED tokens, with the clause that says they are not the deck's", () => {
    shopping([soldier, token({ oracleId: "x", name: "Food", joined: false })]);
    expect(screen.getByText("Tokens")).toBeTruthy();
    expect(screen.getByText("1 · not in the deck’s count")).toBeTruthy();
    expect(screen.getByText("Soldier")).toBeTruthy();
    expect(screen.queryByText("Food")).toBeNull();
  });

  it("names the token as a token, with its type and P/T, and its printing from md up", () => {
    shopping([soldier]);
    expect(screen.getByText("token · Creature — Soldier · 1/1")).toBeTruthy();
    expect(screen.getByText("token · Creature — Soldier · 1/1 · TLA 8")).toBeTruthy();
  });

  it("the buy tag press marks the token held in one write, with no confirm", async () => {
    shopping([soldier]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Mark the Soldier token as in your collection" })); });
    expect(stub.held).toHaveBeenCalledWith(DECK, "s1", true);
    expect(stub.joined).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the ✕ takes it off Shopping and nothing else", async () => {
    shopping([soldier]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Take the Soldier token off Shopping" })); });
    expect(stub.joined).toHaveBeenCalledWith(DECK, "s1", false);
    expect(stub.held).not.toHaveBeenCalled();
  });

  it("draws a sold-out token with the shipped sold-out tag, still pressable", () => {
    shopping([{ ...soldier, price: priced(15, new Date("2026-09-01")) }]);
    expect(screen.getByRole("button", { name: /Mark the Soldier token/ }).textContent).toContain("sold out");
  });

  it("says so when a press threw", async () => {
    stub.held.mockRejectedValue(new Error("down"));
    shopping([soldier]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Mark the Soldier token/ })); });
    expect(screen.getByRole("alert").textContent).toBe("We couldn’t save that. The token is unchanged.");
  });
  it("on Shopping offers only the remove press: a hand mark on it could not be undone", () => {
    shopping([token({ oracleId: "f1", makers: [], joined: true, name: "Food", price: priced(15) })]);
    expect(screen.queryByRole("button", { name: /Mark the Food token/ })).toBeNull();
    expect(screen.getByText("from no card in this deck")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Take the Food token off Shopping/ })).toBeTruthy();
  });
});

describe("a joined token whose maker left the deck", () => {
  it("stays on the deck page, says it has no maker, and offers no fold", () => {
    draw(ok([token({ makers: [], joined: true })]));
    expect(screen.getByText("from no card in this deck")).toBeTruthy();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
    // Not a button at all: nothing to unfold means no focusable control that does nothing.
    expect(screen.queryByRole("button", { name: /from no card in this deck/ })).toBeNull();
    expect(screen.queryByText(/made by 0 cards/)).toBeNull();
    // Its hand mark would be refused both ways, so the row offers none; the Shopping toggle stays (it leaves).
    expect(screen.queryByRole("button", { name: /as in your collection/ })).toBeNull();
    expect(screen.getByRole("button", { name: /off this deck’s Shopping list/ })).toBeTruthy();
  });

});
