import { describe, expect, it } from "vitest";
import { ERROR_WORDS, messageSkeleton } from "./message-skeleton";

// The leak cases are real card and deck names, the words a client error's message actually carries.
const CARDS = ["Sol Ring", "Atraxa, Praetors' Voice", "Urza's Saga", "Lightning Bolt", "The Ur-Dragon", "Ghalta, Primal Hunger", "Rootha, Mastering the Moment"];
const DECKS = ["Weekend jank", "my spicy deck", "Kitchen table brew", "Korvold Treasure Sacrifice Value Engine"];

describe("messageSkeleton", () => {
  it("keeps an engine's own error readable", () => {
    expect(messageSkeleton("Cannot read properties of undefined (reading 'name')")).toBe("Cannot read properties of undefined (reading '·')");
    expect(messageSkeleton("x.map is not a function")).toBe("· is not a function");
    expect(messageSkeleton("Failed to fetch")).toBe("Failed to fetch");
    expect(messageSkeleton("Loading chunk 4521 failed.")).toBe("Loading chunk · failed.");
    expect(messageSkeleton('duplicate key value violates unique constraint "deck_cards_pkey"')).toBe('duplicate key value violates unique constraint "·"');
    expect(messageSkeleton("Hydration failed because the server rendered text didn't match the client.")).toContain("Hydration failed because the server rendered text");
    expect(messageSkeleton("ChunkLoadError: Loading chunk 12 failed")).toBe("ChunkLoadError: Loading chunk 12 failed");
  });

  it("never lets a card or deck name through mid-sentence, quoted, bare or interpolated", () => {
    // "Root Out" and "Unexpected Results" are names made of error words: capitalised mid-sentence, they go too.
    for (const name of [...CARDS, ...DECKS, "Root Out", "Unexpected Results", "Lock and Key"]) {
      for (const m of [`No card named ${name}`, `Cannot find deck "${name}"`, `Cannot find deck "Rootha's ${name}"`, `failed to load ${name} (status 500)`]) {
        const out = messageSkeleton(m) ?? "[redacted]";
        // A lowercase word of a name that is itself an error word ("table" in "Kitchen table brew") may stand: the residual.
        for (const word of name.split(/[\s,'-]+/).filter((w) => w.length > 2 && !(w === w.toLowerCase() && ERROR_WORDS.has(w)))) {
          expect(out, `${m} → ${out}`).not.toContain(word);
        }
      }
    }
  });

  it("keeps a friend's name out even when it is an error word", () => {
    expect(messageSkeleton("cannot reach Will, retry failed")).toBe("cannot reach ·, retry failed");
    expect(messageSkeleton("No Page found")).toBe("No · found");
  });

  it("scrubs an email, a URL, a long number, a Clerk id and a token whole", () => {
    const out = messageSkeleton("user_3HdjdocERCjunk0zJQFDWyHkTd4 at hugh@example.com hit https://the-99.dev/join/abcDEF123 with 4111111111111111 and eyJhbGciOiJIUzI1NiJ9 failed");
    expect(out).not.toMatch(/user_3|hugh|example|the-99|abcDEF|4111|eyJ/);
    expect(out).toContain("failed");
  });

  it("scrubs words in any script, and any character outside printable ASCII", () => {
    expect(messageSkeleton("failed to load Ёлка")).toBe("failed to load ·");
    expect(messageSkeleton("failed to load 日本語デッキ")).toBe("failed to load ·");
    expect(messageSkeleton("failed to load Æther Vial")).toBe("failed to load ·");
    expect(messageSkeleton("failed to load Lim-Dûl's Vault 🔥")).not.toMatch(/Lim|Dûl|Vault|🔥|û/);
  });

  it("keeps no camelCase, snake_case or dotted word a player could have typed as a name", () => {
    expect(messageSkeleton("failed to load spicyJank")).toBe("failed to load ·");
    expect(messageSkeleton("failed to load sol.ring")).toBe("failed to load ·");
    expect(messageSkeleton("failed to load my_deck at evil.example.com")).toBe("failed to load · at ·");
  });

  it("says nothing when no word of it is an error word", () => {
    expect(messageSkeleton("Sol Ring")).toBeNull();
    expect(messageSkeleton("")).toBeNull();
  });

  it("scrubs a link token, a UUID and any long run with a digit before reading words", () => {
    const out = messageSkeleton("failed /join/Ab-123xyz-9Qr and 3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b and abc12345def")!;
    expect(out).not.toMatch(/Ab|123|9Qr|3f2a|abc12345/);
    expect(out).toMatch(/^failed /);
  });

  it("reads a multi-line message as one line, with spaces where its breaks were", () => {
    expect(messageSkeleton("failed\nto load chunk")).toBe("failed to load chunk");
  });

  it("caps what leaves", () => {
    expect(messageSkeleton("failed ".repeat(200))!.length).toBeLessThanOrEqual(301);
  });
});
