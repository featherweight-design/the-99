import { describe, expect, it } from "vitest";
import { parseBulkIndex } from "./bulk";

describe("parseBulkIndex", () => {
  it("reads the JSONL download uri and compressed size", () => {
    expect(
      parseBulkIndex({
        jsonl_download_uri: "https://data.scryfall.io/oracle-cards/x.jsonl.gz",
        compressed_size: 24_357_783,
      }),
    ).toEqual({
      jsonlDownloadUri: "https://data.scryfall.io/oracle-cards/x.jsonl.gz",
      compressedSize: 24_357_783,
    });
  });

  // The shape that broke the July 2026 refresh (#103). Scryfall may keep serving the legacy
  // JSON-array fields, so their presence must not be mistaken for a usable index.
  it("rejects the legacy download_uri-only shape", () => {
    expect(() =>
      parseBulkIndex({ download_uri: "https://data.scryfall.io/oracle-cards/x.json", size: 201 }),
    ).toThrow(/missing jsonl_download_uri/);
  });

  it("rejects a missing or unusable compressed_size", () => {
    expect(() => parseBulkIndex({ jsonl_download_uri: "https://x/y.jsonl.gz" })).toThrow(
      /missing compressed_size/,
    );
    expect(() =>
      parseBulkIndex({ jsonl_download_uri: "https://x/y.jsonl.gz", compressed_size: 0 }),
    ).toThrow(/missing compressed_size/);
  });

  it("rejects a non-object payload", () => {
    expect(() => parseBulkIndex(null)).toThrow(/missing jsonl_download_uri/);
  });
});
