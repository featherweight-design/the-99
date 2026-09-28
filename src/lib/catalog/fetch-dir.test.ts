import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manifestRefusal, sha256File, type Manifest } from "./fetch-dir";
import { fetchBulkIndex, streamBulkEntries } from "../scryfall/bulk";
import { loadSetsPayload } from "../scryfall/seed-sets";
import { fetchManapoolSingles } from "../manapool/client";

vi.mock("../../db", () => ({ db: {} }));

const manifest = (updatedAt: string, sha = "b"): Manifest => ({
  fetchedAt: "2026-09-28T09:00:00.000Z",
  sources: [{
    source: "oracle_cards", updatedAt, sha256: sha,
    files: [{ file: "bulk-oracle_cards.json", url: "u", bytes: 1, sha256: "a" }, { file: "bulk-oracle_cards.jsonl.gz", url: "u", bytes: 2, sha256: sha }],
  }],
});
const files = (sha = "b") => new Map([["bulk-oracle_cards.json", { bytes: 1, sha256: "a" }], ["bulk-oracle_cards.jsonl.gz", { bytes: 2, sha256: sha }]]);
const ingested = (updatedAt: string, sha256 = "b") => new Map([["oracle_cards" as const, { updatedAt: new Date(updatedAt), sha256 }]]);

describe("manifestRefusal", () => {
  it("passes an artifact whose bytes match and whose sources are new", () => {
    expect(manifestRefusal(manifest("2026-09-28T09:00:00Z"), files(), ingested("2026-09-27T09:00:00Z"))).toEqual([]);
  });

  it("passes a retry of the same artifact, which is a no-op rather than a rollback", () => {
    expect(manifestRefusal(manifest("2026-09-28T09:00:00Z"), files(), ingested("2026-09-28T09:00:00Z"))).toEqual([]);
  });

  it("passes a database that has never ingested from an artifact", () => {
    expect(manifestRefusal(manifest("2026-09-28T09:00:00Z"), files(), new Map())).toEqual([]);
  });

  it("refuses a source older than the database already ingested", () => {
    expect(manifestRefusal(manifest("2026-09-26T09:00:00Z"), files(), ingested("2026-09-27T09:00:00Z")))
      .toEqual(["oracle_cards: updated 2026-09-26T09:00:00Z, older than the 2026-09-27T09:00:00.000Z this database already ingested"]);
  });

  it("refuses a file whose bytes are not the ones the manifest recorded", () => {
    expect(manifestRefusal(manifest("2026-09-28T09:00:00Z"), files("x"), new Map()))
      .toEqual(["bulk-oracle_cards.jsonl.gz: 2 bytes x, manifest says 2 bytes b"]);
  });

  it("refuses a file missing from the artifact", () => {
    const partial = new Map([["bulk-oracle_cards.json", { bytes: 1, sha256: "a" }]]);
    expect(manifestRefusal(manifest("2026-09-28T09:00:00Z"), partial, new Map()))
      .toEqual(["bulk-oracle_cards.jsonl.gz: missing from the artifact"]);
  });
});

describe("the CATALOG_FETCH_DIR seams", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "catalog-fetch-"));
    vi.stubEnv("CATALOG_FETCH_DIR", dir);
    // Every read must come from the directory: a network call fails the test.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network read under CATALOG_FETCH_DIR"); }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads a bulk index and streams its body from the saved files", async () => {
    writeFileSync(join(dir, "bulk-oracle_cards.json"),
      JSON.stringify({ jsonl_download_uri: "https://data.scryfall.io/x.jsonl.gz", compressed_size: 10, updated_at: "2026-09-28T09:00:00Z" }));
    writeFileSync(join(dir, "bulk-oracle_cards.jsonl.gz"), gzipSync('{"id":"a"}\n{"id":"b"}\n'));
    const index = await fetchBulkIndex("oracle_cards");
    expect(index.jsonlDownloadUri.startsWith("file:")).toBe(true);
    const rows: unknown[] = [];
    for await (const row of streamBulkEntries(index)) rows.push(row);
    expect(rows).toEqual([{ id: "a" }, { id: "b" }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the sets list from the saved file", async () => {
    writeFileSync(join(dir, "sets.json"), JSON.stringify({ data: [{ code: "fra" }] }));
    expect(await loadSetsPayload()).toEqual({ data: [{ code: "fra" }] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads ManaPool's feed from the saved file", async () => {
    writeFileSync(join(dir, "manapool-singles.json"), JSON.stringify({ data: [] }));
    expect(await fetchManapoolSingles()).toEqual({ data: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hashes a file by its bytes", async () => {
    writeFileSync(join(dir, "f"), "abc");
    expect(await sha256File(join(dir, "f"))).toEqual({
      bytes: 3, sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
  });
});
