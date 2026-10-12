import { describe, expect, it } from "vitest";
import {
  cleanDisplayName, cleanPodName, friendshipRows, inviteState, isUuid, newInviteToken, nextPodOwner,
} from "./rules";

const at = (iso: string) => new Date(iso);
const base = { expiresAt: at("2026-10-19T00:00:00Z"), redeemedAt: null, declinedAt: null, revokedAt: null };

describe("inviteState", () => {
  it("is open until its expiry, and expired from that instant", () => {
    expect(inviteState(base, at("2026-10-18T23:59:59Z"))).toBe("open");
    expect(inviteState(base, at("2026-10-19T00:00:00Z"))).toBe("expired");
  });

  it("names how an ended invite ended, whatever the clock says", () => {
    const now = at("2026-10-13T00:00:00Z");
    expect(inviteState({ ...base, redeemedAt: now }, now)).toBe("redeemed");
    expect(inviteState({ ...base, declinedAt: now }, now)).toBe("declined");
    expect(inviteState({ ...base, revokedAt: now }, at("2026-11-01T00:00:00Z"))).toBe("revoked");
  });
});

describe("names", () => {
  it("trims and collapses whitespace, and counts code points, not UTF-16 units", () => {
    expect(cleanDisplayName("  Hugh   H  ")).toBe("Hugh H");
    expect(cleanDisplayName("🐉".repeat(30))).toBe("🐉".repeat(30));
    expect(cleanDisplayName("🐉".repeat(31))).toBeNull();
  });

  it("refuses an empty name, a control or format character, and a non-string", () => {
    expect(cleanDisplayName("   ")).toBeNull();
    expect(cleanDisplayName("Hu​gh")).toBeNull();
    expect(cleanDisplayName("Hu\u0007gh")).toBeNull();
    expect(cleanDisplayName(42)).toBeNull();
  });

  it("gives a pod 40 code points", () => {
    expect(cleanPodName("x".repeat(40))).toBe("x".repeat(40));
    expect(cleanPodName("x".repeat(41))).toBeNull();
  });
});

describe("nextPodOwner (Q5)", () => {
  const m = (userId: string, iso: string) => ({ userId, joinedAt: at(iso) });

  it("hands the pod to the earliest remaining member", () => {
    expect(nextPodOwner([m("owner", "2026-01-01T00:00:00Z"), m("b", "2026-03-01T00:00:00Z"), m("a", "2026-02-01T00:00:00Z")], "owner")).toBe("a");
  });

  it("breaks a tie by user id, whatever order the rows came in", () => {
    const rows = [m("owner", "2026-01-01T00:00:00Z"), m("z", "2026-02-01T00:00:00Z"), m("c", "2026-02-01T00:00:00Z")];
    expect(nextPodOwner(rows, "owner")).toBe("c");
    expect(nextPodOwner([...rows].reverse(), "owner")).toBe("c");
  });

  it("answers null when nobody is left", () => {
    expect(nextPodOwner([m("owner", "2026-01-01T00:00:00Z")], "owner")).toBeNull();
  });
});

describe("friendshipRows", () => {
  it("writes the pair in user id order, whichever side asks", () => {
    const rows = [{ userId: "user_a", friendUserId: "user_b" }, { userId: "user_b", friendUserId: "user_a" }];
    expect(friendshipRows("user_a", "user_b")).toEqual(rows);
    expect(friendshipRows("user_b", "user_a")).toEqual(rows);
  });
});

describe("ids and tokens", () => {
  it("takes only a uuid as an id claim", () => {
    expect(isUuid("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b")).toBe(true);
    expect(isUuid("user_3GkZ")).toBe(false);
    expect(isUuid("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b' or 1=1")).toBe(false);
  });

  it("makes 22-character url-safe tokens", () => {
    const token = newInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newInviteToken()).not.toBe(token);
  });
});
