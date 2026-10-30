import { describe, expect, it } from "vitest";
import { codeHmac, secretHash } from "../invites/tokens";
import { decideConfirm, decideStart } from "./claim";

const now = new Date("2026-10-30T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const SECRET = "a".repeat(64);
const COOKIE = "c".repeat(43);

function row(over: Partial<Parameters<typeof decideStart>[0] & object> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001", codeId: "c1", state: "open", holdsUntil: at(5 * 60_000), email: "a@b.co",
    clerkInvitationId: null, claimSecretHash: secretHash(COOKIE), codeHmac: codeHmac(SECRET, "00000000-0000-4000-8000-000000000001", "123456"),
    codeExpiresAt: at(5 * 60_000), codeSentAt: at(-90_000), codeTries: 0, provenAt: null, userId: null, createdAt: at(-60_000), resolvedAt: null,
    ...over,
  } as NonNullable<Parameters<typeof decideStart>[0]>;
}

describe("decideStart", () => {
  it("starts a new claim with no row, another browser's cookie, or a lapsed hold", () => {
    expect(decideStart(undefined, null, "a@b.co", now)).toEqual({ kind: "first" });
    expect(decideStart(row(), "d".repeat(43), "a@b.co", now)).toEqual({ kind: "first" });
    expect(decideStart(row({ holdsUntil: at(-1) }), COOKIE, "a@b.co", now)).toEqual({ kind: "first" });
  });
  it("re-sends for the same browser, noting a changed address", () => {
    expect(decideStart(row(), COOKIE, "a@b.co", now)).toEqual({ kind: "again", changed: false });
    expect(decideStart(row(), COOKIE, "x@y.co", now)).toEqual({ kind: "again", changed: true });
  });
  it("waits out the resend cooldown", () => {
    expect(decideStart(row({ codeSentAt: at(-10_000) }), COOKIE, "a@b.co", now)).toEqual({ kind: "wait", waitMs: 50_000 });
  });
  it("does not re-send a proven claim", () => {
    expect(decideStart(row({ state: "proven" }), COOKIE, "a@b.co", now)).toEqual({ kind: "ended" });
  });
});

describe("decideConfirm", () => {
  it("proves the right code", () => {
    expect(decideConfirm(row(), COOKIE, " 123 456 ", SECRET, now)).toEqual({ kind: "proven" });
  });
  it("counts a wrong code and ends on the fifth", () => {
    expect(decideConfirm(row(), COOKIE, "000000", SECRET, now)).toEqual({ kind: "wrong", triesLeft: 4 });
    expect(decideConfirm(row({ codeTries: 4 }), COOKIE, "000000", SECRET, now)).toEqual({ kind: "ends" });
  });
  it("reads an expired code, and ends for a stranger's cookie or a lapsed hold", () => {
    expect(decideConfirm(row({ codeExpiresAt: at(-1) }), COOKIE, "123456", SECRET, now)).toEqual({ kind: "expired" });
    expect(decideConfirm(row(), "d".repeat(43), "123456", SECRET, now)).toEqual({ kind: "ended" });
    expect(decideConfirm(row({ holdsUntil: at(-1) }), COOKIE, "123456", SECRET, now)).toEqual({ kind: "ended" });
    expect(decideConfirm(undefined, COOKIE, "123456", SECRET, now)).toEqual({ kind: "ended" });
  });
  it("answers a retry on a proven claim as proven", () => {
    expect(decideConfirm(row({ state: "proven", codeHmac: null, codeExpiresAt: null }), COOKIE, "999999", SECRET, now)).toEqual({ kind: "proven" });
  });
});
