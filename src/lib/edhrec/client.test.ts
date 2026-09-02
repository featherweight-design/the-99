import { describe, expect, it, vi } from "vitest";

// client.ts imports db at module level; stub it so the module loads in tests.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { fetchEdhrecUncached } from "./client";

function mockFetch(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300 }),
  );
}

describe("fetchEdhrecUncached", () => {
  it("returns unreachable: true for a 429 so the previous index row is preserved", async () => {
    mockFetch(429);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: true });
  });

  it("returns unreachable: true for a 403 so the previous index row is preserved", async () => {
    mockFetch(403);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: true });
  });

  it("returns unreachable: false (absent) for a 404 — commander is genuinely not on EDHREC", async () => {
    mockFetch(404);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: false });
  });
});
