import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { decideSend, NOTICE_QUIET_MS } from "./friend-requests";

const NOW = new Date("2026-11-12T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("decideSend", () => {
  it("sends nothing between friends", () => {
    expect(decideSend(true, undefined, undefined, NOW)).toEqual({ kind: "alreadyFriends" });
    expect(decideSend(true, { state: "waiting", noticedAt: NOW }, { state: "waiting" }, NOW)).toEqual({ kind: "alreadyFriends" });
  });

  it("answers the owner's own waiting request: friends (A9, L4)", () => {
    expect(decideSend(false, undefined, { state: "waiting" }, NOW)).toEqual({ kind: "nowFriends" });
    expect(decideSend(false, { state: "declined", noticedAt: NOW }, { state: "waiting" }, NOW)).toEqual({ kind: "nowFriends" });
  });

  it("does not treat the owner's declined or withdrawn request as an answer", () => {
    expect(decideSend(false, undefined, { state: "declined" }, NOW)).toEqual({ kind: "insert" });
    expect(decideSend(false, undefined, { state: "withdrawn" }, NOW)).toEqual({ kind: "insert" });
  });

  it("writes a first request", () => {
    expect(decideSend(false, undefined, undefined, NOW)).toEqual({ kind: "insert" });
  });

  it("changes nothing on a waiting request, or a declined one, which the requester cannot tell apart (H2)", () => {
    expect(decideSend(false, { state: "waiting", noticedAt: ago(1000) }, undefined, NOW)).toEqual({ kind: "unchanged" });
    expect(decideSend(false, { state: "declined", noticedAt: ago(NOTICE_QUIET_MS * 3) }, undefined, NOW)).toEqual({ kind: "unchanged" });
  });

  it("resends a withdrawn request, lighting the diamond only past the 30-day quiet (G3)", () => {
    expect(decideSend(false, { state: "withdrawn", noticedAt: ago(NOTICE_QUIET_MS - 1) }, undefined, NOW)).toEqual({ kind: "resend", relight: false });
    expect(decideSend(false, { state: "withdrawn", noticedAt: ago(NOTICE_QUIET_MS) }, undefined, NOW)).toEqual({ kind: "resend", relight: true });
  });

  it("resends after an accept the two have since undone by unfriending", () => {
    expect(decideSend(false, { state: "accepted", noticedAt: ago(NOTICE_QUIET_MS * 2) }, undefined, NOW)).toEqual({ kind: "resend", relight: true });
  });
});
