// The three writes that make a Clerk invitation (the email send, the QR hand-over, the flyer hand-over), run against a
// scripted database: each awaited query takes the next answer from `m.results`, and every builder call is recorded. The
// whole writes are proved against a real database by `probe:invites`; this pins what the probe cannot reach in CI: the
// redirect each one passes to Clerk, that a `rejected` create is never answered as sent, and that a repeated email send
// (one request id twice) reserves, asks Clerk and mails once.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClerkInvites, CreateInvitation, CreateResult } from "./clerk";
import type { Mail, MailConfig, MailResult } from "./mail";

const m = vi.hoisted(() => ({ results: [] as unknown[], calls: [] as { method: string; args: unknown[] }[] }));
vi.mock("../../db", () => {
  // A query builder: every call records itself and returns another; awaiting one takes the next scripted answer.
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_target, prop) => {
      if (prop === "then") {
        const value = m.results.shift();
        // A scripted Error is the query throwing (a unique violation).
        return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
          (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)).then(ok, ko);
      }
      return (...args: unknown[]) => {
        m.calls.push({ method: String(prop), args });
        return chain();
      };
    },
  });
  const db: Record<string, unknown> = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      if (prop === "transaction") return async (fn: (tx: unknown) => unknown) => fn(db);
      return (...args: unknown[]) => {
        m.calls.push({ method: String(prop), args });
        return chain();
      };
    },
  });
  return { db };
});
vi.mock("./read", () => ({ readCountIn: async () => ({ count: { out: false } }) }));

import { handOverFlyer } from "../flyer/claim";
import { handOver } from "./claim";
import { sendEmailInvite } from "./send";
import { secretHash } from "./tokens";

const NOW = new Date("2026-11-11T12:00:00Z");
const LATER = new Date(NOW.getTime() + 86_400_000);
const SIGN_UP = "https://the99.app/sign-up";
const SECRET = "c0ffee".repeat(11).slice(0, 64);
const COOKIE = "C".repeat(43);
const TOKEN = "T".repeat(43);

/** A Clerk stand-in that answers `answer` to every create and records what it was asked. */
function fakeClerk(answer: CreateResult) {
  const created: CreateInvitation[] = [];
  const clerk: ClerkInvites = {
    async create(input) { created.push(input); return answer; },
    async revoke() { return true; },
    async revokeFor() { return true; },
    async findFor() { return { ok: true, id: null }; },
    async hasAccount() { return false; },
  };
  return { clerk, created };
}

const MADE: CreateResult = { ok: true, id: "inv_1", url: "https://accounts.x/ticket" };

beforeEach(() => {
  m.results = [];
  m.calls = [];
  vi.restoreAllMocks();
});

describe("handOver (the QR path)", () => {
  // A proven claim on this browser, inside its 7 days.
  const claim = {
    id: "res_1", userId: "sender", kind: "qr", state: "claimed", qrTokenHash: secretHash(TOKEN), qrExpiresAt: NOW, holdsUntil: LATER,
    email: "new@x.dev", clerkInvitationId: null, claimSecretHash: secretHash(COOKIE), codeHmac: null, codeExpiresAt: null,
    codeSentAt: null, codeTries: 0, provenAt: NOW, createdAt: NOW, resolvedAt: null,
  };
  // The sender read, the sender's lock, the claim read under it, and the stored invitation id.
  const script = () => [[{ userId: "sender" }], undefined, [claim], [{ id: "res_1" }]];

  it("makes the invitation with the redirect it is given", async () => {
    m.results = script();
    const { clerk, created } = fakeClerk(MADE);
    expect(await handOver(TOKEN, COOKIE, { redirectUrl: SIGN_UP, now: NOW, clerk })).toEqual({ ok: true, url: "https://accounts.x/ticket" });
    expect(created).toHaveLength(1);
    expect(created[0].redirectUrl).toBe(SIGN_UP);
  });

  it("makes it with none when given none", async () => {
    m.results = script();
    const { clerk, created } = fakeClerk(MADE);
    await handOver(TOKEN, COOKIE, { redirectUrl: null, now: NOW, clerk });
    expect(created[0].redirectUrl).toBeNull();
  });
});

