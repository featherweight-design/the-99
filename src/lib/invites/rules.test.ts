import { describe, expect, it } from "vitest";
import {
  CODE_MAX_TRIES, HOLD_MS, INVITES_MAX, QR_TTL_MS, codeState, heldForSet, heldForTopUp, holdingCount, holdsInvite,
  inviteCardOpen, inviteCount, isEmailShape, normalizeEmail, parseCode, parseInvitesLeft, resendWaitMs,
  type HoldingRow,
} from "./rules";

const now = new Date("2026-10-16T12:00:00Z");
const ms = (d: number) => new Date(now.getTime() + d);
const qr = (expires: number, state: HoldingRow["state"] = "qr_open"): HoldingRow =>
  ({ kind: "qr", state, qrExpiresAt: ms(expires), holdsUntil: state === "claimed" ? ms(HOLD_MS) : null });
const email = (until: number, state: HoldingRow["state"] = "reserved"): HoldingRow =>
  ({ kind: "email", state, qrExpiresAt: null, holdsUntil: ms(until) });

describe("holdsInvite", () => {
  it("holds an open QR until its 15 minutes pass, and not from that instant", () => {
    expect(QR_TTL_MS).toBe(15 * 60 * 1000);
    expect(holdsInvite(qr(1), now)).toBe(true);
    expect(holdsInvite(qr(0), now)).toBe(false);
  });

  it("holds a claimed or reserved row on its own 7-day clock", () => {
    expect(HOLD_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(holdsInvite(email(1), now)).toBe(true);
    expect(holdsInvite(email(0), now)).toBe(false);
    expect(holdsInvite({ kind: "qr", state: "claimed", qrExpiresAt: ms(-1), holdsUntil: ms(1) }, now)).toBe(true);
  });

  it("never holds in a final state, whatever the clocks say", () => {
    for (const state of ["spent", "returned", "revoked"] as const) {
      expect(holdsInvite(email(HOLD_MS, state), now)).toBe(false);
      expect(holdsInvite(qr(QR_TTL_MS, state), now)).toBe(false);
    }
  });
});

describe("inviteCount", () => {
  it("is the stock less every row holding, with the waiting and the live QR named apart", () => {
    const rows = [qr(60_000), email(HOLD_MS), email(-1), qr(-1), email(HOLD_MS, "spent")];
    expect(inviteCount(5, rows, now)).toEqual({ left: 3, waiting: 1, liveQr: true, qrUntil: ms(60_000), out: false });
    expect(holdingCount(rows, now)).toBe(2);
  });

  it("is out at zero left, and never reads below zero", () => {
    expect(inviteCount(1, [email(HOLD_MS)], now)).toEqual({ left: 0, waiting: 1, liveQr: false, qrUntil: null, out: true });
    expect(inviteCount(0, [email(HOLD_MS)], now).left).toBe(0);
    expect(inviteCount(0, [], now).out).toBe(true);
  });

  it("names the latest expiry among the holding open QRs as qrUntil, and null when none holds", () => {
    expect(inviteCount(5, [qr(60_000), qr(120_000), qr(-1)], now).qrUntil).toEqual(ms(120_000));
    expect(inviteCount(5, [qr(-1), qr(0), qr(HOLD_MS, "claimed")], now).qrUntil).toBeNull();
  });
});

describe("inviteCardOpen (audit G-2)", () => {
  it("greys card 2 only at zero with no live QR", () => {
    expect(inviteCardOpen(inviteCount(1, [], now))).toBe(true);
    expect(inviteCardOpen(inviteCount(0, [], now))).toBe(false);
    expect(inviteCardOpen(inviteCount(1, [qr(60_000)], now))).toBe(true);
  });
});

describe("admin writes", () => {
  it("parses invites left as a whole number from 0 to the ceiling", () => {
    expect(parseInvitesLeft("3")).toBe(3);
    expect(parseInvitesLeft(" 0 ")).toBe(0);
    expect(parseInvitesLeft(INVITES_MAX)).toBe(INVITES_MAX);
    for (const bad of [-1, INVITES_MAX + 1, 1.5, "1.5", "", "two", null, undefined, Number.NaN]) {
      expect(parseInvitesLeft(bad), String(bad)).toBeNull();
    }
  });

  it("stores a Set as left plus what is holding, so a waiting invite stays waiting", () => {
    expect(heldForSet(0, 1)).toBe(1);
    const rows = [email(HOLD_MS)];
    expect(inviteCount(heldForSet(2, holdingCount(rows, now)), rows, now)).toMatchObject({ left: 2, waiting: 1 });
  });

  it("tops a member up only when their left is below the target, and lowers nobody", () => {
    expect(heldForTopUp(inviteCount(1, [email(HOLD_MS)], now), 1, 3)).toBe(4);
    expect(heldForTopUp(inviteCount(3, [], now), 0, 3)).toBeNull();
    expect(heldForTopUp(inviteCount(9, [], now), 0, 3)).toBeNull();
  });
});

describe("addresses", () => {
  it("checks the shape and nothing more", () => {
    expect(isEmailShape("name@example.com")).toBe(true);
    expect(isEmailShape("  name@example.com ")).toBe(true);
    for (const bad of ["", "name", "name@", "@example.com", "name@example", "na me@example.com", "a@b@c.com", `${"a".repeat(250)}@b.co`]) {
      expect(isEmailShape(bad), bad).toBe(false);
    }
  });

  it("stores an address trimmed and in lower case", () => {
    expect(normalizeEmail(" Name@Example.COM ")).toBe("name@example.com");
  });
});

describe("the code", () => {
  it("is live until its expiry, then expired; spent at the fifth wrong try whatever the clock", () => {
    expect(codeState({ codeExpiresAt: null, codeTries: 0 }, now)).toBe("none");
    expect(codeState({ codeExpiresAt: ms(1), codeTries: CODE_MAX_TRIES - 1 }, now)).toBe("live");
    expect(codeState({ codeExpiresAt: ms(0), codeTries: 0 }, now)).toBe("expired");
    expect(codeState({ codeExpiresAt: ms(60_000), codeTries: CODE_MAX_TRIES }, now)).toBe("spent");
  });

  it("waits out the 60-second cooldown before another send", () => {
    expect(resendWaitMs(null, now)).toBe(0);
    expect(resendWaitMs(ms(-20_000), now)).toBe(40_000);
    expect(resendWaitMs(ms(-60_000), now)).toBe(0);
  });

  it("reads six digits, spaces dropped, and nothing else", () => {
    expect(parseCode("012 345")).toBe("012345");
    for (const bad of ["12345", "1234567", "12a456", ""]) expect(parseCode(bad), bad).toBeNull();
  });
});

describe("isClaimSecretShape", () => {
  it("accepts 43 base64url characters and nothing else", async () => {
    const { isClaimSecretShape } = await import("./rules");
    expect(isClaimSecretShape("a".repeat(43))).toBe(true);
    expect(isClaimSecretShape("a".repeat(42))).toBe(false);
    expect(isClaimSecretShape("a".repeat(44))).toBe(false);
    expect(isClaimSecretShape(`${"a".repeat(42)}+`)).toBe(false);
    expect(isClaimSecretShape(null)).toBe(false);
  });
});
