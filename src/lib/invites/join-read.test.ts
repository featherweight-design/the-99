import { describe, expect, it } from "vitest";
import { inviteReservations } from "../../db/schema";
import { joinStep } from "./join-read";
import { CODE_MAX_TRIES, CODE_RESEND_MS, CODE_TTL_MS, HOLD_MS, QR_TTL_MS } from "./rules";
import { secretHash } from "./tokens";

type Row = typeof inviteReservations.$inferSelect;
const NOW = new Date("2026-10-17T12:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);
const COOKIE = "browser-secret";

const open = (o: Partial<Row> = {}): Row => ({
  id: "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68", userId: "sender", kind: "qr", state: "qr_open", qrTokenHash: "h", qrExpiresAt: at(QR_TTL_MS),
  holdsUntil: null, email: null, clerkInvitationId: null, claimSecretHash: null, codeHmac: null, codeExpiresAt: null,
  codeSentAt: null, codeTries: 0, provenAt: null, createdAt: NOW, resolvedAt: null, ...o,
});
const claimed = (o: Partial<Row> = {}): Row => open({
  state: "claimed", holdsUntil: at(HOLD_MS), email: "a@x.dev", claimSecretHash: secretHash(COOKIE),
  codeHmac: "x", codeExpiresAt: at(CODE_TTL_MS), codeSentAt: at(-1000), ...o,
});

describe("joinStep (what /join/[token] draws)", () => {
  it("N1: an open QR within its 15 minutes asks for the email", () => {
    expect(joinStep(open(), null, NOW)).toEqual({ kind: "email" });
  });
  it("N11: a QR past its 15 minutes is expired; no row, an email row and a spent row are ended (N12)", () => {
    expect(joinStep(open({ qrExpiresAt: at(-1) }), null, NOW)).toEqual({ kind: "expired" });
    expect(joinStep(undefined, null, NOW)).toEqual({ kind: "ended" });
    expect(joinStep(open({ kind: "email", state: "reserved" }), null, NOW)).toEqual({ kind: "ended" });
    expect(joinStep(open({ state: "spent" }), null, NOW)).toEqual({ kind: "ended" });
  });
  it("N3: the claiming browser sees the code step with the resend wait left; N5: an expired code says so", () => {
    expect(joinStep(claimed(), COOKIE, NOW)).toEqual({ kind: "code", email: "a@x.dev", resendWaitMs: CODE_RESEND_MS - 1000, expired: false });
    expect(joinStep(claimed({ codeExpiresAt: at(-1) }), COOKIE, NOW)).toMatchObject({ kind: "code", expired: true });
  });
  it("N6: a proven claim redraws the hand-over on reopen", () => {
    expect(joinStep(claimed({ provenAt: at(-5), codeHmac: null, codeExpiresAt: null }), COOKIE, NOW)).toEqual({ kind: "proven", email: "a@x.dev" });
  });
  it("names nobody to any other browser, or to none: a claim is not readable from the link alone", () => {
    expect(joinStep(claimed(), "someone-else", NOW)).toEqual({ kind: "ended" });
    expect(joinStep(claimed(), null, NOW)).toEqual({ kind: "ended" });
  });
  it("ends a claim whose 7 days or whose tries have run out", () => {
    expect(joinStep(claimed({ holdsUntil: at(-1) }), COOKIE, NOW)).toEqual({ kind: "ended" });
    expect(joinStep(claimed({ codeTries: CODE_MAX_TRIES }), COOKIE, NOW)).toEqual({ kind: "ended" });
  });
});