describe("handOverFlyer (the flyer path)", () => {
  const code = { id: "code_1", code: "MAX4QK", label: "x", groupId: null, capacity: 50, createdBy: "hugh", createdAt: NOW, revokedAt: null };
  // A proven claim on this browser, inside its hold.
  const claim = {
    id: "claim_1", codeId: "code_1", state: "proven", holdsUntil: LATER, email: "new@x.dev", clerkInvitationId: null,
    claimSecretHash: secretHash(COOKIE), codeHmac: null, codeExpiresAt: null, codeSentAt: null, codeTries: 0, provenAt: NOW,
    userId: null, createdAt: NOW, resolvedAt: null,
  };
  // The code; the creator's lock, the revoke check and the claim; then the per-claim lock, the claim again, the revoke
  // check again, and the stored invitation id.
  const script = () => [
    [code], undefined, [{ revokedAt: null }], [claim],
    { rows: [{ ok: true }] }, [claim], [{ revokedAt: null }], [{ id: "claim_1" }],
  ];

  it("makes the invitation with the redirect it is given", async () => {
    m.results = script();
    const { clerk, created } = fakeClerk(MADE);
    expect(await handOverFlyer("MAX4QK", COOKIE, { redirectUrl: SIGN_UP, now: NOW, clerk })).toEqual({ ok: true, url: "https://accounts.x/ticket" });
    expect(created).toHaveLength(1);
    expect(created[0].redirectUrl).toBe(SIGN_UP);
  });

  it("makes it with none when given none", async () => {
    m.results = script();
    const { clerk, created } = fakeClerk(MADE);
    await handOverFlyer("MAX4QK", COOKIE, { redirectUrl: null, now: NOW, clerk });
    expect(created[0].redirectUrl).toBeNull();
  });
});

