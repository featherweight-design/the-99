// Upgrade this precon's seen and pick actions (fresh start 1/4): each is a public endpoint, so the reader's switch and the
// shape of every argument are checked before the store is reached, and the store is called with the session's user id.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestFlags: vi.fn(),
  preconUpgradeEnabled: vi.fn(),
  markSeen: vi.fn(),
  setPick: vi.fn(),
}));
vi.mock("../../auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../flags/request", () => ({ requestFlags: m.requestFlags }));
vi.mock("./flag", () => ({ preconUpgradeEnabled: m.preconUpgradeEnabled }));
vi.mock("./store", () => ({ markSeen: m.markSeen, setPick: m.setPick }));
vi.mock("./run", () => ({ LIVE_DEPS: {}, pressUpgrade: vi.fn(), readUpgrade: vi.fn() }));

import { markUpgradeSeenAction, pickUpgradeLineAction } from "./actions";

const RUN = "11111111-1111-4111-8111-111111111111";
const ORACLE = "22222222-2222-4222-8222-222222222222";
const ENV = { PRECON_UPGRADE_ENABLED: "true" };

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_session");
  m.requestFlags.mockResolvedValue(ENV);
  m.preconUpgradeEnabled.mockReturnValue(true);
  m.markSeen.mockResolvedValue(true);
  m.setPick.mockResolvedValue({ ok: true, unpicked: [] });
});

describe("markUpgradeSeenAction", () => {
  it("is refused with the reader's switch off, and the store is never reached", async () => {
    m.preconUpgradeEnabled.mockReturnValue(false);
    expect(await markUpgradeSeenAction(RUN)).toEqual({ ok: false });
    expect(m.requestFlags).toHaveBeenCalledWith("user_session");
    expect(m.preconUpgradeEnabled).toHaveBeenCalledWith(ENV);
    expect(m.markSeen).not.toHaveBeenCalled();
  });

  it("refuses a malformed run id without calling the store", async () => {
    for (const bad of ["", "r", `${RUN}x`, "'; drop table", 42 as unknown as string]) {
      expect(await markUpgradeSeenAction(bad)).toEqual({ ok: false });
    }
    expect(m.markSeen).not.toHaveBeenCalled();
  });

  it("marks the run with the user id from the session", async () => {
    expect(await markUpgradeSeenAction(RUN)).toEqual({ ok: true });
    expect(m.markSeen).toHaveBeenCalledWith("user_session", RUN);
  });

  it("passes the store's false through (already seen, or not the reader's)", async () => {
    m.markSeen.mockResolvedValue(false);
    expect(await markUpgradeSeenAction(RUN)).toEqual({ ok: false });
  });
});

describe("pickUpgradeLineAction", () => {
  it("is refused with the reader's switch off, and the store is never reached", async () => {
    m.preconUpgradeEnabled.mockReturnValue(false);
    expect(await pickUpgradeLineAction(RUN, `a-${ORACLE}`, true)).toEqual({ ok: false, reason: "off" });
    expect(m.setPick).not.toHaveBeenCalled();
  });

  it("refuses a malformed run id without calling the store", async () => {
    expect(await pickUpgradeLineAction("not-a-run", `a-${ORACLE}`, true)).toEqual({ ok: false, reason: "notFound" });
    expect(m.setPick).not.toHaveBeenCalled();
  });

  it("is unknownLine for a malformed line id, without calling the store", async () => {
    for (const bad of [ORACLE, `x-${ORACLE}`, "a-", `a-${ORACLE}x`, "a-add-1"]) {
      expect(await pickUpgradeLineAction(RUN, bad, true)).toEqual({ ok: false, reason: "unknownLine" });
    }
    expect(m.setPick).not.toHaveBeenCalled();
  });

  it("refuses a picked that is not a boolean", async () => {
    for (const bad of ["true", 1, null, undefined]) {
      expect(await pickUpgradeLineAction(RUN, `c-${ORACLE}`, bad as unknown as boolean)).toEqual({ ok: false, reason: "unknownLine" });
    }
    expect(m.setPick).not.toHaveBeenCalled();
  });

  it("sets the pick with the user id from the session and returns the store's answer", async () => {
    m.setPick.mockResolvedValue({ ok: true, unpicked: [`c-${ORACLE}`] });
    expect(await pickUpgradeLineAction(RUN, `c-${ORACLE}`, false)).toEqual({ ok: true, unpicked: [`c-${ORACLE}`] });
    expect(m.setPick).toHaveBeenCalledWith("user_session", RUN, `c-${ORACLE}`, false);
  });
});
