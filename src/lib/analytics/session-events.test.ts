import { describe, expect, it, vi } from "vitest";
import { captureSessionEvent, isSessionEvent, sessionEvent } from "./session-events";

const H = 3_600_000;
const data = {
  user_id: "user_1", status: "ended", created_at: 0, last_active_at: 10 * H, updated_at: 12 * H,
  abandon_at: 90 * 24 * H, expire_at: 7 * 24 * H, latest_activity: { is_mobile: true, ip_address: "1.2.3.4", city: "X" },
  client_id: "client_1", id: "sess_1",
};
const ctx = { hostname: "the-99.dev", key: "phc_test" };

describe("sessionEvent", () => {
  it("knows the three session events and no others", () => {
    expect(["session.ended", "session.removed", "session.revoked"].every(isSessionEvent)).toBe(true);
    expect(isSessionEvent("session.created")).toBe(false);
    expect(isSessionEvent("user.created")).toBe(false);
  });

  it("carries ages and margins in hours, and nothing that identifies a device or place", () => {
    expect(sessionEvent("session.ended", data)).toEqual({
      event: "auth_session_ended",
      distinctId: "user_1",
      properties: {
        session_status: "ended", session_age_hours: 12, idle_hours: 2,
        hours_before_abandon: 90 * 24 - 12, hours_before_expire: 7 * 24 - 12, is_mobile: true,
      },
    });
  });

  it("is null without a user, and reads missing times as null", () => {
    expect(sessionEvent("session.revoked", { ...data, user_id: undefined })).toBeNull();
    expect(sessionEvent("session.removed", { user_id: "u" })?.properties.session_age_hours).toBeNull();
  });
});

describe("captureSessionEvent", () => {
  it("posts one event to PostHog with GeoIP off and no IP or city", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await captureSessionEvent("session.ended", data, ctx, fetchImpl as unknown as typeof fetch)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ api_key: "phc_test", event: "auth_session_ended", distinct_id: "user_1" });
    expect(body.properties.$geoip_disable).toBe(true);
    expect(init.body).not.toMatch(/1\.2\.3\.4|"X"|client_1|sess_1/);
  });

  it("is dormant without a key or off the production hostnames, and never throws", async () => {
    const fetchImpl = vi.fn();
    expect(await captureSessionEvent("session.ended", data, { ...ctx, key: "" }, fetchImpl as unknown as typeof fetch)).toBe(false);
    expect(await captureSessionEvent("session.ended", data, { ...ctx, hostname: "staging.the-99.dev" }, fetchImpl as unknown as typeof fetch)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await captureSessionEvent("session.ended", data, ctx, (async () => { throw new Error("down"); }) as typeof fetch)).toBe(false);
    warn.mockRestore();
  });
});
