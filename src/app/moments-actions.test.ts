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

  // No moment has a tool switch any more: Proposed cuts' followed the Analysis tab, retired 2026-11-01 (always on), as
  // Stand-ins' and Help me choose's did before it. So its moment spends whatever the retired switches say.
  it("spends Proposed cuts' moment whatever the Analysis tab's retired switch says", async () => {
    env = { ANALYSIS_TAB_ENABLED: "off", PROPOSED_CUTS_ENABLED: "off" };
    await spendMomentAction("proposed-cuts");
    expect(spendMoment).toHaveBeenCalledWith("user_1", "proposed-cuts");
  });

  it("spends Help me choose's moment whatever its retired switch says", async () => {
    env = { HELP_ME_CHOOSE_ENABLED: "off" };
    await spendMomentAction("help-me-choose");
    expect(spendMoment).toHaveBeenCalledWith("user_1", "help-me-choose");
  });
});
