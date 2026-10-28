import { describe, expect, it } from "vitest";
import { backScreenName, deckIdOf, safeFrom } from "./back";

const DECK = "/decks/0b6c2f4e-1111-4222-8333-444455556666";

describe("safeFrom", () => {
  it("keeps a same-origin relative path with its query", () => {
    expect(safeFrom("/collection/replace")).toBe("/collection/replace");
    expect(safeFrom("/collection?card=abc&q=x")).toBe("/collection?card=abc&q=x");
    expect(safeFrom("/")).toBe("/");
  });

  it("refuses anything that could leave the app", () => {
    for (const raw of [
      "//evil.example",
      "//evil.example/decks",
      "https://evil.example",
      "javascript:alert(1)",
      "/\\evil",
      "/\\\\evil.example",
      "\\evil",
      "evil",
      "",
      "/a\nb",
      "/%0a",
    ]) {
      expect(safeFrom(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it("refuses a path that only becomes protocol-relative once normalized or decoded (Copilot round 1)", () => {
    for (const raw of [
      "/.//collection/replace",
      "/./evil.example/..//evil.example",
      "/a/..//evil.example",
      "/..//evil.example",
      "/%2E%2E//evil.example",
      "/%2F%2Fevil.example",
      "/%2f%2fevil.example/decks",
      "/%2F/evil.example",
      "/%252F%252Fevil.example",
      "/%5Cevil.example",
      "/%5c%5cevil.example",
      "/a%5Cb",
      "/%00",
      "/%7F",
      "/%E0%A4%A",
    ]) {
      expect(safeFrom(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it("keeps a dot segment or an encoded character that stays on the app's own path", () => {
    expect(safeFrom("/collection/./replace")).toBe("/collection/replace");
    expect(safeFrom("/decks/../collection")).toBe("/collection");
    expect(safeFrom("/collection?q=a%2Fb")).toBe("/collection?q=a%2Fb");
  });

  it("refuses a repeated or missing parameter", () => {
    expect(safeFrom(["/a", "/b"])).toBeNull();
    expect(safeFrom(undefined)).toBeNull();
  });
});

describe("backScreenName", () => {
  it("names a sectioned screen by its section (board: Back to Upload a file)", () => {
    expect(backScreenName("/collection/replace")).toBe("Upload a file");
    expect(backScreenName("/")).toBe("Home");
    expect(backScreenName("/collection")).toBe("Cards");
    expect(backScreenName("/decks")).toBe("Your decks");
  });

  it("names a deck by its own name, else by its section", () => {
    expect(backScreenName(DECK, "Sai")).toBe("Sai");
    expect(backScreenName(DECK, null)).toBe("Your deck");
  });

  it("names each A1 screen", () => {
    expect(backScreenName("/collection?card=x")).toBe("Card details");
    expect(backScreenName("/collection/sets")).toBe("Sets");
    expect(backScreenName("/collection/proxies")).toBe("Proxies");
    expect(backScreenName("/collection/history")).toBe("History");
    expect(backScreenName("/collection/wishlist")).toBe("Wishlist");
    expect(backScreenName("/decks/new")).toBe("New deck");
    expect(backScreenName("/decks/precons")).toBe("New deck");
    expect(backScreenName("/commanders/choose")).toBe("New deck");
    expect(backScreenName("/settings")).toBe("Settings");
    expect(backScreenName("/credits")).toBe("Credits");
  });

  it("names nothing the ? never lands from", () => {
    expect(backScreenName("/admin")).toBeNull();
    expect(backScreenName("/about/decks")).toBeNull();
  });
});

describe("deckIdOf", () => {
  it("reads a deck page's id and nothing else", () => {
    expect(deckIdOf(DECK)).toBe("0b6c2f4e-1111-4222-8333-444455556666");
    expect(deckIdOf("/decks")).toBeNull();
    expect(deckIdOf("/decks/new")).toBeNull();
  });
});
