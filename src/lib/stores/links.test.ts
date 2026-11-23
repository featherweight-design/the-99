import { describe, expect, it } from "vitest";

import { manapoolCardUrl } from "../manapool/links";
import { storeCardUrl } from "./links";

describe("storeCardUrl", () => {
  it("is Mana Pool's own card link for Mana Pool", () => {
    expect(storeCardUrl("manapool", "Sol Ring")).toBe(manapoolCardUrl("Sol Ring"));
  });

  it("is each other store's name search, the name encoded, with no partner tag", () => {
    expect(storeCardUrl("tcgplayer", "Jace, the Mind Sculptor"))
      .toBe("https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=Jace%2C%20the%20Mind%20Sculptor");
    expect(storeCardUrl("cardkingdom", "Fire // Ice", "split"))
      .toBe("https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=Fire%20%2F%2F%20Ice");
    for (const store of ["tcgplayer", "cardkingdom"] as const) {
      expect(storeCardUrl(store, "Sol Ring")).not.toMatch(/utm_|partner|affiliate|irclickid/i);
    }
  });

  it("searches a two-faced card by its front face, and a split card by its whole name", () => {
    expect(storeCardUrl("cardkingdom", "Delver of Secrets // Insectile Aberration", "transform"))
      .toBe("https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=Delver%20of%20Secrets");
    expect(storeCardUrl("tcgplayer", "Bonecrusher Giant // Stomp", "adventure")).toMatch(/&q=Bonecrusher%20Giant$/);
    expect(storeCardUrl("tcgplayer", "Commit // Memory", "aftermath")).toMatch(/&q=Commit%20%2F%2F%20Memory$/);
    // Mana Pool's shipped link is untouched: it searches the whole name whatever the layout.
    expect(storeCardUrl("manapool", "Delver of Secrets // Insectile Aberration", "transform"))
      .toBe(manapoolCardUrl("Delver of Secrets // Insectile Aberration"));
  });
});
