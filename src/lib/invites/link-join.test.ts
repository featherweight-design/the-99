import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { CODE_TTL_MS, LINK_PROVEN_HOLD_MS, linkHoldUntil, MAX_LINK_HOLDS } from "./rules";
import { linkJoinRefusal, openLinkJoin } from "./link-join";

const NOW = new Date("2026-11-12T12:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

describe("linkHoldUntil", () => {
  it("holds an unproven claim for the code's ten minutes, never the QR's seven days", () => {
    expect(linkHoldUntil(NOW, false, null)).toEqual(at(CODE_TTL_MS));
  });

  it("refreshes the window on a resend", () => {
    expect(linkHoldUntil(NOW, false, at(-60_000))).toEqual(at(CODE_TTL_MS));
  });

  it("holds a proven claim an hour, and a later resend never shortens it", () => {
    expect(linkHoldUntil(NOW, true, at(CODE_TTL_MS))).toEqual(at(LINK_PROVEN_HOLD_MS));
    expect(linkHoldUntil(NOW, false, at(LINK_PROVEN_HOLD_MS))).toEqual(at(LINK_PROVEN_HOLD_MS));
  });
});

describe("linkJoinRefusal", () => {
  it("opens nothing when the owner is out of invites", () => {
    expect(linkJoinRefusal(true, 0)).toBe("out");
  });

  it("caps the newcomers one link holds at once at two", () => {
    expect(MAX_LINK_HOLDS).toBe(2);
    expect(linkJoinRefusal(false, 1)).toBeNull();
    expect(linkJoinRefusal(false, 2)).toBe("busy");
  });
});

describe("openLinkJoin", () => {
  it("writes nothing without the key or with a token that is not a link", async () => {
    expect(await openLinkJoin("x".repeat(22), null)).toEqual({ ok: false, reason: "unconfigured" });
    expect(await openLinkJoin("short", "a".repeat(64))).toEqual({ ok: false, reason: "ended" });
  });
});
