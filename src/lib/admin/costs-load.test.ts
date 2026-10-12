// `loadCosts` wiring, against a database that answers every read with no rows: the owner's share it
// hands the view is the one the allowance enforces (`ownerShareMicro()`), env var included.
import { afterEach, describe, expect, it, vi } from "vitest";

const empty = (): unknown =>
  new Proxy(() => {}, {
    get: (_t, key) => (key === "then" ? (resolve: (v: unknown) => void) => resolve([]) : empty),
    apply: () => empty(),
  });
vi.mock("../../db", () => ({ db: empty() }));
vi.mock("../model/allowance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../model/allowance")>()),
  modelOwnerUserId: () => "user_owner",
  readAllowance: async () => ({ paused: false }),
}));

const { loadCosts } = await import("./costs");

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z");
const before = process.env.MODEL_OWNER_MONTHLY_USD;

afterEach(() => {
  if (before === undefined) delete process.env.MODEL_OWNER_MONTHLY_USD;
  else process.env.MODEL_OWNER_MONTHLY_USD = before;
});

describe("loadCosts", () => {
  it("reads the owner's share from MODEL_OWNER_MONTHLY_USD", async () => {
    process.env.MODEL_OWNER_MONTHLY_USD = "25";
    const s = await loadCosts(OCT, "user_admin", NOW);
    expect(s.ownerShareMicro).toBe(25_000_000);
    expect(s.ownerMicro).toBe(0);
  });

  it("falls back to spend-rule's share when the env var is unset", async () => {
    delete process.env.MODEL_OWNER_MONTHLY_USD;
    const s = await loadCosts(OCT, "user_admin", NOW);
    expect(s.ownerShareMicro).toBe(5_000_000);
  });
});
