import { describe, expect, it } from "vitest";
import { inviteReservations } from "../../db/schema";
import { codeMail, decideClaim, decideConfirm, decideHandOver } from "./claim";
import { CODE_MAX_TRIES, CODE_RESEND_MS, CODE_TTL_MS, HOLD_MS, QR_TTL_MS } from "./rules";
import { codeHmac, secretHash } from "./tokens";

type Row = typeof inviteReservations.$inferSelect;
const NOW = new Date("2026-10-17T12:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);
const SECRET = "ab".repeat(32);
const COOKIE = "browser-secret";
const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

const open = (o: Partial<Row> = {}): Row => ({
  id: ID, userId: "sender", kind: "qr", state: "qr_open", qrTokenHash: "h", qrExpiresAt: at(QR_TTL_MS), holdsUntil: null,
  email: null, clerkInvitationId: null, claimSecretHash: null, codeHmac: null, codeExpiresAt: null, codeSentAt: null,
  codeTries: 0, provenAt: null, createdAt: NOW, resolvedAt: null, ...o,
});
const claimed = (o: Partial<Row> = {}): Row => open({
  state: "claimed", qrExpiresAt: at(QR_TTL_MS), holdsUntil: at(HOLD_MS), email: "a@x.dev", claimSecretHash: secretHash(COOKIE),
  codeHmac: codeHmac(SECRET, ID, "123456"), codeExpiresAt: at(CODE_TTL_MS), codeSentAt: at(-CODE_RESEND_MS - 1), ...o,
});

describe("decideClaim (Send code)", () => {
  it("claims an open QR within its 15 minutes", () => {
    expect(decideClaim(open(), null, "a@x.dev", NOW)).toEqual({ kind: "first" });
  });
  it("ends a QR past its 15 minutes, a row nobody has, and an email row", () => {
    expect(decideClaim(open({ qrExpiresAt: at(-1) }), null, "a@x.dev", NOW)).toEqual({ kind: "ended" });
    expect(decideClaim(undefined, null, "a@x.dev", NOW)).toEqual({ kind: "ended" });
    expect(decideClaim(open({ kind: "email", state: "reserved" }), null, "a@x.dev", NOW)).toEqual({ kind: "ended" });
  });
  it("lets the same browser send again, and says whether the address changed", () => {
    expect(decideClaim(claimed(), COOKIE, "a@x.dev", NOW)).toEqual({ kind: "again", changed: false });
    expect(decideClaim(claimed(), COOKIE, "b@x.dev", NOW)).toEqual({ kind: "again", changed: true });
  });
  it("ends a claim for any other browser, or none: a claimed row is nobody else's to resend", () => {
    expect(decideClaim(claimed(), "someone-else", "a@x.dev", NOW)).toEqual({ kind: "ended" });
    expect(decideClaim(claimed(), null, "a@x.dev", NOW)).toEqual({ kind: "ended" });
  });
  it("makes a resend inside the 60-second cooldown wait, and says how long", () => {
    const recent = claimed({ codeSentAt: at(-10_000) });
    expect(decideClaim(recent, COOKIE, "a@x.dev", NOW)).toEqual({ kind: "wait", waitMs: CODE_RESEND_MS - 10_000 });
  });
  it("ends a claim whose 7 days have run out, or whose tries are spent", () => {
    expect(decideClaim(claimed({ holdsUntil: at(-1) }), COOKIE, "a@x.dev", NOW)).toEqual({ kind: "ended" });
    expect(decideClaim(claimed({ codeTries: CODE_MAX_TRIES }), COOKIE, "a@x.dev", NOW)).toEqual({ kind: "ended" });
  });
});

describe("decideConfirm", () => {
  it("answers proven again to the claiming browser once the claim is proven (a retry after a lost response), and to nobody else", () => {
    const proven = claimed({ provenAt: NOW, codeHmac: null, codeExpiresAt: null });
    expect(decideConfirm(proven, COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "proven" });
    expect(decideConfirm(proven, "someone-else", "123456", SECRET, NOW)).toEqual({ kind: "ended" });
    expect(decideConfirm({ ...proven, holdsUntil: at(-1) }, COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "ended" });
    // A row with its code still live is not yet the proven state a replay answers.
    expect(decideConfirm(claimed({ provenAt: NOW, codeTries: 4 }), COOKIE, "000000", SECRET, NOW)).toEqual({ kind: "ends" });
  });
  it("proves the right code from the claiming browser", () => {
    expect(decideConfirm(claimed(), COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "proven" });
    expect(decideConfirm(claimed(), COOKIE, "123 456", SECRET, NOW)).toEqual({ kind: "proven" });
  });
  it("counts a wrong code and says how many tries are left, and ends the row on the fifth", () => {
    expect(decideConfirm(claimed(), COOKIE, "000000", SECRET, NOW)).toEqual({ kind: "wrong", triesLeft: 4 });
    expect(decideConfirm(claimed({ codeTries: 3 }), COOKIE, "000000", SECRET, NOW)).toEqual({ kind: "wrong", triesLeft: 1 });
    expect(decideConfirm(claimed({ codeTries: 4 }), COOKIE, "000000", SECRET, NOW)).toEqual({ kind: "ends" });
  });
  it("counts a malformed code as a wrong one", () => {
    expect(decideConfirm(claimed(), COOKIE, "12", SECRET, NOW)).toEqual({ kind: "wrong", triesLeft: 4 });
    expect(decideConfirm(claimed(), COOKIE, "abcdef", SECRET, NOW)).toEqual({ kind: "wrong", triesLeft: 4 });
  });
  it("refuses a code after its 10 minutes (N5) without counting a try", () => {
    expect(decideConfirm(claimed({ codeExpiresAt: at(-1) }), COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "expired" });
  });
  it("ends for another browser, a code already used, spent tries or a lapsed claim", () => {
    expect(decideConfirm(claimed(), "other", "123456", SECRET, NOW)).toEqual({ kind: "ended" });
    expect(decideConfirm(claimed({ codeHmac: null, codeExpiresAt: null }), COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "ended" });
    expect(decideConfirm(claimed({ codeTries: CODE_MAX_TRIES }), COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "ended" });
    expect(decideConfirm(claimed({ holdsUntil: at(-1) }), COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "ended" });
  });
  it("does not prove a code made for another reservation", () => {
    const other = claimed({ codeHmac: codeHmac(SECRET, "11111111-1111-4111-8111-111111111111", "123456") });
    expect(decideConfirm(other, COOKIE, "123456", SECRET, NOW)).toEqual({ kind: "wrong", triesLeft: 4 });
  });
});

describe("decideHandOver (Continue to sign-up)", () => {
  it("goes only for a proven claim from the claiming browser, naming the address and any stored invitation", () => {
    const proven = claimed({ provenAt: NOW, clerkInvitationId: "inv_1" });
    expect(decideHandOver(proven, COOKIE, NOW)).toEqual({ kind: "go", email: "a@x.dev", staleInvitationId: "inv_1" });
  });
  it("ends a claim whose five tries ran out, even proven and with Clerk cleanup still pending", () => {
    const exhausted = claimed({ provenAt: NOW, codeTries: CODE_MAX_TRIES });
    expect(decideHandOver(exhausted, COOKIE, NOW)).toEqual({ kind: "ended" });
  });
  it("ends for an unproven claim, another browser or a lapsed claim", () => {
    expect(decideHandOver(claimed(), COOKIE, NOW)).toEqual({ kind: "ended" });
    expect(decideHandOver(claimed({ provenAt: NOW }), "other", NOW)).toEqual({ kind: "ended" });
    expect(decideHandOver(claimed({ provenAt: NOW, holdsUntil: at(-1) }), COOKIE, NOW)).toEqual({ kind: "ended" });
    expect(decideHandOver(open(), COOKIE, NOW)).toEqual({ kind: "ended" });
  });
});

describe("codeMail", () => {
  it("carries the code and no link and no sender's name", () => {
    const m = codeMail("a@x.dev", "042917");
    expect(m.to).toBe("a@x.dev");
    expect(m.subject).toContain("042917");
    expect(m.text).toContain("042917");
    expect(m.text + m.html).not.toMatch(/https?:|\/join/);
  });
});
