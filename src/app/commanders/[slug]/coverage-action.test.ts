// The retry action's only job is deciding whether the re-resolved commander
// has figures to hand back. Getting that wrong is invisible in the component
// tests, which mock the action away entirely.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RoleCard, RoleName } from "../../../lib/recs/score";

const { requireUserId, resolveCommanderSlug, scoreOneCommander, loadAvailability, loadFreePool, resolveOwnedPrintings } = vi.hoisted(
  () => ({
    requireUserId: vi.fn(),
    resolveCommanderSlug: vi.fn(),
    scoreOneCommander: vi.fn(),
    loadAvailability: vi.fn(),
    loadFreePool: vi.fn(),
    resolveOwnedPrintings: vi.fn(),
  }),
);

vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/discovery/resolve-slug", () => ({ resolveCommanderSlug }));
vi.mock("../../../lib/recs/recommend", () => ({ scoreOneCommander }));
vi.mock("../../../lib/recs/free-ranking", () => ({ loadFreePool }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability }));
vi.mock("../../../lib/collection/owned-printings", () => ({ resolveOwnedPrintings }));
// The reader's resolved switches, a stand-in pinned by identity: the retry scores under the role
// basis the page rendered with (admin PR 6d-2), so the env must reach the resolve and the score; and
// the free pool's claim read decides NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from it (6f-1).
const RESOLVED = vi.hoisted(() => ({
  LABEL_ROLE_COUNTS_ENABLED: "true", NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true",
}) as unknown as NodeJS.ProcessEnv);
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => RESOLVED }));

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
  loadFreePool.mockReset().mockResolvedValue([{ oracleId: "free-1" }]);
  resolveOwnedPrintings.mockReset().mockResolvedValue(new Map());
});

