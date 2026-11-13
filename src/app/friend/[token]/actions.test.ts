import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  refused: null as number | null, buckets: [] as string[], opened: [] as unknown[],
  sent: null as unknown, withdrawn: true, revalidated: [] as string[],
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => h.revalidated.push(p) }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "me" }));
vi.mock("../../../lib/flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../../../lib/social/friend-requests", () => ({ sendFriendRequest: async () => h.sent, withdrawFriendRequest: async () => h.withdrawn }));
vi.mock("../../friends/sender-profile", () => ({ ensureSenderProfile: async () => {} }));
vi.mock("../../../lib/rate/anon", () => ({
  newcomerRefusal: async (_h: unknown, visitor: string, backstop: string) => { h.buckets.push(visitor, backstop); return h.refused; },
}));
vi.mock("../../../lib/invites/link-join", () => ({
  openLinkJoin: async (token: unknown) => { h.opened.push(token); return { ok: true, token: "Q".repeat(43) }; },
}));

import { joinFromLinkAction, sendLinkRequestAction, withdrawLinkRequestAction } from "./actions";

beforeEach(() => {
  h.sent = null;
  h.withdrawn = true;
  h.revalidated = [];
  h.refused = null;
  h.buckets = [];
  h.opened = [];
});

describe("joinFromLinkAction", () => {
  const TOKEN = "A".repeat(22);

  it("opens a join on the link's own caps and sends the visitor to the join flow", async () => {
    expect(await joinFromLinkAction(TOKEN)).toEqual({ ok: true, path: `/join/${"Q".repeat(43)}` });
    expect(h.buckets).toEqual(["friend-join", "friend-join-all"]);
  });

  it("reads a capped visitor as a busy link and opens nothing", async () => {
    h.refused = 60;
    expect(await joinFromLinkAction(TOKEN)).toEqual({ ok: false, reason: "busy" });
    expect(h.opened).toEqual([]);
  });

  it("ends anything that is not a link token before counting it", async () => {
    expect(await joinFromLinkAction("../etc")).toEqual({ ok: false, reason: "ended" });
    expect(h.buckets).toEqual([]);
  });
});

describe("sendLinkRequestAction", () => {
  it("answers a send and refreshes /friends", async () => {
    h.sent = { ok: true, outcome: "nowFriends", owner: { publicId: "p" } };
    expect(await sendLinkRequestAction("A".repeat(22))).toMatchObject({ ok: true, outcome: "nowFriends" });
    expect(h.revalidated).toEqual(["/friends"]);
  });

  it("names a link that is nobody's ended, your own self, a capped send limited, anything else failed", async () => {
    for (const [reason, want] of [["notFound", "ended"], ["self", "self"], ["limited", "limited"], ["noProfile", "failed"], ["unconfigured", "failed"]] as const) {
      h.sent = { ok: false, reason, ...(reason === "limited" ? { retryAfterSec: 60 } : {}) };
      expect(await sendLinkRequestAction("A".repeat(22))).toEqual({ ok: false, reason: want });
    }
    expect(h.revalidated).toEqual([]);
  });
});

describe("withdrawLinkRequestAction", () => {
  it("refreshes /friends only when something was taken back", async () => {
    h.withdrawn = false;
    expect(await withdrawLinkRequestAction("p")).toBe(false);
    expect(h.revalidated).toEqual([]);
    h.withdrawn = true;
    expect(await withdrawLinkRequestAction("p")).toBe(true);
    expect(h.revalidated).toEqual(["/friends"]);
  });
});
