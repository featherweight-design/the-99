import { describe, expect, it } from "vitest";

import { STORE_INFO } from "../stores/info";
import { cardLinkOutCopy } from "./collection-browse";
import { feedCopy } from "./feed";
import { priceCopy } from "./price";
import { storeCopy } from "./store";
import { wishlistPrintingCopy } from "./wishlist";

const { manapool, tcgplayer, cardkingdom } = STORE_INFO;

describe("store copy, card details and the feed (store choice UI-2)", () => {
  it("keeps every shipped Mana Pool string, now drawn from the store forms", () => {
    expect(cardLinkOutCopy.card).toBe("Buy any printing at Mana Pool");
    expect(cardLinkOutCopy.token).toBe("Buy this token at Mana Pool");
    expect(wishlistPrintingCopy.linkOut("C21", "263")).toBe("Buy C21 263 at Mana Pool");
    expect(wishlistPrintingCopy.box.soldOutNote("$2.41")).toBe("Mana Pool has none now. Any printing is $2.41.");
    expect(feedCopy.home.press.priceDrop).toBe("Buy at Mana Pool");
    expect(priceCopy.cheapest.aria("$1.00")).toBe("cheapest non-foil printing of this card is $1.00 at Mana Pool");
    expect(priceCopy.aria.priced("$1.00", "2h ago")).toBe(storeCopy.aria.priced(manapool, "$1.00", "2h ago"));
  });

  it("names the reader's store in each", () => {
    expect(storeCopy.linkOut(cardkingdom)).toBe("Buy any printing at Card Kingdom");
    expect(storeCopy.lookFor(tcgplayer)).toBe("Look for it at TCGplayer");
    expect(storeCopy.feedBuy(tcgplayer)).toBe("Buy at TCGplayer");
  });

  it("speaks a market figure as the store's market price", () => {
    expect(storeCopy.aria.priced(tcgplayer, "$2.10", "2h ago")).toBe("$2.10, TCGplayer market price, last checked 2h ago");
    expect(storeCopy.aria.priced(cardkingdom, "$2.10", "2h ago")).toBe("$2.10 at Card Kingdom, last checked 2h ago");
  });

  it("names no history Mana Pool's rows alone carry", () => {
    expect(storeCopy.noStockAria(manapool, "neverStocked")).toBe("Never stocked at Mana Pool");
    expect(storeCopy.noStockAria(tcgplayer, "neverStocked")).toBe("No price from TCGplayer");
    expect(storeCopy.noStockAria(tcgplayer, "noFigure")).toBe("No price from TCGplayer");
    expect(storeCopy.noStockAria(cardkingdom, "soldOut")).toBe("Sold out at Card Kingdom");
  });
});
