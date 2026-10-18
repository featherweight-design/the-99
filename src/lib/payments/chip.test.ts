// readChip's early return: a reader the switch turns away, with no lot at all, still gets the chip when they hold a live
// plan (its first invoice may not have granted yet), so the menu entry that links to /credits is there.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ lots: [] as { source: string }[], plan: vi.fn(), allowance: vi.fn() }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ groupBy: async () => m.lots }) }) }) } }));
vi.mock("./plan-read", () => ({ readPlanFacts: m.plan }));
vi.mock("../model/allowance", () => ({ readAllowance: m.allowance }));

import { readChip } from "./chip";

const NOW = new Date("2026-11-14T12:00:00Z");
const live = { status: "incomplete", cancelAtPeriodEnd: false, currentPeriodEnd: new Date("2026-12-14T00:00:00Z") };

beforeEach(() => {
  vi.resetAllMocks();
  m.lots = [];
  m.plan.mockResolvedValue(null);
  m.allowance.mockResolvedValue({ used: 2, limit: 5, nextAt: null, reopensAt: null });
});

describe("readChip", () => {
  it("is null for a reader with the switch off, no lot and no plan, and reads no allowance", async () => {
    expect(await readChip("u", {} as NodeJS.ProcessEnv, NOW)).toBeNull();
    expect(m.allowance).not.toHaveBeenCalled();
  });

  it("is the chip for a live plan with no grant yet and the switch off", async () => {
    m.plan.mockResolvedValue(live);
    expect(await readChip("u", {} as NodeJS.ProcessEnv, NOW)).toMatchObject({ kind: "credits", label: "3 credits" });
  });

  it("an ended plan does not keep it", async () => {
    m.plan.mockResolvedValue({ ...live, status: "canceled" });
    expect(await readChip("u", {} as NodeJS.ProcessEnv, NOW)).toBeNull();
  });

  it("is null, never an error, when the subscription read throws", async () => {
    m.plan.mockRejectedValue(new Error("db"));
    expect(await readChip("u", {} as NodeJS.ProcessEnv, NOW)).toBeNull();
  });
});
