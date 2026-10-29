import { beforeEach, describe, expect, it, vi } from "vitest";

const spendTour = vi.fn(async () => true);
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/discovery/tour", () => ({ spendTour: (...a: unknown[]) => spendTour(...(a as [])) }));

const { spendTourAction } = await import("./tour-actions");

beforeEach(() => {
  spendTour.mockClear();
});

describe("spendTourAction", () => {
  it("spends the reader's tour and reports the claim", async () => {
    expect(await spendTourAction()).toEqual({ claimed: true });
    expect(spendTour).toHaveBeenCalledWith("user_1");
  });
});
