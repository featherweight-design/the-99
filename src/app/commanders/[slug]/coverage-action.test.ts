// The retry action's only job is deciding whether the re-resolved commander
// has figures to hand back. Getting that wrong is invisible in the component
// tests, which mock the action away entirely.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RoleCard, RoleName } from "../../../lib/recs/score";

const { requireUserId, resolveCommanderSlug, scoreOneCommander, loadAvailability } = vi.hoisted(
  () => ({
    requireUserId: vi.fn(),
    resolveCommanderSlug: vi.fn(),
    scoreOneCommander: vi.fn(),
    loadAvailability: vi.fn(),
  }),
);

vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/discovery/resolve-slug", () => ({ resolveCommanderSlug }));
vi.mock("../../../lib/recs/recommend", () => ({ scoreOneCommander }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability }));

/** A hard claim, so a stamped card reads as something other than free. */
const CLAIMED = {
  owned: 1,
  hard: 1,
  soft: 0,
  free: 0,
  claims: [
    { id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true },
  ],
};

const { retryCoverageFigures } = await import("./coverage-action");

const roleCards: Record<RoleName, RoleCard[]> = {
  ramp: [],
  draw: [],
  removal: [],
  wipes: [],
};

beforeEach(() => {
  requireUserId.mockReset().mockResolvedValue("user_1");
  resolveCommanderSlug.mockReset().mockResolvedValue({ oracleId: "korvold" });
  scoreOneCommander.mockReset();
  loadAvailability.mockReset().mockResolvedValue(new Map());
});

describe("retryCoverageFigures", () => {
  it("hands back the role cards when the retry resolves ok", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleCards });
    await expect(retryCoverageFigures("korvold")).resolves.toEqual(roleCards);
  });

  // The section REPLACES its state with whatever this returns, and
  // `scoreOneCommander` leaves every `availability` null. Handing back the bare
  // scored cards erased every marker on a successful retry, reverted the key to
  // its free form, and made the Availability sort read every recovered card as
  // free — none of which `router.refresh()` undoes, because the state is
  // client-owned.
  it("re-stamps the claim picture onto the recovered cards", async () => {
    const cards: Record<RoleName, RoleCard[]> = {
      ...roleCards,
      ramp: [{ oracleId: "sol", name: "Sol Ring", inclusionPct: 82, committedTo: null, availability: null }],
    };
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleCards: cards });
    loadAvailability.mockResolvedValue(new Map([["sol", CLAIMED]]));

    const out = await retryCoverageFigures("korvold");
    expect(out!.ramp[0].availability).toEqual(CLAIMED);
    // Narrowed to the cards this payload actually carries, not the whole shelf.
    expect(loadAvailability).toHaveBeenCalledWith("user_1", { oracleIds: ["sol"] });
  });

  // The claim read is an enrichment. A blip in it must not turn a retry that
  // DID recover the figures into a failure.
  it("still hands back the figures when the claim read fails", async () => {
    const cards: Record<RoleName, RoleCard[]> = {
      ...roleCards,
      ramp: [{ oracleId: "sol", name: "Sol Ring", inclusionPct: 82, committedTo: null, availability: null }],
    };
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleCards: cards });
    loadAvailability.mockRejectedValue(new Error("claim read down"));

    const out = await retryCoverageFigures("korvold");
    expect(out!.ramp[0].name).toBe("Sol Ring");
    expect(out!.ramp[0].availability).toBeNull();
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
    resolveCommanderSlug.mockResolvedValue(null);
    await expect(retryCoverageFigures("nobody")).resolves.toBeNull();
    expect(scoreOneCommander).not.toHaveBeenCalled();
  });

  it("returns null when the rescore yields nothing", async () => {
    scoreOneCommander.mockResolvedValue(null);
    await expect(retryCoverageFigures("korvold")).resolves.toBeNull();
  });
});
