import { describe, expect, it } from "vitest";
import {
  COLLECTION_FILE_MAX_BYTES,
  COLLECTION_FILE_MAX_LABEL,
  DECK_IMPORT_FILE_MAX_BYTES,
  DECK_IMPORT_FILE_MAX_LABEL,
  DECK_IMPORT_SOURCES,
  type DeckImportSource,
  deckImportMaxBytes,
  deckImportTooLargeMessage,
  isDeckImportTooLargeMessage,
  PASTE_MAX_BYTES,
  PASTE_MAX_LABEL,
} from "./upload-limits";

describe("upload limits", () => {
  it("gives deck import its own 2 MB cap, not the collection's", () => {
    // A decklist is far smaller than a collection, so deck import keeps its own,
    // tighter cap. The collection's is 4 MB, under Vercel's 4.5 MB request limit.
    expect(DECK_IMPORT_FILE_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(COLLECTION_FILE_MAX_BYTES).toBe(4 * 1024 * 1024);
    expect(DECK_IMPORT_FILE_MAX_BYTES).toBeLessThan(COLLECTION_FILE_MAX_BYTES);
  });

  it("rejects the handoff's 4.1 MB example and accepts a real decklist", () => {
    expect(4.1 * 1024 * 1024).toBeGreaterThan(DECK_IMPORT_FILE_MAX_BYTES);
    expect(8 * 1024).toBeLessThan(DECK_IMPORT_FILE_MAX_BYTES);
  });

  it("keeps the label the copy renders in step with the check", () => {
    // PR 4's copy says "under 2 MB" in three places; this is the one number both read.
    expect(DECK_IMPORT_FILE_MAX_LABEL).toBe("2 MB");
    expect(DECK_IMPORT_FILE_MAX_BYTES).toBe(
      Number(DECK_IMPORT_FILE_MAX_LABEL.replace(" MB", "")) * 1024 * 1024,
    );
  });

  it("pairs every cap with the label its message renders", () => {
    // Copilot caught the collection messages still hardcoding "5 MB" / "100 KB" while
    // the checks read constants — the drift this module exists to prevent.
    expect(COLLECTION_FILE_MAX_LABEL).toBe("4 MB");
    expect(PASTE_MAX_LABEL).toBe("100 KB");
    expect(COLLECTION_FILE_MAX_BYTES).toBe(
      Number(COLLECTION_FILE_MAX_LABEL.replace(" MB", "")) * 1024 * 1024,
    );
    expect(DECK_IMPORT_FILE_MAX_BYTES).toBe(
      Number(DECK_IMPORT_FILE_MAX_LABEL.replace(" MB", "")) * 1024 * 1024,
    );
    // The paste cap is the one label that is decimal KB rather than KiB, so it needs its
    // own arithmetic rather than the MB caps' — asserting the number alone would let the
    // label drift to "98 KB" unchallenged.
    expect(PASTE_MAX_BYTES).toBe(Number(PASTE_MAX_LABEL.replace(" KB", "")) * 1000);
  });

  it("recognises its own too-large message from every source", () => {
    // The client shows a thrown message only when this returns true, so a source
    // the guard forgets would silently degrade to the generic "our end" banner.
    for (const source of DECK_IMPORT_SOURCES) {
      expect(isDeckImportTooLargeMessage(deckImportTooLargeMessage(source))).toBe(true);
    }
    expect(isDeckImportTooLargeMessage("card is not a legal commander")).toBe(false);
  });

  it("falls back to the strictest cap for a source the type system never saw", () => {
    // `source` arrives from a server action, so the type is the caller's claim.
    // A missing arm would return undefined and compare a byte count against it,
    // which is false for every size — the guard off entirely.
    const rogue = "url" as unknown as DeckImportSource;
    expect(deckImportMaxBytes(rogue)).toBe(PASTE_MAX_BYTES);
    expect(deckImportTooLargeMessage(rogue)).toContain(PASTE_MAX_LABEL);
  });

  it("shares one paste cap across both flows", () => {
    expect(PASTE_MAX_BYTES).toBe(100_000);
  });

  it("caps a paste at 100 KB but lets a file use the full 2 MB", () => {
    // The file cap was previously enforced nowhere: every import went through the
    // paste check, so a valid 200 KB export was rejected as an oversized paste.
    expect(deckImportMaxBytes("paste")).toBe(PASTE_MAX_BYTES);
    expect(deckImportMaxBytes("file")).toBe(DECK_IMPORT_FILE_MAX_BYTES);
    expect(200 * 1024).toBeGreaterThan(deckImportMaxBytes("paste"));
    expect(200 * 1024).toBeLessThan(deckImportMaxBytes("file"));
  });
});
