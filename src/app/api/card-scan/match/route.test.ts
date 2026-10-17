import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { CARD_SCAN_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" } as Record<string, string>,
  lookup: vi.fn(),
  hit: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../../lib/card-scan/lookup", () => ({ lookupGuesses: stub.lookup }));
vi.mock("../../../../lib/rate/observe", () => ({ observeHit: stub.hit }));

import { POST } from "./route";
import { EMBED_DIM, SCAN_MODEL } from "../../../../lib/card-scan/match";

const unit = () => {
  const v = new Float32Array(EMBED_DIM);
  v[0] = 1;
  return Buffer.from(v.buffer).toString("base64");
};
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/card-scan/match", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const GUESS = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", scryfallId: "22222222-2222-4222-8222-222222222222", typeLine: "Artifact", imageUri: "https://img/sol", score: 0.91 };

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { CARD_SCAN_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" };
  stub.lookup.mockReset();
  stub.hit.mockReset();
  stub.lookup.mockResolvedValue({ kind: "ok", index: "all-20261014", answer: { guesses: [GUESS], margin: null } });
});

describe("POST /api/card-scan/match", () => {
  it("answers the guesses and margin, uncached, and counts the request", async () => {
    const res = await post({ model: SCAN_MODEL, embedding: unit() });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ index: "all-20261014", guesses: [GUESS], margin: null });
    expect(stub.lookup.mock.calls[0][1]).toBe(SCAN_MODEL);
    expect(stub.lookup.mock.calls[0][0][0]).toBe(1);
    expect(stub.hit).toHaveBeenCalledWith("user_1", "card-scan");
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await post({ model: SCAN_MODEL, embedding: unit() })).status).toBe(401);
    expect(stub.lookup).not.toHaveBeenCalled();
  });

  it("is not there with the switch off, or with its parent off", async () => {
    stub.env = { CARD_SCAN_ENABLED: "true" };
    expect((await post({ model: SCAN_MODEL, embedding: unit() })).status).toBe(404);
    stub.env = { COLLECTION_EDIT_ENABLED: "true" };
    expect((await post({ model: SCAN_MODEL, embedding: unit() })).status).toBe(404);
    expect(stub.lookup).not.toHaveBeenCalled();
  });

  it("refuses a body that is not a fingerprint before reading the index", async () => {
    for (const body of ["not json", { model: SCAN_MODEL }, { embedding: unit() }, { model: SCAN_MODEL, embedding: "AAAA" }, { model: SCAN_MODEL, embedding: unit(), pad: "x".repeat(4096) }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad-embedding" });
    }
    expect(stub.lookup).not.toHaveBeenCalled();
  });

  it("names both models on a mismatch, and answers 503 with no index or a failed read", async () => {
    stub.lookup.mockResolvedValueOnce({ kind: "model", index: { version: "all-20261014", model: SCAN_MODEL } });
    const res = await post({ model: "other", embedding: unit() });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "model", index: "all-20261014", model: SCAN_MODEL });
    stub.lookup.mockResolvedValueOnce({ kind: "no-index" });
    expect((await post({ model: SCAN_MODEL, embedding: unit() })).status).toBe(503);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A database the migration has not reached (Postgres's undefined table), wrapped as the driver wraps it.
    stub.lookup.mockRejectedValueOnce(Object.assign(new Error("query failed"), { cause: Object.assign(new Error("relation \"scan_index_meta\" does not exist"), { code: "42P01" }) }));
    const missing = await post({ model: SCAN_MODEL, embedding: unit() });
    expect(missing.status).toBe(503);
    expect(await missing.json()).toEqual({ error: "no-index" });
    // The lock an ingest holds while it republishes (lock_not_available), or any other failure: one that may pass.
    stub.lookup.mockRejectedValueOnce(Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" }));
    const locked = await post({ model: SCAN_MODEL, embedding: unit() });
    expect(locked.status).toBe(503);
    expect(await locked.json()).toEqual({ error: "unavailable" });
  });
});
