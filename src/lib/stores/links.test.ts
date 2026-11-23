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
    expect(storeCardUrl("cardkingdom", "Fire // Ice"))
      .toBe("https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=Fire%20%2F%2F%20Ice");
    for (const store of ["tcgplayer", "cardkingdom"] as const) {
      expect(storeCardUrl(store, "Sol Ring")).not.toMatch(/utm_|partner|affiliate|irclickid/i);
    }
  });
});