describe("retryCoverageFigures", () => {
  it("hands back the role cards when the retry resolves ok", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toEqual(roleCards);
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
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards: cards });
    loadAvailability.mockResolvedValue(new Map([["sol", CLAIMED]]));

    const out = await retryCoverageFigures("korvold", "all", "labels");
    expect(out!.ramp[0].availability).toEqual(CLAIMED);
    // Narrowed to the cards this payload actually carries, not the whole shelf.
    expect(loadAvailability).toHaveBeenCalledWith("user_1", { oracleIds: ["sol"], env: RESOLVED });
    // The claim read runs under the reader's resolved switches (admin PR 6e), the very env the retry
    // resolved and scored under (the page's basis laid over the reader's): identity, not a deep match.
    expect(loadAvailability.mock.calls[0][1].env === resolveCommanderSlug.mock.calls[0][2]).toBe(true);
  });

  // The page gives every role card the owned copy's art, which is what Role Coverage hands its
  // siblings for the neighbor plates. The scored cards carry none, so handing them back bare
  // blanked every plate on a successful retry until a read-ahead filled it.
  it("re-stamps the owned copy's art onto the recovered cards", async () => {
    const cards: Record<RoleName, RoleCard[]> = {
      ...roleCards,
      ramp: [{ oracleId: "sol", name: "Sol Ring", inclusionPct: 82, committedTo: null, availability: null }],
    };
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards: cards });
    resolveOwnedPrintings.mockResolvedValue(new Map([["sol", { imageUri: "https://img/owned-sol.jpg", printedName: "Renamed Ring" }]]));

    const out = await retryCoverageFigures("korvold", "all", "labels");
    expect(out!.ramp[0].imageUri).toBe("https://img/owned-sol.jpg");
    expect(out!.ramp[0].printedName).toBe("Renamed Ring");
    expect(resolveOwnedPrintings).toHaveBeenCalledWith("user_1", ["sol"]);
  });

  // A claim-read failure REJECTS rather than returning null-stamped cards, and
  // that is the whole point. The section replaces its state with whatever comes
  // back, so handing it cards stamped null would erase the markers this
  // re-stamp exists to preserve — the same regression, arriving by the fallback
  // instead of by the omission. A rejection is a no-op: `handleRetry` swallows
  // it, the state stands, and the reader can press Retry again.
  it("rejects rather than handing back null-stamped cards when the claim read fails", async () => {
    const cards: Record<RoleName, RoleCard[]> = {
      ...roleCards,
      ramp: [{ oracleId: "sol", name: "Sol Ring", inclusionPct: 82, committedTo: null, availability: null }],
    };
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards: cards });
    loadAvailability.mockRejectedValue(new Error("claim read down"));

    await expect(retryCoverageFigures("korvold", "all", "labels")).rejects.toThrow("claim read down");
  });

  // The read is expensive and its result is discarded for any non-ok state, so
  // it must sit AFTER the guard rather than before it.
  it("does not read claims at all when the retry is still degraded", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "degraded", roleBasis: "labels", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
    expect(loadAvailability).not.toHaveBeenCalled();
  });

  it("withholds figures when the retry is still degraded", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "degraded", roleBasis: "labels", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
  });

  it("withholds figures when the retry comes back absent", async () => {
    // Absent is a real answer from a reachable EDHREC, not a failure — but it
    // is still no data, and returning cards here would draw the ok treatment
    // for a commander EDHREC has nothing on.
    scoreOneCommander.mockResolvedValue({ synergyState: "absent", roleBasis: "labels", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
  });

  it("returns null when the commander cannot be resolved", async () => {
    resolveCommanderSlug.mockResolvedValue(null);
    await expect(retryCoverageFigures("nobody", "all", "labels")).resolves.toBeNull();
    expect(scoreOneCommander).not.toHaveBeenCalled();
  });

  // Admin PR 6d-2 (Copilot round 5): the retry answers on the OPEN page's basis, never a fresh
  // snapshot. The reader's switch now says labels; the page was drawn under the classifier.
  it("scores under the basis the page names, not the one the switch resolves to now", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "classifier", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "classifier")).resolves.not.toBeNull();
    const env = scoreOneCommander.mock.calls[0][4] as NodeJS.ProcessEnv;
    expect(env.LABEL_ROLE_COUNTS_ENABLED).toBe("false");
  });

  it("refuses a basis outside the closed set, and reads nothing", async () => {
    await expect(retryCoverageFigures("korvold", "all", "other")).resolves.toBeNull();
    expect(scoreOneCommander).not.toHaveBeenCalled();
  });

  it("answers a labels page under the kill switch with nothing, never classifier cards", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "off");
    try {
      await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
      expect(scoreOneCommander).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("answers nothing when the rescore fell back to another basis than the page's", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "classifier", roleCards });
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
    expect(loadAvailability).not.toHaveBeenCalled();
  });

  it("returns null when the rescore yields nothing", async () => {
    scoreOneCommander.mockResolvedValue(null);
    await expect(retryCoverageFigures("korvold", "all", "labels")).resolves.toBeNull();
  });
  // ── The retry keeps the pool the page is drawing ─────────────────────────
  //
  // `/commanders/[slug]?avail=free` scores against the free pool — the cards no
  // committed deck is holding. This action passed no pool at all, so a
  // successful retry there handed back cards the free list deliberately
  // excludes, and Role Coverage silently became the all-owned panel while the
  // URL still said free.
  it("scores against the free pool when the page is in free mode", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards });
    // The environment says the opposite of the reader's switches: a free pool left to default its env
    // would run the claim model under the environment's.
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    try {
      await retryCoverageFigures("korvold", "free", "labels");
    } finally {
      vi.unstubAllEnvs();
    }
    expect(loadFreePool).toHaveBeenCalledTimes(1);
    expect(loadFreePool.mock.calls[0][0]).toBe("user_1");
    // The page-basis env the action derives from RESOLVED (a copy carrying the page's basis), the same
    // object the score is handed, so it holds the reader's switches and not the environment's.
    const handed = loadFreePool.mock.calls[0][1] as NodeJS.ProcessEnv | undefined;
    expect(handed !== undefined && handed === scoreOneCommander.mock.calls[0][4]).toBe(true);
    expect(handed?.NEVER_CUT_ENABLED === "true" && handed?.CHANGE_COMMANDER_ENABLED === "true").toBe(true);
    expect(scoreOneCommander).toHaveBeenCalledWith("user_1", "korvold", "korvold", [
      { oracleId: "free-1" },
    ], RESOLVED);
  });

  it("scores against the collection in the default mode, and reads no free pool", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards });
    await retryCoverageFigures("korvold", "all", "labels");
    expect(loadFreePool).not.toHaveBeenCalled();
    expect(scoreOneCommander).toHaveBeenCalledWith("user_1", "korvold", "korvold", undefined, RESOLVED);
    expect(resolveCommanderSlug).toHaveBeenCalledWith("user_1", "korvold", RESOLVED);
  });

  // A failed free-pool read ABANDONS the retry rather than scoring against the
  // collection. The section replaces its client state with whatever comes back
  // and `router.refresh()` keeps client state, so a collection-scored payload
  // would leave all-owned cards on screen under a free URL — this action's own
  // defect, reached through the outage path. Both halves are asserted: that the
  // rescore never happens, and that the caller gets the same null every other
  // failed retry returns.
  it("abandons the retry when the free pool read fails, rather than scoring the collection", async () => {
    scoreOneCommander.mockResolvedValue({ synergyState: "ok", roleBasis: "labels", roleCards });
    loadFreePool.mockResolvedValue(null);
    await expect(retryCoverageFigures("korvold", "free", "labels")).resolves.toBeNull();
    expect(scoreOneCommander).not.toHaveBeenCalled();
  });
});
