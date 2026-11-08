import { describe, expect, it } from "vitest";
import { clerkCookies, platformOf, PRESS_WINDOW_MS, signOutEvidence, type BrowserFacts } from "./sign-out-evidence";

const facts: BrowserFacts = { standalone: true, platform: "ios", clientUat: "zero", sessionCookie: false, visibility: "visible" };
const now = Date.UTC(2026, 10, 8, 12);

describe("signOutEvidence", () => {
  it("is null when this browser never saw the reader signed in", () => {
    expect(signOutEvidence({ kind: "signed_out_load", seenAt: null, pressedAt: null, now, facts, clientSessions: 0 })).toBeNull();
  });

  it("carries whole hours since last seen, the browser facts and the session count", () => {
    const e = signOutEvidence({ kind: "signed_out_load", seenAt: now - 50 * 3_600_000 - 1, pressedAt: null, now, facts, clientSessions: 0 });
    expect(e).toEqual({ ...facts, kind: "signed_out_load", hoursSinceSeen: 50, pressedSignOut: false, clientSessions: 0 });
  });

  it("counts a Sign out press only inside its window", () => {
    const base = { kind: "session_ended" as const, seenAt: now - 1000, now, facts, clientSessions: null };
    expect(signOutEvidence({ ...base, pressedAt: now - 1000 })?.pressedSignOut).toBe(true);
    expect(signOutEvidence({ ...base, pressedAt: now - PRESS_WINDOW_MS - 1 })?.pressedSignOut).toBe(false);
    expect(signOutEvidence({ ...base, pressedAt: now + 1000 })?.pressedSignOut).toBe(false);
  });

  it("never reports negative hours for a clock that moved back", () => {
    expect(signOutEvidence({ kind: "session_ended", seenAt: now + 10_000, pressedAt: null, now, facts, clientSessions: 1 })?.hoursSinceSeen).toBe(0);
  });
});

describe("platformOf", () => {
  it("reads a coarse platform, an iPad asking for desktop pages as iOS", () => {
    expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("mac");
    expect(platformOf("Mozilla/5.0 (Linux; Android 15; Pixel 9)", 5)).toBe("android");
    expect(platformOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0)).toBe("windows");
    expect(platformOf("curl/8", 0)).toBe("other");
  });
});

describe("clerkCookies", () => {
  it("reads Clerk's cookies by name alone, suffixed ones included", () => {
    expect(clerkCookies("")).toEqual({ clientUat: "absent", sessionCookie: false });
    expect(clerkCookies("a=1; __client_uat=0")).toEqual({ clientUat: "zero", sessionCookie: false });
    expect(clerkCookies("__client_uat=1731000000; __session=eyJ")).toEqual({ clientUat: "set", sessionCookie: true });
    expect(clerkCookies("__client_uat_AbC=1731000000; __client_uat=0; __session_AbC=x")).toEqual({ clientUat: "set", sessionCookie: true });
    expect(clerkCookies("__client_uatx=5; __sessionid=1")).toEqual({ clientUat: "absent", sessionCookie: false });
  });
});
