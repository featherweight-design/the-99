import { beforeEach, describe, expect, it, vi } from "vitest";

const spendTour = vi.fn(async () => {});
let env: Record<string, string> = {};
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => env }));
vi.mock("../lib/discovery/tour", () => ({ spendTour: (...a: unknown[]) => spendTour(...(a as [])) }));

const { spendTourAction } = await import("./tour-actions");

beforeEach(() => {
  spendTour.mockClear();
  env = { FIRST_RUN_TOUR_ENABLED: "true" };
});

describe("spendTourAction", () => {
  it("spends the reader's tour with the switch on", async () => {
    await spendTourAction();
    expect(spendTour).toHaveBeenCalledWith("user_1");
  });

  it("writes nothing with the switch off for the reader", async () => {
    env = {};
    await spendTourAction();
    env = { FIRST_RUN_TOUR_ENABLED: "off" };
    await spendTourAction();
    expect(spendTour).not.toHaveBeenCalled();
  });
});
