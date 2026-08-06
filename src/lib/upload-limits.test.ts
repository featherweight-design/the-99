import { describe, expect, it } from "vitest";
import {
  COLLECTION_FILE_MAX_BYTES,
  DECK_IMPORT_FILE_MAX_BYTES,
  DECK_IMPORT_FILE_MAX_LABEL,
  PASTE_MAX_BYTES,
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

  it("shares one paste cap across both flows", () => {
    expect(PASTE_MAX_BYTES).toBe(100_000);
  });
});
