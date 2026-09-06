import { describe, it, expect } from "vitest";
import {
  manapoolAddDeckUrl,
  manapoolCardUrl,
  manapoolDeckText,
  MANAPOOL_ADD_DECK_URL,
} from "./links";

function decodeDeckParam(url: string): string {
  const deck = new URL(url).searchParams.get("deck")!;
  const binary = atob(deck);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

describe("manapoolDeckText", () => {
  it("writes one `<qty> <name>` line per card", () => {
    expect(
      manapoolDeckText([
        { name: "Fireball", quantity: 1 },
        { name: "Lightning Bolt", quantity: 1 },
        { name: "Forest", quantity: 7 },
      ]),
    ).toBe("1 Fireball\n1 Lightning Bolt\n7 Forest");
  });
});

describe("manapoolAddDeckUrl", () => {
  it("reproduces the documented example byte for byte", () => {
    const url = manapoolAddDeckUrl([
      { name: "Fireball", quantity: 1 },
      { name: "Lightning Bolt", quantity: 1 },
      { name: "Forest", quantity: 7 },
    ]);
    expect(url).toBe(
      `${MANAPOOL_ADD_DECK_URL}?deck=${encodeURIComponent(
        btoa("1 Fireball\n1 Lightning Bolt\n7 Forest"),
      )}`,
    );
  });

  it("round-trips split cards, apostrophes and diacritics", () => {
    const cards = [
      { name: "Fire // Ice", quantity: 1 },
      { name: "Gaea's Cradle", quantity: 1 },
      { name: "Æther Vial", quantity: 2 },
    ];
    expect(decodeDeckParam(manapoolAddDeckUrl(cards)!)).toBe(manapoolDeckText(cards));
  });

  it("returns null for an empty list", () => {
    expect(manapoolAddDeckUrl([])).toBeNull();
  });

  it("keeps a 99-card list under 4 KB", () => {
    const cards = Array.from({ length: 99 }, (_, i) => ({
      name: `Elminster's Simulacrum ${i}`,
      quantity: 1,
    }));
    expect(manapoolAddDeckUrl(cards)!.length).toBeLessThan(4096);
  });
});

describe("manapoolCardUrl", () => {
  it("encodes a plain name", () => {
    expect(manapoolCardUrl("Sol Ring")).toBe("https://manapool.com/cards?q=Sol%20Ring");
  });

  it("encodes the slashes of a split card", () => {
    expect(manapoolCardUrl("Fire // Ice")).toBe("https://manapool.com/cards?q=Fire%20%2F%2F%20Ice");
  });

  it("encodes a non-ASCII name", () => {
    expect(manapoolCardUrl("Æther Vial")).toBe("https://manapool.com/cards?q=%C3%86ther%20Vial");
  });
});
