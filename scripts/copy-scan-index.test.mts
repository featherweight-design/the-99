import { describe, expect, it } from "vitest";
import { EMBED_DIM } from "../src/lib/card-scan/match";
import { parseHalfvec, publishScanIndexIn } from "./lib/scan-index";
import { missingCardsRefusal } from "./copy-scan-index";

describe("db:copy:scan-index", () => {
  it("reads a halfvec's text back into floats, refusing one of the wrong length", () => {
    const out = new Float32Array(EMBED_DIM);
    parseHalfvec(`[${Array.from({ length: EMBED_DIM }, (_, i) => (i === 3 ? "0.5" : "0")).join(",")}]`, out, 0);
    expect(out[3]).toBe(0.5);
    expect(() => parseHalfvec("[1,2,3]", out, 0)).toThrow();
  });

  it("refuses a target whose catalog lacks more than 1% of the index's cards", () => {
    expect(missingCardsRefusal(1000, 10)).toBeNull();
    expect(missingCardsRefusal(1000, 11)).toMatch(/lacks 11 of the index's 1000 cards/);
    expect(missingCardsRefusal(0, 0)).toMatch(/no cards/);
  });

  it("writes a copied row's embedding as the source printed it, never re-rounded through floats", async () => {
    const literal = `[${Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? "0.0123" : "0")).join(",")}]`;
    const params: unknown[][] = [];
    const q = async (text: string, p?: unknown[]) => {
      if (text.startsWith("insert into scan_index ")) params.push(p ?? []);
      return { rows: text.startsWith("select count") ? [{ n: 1 }] : [] };
    };
    const vectors = new Float32Array(EMBED_DIM);
    parseHalfvec(literal, vectors, 0);
    await publishScanIndexIn(q, {
      version: "v", model: "m", keys: [["00000000-0000-0000-0000-000000000001", "0", "00000000-0000-0000-0000-000000000002"]],
      vectors, literals: [literal],
    });
    expect(params[0][3]).toBe(literal);
  });
});
