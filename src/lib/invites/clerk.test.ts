import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ create: vi.fn(), revoke: vi.fn(), list: vi.fn(), pending: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    invitations: { createInvitation: m.create, revokeInvitation: m.revoke, getInvitationList: m.pending },
    users: { getUserList: m.list },
  }),
}));

import { classifyClerkError, clerkInvites, INVITATION_DAYS, refusesRedirect } from "./clerk";

const refusal = Object.assign(new Error("exists"), { status: 422, errors: [{ code: "duplicate_record" }] });
// Clerk's answer to a redirect_url it will not take: a 422 naming the parameter.
const redirectRefusal = Object.assign(new Error("invalid"), {
  status: 422, errors: [{ code: "form_param_value_invalid", message: "is invalid", meta: { paramName: "redirect_url" } }],
});
const SIGN_UP = "https://the99.test/sign-up";

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("classifyClerkError", () => {
  it("reads a 4xx as a refusal with Clerk's code, and anything else as indeterminate", () => {
    expect(classifyClerkError(refusal)).toEqual({ ok: false, reason: "refused", code: "duplicate_record" });
    expect(classifyClerkError({ status: 400 })).toEqual({ ok: false, reason: "refused", code: null });
    for (const e of [{ status: 500 }, { status: 503 }, new Error("fetch failed"), null, "x", { status: "422" }]) {
      expect(classifyClerkError(e)).toEqual({ ok: false, reason: "indeterminate" });
    }
  });

  it("reads a 4xx naming redirect_url as the request's own fault, never the address's refusal", () => {
    expect(classifyClerkError(redirectRefusal)).toEqual({ ok: false, reason: "rejected" });
    expect(refusesRedirect({ status: 400, errors: [{ longMessage: "redirect_url must be an allowed origin" }] })).toBe(true);
    expect(refusesRedirect(refusal)).toBe(false);
    expect(refusesRedirect({ status: 500, errors: [{ meta: { paramName: "redirect_url" } }] })).toBe(false);
  });
});

