import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ create: vi.fn(), revoke: vi.fn(), list: vi.fn(), pending: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    invitations: { createInvitation: m.create, revokeInvitation: m.revoke, getInvitationList: m.pending },
    users: { getUserList: m.list },
  }),
}));

import { classifyClerkError, clerkInvites, INVITATION_DAYS } from "./clerk";

const refusal = Object.assign(new Error("exists"), { status: 422, errors: [{ code: "duplicate_record" }] });

beforeEach(() => vi.resetAllMocks());

describe("classifyClerkError", () => {
  it("reads a 4xx as a refusal with Clerk's code, and anything else as indeterminate", () => {
    expect(classifyClerkError(refusal)).toEqual({ ok: false, reason: "refused", code: "duplicate_record" });
    expect(classifyClerkError({ status: 400 })).toEqual({ ok: false, reason: "refused", code: null });
    for (const e of [{ status: 500 }, { status: 503 }, new Error("fetch failed"), null, "x", { status: "422" }]) {
      expect(classifyClerkError(e)).toEqual({ ok: false, reason: "indeterminate" });
    }
  });
});

describe("clerkInvites.create", () => {
  it("creates a 7-day invitation naming the reservation, with no redirect and no ignoreExisting", async () => {
    m.create.mockResolvedValue({ id: "inv_1", url: "https://accounts.x/ticket" });
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r1", notify: true }))
      .toEqual({ ok: true, id: "inv_1", url: "https://accounts.x/ticket" });
    expect(INVITATION_DAYS).toBe(7);
    expect(m.create).toHaveBeenCalledWith({
      emailAddress: "a@x.dev", notify: true, expiresInDays: 7, publicMetadata: { inviteReservation: "r1" },
    });
  });

  it("passes ignoreExisting only when asked, for the QR path's hand-over", async () => {
    m.create.mockResolvedValue({ id: "inv_2", url: null });
    await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r2", notify: false, ignoreExisting: true });
    expect(m.create.mock.calls[0][0]).toMatchObject({ notify: false, ignoreExisting: true });
  });

  it("answers a throw by what it can mean, never throwing", async () => {
    m.create.mockRejectedValue(refusal);
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r", notify: true }))
      .toMatchObject({ ok: false, reason: "refused" });
    m.create.mockRejectedValue(new Error("timeout"));
    expect(await clerkInvites.create({ emailAddress: "a@x.dev", reservationId: "r", notify: true }))
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
    expect(m.pending).toHaveBeenCalledWith({ query: "a@x.dev", status: "pending" });
    expect(m.revoke.mock.calls).toEqual([["inv_a"]]);
    m.revoke.mockRejectedValue({ status: 429 });
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(false);
    m.pending.mockRejectedValue(new Error("down"));
    expect(await clerkInvites.revokeFor("a@x.dev", "r1")).toBe(false);
  });

  it("looks an address up by exact email", async () => {
    m.list.mockResolvedValue({ data: [{ id: "user_x" }] });
    expect(await clerkInvites.hasAccount("a@x.dev")).toBe(true);
    expect(m.list).toHaveBeenCalledWith({ emailAddress: ["a@x.dev"], limit: 1 });
    m.list.mockResolvedValue({ data: [] });
    expect(await clerkInvites.hasAccount("a@x.dev")).toBe(false);
  });
});
