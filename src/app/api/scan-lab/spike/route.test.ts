import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
const flags = vi.fn();
vi.mock("../../../../lib/flags/request", () => ({ requestFlags: () => flags() }));
// The tap a `run` row names, as the reader's own results table holds it; and every row inserted.
let ownResult: { id: string } | undefined;
const inserted: unknown[] = [];
vi.mock("../../../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (ownResult ? [ownResult] : []) }) }) }),
    insert: () => ({ values: async (v: unknown) => void inserted.push(v) }),
  },
}));

const { POST } = await import("./route");

const RESULT = "11111111-1111-4111-8111-111111111111";
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/scan-lab/spike", { method: "POST", body: JSON.stringify(body) }));
const run = { kind: "run", resultId: RESULT, first: { oracleId: null, margin: null, ms: 120 }, frames: 4 };

beforeEach(() => {
  auth.mockResolvedValue({ userId: "user_reader" });
  flags.mockResolvedValue({ SCAN_LAB_ENABLED: "true" });
  ownResult = { id: RESULT };
  inserted.length = 0;
});

describe("POST /api/scan-lab/spike", () => {
  it("stores a checked row for the signed-in reader, a run tied to the reader's own tap", async () => {
    expect((await post(run)).status).toBe(204);
    expect(inserted).toEqual([{ userId: "user_reader", kind: "run", resultId: RESULT, data: run }]);
  });
  it("refuses a run naming a tap that is not the reader's", async () => {
    ownResult = undefined;
    expect((await post(run)).status).toBe(404);
    expect(inserted).toEqual([]);
  });
  it("refuses a row the lab never writes, the signed out, and a reader with the lab off", async () => {
    expect((await post({ ...run, extra: 1 })).status).toBe(400);
    auth.mockResolvedValue({ userId: null });
    expect((await post(run)).status).toBe(401);
    auth.mockResolvedValue({ userId: "user_reader" });
    flags.mockResolvedValue({ SCAN_LAB_ENABLED: "false" });
    expect((await post(run)).status).toBe(404);
    expect(inserted).toEqual([]);
  });
});
