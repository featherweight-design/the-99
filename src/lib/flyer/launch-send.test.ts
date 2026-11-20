import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./launch-date", () => ({ readStoredLaunchDate: async () => null }));

import { LAUNCH_BATCH_MAX, sendLaunchBatch, type LaunchStore } from "./launch-send";
import type { MailResult } from "../invites/mail";

const ENV = {
  RESEND_API_KEY: "re_test",
  INVITE_EMAIL_FROM: "The 99 <invites@mail.the-99.dev>",
  INVITE_CODE_SECRET: "a".repeat(64),
  APP_ORIGIN: "https://the-99.dev",
};
const NOW = new Date("2026-12-01T12:00:00Z");
const okFetch = (async () => new Response(null, { status: 200 })) as unknown as typeof fetch;

/** An in-memory list whose claim sets `sent` once, like the UPDATE ... WHERE sent_at IS NULL. */
function memoryStore(emails: string[]): LaunchStore & { sent: Set<string>; links: Map<string, string> } {
  const sent = new Set<string>();
  const links = new Map<string, string>();
  return {
    sent,
    links,
    linkUnsubscribe: async (e, hash) => {
      links.set(e, hash);
    },
    waiting: async () => emails.filter((e) => !sent.has(e)).length,
    claimNext: async (skip) => {
      const next = emails.find((e) => !sent.has(e) && !skip.includes(e));
      if (!next) return null;
      sent.add(next);
      return { email: next, codeId: null };
    },
    release: async (e) => {
      sent.delete(e);
    },
  };
}

function deps(store: LaunchStore, results: MailResult[] = [], extra: object = {}) {
  const queue = [...results];
  const send = vi.fn(async () => queue.shift() ?? ({ ok: true } as MailResult));
  return { send, d: { env: ENV, store, send, fetchImpl: okFetch, sleep: async () => {}, now: NOW, launchRaw: "2026-11-30", ...extra } };
}

