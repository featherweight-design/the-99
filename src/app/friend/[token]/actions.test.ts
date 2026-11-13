import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ refused: null as number | null, buckets: [] as string[], opened: [] as unknown[] }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../../../lib/rate/anon", () => ({
  newcomerRefusal: async (_h: unknown, visitor: string, backstop: string) => { h.buckets.push(visitor, backstop); return h.refused; },
}));
vi.mock("../../../lib/invites/link-join", () => ({
  openLinkJoin: async (token: unknown) => { h.opened.push(token); return { ok: true, token: "Q".repeat(43) }; },
}));

import { joinFromLinkAction } from "./actions";

beforeEach(() => {
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
