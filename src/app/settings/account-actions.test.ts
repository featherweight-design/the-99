// Account in Settings' two writes on the reader's own Clerk account: the delete steps up before it counts or deletes, and
// the device sign-out refuses any session that is not one of the reader's OTHER devices with the same answer.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  has: vi.fn(),
  deleteUser: vi.fn(),
  getSessionList: vi.fn(),
  revokeSession: vi.fn(),
  enforceHit: vi.fn(),
  captureServerError: vi.fn(),
}));

class FakeClerkError extends Error {
  constructor(readonly status: number) {
    super(`clerk ${status}`);
  }
}

vi.mock("@clerk/nextjs/server", () => ({
  auth: m.auth,
  clerkClient: async () => ({
    users: { deleteUser: m.deleteUser },
    sessions: { getSessionList: m.getSessionList, revokeSession: m.revokeSession },
  }),
  reverificationError: (level: string) => ({ clerk_error: { type: "forbidden", reason: "reverification-error", metadata: { reverification: level } } }),
}));
vi.mock("@clerk/nextjs/errors", () => ({ isClerkAPIResponseError: (e: unknown) => e instanceof FakeClerkError }));
// `enforceHit` lets a hit through (null) unless a test says otherwise.
vi.mock("../../lib/rate/observe", () => ({ enforceHit: async (...a: unknown[]) => (await m.enforceHit(...a)) ?? null }));
vi.mock("../../lib/sentry/capture", () => ({ captureServerError: m.captureServerError }));

import { deleteAccountAction, signOutDeviceAction } from "./account-actions";

const OTHER = "sess_2abcdefghijklmnop";
const THIS = "sess_1abcdefghijklmnop";

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ userId: "user_a", sessionId: THIS, has: m.has });
  m.has.mockReturnValue(true);
  m.deleteUser.mockResolvedValue({});
  m.getSessionList.mockResolvedValue({ data: [{ id: THIS }, { id: OTHER }], totalCount: 2 });
  m.revokeSession.mockResolvedValue({});
});

describe("deleteAccountAction", () => {
  it("refuses a signed-out caller before anything", async () => {
    m.auth.mockResolvedValue({ userId: null, sessionId: null, has: m.has });
    await expect(deleteAccountAction()).rejects.toThrow("unauthenticated");
    expect(m.enforceHit).not.toHaveBeenCalled();
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("asks for a strict step-up first, counting nothing and deleting nothing", async () => {
    m.has.mockReturnValue(false);
    const out = await deleteAccountAction();
    expect(m.has).toHaveBeenCalledWith({ reverification: "strict" });
    expect(out).toMatchObject({ clerk_error: { reason: "reverification-error", metadata: { reverification: "strict" } } });
    expect(m.enforceHit).not.toHaveBeenCalled();
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the reader's own account after the step-up, counted on the account-delete rule", async () => {
    expect(await deleteAccountAction()).toEqual({ ok: true });
    expect(m.enforceHit).toHaveBeenCalledWith("user_a", "account-delete");
    expect(m.deleteUser).toHaveBeenCalledWith("user_a");
  });

  it("refuses as limited over the rule, deleting nothing", async () => {
    m.enforceHit.mockResolvedValue(600);
    expect(await deleteAccountAction()).toEqual({ ok: false, reason: "limited" });
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("reads Clerk's own 429 as limited, unreported", async () => {
    m.deleteUser.mockRejectedValue(new FakeClerkError(429));
    expect(await deleteAccountAction()).toEqual({ ok: false, reason: "limited" });
    expect(m.captureServerError).not.toHaveBeenCalled();
  });

  it("never reads a failed delete as done, and reports it", async () => {
    m.deleteUser.mockRejectedValue(new Error("network"));
    expect(await deleteAccountAction()).toEqual({ ok: false, reason: "failed" });
    expect(m.captureServerError).toHaveBeenCalledWith("account-delete", expect.any(Error));
  });
});

describe("signOutDeviceAction", () => {
  it("refuses a signed-out caller before anything", async () => {
    m.auth.mockResolvedValue({ userId: null, sessionId: null, has: m.has });
    await expect(signOutDeviceAction(OTHER)).rejects.toThrow("unauthenticated");
    expect(m.getSessionList).not.toHaveBeenCalled();
  });

  it("signs out one of the reader's other devices", async () => {
    expect(await signOutDeviceAction(OTHER)).toEqual({ ok: true });
    expect(m.enforceHit).toHaveBeenCalledWith("user_a", "device-sign-out");
    expect(m.revokeSession).toHaveBeenCalledWith(OTHER);
  });

  it.each([
    ["not a string", 42],
    ["not a session id", "user_abcdefghijklmnop"],
    ["this device", THIS],
  ])("refuses %s before Clerk is asked or a hit is counted", async (_n, id) => {
    expect(await signOutDeviceAction(id)).toEqual({ ok: false, reason: "failed" });
    expect(m.enforceHit).not.toHaveBeenCalled();
    expect(m.getSessionList).not.toHaveBeenCalled();
    expect(m.revokeSession).not.toHaveBeenCalled();
  });

  it("revokes only an id among the reader's own active sessions, never looking up the asked-for id", async () => {
    await signOutDeviceAction(OTHER);
    expect(m.getSessionList).toHaveBeenCalledWith({ userId: "user_a", status: "active", limit: 100 });
  });

  it("refuses a session that is not one of the reader's with the same answer, revoking nothing", async () => {
    m.getSessionList.mockResolvedValue({ data: [{ id: THIS }], totalCount: 1 });
    expect(await signOutDeviceAction(OTHER)).toEqual({ ok: false, reason: "failed" });
    expect(m.revokeSession).not.toHaveBeenCalled();
    expect(m.captureServerError).not.toHaveBeenCalled();
  });

  it("reports a failed revoke and never reads it as done", async () => {
    m.revokeSession.mockRejectedValue(new Error("network"));
    expect(await signOutDeviceAction(OTHER)).toEqual({ ok: false, reason: "failed" });
    expect(m.captureServerError).toHaveBeenCalledWith("device-sign-out", expect.any(Error));
  });

  it("refuses as limited over the rule, asking Clerk nothing", async () => {
    m.enforceHit.mockResolvedValue(60);
    expect(await signOutDeviceAction(OTHER)).toEqual({ ok: false, reason: "limited" });
    expect(m.getSessionList).not.toHaveBeenCalled();
  });

  it("reads Clerk's 429 as limited", async () => {
    m.revokeSession.mockRejectedValue(new FakeClerkError(429));
    expect(await signOutDeviceAction(OTHER)).toEqual({ ok: false, reason: "limited" });
  });
});
