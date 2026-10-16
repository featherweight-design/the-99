import { beforeEach, describe, expect, it, vi } from "vitest";

const spendMoment = vi.fn(async () => {});
let env: Record<string, string> = {};
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => env }));
vi.mock("../lib/moments/spent", () => ({ spendMoment: (...a: unknown[]) => spendMoment(...(a as [])) }));

const { spendMomentAction } = await import("./moments-actions");

beforeEach(() => {
  spendMoment.mockClear();
  env = { MOMENTS_ENABLED: "true", LINEUP_ENABLED: "true" };
});

describe("spendMomentAction", () => {
  it("spends a moment live for the reader", async () => {
    await spendMomentAction("lineup");
    expect(spendMoment).toHaveBeenCalledWith("user_1", "lineup");
  });

  it("spends nothing the registry does not name", async () => {
    await spendMomentAction("nope");
    await spendMomentAction(7);
    expect(spendMoment).not.toHaveBeenCalled();
  });

  it("spends nothing with the switch off, or for a moment whose tool is off", async () => {
    await spendMomentAction("matchups");
    env = { LINEUP_ENABLED: "true" };
    await spendMomentAction("lineup");
    expect(spendMoment).not.toHaveBeenCalled();
  });
});
