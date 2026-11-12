import { describe, expect, it } from "vitest";
import { ERROR_WORDS, messageSkeleton } from "./message-skeleton";

// The leak cases are real card and deck names, the words a client error's message actually carries.
const CARDS = ["Sol Ring", "Atraxa, Praetors' Voice", "Urza's Saga", "Lightning Bolt", "The Ur-Dragon", "Ghalta, Primal Hunger", "Rootha, Mastering the Moment"];
const DECKS = ["Weekend jank", "my spicy deck", "Kitchen table brew", "Korvold Treasure Sacrifice Value Engine"];

describe("messageSkeleton", () => {
  it("keeps an engine's own error readable", () => {
    expect(messageSkeleton("Cannot read properties of undefined (reading 'name')")).toBe("Cannot read properties of undefined (reading '·')");
    expect(messageSkeleton("x.map is not a function")).toBe("x.map is not a function");
    expect(messageSkeleton("Failed to fetch")).toBe("Failed to fetch");
    expect(messageSkeleton("Loading chunk 4521 failed.")).toBe("Loading chunk · failed.");
    expect(messageSkeleton('duplicate key value violates unique constraint "deck_cards_pkey"')).toBe('duplicate key value violates unique constraint "·"');
    expect(messageSkeleton("Hydration failed because the server rendered text didn't match the client.")).toContain("Hydration failed because the server rendered text");
    expect(messageSkeleton("ChunkLoadError: Loading chunk 12 failed")).toBe("ChunkLoadError: Loading chunk 12 failed");
  });

  it("never lets a card or deck name through, quoted, bare or interpolated anywhere", () => {
    for (const name of [...CARDS, ...DECKS]) {
      for (const m of [`No card named ${name}`, `Cannot find deck "${name}"`, `${name} is not defined`, `failed to load ${name} (status 500)`, name]) {
        const out = messageSkeleton(m) ?? "[redacted]";
        // A word of a name that is itself an error word ("Value", "table") may stand; no other word of it may.
        for (const word of name.split(/[\s,'-]+/).filter((w) => w.length > 2 && !ERROR_WORDS.has(w.toLowerCase()))) {
          expect(out, `${m} → ${out}`).not.toContain(word);
        }
      }
    }
  });

  it("scrubs an email, a URL, a long number, a Clerk id and a token whole", () => {
    const out = messageSkeleton("user_3HdjdocERCjunk0zJQFDWyHkTd4 at hugh@example.com hit https://the-99.dev/join/abcDEF123 with 4111111111111111 and eyJhbGciOiJIUzI1NiJ9 failed");
    expect(out).not.toMatch(/user_3|hugh|example|the-99|abcDEF|4111|eyJ/);
    expect(out).toContain("failed");
  });

  it("says nothing when no word of it is an error word", () => {
    expect(messageSkeleton("Sol Ring")).toBeNull();
    expect(messageSkeleton("")).toBeNull();
  });

  it("caps what leaves", () => {
    expect(messageSkeleton("failed ".repeat(200))!.length).toBeLessThanOrEqual(301);
  });
});
