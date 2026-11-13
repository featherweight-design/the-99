import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { CODE_TTL_MS, inviteCount, LINK_PROVEN_HOLD_MS, linkHoldUntil, MAX_LINK_HOLDS } from "./rules";
import { linkJoinRefusal, openLinkJoin } from "./link-join";

const NOW = new Date("2026-11-12T12:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

describe("linkHoldUntil", () => {
  it("holds an unproven claim for the code's ten minutes from now, never the QR's seven days", () => {
    expect(linkHoldUntil(NOW, null)).toEqual(at(CODE_TTL_MS));
  });

  it("holds a proven claim an hour from the PROOF, so a later resend never extends it", () => {
    const proven = at(-20 * 60_000);
    expect(linkHoldUntil(NOW, proven)).toEqual(new Date(proven.getTime() + LINK_PROVEN_HOLD_MS));
    expect(linkHoldUntil(at(50 * 60_000), proven)).toEqual(new Date(proven.getTime() + LINK_PROVEN_HOLD_MS));
  });
});

describe("inviteCount with a friend link's newcomer", () => {
  it("counts the newcomer as waiting, never as the sender's own live QR", () => {
    const row = { kind: "qr" as const, state: "qr_open" as const, qrExpiresAt: at(60_000), holdsUntil: null, linkKeyId: "k" };
    const count = inviteCount(3, [row], NOW);
    expect(count).toMatchObject({ left: 2, waiting: 1, liveQr: false, qrUntil: null });
  });
});

describe("linkJoinRefusal", () => {
  it("opens nothing when the owner is out of invites", () => {
    expect(linkJoinRefusal(true, 0)).toBe("out");
  });

  it("caps the newcomers one link holds at once at two", () => {
    expect(MAX_LINK_HOLDS).toBe(2);
    expect(linkJoinRefusal(false, 1)).toBeNull();
    expect(linkJoinRefusal(false, 2)).toBe("busy");
  });
});

describe("openLinkJoin", () => {
  it("writes nothing without the key or with a token that is not a link", async () => {
    expect(await openLinkJoin("x".repeat(22), null)).toEqual({ ok: false, reason: "unconfigured" });
    expect(await openLinkJoin("short", "a".repeat(64))).toEqual({ ok: false, reason: "ended" });
  });
});