describe("sendEmailInvite (the email path)", () => {
  const env = { RESEND_API_KEY: "re_test", INVITE_EMAIL_FROM: "The 99 <invites@mail.the-99.dev>", INVITE_CODE_SECRET: SECRET };
  // The sender's lock, then the reservation inserted (the count is `readCountIn`'s, mocked); a return's update after.
  const script = () => [undefined, [{ id: "res_9" }], undefined];
  const sets = () => m.calls.filter((c) => c.method === "set").map((c) => c.args[0] as Record<string, unknown>);

  it("asks Clerk with the redirect it is given", async () => {
    m.results = script();
    const { clerk, created } = fakeClerk({ ok: false, reason: "refused", code: null });
    await sendEmailInvite("sender", "new@x.dev", { redirectUrl: SIGN_UP, now: NOW, env, senderName: "Hugh", clerk });
    expect(created).toHaveLength(1);
    expect(created[0].redirectUrl).toBe(SIGN_UP);
  });

  it("answers a rejected create failed, never ok, mails nothing and gives the invite back", async () => {
    m.results = script();
    const mail = vi.fn();
    const { clerk } = fakeClerk({ ok: false, reason: "rejected" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendEmailInvite("sender", "new@x.dev", { redirectUrl: SIGN_UP, now: NOW, env, senderName: "Hugh", clerk, mail }))
      .toEqual({ ok: false, reason: "failed" });
    expect(mail).not.toHaveBeenCalled();
    expect(sets()).toContainEqual(expect.objectContaining({ state: "returned", email: null, clerkInvitationId: null }));
  });

  it("still answers a refusal of the address ok (R5), and keeps its reservation", async () => {
    m.results = script();
    const { clerk } = fakeClerk({ ok: false, reason: "refused", code: "duplicate_record" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await sendEmailInvite("sender", "new@x.dev", { redirectUrl: SIGN_UP, now: NOW, env, senderName: "Hugh", clerk }))
      .toEqual({ ok: true });
    expect(sets()).not.toContainEqual(expect.objectContaining({ state: "returned" }));
  });
});

describe("sendEmailInvite, one request id twice (a Try again after the client gave up)", () => {
  const env = { RESEND_API_KEY: "re_test", INVITE_EMAIL_FROM: "The 99 <invites@mail.the-99.dev>", INVITE_CODE_SECRET: SECRET };
  const RID = "6f1c2b3a-4d5e-4f60-8a71-92b3c4d5e6f7";
  const inserts = () => m.calls.filter((c) => c.method === "insert");
  const values = () => m.calls.filter((c) => c.method === "values").map((c) => c.args[0] as Record<string, unknown>);
  type MailFn = (config: MailConfig | null, mail: Mail) => Promise<MailResult>;
  const send = (clerk: ClerkInvites, mail: MailFn) =>
    sendEmailInvite("sender", "new@x.dev", { redirectUrl: SIGN_UP, now: NOW, env, senderName: "Hugh", clerk, mail, requestId: RID });

  it("reserves, asks Clerk and mails once, and answers the repeat as the first answered", async () => {
    const { clerk, created } = fakeClerk(MADE);
    const mail = vi.fn<MailFn>(async () => ({ ok: true }));
    // The lock, no row with this id yet, the reservation inserted, the invitation id stored.
    m.results = [undefined, [], [{ id: "res_9" }], [{ id: "res_9" }]];
    const first = await send(clerk, mail);
    expect(first).toEqual({ ok: true });
    expect(values()).toContainEqual(expect.objectContaining({ requestId: RID, state: "reserved" }));
    // The repeat: the lock, then the first's row, read under it.
    m.results = [undefined, [{ state: "reserved", email: "new@x.dev" }]];
    expect(await send(clerk, mail)).toEqual(first);
    expect(inserts()).toHaveLength(1);
    expect(created).toHaveLength(1);
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("passes the request id to Resend as its Idempotency-Key", async () => {
    const { clerk } = fakeClerk(MADE);
    const mail = vi.fn<MailFn>(async () => ({ ok: true }));
    m.results = [undefined, [], [{ id: "res_9" }], [{ id: "res_9" }]];
    await send(clerk, mail);
    expect(mail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idempotencyKey: `invite-email/${RID}`, to: "new@x.dev" }));
  });

  it("mails with no key when the send carries no request id", async () => {
    const { clerk } = fakeClerk(MADE);
    const mail = vi.fn<MailFn>(async () => ({ ok: true }));
    m.results = [undefined, [{ id: "res_9" }], [{ id: "res_9" }]];
    await sendEmailInvite("sender", "new@x.dev", { redirectUrl: SIGN_UP, now: NOW, env, senderName: "Hugh", clerk, mail });
    expect(mail).toHaveBeenCalledTimes(1);
    expect((mail.mock.calls[0] as unknown[])[1]).not.toHaveProperty("idempotencyKey");
  });

  it("reads a unique violation as the repeat it is (a row with this id committed first): no Clerk, no mail", async () => {
    const { clerk, created } = fakeClerk(MADE);
    const mail = vi.fn<MailFn>();
    const violation = Object.assign(new Error("insert failed"), { cause: { code: "23505" } });
    // The lock, no row yet, the insert refused by the unique index; then the first's row, read after.
    m.results = [undefined, [], violation, [{ state: "reserved", email: "new@x.dev" }]];
    expect(await send(clerk, mail)).toEqual({ ok: true });
    expect(created).toHaveLength(0);
    expect(mail).not.toHaveBeenCalled();
  });

  it("answers a repeat of a send that ended unmailed failed, doing nothing", async () => {
    const { clerk, created } = fakeClerk(MADE);
    const mail = vi.fn<MailFn>();
    m.results = [undefined, [{ state: "returned", email: null }]];
    expect(await send(clerk, mail)).toEqual({ ok: false, reason: "failed" });
    expect(inserts()).toHaveLength(0);
    expect(created).toHaveLength(0);
    expect(mail).not.toHaveBeenCalled();
  });

  const sets = () => m.calls.filter((c) => c.method === "set").map((c) => c.args[0] as Record<string, unknown>);
  const returned = () => sets().filter((v) => v.state === "returned");

  it("frees the request id in the return when Resend refused the mail (nobody mailed)", async () => {
    const { clerk } = fakeClerk(MADE);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // The lock, no row, the reservation, the invitation id stored, then the return.
    m.results = [undefined, [], [{ id: "res_9" }], [{ id: "res_9" }], undefined];
    expect(await send(clerk, vi.fn<MailFn>(async () => ({ ok: false, reason: "failed" })))).toEqual({ ok: false, reason: "failed" });
    expect(returned()).toEqual([expect.objectContaining({ requestId: null, email: null })]);
  });

  it("frees the request id in the return when Clerk rejected the request (nothing made, nobody mailed)", async () => {
    const { clerk } = fakeClerk({ ok: false, reason: "rejected" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.results = [undefined, [], [{ id: "res_9" }], undefined];
    expect(await send(clerk, vi.fn<MailFn>())).toEqual({ ok: false, reason: "failed" });
    expect(returned()).toEqual([expect.objectContaining({ requestId: null })]);
  });

  it("frees the request id when Clerk's answer was lost and its invitation is then ended (made unmailed)", async () => {
    const { clerk } = fakeClerk({ ok: false, reason: "indeterminate" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.results = [undefined, [], [{ id: "res_9" }], undefined];
    expect(await send(clerk, vi.fn<MailFn>())).toEqual({ ok: false, reason: "failed" });
    expect(returned()).toEqual([expect.objectContaining({ requestId: null })]);
  });

  it("keeps the request id (and the reservation) when Clerk's answer was lost and its ending is not known", async () => {
    const { clerk } = fakeClerk({ ok: false, reason: "indeterminate" });
    clerk.revokeFor = async () => false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.results = [undefined, [], [{ id: "res_9" }]];
    expect(await send(clerk, vi.fn<MailFn>())).toEqual({ ok: false, reason: "failed" });
    expect(returned()).toHaveLength(0);
    expect(sets().some((v) => "requestId" in v)).toBe(false);
  });

  it("keeps the request id (and the reservation) when Resend's answer was lost: the mail may have gone", async () => {
    const { clerk } = fakeClerk(MADE);
    m.results = [undefined, [], [{ id: "res_9" }], [{ id: "res_9" }]];
    expect(await send(clerk, vi.fn<MailFn>(async () => ({ ok: false, reason: "indeterminate" })))).toEqual({ ok: true });
    expect(returned()).toHaveLength(0);
    expect(sets().some((v) => "requestId" in v)).toBe(false);
  });

  it("sends a repeat afresh once the first freed its id: a new reservation carrying the id, one more Clerk call and mail", async () => {
    const { clerk, created } = fakeClerk(MADE);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mail = vi.fn<MailFn>()
      .mockResolvedValueOnce({ ok: false, reason: "failed" })
      .mockResolvedValueOnce({ ok: true });
    m.results = [undefined, [], [{ id: "res_9" }], [{ id: "res_9" }], undefined];
    expect(await send(clerk, mail)).toEqual({ ok: false, reason: "failed" });
    // The repeat: the lock, and no row with this id (the return cleared it), so a new reservation.
    m.results = [undefined, [], [{ id: "res_10" }], [{ id: "res_10" }]];
    expect(await send(clerk, mail)).toEqual({ ok: true });
    expect(inserts()).toHaveLength(2);
    expect(values().filter((v) => v.state === "reserved")).toEqual([
      expect.objectContaining({ requestId: RID }), expect.objectContaining({ requestId: RID }),
    ]);
    expect(created).toHaveLength(2);
    expect(mail).toHaveBeenCalledTimes(2);
  });

  it("rethrows any other failure of the reservation", async () => {
    const { clerk } = fakeClerk(MADE);
    m.results = [undefined, [], Object.assign(new Error("down"), { code: "08006" })];
    await expect(send(clerk, vi.fn<MailFn>())).rejects.toThrow("down");
  });
});