describe("sendLaunchBatch", () => {
  it("refuses with no launch date, or before it", async () => {
    const store = memoryStore(["a@x.dev"]);
    expect(await sendLaunchBatch({ dryRun: true, limit: 0 }, { ...deps(store).d, launchRaw: null })).toEqual({ ok: false, reason: "no-launch-date" });
    expect(await sendLaunchBatch({ dryRun: true, limit: 0 }, { ...deps(store).d, launchRaw: "2026-12-05" })).toEqual({ ok: false, reason: "before-launch" });
  });

  it("refuses while the mail configuration or the secret is missing", async () => {
    const { d } = deps(memoryStore(["a@x.dev"]));
    expect(await sendLaunchBatch({ dryRun: true, limit: 0 }, { ...d, env: { ...ENV, INVITE_CODE_SECRET: "short" } })).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("refuses while an image is missing, and names it", async () => {
    const fetchImpl = (async (url: string) => new Response(null, { status: url.endsWith("launch-fan@2x.png") ? 404 : 200 })) as unknown as typeof fetch;
    const { d } = deps(memoryStore(["a@x.dev"]));
    expect(await sendLaunchBatch({ dryRun: true, limit: 0 }, { ...d, fetchImpl })).toEqual({ ok: false, reason: "images-missing", missing: ["launch-fan@2x.png"] });
  });

  it("a dry run counts and sends nothing", async () => {
    const store = memoryStore(["a@x.dev", "b@x.dev"]);
    const { d, send } = deps(store);
    expect(await sendLaunchBatch({ dryRun: true, limit: 0 }, d)).toMatchObject({ ok: true, dryRun: true, waiting: 2, sent: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(store.sent.size).toBe(0);
  });

  it("sends at most the limit, and a second batch never re-sends an address", async () => {
    const store = memoryStore(["a@x.dev", "b@x.dev", "c@x.dev"]);
    const first = deps(store);
    expect(await sendLaunchBatch({ dryRun: false, limit: 2 }, first.d)).toMatchObject({ ok: true, sent: 2, waiting: 1, stoppedBy: "limit" });
    const second = deps(store);
    expect(await sendLaunchBatch({ dryRun: false, limit: 5 }, second.d)).toMatchObject({ ok: true, sent: 1, waiting: 0, stoppedBy: "done" });
    const to = [...first.send.mock.calls, ...second.send.mock.calls].map((c) => (c as unknown as [unknown, { to: string }])[1].to);
    expect(to).toEqual(["a@x.dev", "b@x.dev", "c@x.dev"]);
  });

  it("skips an address it released, so the batch moves on to the next one", async () => {
    const store = memoryStore(["a@x.dev", "b@x.dev", "c@x.dev"]);
    const { d, send } = deps(store, [{ ok: true }, { ok: false, reason: "failed" }, { ok: true }]);
    expect(await sendLaunchBatch({ dryRun: false, limit: 3 }, d)).toMatchObject({ sent: 2, released: 1 });
    const to = send.mock.calls.map((c) => (c as unknown as [unknown, { to: string }])[1].to);
    expect(to).toEqual(["a@x.dev", "b@x.dev", "c@x.dev"]);
    // b@ was released and waits for the next batch; it was never sent twice in this one.
    expect([...store.sent].sort()).toEqual(["a@x.dev", "c@x.dev"]);
  });

  it("caps a batch at LAUNCH_BATCH_MAX whatever is asked", async () => {
    const store = memoryStore(Array.from({ length: LAUNCH_BATCH_MAX + 5 }, (_, i) => `p${i}@x.dev`));
    const { d } = deps(store);
    expect(await sendLaunchBatch({ dryRun: false, limit: 1000 }, d)).toMatchObject({ sent: LAUNCH_BATCH_MAX, waiting: 5 });
  });

  it("releases a definite refusal and stops at the day's cap; keeps an indeterminate one claimed", async () => {
    const store = memoryStore(["a@x.dev", "b@x.dev", "c@x.dev"]);
    const { d } = deps(store, [{ ok: false, reason: "indeterminate" }, { ok: false, reason: "failed" }, { ok: false, reason: "capped" }]);
    const report = await sendLaunchBatch({ dryRun: false, limit: 3 }, d);
    expect(report).toMatchObject({ ok: true, sent: 0, uncertain: 1, released: 2, stoppedBy: "capped" });
    // a@ stays claimed (it may have gone); b@ and c@ wait for the next batch.
    expect([...store.sent]).toEqual(["a@x.dev"]);
  });

  it("sends the one-click header, the launch tag and an idempotency key per address", async () => {
    const { d, send } = deps(memoryStore(["a@x.dev"]));
    await sendLaunchBatch({ dryRun: false, limit: 1 }, d);
    const mail = (send.mock.calls[0] as unknown as [unknown, Record<string, string>])[1];
    expect(mail.template).toBe("launch");
    expect(mail.listUnsubscribe).toMatch(/^https:\/\/the-99\.dev\/api\/unsubscribe\?t=[A-Za-z0-9_-]{43}$/);
    expect(mail.idempotencyKey).toMatch(/^launch-[A-Za-z0-9_-]{22}-[0-9a-z]+$/);
    expect(mail.html).toContain("https://the-99.dev/unsubscribe?t=");
  });

  it("writes the unsubscribe hash before the mail goes out", async () => {
    const store = memoryStore(["a@x.dev"]);
    const order: string[] = [];
    const linked = store.linkUnsubscribe;
    store.linkUnsubscribe = async (e, h) => {
      order.push("link");
      await linked(e, h);
    };
    const { d } = deps(store);
    await sendLaunchBatch({ dryRun: false, limit: 1 }, { ...d, send: async () => (order.push("send"), { ok: true }) });
    expect(order).toEqual(["link", "send"]);
    expect(store.links.get("a@x.dev")).toMatch(/^[0-9a-f]{64}$/);
  });
});
