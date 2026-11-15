import { describe, expect, it, vi } from "vitest";
import { accountId, captureFunnelEvent, claimId, FUNNEL_EVENTS } from "./funnel-events";

const KEY = "k".repeat(40);
const env = { SENTRY_USER_HASH_KEY: KEY };

describe("ids", () => {
  it("hash an account under the key, never carrying the Clerk id", () => {
    const id = accountId("user_2abcDEF123", env);
    expect(id).toMatch(/^u_[0-9a-f]{16}$/);
    expect(id).not.toContain("user_2abc");
    expect(accountId("user_2abcDEF123", env)).toBe(id);
    expect(accountId("user_other", env)).not.toBe(id);
  });
  it("hash a claim secret, so one newcomer's request and redeem share an id and the secret never leaves", () => {
    const a = claimId("secret-value-1", env);
    expect(a).toMatch(/^a_[0-9a-f]{16}$/);
    expect(a).toBe(claimId("secret-value-1", env));
    expect(a).not.toContain("secret");
    expect(claimId(null, env)).toMatch(/^a_[0-9a-f]{16}$/);
    expect(claimId(null, env)).not.toBe(claimId(null, env));
  });
  it("keep the two namespaces apart: an account and a claim with the same text never collide", () => {
    expect(accountId("same", env)).not.toBe(claimId("same", env));
  });
  it("are null without a key of 32 characters or more (the event is then not sent), and fall back to the anonymous-read salt", () => {
    expect(accountId("u", {})).toBeNull();
    expect(accountId("u", { SENTRY_USER_HASH_KEY: "short" })).toBeNull();
    expect(claimId("s", {})).toBeNull();
    expect(accountId("u", { SENTRY_USER_HASH_KEY: "short", ANON_KEY_SALT: KEY })).toMatch(/^u_/);
  });
});

describe("captureFunnelEvent", () => {
  const ctx = { hostname: "the-99.dev", key: "phc_test", host: "https://us.i.posthog.com" };
  it("posts one personless, GeoIP-off event with its properties and nothing else", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await captureFunnelEvent("code_requested", "a_1234", { outcome: "sent", kind: "flyer" }, ctx, fetchImpl as unknown as typeof fetch)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(JSON.parse(init.body as string)).toEqual({
      api_key: "phc_test", event: "code_requested", distinct_id: "a_1234",
      properties: { outcome: "sent", kind: "flyer", $geoip_disable: true, $process_person_profile: false },
    });
  });
  it("is dormant without a key, without an id, or off the production hostnames", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}"));
    const f = fetchImpl as unknown as typeof fetch;
    expect(await captureFunnelEvent("account_created", "u_1", {}, { ...ctx, key: undefined }, f)).toBe(false);
    expect(await captureFunnelEvent("account_created", null, {}, ctx, f)).toBe(false);
    expect(await captureFunnelEvent("account_created", "u_1", {}, { ...ctx, hostname: "staging.the-99.dev" }, f)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("never throws: a failed or refused send is false", async () => {
    expect(await captureFunnelEvent("account_created", "u_1", {}, ctx, (async () => { throw new Error("down"); }) as unknown as typeof fetch)).toBe(false);
    expect(await captureFunnelEvent("account_created", "u_1", {}, ctx, (async () => new Response("no", { status: 500 })) as unknown as typeof fetch)).toBe(false);
  });
  it("names exactly the four custom events (the landing is the browser's own $pageview)", () => {
    expect([...FUNNEL_EVENTS]).toEqual(["code_requested", "code_redeemed", "account_created", "first_collection_action"]);
  });
});
