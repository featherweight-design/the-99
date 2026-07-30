import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBulkIndex, streamBulkEntries, type BulkIndex } from "./bulk";

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

describe("streamBulkEntries", () => {
  const INDEX: BulkIndex = { jsonlDownloadUri: "https://x/y.jsonl.gz", compressedSize: 1 };

  afterEach(() => vi.unstubAllGlobals());

  /** Stubs fetch with a gzipped body, and reports whether the request was aborted. */
  function stubDownload(body: Buffer): { aborted: () => boolean } {
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", (_url: string, init: { signal: AbortSignal }) => {
      signal = init.signal;
      return Promise.resolve(new Response(new Uint8Array(body)));
    });
    return { aborted: () => signal?.aborted ?? false };
  }

  async function collect(index = INDEX) {
    const out: Record<string, unknown>[] = [];
    for await (const entry of streamBulkEntries(index)) out.push(entry);
    return out;
  }

  it("yields one parsed object per line and ignores the trailing newline", async () => {
    stubDownload(gzipSync('{"name":"Forest"}\n{"name":"Island"}\n'));
    expect(await collect()).toEqual([{ name: "Forest" }, { name: "Island" }]);
  });

  it("handles CRLF line endings", async () => {
    stubDownload(gzipSync('{"name":"Forest"}\r\n{"name":"Island"}\r\n'));
    expect(await collect()).toEqual([{ name: "Forest" }, { name: "Island" }]);
  });

  it("rejects when the body is not valid gzip", async () => {
    stubDownload(Buffer.from('{"name":"Forest"}\n'));
    await expect(collect()).rejects.toThrow();
  });

  it("rejects when a line is not valid JSON", async () => {
    stubDownload(gzipSync('{"name":"Forest"}\nnot json\n'));
    await expect(collect()).rejects.toThrow(SyntaxError);
  });

  it.each([["null", "null"], ["an array", "[1,2]"], ["a primitive", '"Forest"']])(
    "rejects a line that parses to %s",
    async (_label, line) => {
      stubDownload(gzipSync(`{"name":"Forest"}\n${line}\n`));
      await expect(collect()).rejects.toThrow(/not a JSON object/);
    },
  );

  it("rejects a non-OK download", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("nope", { status: 503 })));
    await expect(collect()).rejects.toThrow(/bulk download 503/);
  });

  // The contract canary reads a single line of a ~77MB download; without this the rest of the
  // body would keep streaming after the generator is abandoned.
  it("aborts the request when the consumer stops early", async () => {
    const req = stubDownload(gzipSync('{"name":"Forest"}\n{"name":"Island"}\n'));
    for await (const entry of streamBulkEntries(INDEX)) {
      expect(entry).toEqual({ name: "Forest" });
      break;
    }
    expect(req.aborted()).toBe(true);
  });
});
