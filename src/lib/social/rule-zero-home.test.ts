import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("./rule-zero", () => ({ openTablesFor: m.open }));

import { loadHomeTables, soonestFirst } from "./rule-zero-home";

const at = (id: string, iso: string) => ({ tableId: id, closesAt: new Date(iso) }) as never;

describe("Home's tables stack soonest closing first", () => {
  it("orders by closing time without touching the input", () => {
    const input = [at("later", "2026-09-09T11:00:00Z"), at("sooner", "2026-09-08T09:00:00Z")];
    expect(soonestFirst(input).map((t) => (t as { tableId: string }).tableId)).toEqual(["sooner", "later"]);
    expect((input[0] as { tableId: string }).tableId).toBe("later");
  });

  it("applies to what the loader returns, so the first-run Home gets it too", async () => {
    m.open.mockResolvedValue([at("later", "2026-09-09T11:00:00Z"), at("sooner", "2026-09-08T09:00:00Z")]);
    expect((await loadHomeTables("u1")).map((t) => (t as { tableId: string }).tableId)).toEqual(["sooner", "later"]);
  });
});
