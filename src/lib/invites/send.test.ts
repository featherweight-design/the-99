// The pure half of the sender's writes; the writes themselves are proved against a database by `probe:invites`.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../db", () => ({ db: {} }));
import { inviteMail, qrWatch, repeatAnswer } from "./send";
import { INVITATION_DAYS } from "./clerk";
import { isQrToken, joinPath } from "./rules";
import { qrToken } from "./tokens";

const now = new Date("2026-10-16T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);

describe("qrWatch", () => {
  it("reads a live QR with its seconds left, rounded up", () => {
    expect(qrWatch("qr_open", at(600_000), now)).toEqual({ state: "live", secondsLeft: 600 });
    expect(qrWatch("qr_open", at(1), now)).toEqual({ state: "live", secondsLeft: 1 });
  });

  it("reads a claim or a spend as claimed", () => {
    expect(qrWatch("claimed", at(-1), now)).toEqual({ state: "claimed" });
    expect(qrWatch("spent", null, now)).toEqual({ state: "claimed" });
  });

  it("reads a lapsed QR, a return and a revoke as expired", () => {
    expect(qrWatch("qr_open", now, now)).toEqual({ state: "expired" });
    expect(qrWatch("qr_open", null, now)).toEqual({ state: "expired" });
    expect(qrWatch("returned", null, now)).toEqual({ state: "expired" });
    expect(qrWatch("revoked", null, now)).toEqual({ state: "expired" });
  });
});

describe("isQrToken and joinPath", () => {
  it("accepts exactly a derived token's shape", () => {
    const t = qrToken("ab".repeat(32), "11111111-1111-4111-8111-111111111111");
    expect(isQrToken(t)).toBe(true);
    for (const bad of [t.slice(1), `${t}a`, `${t.slice(1)}=`, `${t.slice(1)}/`, 42, null, undefined]) {
      expect(isQrToken(bad)).toBe(false);
    }
    expect(joinPath(t)).toBe(`/join/${t}`);
  });
});

describe("inviteMail", () => {
  const url = "https://accounts.the-99.dev/sign-up?__clerk_ticket=abc&x=1";
  const base = { to: "new@x.dev", url, days: INVITATION_DAYS, origin: "https://the-99.dev", handUrl: null, commanderName: null };

  it("names the sender and carries Clerk's link as its one link in the panel, in text and HTML", () => {
    const m = inviteMail({ ...base, senderName: "Hugh" });
    expect(m.to).toBe("new@x.dev");
    expect(m.template).toBe("invite");
    expect(m.subject).toBe("Hugh invited you to The 99");
    expect(m.text).toContain("Hugh saved you a seat");
    expect(m.text).toContain(url);
    expect(m.html).toContain(`href="${url.replace("&", "&#38;")}"`);
    // The links in the mail: the tile and footer (the origin), the button (twice, VML and anchor) and the raw link.
    expect(new Set([...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]))).toEqual(new Set(["https://the-99.dev", url.replace("&", "&#38;")]));
  });

  it("escapes the sender's name in the HTML and keeps the subject to one line", () => {
    const m = inviteMail({ ...base, senderName: "<b>Eve</b> & \"co\"\nBcc: x@y.dev" });
    expect(m.html).not.toContain("<b>");
    expect(m.html).toContain("&#60;b&#62;Eve&#60;/b&#62; &#38; &#34;co&#34;");
    expect(m.subject).not.toMatch(/[\r\n]/);
  });

  it(`uses the anonymous forms for an empty name and states the invitation's own lifetime`, () => {
    const m = inviteMail({ ...base, senderName: "  " });
    expect(m.subject).toBe("A friend invited you to The 99");
    expect(m.text).toContain("A friend saved you a seat at The 99.");
    expect(m.text).toContain(`works for ${INVITATION_DAYS} days`);
    expect(m.text).toContain("Don't know who sent it?");
    expect(m.text).toContain("someone on The 99 invited this address");
    // The old defect: a stand-in name read as "Join as A friend's friend".
    expect(m.html + m.text).not.toMatch(/A friend[’']s friend/);
  });

  it("draws the sender's hand when there is art, and the plain one when there is none, and never says whether the address has an account", () => {
    const withArt = inviteMail({ ...base, senderName: "Colin", handUrl: "https://the-99.dev/email/hand/KEY.png", commanderName: "Ghalta, Primal Hunger" });
    expect(withArt.html).toContain('src="https://the-99.dev/email/hand/KEY.png"');
    expect(withArt.html).toContain("Colin’s invitation card, with Ghalta, Primal Hunger art");
    const plain = inviteMail({ ...base, senderName: "Colin" });
    expect(plain.html).toContain('src="https://the-99.dev/email/invite-hero-plain@2x.png"');
    expect(plain.html).toContain("An invitation to The 99");
    expect(withArt.html + plain.html + withArt.text).not.toMatch(/already have an account|account already/i);
  });

  it("keeps \"The 99\" in the heading on one line with a no-break space, and the text part's plain", () => {
    const m = inviteMail({ ...base, senderName: "Colin" });
    expect(m.html).toContain("Colin saved you a seat at The\u00a099");
    expect(m.text).toContain("Colin saved you a seat at The 99.");
  });

  it("has no em dash and never says Press", () => {
    const m = inviteMail({ ...base, senderName: "Colin" });
    expect(m.html + m.text).not.toMatch(/—|\bPress\b/);
  });
});

describe("repeatAnswer (a repeated request id, read from the first send's row)", () => {
  it("answers a row still holding for the address, or spent, ok: mailed, perhaps mailed, refused, or still sending", () => {
    expect(repeatAnswer({ state: "reserved", email: "new@x.dev" }, "new@x.dev")).toEqual({ ok: true });
    expect(repeatAnswer({ state: "spent", email: null }, "new@x.dev")).toEqual({ ok: true });
  });

  it("answers a returned or revoked row failed, and a row for another address failed", () => {
    expect(repeatAnswer({ state: "returned", email: null }, "new@x.dev")).toEqual({ ok: false, reason: "failed" });
    expect(repeatAnswer({ state: "revoked", email: null }, "new@x.dev")).toEqual({ ok: false, reason: "failed" });
    expect(repeatAnswer({ state: "reserved", email: "other@x.dev" }, "new@x.dev")).toEqual({ ok: false, reason: "failed" });
  });
});
