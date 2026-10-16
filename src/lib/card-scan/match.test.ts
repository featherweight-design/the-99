import { describe, expect, it } from "vitest";
import { EMBED_DIM, SCAN_MODEL, decodeEmbedding, poolGuesses, vectorLiteral } from "./match";

/** A unit fingerprint pointing along axis `i`, as the client sends it. */
function encodeUnit(i = 0, scale = 1): string {
  const v = new Float32Array(EMBED_DIM);
  v[i] = scale;
  return Buffer.from(v.buffer).toString("base64");
}

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const row = (oracleId: string, distance: number, scryfallId = `${oracleId.slice(0, 8)}-p`) => ({ oracleId, name: oracleId.slice(0, 1), scryfallId, distance });

describe("decodeEmbedding", () => {
  it("reads 256 little-endian float32 at unit length", () => {
    const v = decodeEmbedding(encodeUnit(3));
    expect(v?.length).toBe(EMBED_DIM);
    expect(v?.[3]).toBe(1);
  });

  it("refuses a fingerprint of the wrong length, off unit length, non-finite, or not base64", () => {
    expect(decodeEmbedding(Buffer.alloc(EMBED_DIM * 4 - 4).toString("base64"))).toBeNull();
    expect(decodeEmbedding(encodeUnit(0, 1.5))).toBeNull();
    const nan = new Float32Array(EMBED_DIM);
    nan[0] = Number.NaN;
    expect(decodeEmbedding(Buffer.from(nan.buffer).toString("base64"))).toBeNull();
    expect(decodeEmbedding("%%%")).toBeNull();
    expect(decodeEmbedding(42)).toBeNull();
    expect(decodeEmbedding("A".repeat(4000))).toBeNull();
  });

  it("names the model with the exporter's build suffix", () => {
    expect(SCAN_MODEL).toBe("dhvazquez/mtg_card_identification_embeddings@653d88d fp32");
  });
});

describe("poolGuesses", () => {
  it("keeps one guess per card, its best row, best first, three at most, with the margin of the first two", () => {
    const r = poolGuesses([row(A, 0.1, "a1"), row(A, 0.05, "a2"), row(B, 0.2), row(C, 0.3), row(D, 0.4)]);
    expect(r.guesses.map((g) => [g.oracleId, g.scryfallId])).toEqual([[A, "a2"], [B, "22222222-p"], [C, "33333333-p"]]);
    expect(r.guesses[0].score).toBeCloseTo(0.95);
    expect(r.margin).toBeCloseTo(0.15);
  });

  it("clamps a score to [-1, 1] and has no margin with fewer than two guesses", () => {
    const r = poolGuesses([row(A, -0.002)]);
    expect(r.guesses[0].score).toBe(1);
    expect(r.margin).toBeNull();
    expect(poolGuesses([]).guesses).toEqual([]);
  });
});

describe("vectorLiteral", () => {
  it("writes pgvector's text form", () => {
    expect(vectorLiteral(new Float32Array([0.5, -1, 0]))).toBe("[0.5,-1,0]");
  });
});
