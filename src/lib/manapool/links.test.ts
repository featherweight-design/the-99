import { describe, it, expect } from "vitest";
import {
  manapoolAddDeckUrl,
  manapoolAddDeckUrls,
  manapoolCardUrl,
  MANAPOOL_URL_MAX,
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

describe("a token line that names its printing", () => {
  const treasure = { name: "Treasure", quantity: 2, printing: { setCode: "tla", collectorNumber: "9" } };

  it("writes `<qty> <name> [SET] <number>` with the set upper-cased", () => {
    expect(manapoolDeckText([treasure])).toBe("2 Treasure [TLA] 9");
  });

  it("mixes with name-only card lines in one list, leaving the card lines byte-identical", () => {
    const text = manapoolDeckText([{ name: "Sol Ring", quantity: 1 }, treasure, { name: "Forest", quantity: 7 }]);
    expect(text).toBe("1 Sol Ring\n2 Treasure [TLA] 9\n7 Forest");
  });

  it("keeps a collector number that is not a plain integer whole", () => {
    expect(manapoolDeckText([{ name: "Spirit", quantity: 1, printing: { setCode: "tmm2", collectorNumber: "12a" } }]))
      .toBe("1 Spirit [TMM2] 12a");
    expect(manapoolDeckText([{ name: "Spirit", quantity: 1, printing: { setCode: "sld", collectorNumber: "★" } }]))
      .toBe("1 Spirit [SLD] ★");
  });

  it("survives the url round trip, a double-faced name included", () => {
    const lines = [{ name: "Punchcard // Punchcard", quantity: 1, printing: { setCode: "x", collectorNumber: "3" } }, treasure];
    expect(decodeDeckParam(manapoolAddDeckUrl(lines)!)).toBe("1 Punchcard // Punchcard [X] 3\n2 Treasure [TLA] 9");
  });

  it("splits by length like any other line and never splits one across parts", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({ name: `Token ${i}`, quantity: 1, printing: { setCode: "tla", collectorNumber: String(i) } }));
    const parts = manapoolAddDeckUrls(lines, 400);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.reduce((n, p) => n + p.lineCount, 0)).toBe(40);
    expect(parts.map((p) => decodeDeckParam(p.href)).join("\n").split("\n")).toEqual(lines.map((l) => `1 ${l.name} [TLA] ${l.printing.collectorNumber}`));
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

describe("manapoolAddDeckUrls (the all-decks cart)", () => {
  // Hugh's staging cart, 2026-10-11: 291 merged lines, 307 copies, an 8,051-character URL that
  // Mana Pool answered 200 with all 291 names decoded. Names here are sized so the URL lands near
  // the measured 8,051 characters (about 27.7 per line), which the first case asserts.
  const cart = Array.from({ length: 291 }, (_, i) => ({
    name: `Evolving Wild ${i}`,
    quantity: i < 16 ? 2 : 1,
  }));

  it("carries a 291-line cart in one link", () => {
    const urls = manapoolAddDeckUrls(cart);
    expect(urls).toHaveLength(1);
    expect(urls[0].href).toBe(manapoolAddDeckUrl(cart));
    expect(urls[0].href.length).toBeLessThanOrEqual(MANAPOOL_URL_MAX);
    expect(urls[0].href.length).toBeGreaterThan(7_500);
    expect(urls[0].href.length).toBeLessThan(8_600);
    expect(urls[0].lineCount).toBe(291);
  });

  it("splits a cart over the limit into parts, each under it, no line split or lost", () => {
    const big = Array.from({ length: 2500 }, (_, i) => ({ name: `Elminster's Simulacrum ${i}`, quantity: 1 + (i % 3) }));
    const urls = manapoolAddDeckUrls(big);
    expect(urls.length).toBeGreaterThan(1);
    for (const u of urls) {
      expect(u.href.length).toBeLessThanOrEqual(MANAPOOL_URL_MAX);
      expect(decodeDeckParam(u.href).split("\n")).toHaveLength(u.lineCount);
    }
    expect(urls.map((u) => decodeDeckParam(u.href)).join("\n")).toBe(manapoolDeckText(big));
    expect(urls.reduce((n, u) => n + u.lineCount, 0)).toBe(2500);
  });

  it("fills each part as far as it goes before starting the next", () => {
    const lines = Array.from({ length: 10 }, (_, i) => ({ name: `Card ${i}`, quantity: 1 }));
    const max = manapoolAddDeckUrl(lines.slice(0, 4))!.length;
    const urls = manapoolAddDeckUrls(lines, max);
    expect(urls[0]).toEqual({ href: manapoolAddDeckUrl(lines.slice(0, 4)), lineCount: 4 });
    expect(urls.map((u) => decodeDeckParam(u.href)).join("\n")).toBe(manapoolDeckText(lines));
  });

  it("is empty for an empty cart", () => {
    expect(manapoolAddDeckUrls([])).toEqual([]);
  });

  it("refuses a line too long for any link rather than emitting one over the limit", () => {
    expect(() => manapoolAddDeckUrls([{ name: "x".repeat(40_000), quantity: 1 }])).toThrow(/longer than a whole link/);
  });
});
