import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  env: { FRIEND_LINKS_ENABLED: "true" } as Record<string, string>,
  origin: "https://the-99.dev" as string | null,
  log: [] as string[],
  send: null as unknown,
  limited: false,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => h.log.push(`revalidate:${p}`) }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "me" }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => h.env }));
vi.mock("../../lib/social/client-rules", async (orig) => ({
  ...(await orig<typeof import("../../lib/social/client-rules")>()),
  originFrom: () => { h.log.push("origin"); return h.origin; },
}));
vi.mock("../../lib/rate/observe", () => ({ enforceHit: async (_u: string, b: string) => { h.log.push(`enforce:${b}`); return h.limited ? 60 : null; } }));
vi.mock("../../lib/social/friend-link-keys", () => ({
  ownLinkKey: async () => { h.log.push("own"); return { ok: true, key: { token: "T".repeat(22), code: "K7Q4XM", createdAt: new Date() } }; },
  resetLinkKey: async () => { h.log.push("reset"); return { ok: true, key: { token: "R".repeat(22), code: "R2M8TV", createdAt: new Date() } }; },
}));
vi.mock("../../lib/social/friend-requests", () => ({ sendFriendRequest: async () => { h.log.push("send"); return h.send; } }));
vi.mock("./sender-profile", () => ({ ensureSenderProfile: async () => h.log.push("profile") }));

import { loadFriendLinkAction, resetFriendLinkAction, sendCodeRequestAction } from "./friend-link-actions";

beforeEach(() => {
  h.env = { FRIEND_LINKS_ENABLED: "true" };
  h.origin = "https://the-99.dev";
  h.log = [];
  h.send = null;
  h.limited = false;
});

describe("friend link actions", () => {
  it("answers off and writes nothing with the switch off", async () => {
    h.env = {};
    expect(await loadFriendLinkAction()).toEqual({ ok: false, reason: "off" });
    expect(await resetFriendLinkAction()).toEqual({ ok: false, reason: "off" });
    expect(await sendCodeRequestAction("K7Q4XM")).toEqual({ ok: false, reason: "off" });
    expect(h.log).toEqual([]);
  });

  it("hands back the link at the request's origin, with its code", async () => {
    expect(await loadFriendLinkAction()).toEqual({ ok: true, link: { url: `https://the-99.dev/friend/${"T".repeat(22)}`, code: "K7Q4XM" } });
  });

  it("reads the origin before a reset counts or writes, so an unreadable host spends nothing", async () => {
    h.origin = null;
    expect(await resetFriendLinkAction()).toEqual({ ok: false, reason: "failed" });
    expect(h.log).toEqual(["origin"]);
  });

  it("refuses a reset past the day's cap without resetting", async () => {
    h.limited = true;
    expect(await resetFriendLinkAction()).toEqual({ ok: false, reason: "limited" });
    expect(h.log).not.toContain("reset");
  });

  it("names a code that is nobody's wrong, your own own, and a capped try limited", async () => {
    for (const [reason, want] of [["notFound", "wrong"], ["self", "own"], ["limited", "limited"], ["noProfile", "failed"]] as const) {
      h.send = { ok: false, reason, ...(reason === "limited" ? { retryAfterSec: 60 } : {}) };
      expect(await sendCodeRequestAction("K7Q4XM")).toEqual({ ok: false, reason: want });
    }
  });

  it("refreshes /friends and Home only when the code made the two friends", async () => {
    const owner = { publicId: "p", displayName: "Wren", commander: null };
    h.send = { ok: true, outcome: "sent", owner };
    await sendCodeRequestAction("K7Q4XM");
    expect(h.log.filter((l) => l.startsWith("revalidate"))).toEqual([]);
    h.send = { ok: true, outcome: "nowFriends", owner };
    await sendCodeRequestAction("K7Q4XM");
    expect(h.log.filter((l) => l.startsWith("revalidate"))).toEqual(["revalidate:/friends", "revalidate:/"]);
  });
});