describe("clerkInvites.create", () => {
  it("creates a 7-day invitation naming the reservation, landing where it is told, with no ignoreExisting", async () => {
    m.create.mockResolvedValue({ id: "inv_1", url: "https://accounts.x/ticket" });
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r1", notify: true, redirectUrl: SIGN_UP }))
      .toEqual({ ok: true, id: "inv_1", url: "https://accounts.x/ticket" });
    expect(INVITATION_DAYS).toBe(7);
    expect(m.create).toHaveBeenCalledWith({
      emailAddress: "a@x.dev", notify: true, expiresInDays: 7, publicMetadata: { inviteReservation: "r1" }, redirectUrl: SIGN_UP,
    });
  });

  it("makes the invitation with no redirect when given none, so its link lands on Clerk's hosted sign-up", async () => {
    m.create.mockResolvedValue({ id: "inv_1", url: null });
    expect((await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r1", notify: false, redirectUrl: null })).ok).toBe(true);
    expect(m.create.mock.calls[0][0]).not.toHaveProperty("redirectUrl");
  });

  it("retries a refused redirect_url once without it, and the invitation is made", async () => {
    m.create.mockRejectedValueOnce(redirectRefusal).mockResolvedValueOnce({ id: "inv_3", url: "https://accounts.x/t3" });
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r3", notify: false, redirectUrl: SIGN_UP }))
      .toEqual({ ok: true, id: "inv_3", url: "https://accounts.x/t3" });
    expect(m.create).toHaveBeenCalledTimes(2);
    expect(m.create.mock.calls[0][0].redirectUrl).toBe(SIGN_UP);
    expect(m.create.mock.calls[1][0]).not.toHaveProperty("redirectUrl");
    expect(console.warn).toHaveBeenCalledWith("[invites] invitation redirect_url refused; retrying without it");
  });

  it("answers a second redirect_url refusal as rejected, never a success, and retries only once", async () => {
    m.create.mockRejectedValue(redirectRefusal);
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r4", notify: false, redirectUrl: SIGN_UP }))
      .toEqual({ ok: false, reason: "rejected" });
    expect(m.create).toHaveBeenCalledTimes(2);
  });

  it("does not retry any other refusal, or a redirect refusal when it sent no redirect", async () => {
    m.create.mockRejectedValue(refusal);
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r5", notify: false, redirectUrl: SIGN_UP }))
      .toMatchObject({ ok: false, reason: "refused" });
    expect(m.create).toHaveBeenCalledTimes(1);
    m.create.mockReset().mockRejectedValue(redirectRefusal);
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r5", notify: false, redirectUrl: null }))
      .toEqual({ ok: false, reason: "rejected" });
    expect(m.create).toHaveBeenCalledTimes(1);
  });

  it("passes ignoreExisting only when asked, for the QR path's hand-over", async () => {
    m.create.mockResolvedValue({ id: "inv_2", url: null });
    await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r2", notify: false, ignoreExisting: true, redirectUrl: null });
    expect(m.create.mock.calls[0][0]).toMatchObject({ notify: false, ignoreExisting: true });
  });

  it("answers a throw by what it can mean, never throwing", async () => {
    m.create.mockRejectedValue(refusal);
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r", notify: true, redirectUrl: null }))
      .toMatchObject({ ok: false, reason: "refused" });
    m.create.mockRejectedValue(new Error("timeout"));
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r", notify: true, redirectUrl: null }))
      .toEqual({ ok: false, reason: "indeterminate" });
  });
});

describe("clerkInvites.revoke and hasAccount", () => {
  it("counts an invitation already gone as revoked, and nothing else", async () => {
    m.revoke.mockResolvedValue({});
    expect(await clerkInvites.revoke("inv_1")).toBe(true);
    for (const status of [400, 404, 410, 422]) {
      m.revoke.mockRejectedValue({ status });
      expect(await clerkInvites.revoke("inv_1")).toBe(true);
    }
    for (const e of [{ status: 401 }, { status: 403 }, { status: 429 }, { status: 502 }, new Error("down")]) {
      m.revoke.mockRejectedValue(e);
      expect(await clerkInvites.revoke("inv_1")).toBe(false);
    }
  });

  it("revokes by address only the pending invitations naming this reservation", async () => {
    m.pending.mockResolvedValue({ data: [
      { id: "inv_a", publicMetadata: { inviteReservation: "r1" } },
      { id: "inv_b", publicMetadata: { inviteReservation: "r2" } },
      { id: "inv_c", publicMetadata: {} },
    ] });
    m.revoke.mockResolvedValue({});
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(true);
    expect(m.pending).toHaveBeenCalledWith({ query: "a@x.dev", status: "pending", limit: 100, offset: 0 });
    expect(m.revoke.mock.calls).toEqual([["inv_a"]]);
    m.revoke.mockRejectedValue({ status: 429 });
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(false);
    m.pending.mockRejectedValue(new Error("down"));
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(false);
  });

  it("reads every page, so a match on page two is revoked", async () => {
    const other = (n: number) => ({ id: `inv_o${n}`, publicMetadata: { inviteReservation: `x${n}` } });
    m.pending.mockReset();
    m.pending
      .mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, n) => other(n)) })
      .mockResolvedValueOnce({ data: [{ id: "inv_mine", publicMetadata: { inviteReservation: "r1" } }] });
    m.revoke.mockReset();
    m.revoke.mockResolvedValue({});
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(true);
    expect(m.pending.mock.calls.map((c) => c[0].offset)).toEqual([0, 100]);
    expect(m.revoke.mock.calls).toEqual([["inv_mine"]]);
  });

  it("looks an address up by exact email", async () => {
    m.list.mockResolvedValue({ data: [{ id: "user_x" }] });
    expect(await clerkInvites.hasAccount("a@x.dev")).toBe(true);
    expect(m.list).toHaveBeenCalledWith({ emailAddress: ["a@x.dev"], limit: 1 });
    m.list.mockResolvedValue({ data: [] });
    expect(await clerkInvites.hasAccount("a@x.dev")).toBe(false);
  });
});
