// Change store (store choice handoff, call 2): trails the Shopping strip's and the cart's provenance line while the
// reader may choose a store, naming the store they are on; with the switch off, or outside a provider, nothing is drawn.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriceStrip } from "../decks/price-strip";
import { CartCheckout } from "../decks/cart/cart-checkout";
import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO } from "../../lib/stores/info";
import { StoreDoor } from "./store-door";
import { StoreProvider } from "./store-provider";

afterEach(cleanup);

const door = () => document.querySelector<HTMLAnchorElement>("[data-store-door]");

describe("StoreDoor", () => {
  it("links to Settings' Store section, named for the reader's store, while they may change it", () => {
    render(
      <StoreProvider store="tcgplayer" canChange>
        <p>prices · <StoreDoor /></p>
      </StoreProvider>,
    );
    const link = screen.getByRole("link", { name: storeCopy.changeAria(STORE_INFO.tcgplayer) });
    expect(link.getAttribute("href")).toBe("/settings#settings-store");
    expect(link.textContent).toBe(storeCopy.change);
  });

  it("draws nothing while the switch is off for the reader", () => {
    render(
      <StoreProvider store="manapool">
        <StoreDoor />
      </StoreProvider>,
    );
    expect(door()).toBeNull();
  });

  it("draws nothing outside a provider (the landing demo)", () => {
    render(<StoreDoor />);
    expect(door()).toBeNull();
  });
});

describe("where it is drawn", () => {
  const strip = (
    <PriceStrip
      summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
      provenance={{ behind: false, when: "Monday" }}
      shoppingCards={[{ name: "Sol Ring", quantity: 1 }]}
    />
  );

  it("trails a deck's Shopping provenance line", () => {
    render(<StoreProvider store="manapool" canChange>{strip}</StoreProvider>);
    expect(door()!.closest("p")!.textContent).toMatch(/· Change store$/);
  });

  it("is absent from the strip with the switch off", () => {
    render(<StoreProvider store="manapool">{strip}</StoreProvider>);
    expect(door()).toBeNull();
  });

  it("trails the all-decks cart's provenance line", () => {
    render(
      <StoreProvider store="cardkingdom" canChange>
        <CartCheckout total={{ copies: 4, cents: 1240, pricedCopies: 4 }} deckCount={2} priced provenance={{ behind: false, when: "Monday" }} links={[]} />
      </StoreProvider>,
    );
    expect(screen.getByRole("link", { name: storeCopy.changeAria(STORE_INFO.cardkingdom) }).closest("p")!.textContent).toMatch(/· Change store$/);
  });
});
