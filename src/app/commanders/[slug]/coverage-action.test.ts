// The retry action's only job is deciding whether the re-resolved commander
// has figures to hand back. Getting that wrong is invisible in the component
// tests, which mock the action away entirely.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RoleCard, RoleName } from "../../../lib/recs/score";

const { requireUserId, findScoredCommander, scoreOneCommander } = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  findScoredCommander: vi.fn(),
  scoreOneCommander: vi.fn(),
}));

vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/recs/store", () => ({ findScoredCommander }));
vi.mock("../../../lib/recs/recommend", () => ({ scoreOneCommander }));

const { retryCoverageFigures } = await import("./coverage-action");

const roleCards: Record<RoleName, RoleCard[]> = {
  ramp: [],
  draw: [],
  removal: [],
  wipes: [],
};

beforeEach(() => {
  requireUserId.mockReset().mockResolvedValue("user_1");
  findScoredCommander.mockReset().mockResolvedValue({ oracleId: "korvold" });
  scoreOneCommander.mockReset();
});

describe("retryCoverageFigures", () => {
  it("hands back the role cards when the retry resolves ok", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleCards });
    await expect(retryCoverageFigures("korvold")).resolves.toBe(roleCards);
  });

  it("withholds figures when the retry is still degraded", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "degraded", roleCards });
    await expect(retryCoverageFigures("korvold")).resolves.toBeNull();
  });

  it("withholds figures when the retry comes back absent", async () => {
    // Absent is a real answer from a reachable EDHREC, not a failure — but it
    // is still no data, and returning cards here would draw the ok treatment
    // for a commander EDHREC has nothing on.
    scoreOneCommander.mockResolvedValue({ synergyState: "absent", roleCards });
    await expect(retryCoverageFigures("korvold")).resolves.toBeNull();
  });

  it("returns null when the commander cannot be resolved", async () => {
    findScoredCommander.mockResolvedValue(null);
    await expect(retryCoverageFigures("nobody")).resolves.toBeNull();
    expect(scoreOneCommander).not.toHaveBeenCalled();
  });

  it("returns null when the rescore yields nothing", async () => {
    scoreOneCommander.mockResolvedValue(null);
    await expect(retryCoverageFigures("korvold")).resolves.toBeNull();
  });
});
