import { describe, expect, it } from "vitest";
import {
  COLLECTION_FILE_MAX_BYTES,
  COLLECTION_FILE_MAX_LABEL,
  DECK_IMPORT_FILE_MAX_BYTES,
  DECK_IMPORT_FILE_MAX_LABEL,
  deckImportMaxBytes,
  PASTE_MAX_BYTES,
  PASTE_MAX_LABEL,
} from "./upload-limits";

describe("upload limits", () => {
  it("gives deck import its own 2 MB cap, not the collection's", () => {
    // The handoff's drawn file-too-large state is a 4.1 MB .xlsx. Standardising on
    // the collection's 5 MB would let that file pass and never reach the state it
    // is drawn to demonstrate.
    expect(DECK_IMPORT_FILE_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(COLLECTION_FILE_MAX_BYTES).toBe(5 * 1024 * 1024);
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
    expect(COLLECTION_FILE_MAX_LABEL).toBe("5 MB");
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

  it("shares one paste cap across both flows", () => {
    expect(PASTE_MAX_BYTES).toBe(100_000);
  });

  it("caps a paste at 100 KB but lets a file or a fetched deck use the full 2 MB", () => {
    // The file cap was previously enforced nowhere: every import went through the
    // paste check, so a valid 200 KB export was rejected as an oversized paste.
    expect(deckImportMaxBytes("paste")).toBe(PASTE_MAX_BYTES);
    expect(deckImportMaxBytes("file")).toBe(DECK_IMPORT_FILE_MAX_BYTES);
    expect(deckImportMaxBytes("url")).toBe(DECK_IMPORT_FILE_MAX_BYTES);
    expect(200 * 1024).toBeGreaterThan(deckImportMaxBytes("paste"));
    expect(200 * 1024).toBeLessThan(deckImportMaxBytes("file"));
  });
});
