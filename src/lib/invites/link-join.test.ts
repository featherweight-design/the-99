import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { CODE_TTL_MS, inviteCount, LINK_PROVEN_HOLD_MS, linkHoldUntil, MAX_LINK_HOLDS } from "./rules";
import { linkJoinRefusal, openLinkJoin } from "./link-join";
import { claimHoldUntil, proofWrite } from "./claim";

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

describe("a friend link's claim and proof", () => {
  const link = { linkKeyId: "k", holdsUntil: at(5 * 60_000), provenAt: null };
  it("holds the code's ten minutes on a send, where a QR claim starts its seven days", () => {
    expect(claimHoldUntil(link, true, false, NOW)).toEqual(at(CODE_TTL_MS));
    expect(claimHoldUntil({ ...link, linkKeyId: null }, true, false, NOW)?.getTime()).toBeGreaterThan(at(LINK_PROVEN_HOLD_MS).getTime());
  });

  it("keeps a proven link claim's hour from the proof on a same-address resend, and drops it for a new address", () => {
    const proven = { ...link, provenAt: at(-60_000), holdsUntil: at(LINK_PROVEN_HOLD_MS - 60_000) };
    expect(claimHoldUntil(proven, false, true, NOW)).toEqual(at(LINK_PROVEN_HOLD_MS - 60_000));
    expect(claimHoldUntil(proven, false, false, NOW)).toEqual(at(CODE_TTL_MS));
  });

  it("holds a link claim an hour from its proof, and leaves a QR claim's hold alone", () => {
    expect(proofWrite({ linkKeyId: "k", provenAt: null }, NOW)).toEqual({ provenAt: NOW, codeHmac: null, codeExpiresAt: null, holdsUntil: at(LINK_PROVEN_HOLD_MS) });
    expect(proofWrite({ linkKeyId: null, provenAt: null }, NOW)).not.toHaveProperty("holdsUntil");
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
