import { beforeEach, describe, expect, it, vi } from "vitest";

const spendMoment = vi.fn(async () => {});
let env: Record<string, string> = {};
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => env }));
vi.mock("../lib/moments/spent", () => ({ spendMoment: (...a: unknown[]) => spendMoment(...(a as [])) }));

const { spendMomentAction } = await import("./moments-actions");

beforeEach(() => {
  spendMoment.mockClear();
  env = {};
});

describe("spendMomentAction", () => {
  it("spends a moment live for the reader", async () => {
    await spendMomentAction("precons");
    expect(spendMoment).toHaveBeenCalledWith("user_1", "precons");
  });

  it("spends nothing the registry does not name", async () => {
    await spendMomentAction("nope");
    await spendMomentAction(7);
    expect(spendMoment).not.toHaveBeenCalled();
  });

  it("spends nothing for a moment whose tool is off", async () => {
    // Proposed cuts follows the Analysis tab, off here. (Stand-ins, then Help me choose, were examples until
    // SWAP_TOOLS_ENABLED and HELP_ME_CHOOSE_ENABLED retired.)
    await spendMomentAction("proposed-cuts");
    expect(spendMoment).not.toHaveBeenCalled();
  });

  it("spends Help me choose's moment whatever its retired switch says", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "off" };
    await spendMomentAction("help-me-choose");
    expect(spendMoment).toHaveBeenCalledWith("user_1", "help-me-choose");
  });
});
