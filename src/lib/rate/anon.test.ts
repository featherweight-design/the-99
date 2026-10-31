import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  env: { RATE_LIMIT_ENABLED: "true" } as Record<string, string | undefined>,
  envThrows: false,
  hits: 1,
  recordThrows: false,
  recorded: [] as [string, string][],
  after: [] as (() => Promise<void>)[],
}));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { h.after.push(fn); } }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: async (u: unknown) => { expect(u).toBeNull(); if (h.envThrows) throw new Error("db down"); return h.env; } }));
vi.mock("./observe", () => ({ recordHit: async (key: string, bucket: string) => { if (h.recordThrows) throw new Error("x"); h.recorded.push([key, bucket]); return h.hits; } }));

import { anonKey, ANON_PREFIX, clientAddress, networkOf, observeAnonymousHit, overAnonymousLimit, UNKNOWN_KEY } from "./anon";

const hdr = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
const flush = async () => { for (const fn of h.after.splice(0)) await fn(); };
const DAY = new Date("2026-10-18T12:00:00Z");

beforeEach(() => {
  h.env = { RATE_LIMIT_ENABLED: "true" };
  h.envThrows = false; h.hits = 1; h.recordThrows = false; h.recorded = []; h.after = [];
  vi.restoreAllMocks();
});

describe("clientAddress", () => {
  it("reads an empty header as absent, so it cannot shadow the real address", () => {
    expect(clientAddress(hdr({ "x-real-ip": "", "x-forwarded-for": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientAddress(hdr({ "x-real-ip": "", "x-vercel-forwarded-for": "5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("prefers x-real-ip, then x-vercel-forwarded-for, then the first hop of x-forwarded-for", () => {
    expect(clientAddress(hdr({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientAddress(hdr({ "x-vercel-forwarded-for": "5.6.7.8", "x-forwarded-for": "9.9.9.9" }))).toBe("5.6.7.8");
    expect(clientAddress(hdr({ "x-forwarded-for": " 9.9.9.9 , 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientAddress(hdr({}))).toBeNull();
    expect(clientAddress(hdr({ "x-forwarded-for": " " }))).toBeNull();
  });
});

describe("networkOf and anonKey", () => {
  it("reduces an IPv6 address to its /64 however it is written, and leaves IPv4 alone", () => {
    expect(networkOf("203.0.113.9")).toBe("203.0.113.9");
    const a = networkOf("2001:db8:abcd:12:1:2:3:4");
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(networkOf("2001:0DB8:abcd:0012:ffff:ffff:ffff:ffff")).toBe(a);
    expect(networkOf("2001:db8:abcd:12::1")).toBe(a);
    expect(networkOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("handles the compressed and decorated forms without crashing or merging unrelated visitors", () => {
    expect(networkOf("::")).toBe("0:0:0:0::/64");
    expect(networkOf("::1")).toBe("0:0:0:0::/64");
    expect(networkOf("2001:db8::")).toBe("2001:db8:0:0::/64");
    expect(networkOf("2001:db8:1::")).toBe("2001:db8:1:0::/64");
    expect(networkOf("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(networkOf("[2001:DB8::1]")).toBe("2001:db8:0:0::/64");
    // Different /64s stay different.
    expect(networkOf("2001:db8:0:1::1")).not.toBe(networkOf("2001:db8:0:2::1"));
  });

  it("returns text that is not an address unreduced and does not throw", () => {
    for (const junk of [":::", "1:2:3", "a:b:c:d:e:f:g:h", "::ffff:999.1.1.1", "unknown, 1.2.3.4", ""]) {
      expect(() => networkOf(junk), junk).not.toThrow();
    }
    expect(networkOf("A:B")).toBe("a:b");
  });

  it("reads an IPv4-mapped IPv6 address as the IPv4 it carries, in dotted, hexadecimal and expanded spellings and any case", () => {
    expect(networkOf("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(networkOf("::FFFF:1.2.3.4")).toBe("1.2.3.4");
    expect(networkOf("::ffff:102:304")).toBe("1.2.3.4");
    expect(networkOf("0:0:0:0:0:ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(networkOf("0000:0000:0000:0000:0000:ffff:0102:0304")).toBe("1.2.3.4");
    // Unrelated mapped addresses stay unrelated.
    expect(networkOf("::ffff:506:708")).toBe("5.6.7.8");
    expect(networkOf("::ffff:506:708")).not.toBe(networkOf("::ffff:102:304"));
    expect(anonKey("::ffff:1.2.3.4", DAY)).toBe(anonKey("1.2.3.4", DAY));
  });

  it("is `anon:` plus 16 hex, the same within a UTC day and a /64, different across days and networks, and never the raw address", () => {
    const k = anonKey("203.0.113.9", DAY);
    expect(k).toMatch(/^anon:[0-9a-f]{16}$/);
    expect(anonKey("203.0.113.9", new Date("2026-10-18T23:59:59Z"))).toBe(k);
    expect(anonKey("203.0.113.9", new Date("2026-10-19T00:00:00Z"))).not.toBe(k);
    expect(anonKey("203.0.113.10", DAY)).not.toBe(k);
    expect(anonKey("2001:db8:abcd:12::1", DAY)).toBe(anonKey("2001:db8:abcd:12:9:9:9:9", DAY));
    // The documented digest, so the key cannot drift into carrying the address or losing the day.
    expect(k).toBe(`anon:${createHash("sha256").update("203.0.113.9|2026-10-18").digest("hex").slice(0, 16)}`);
    expect(k.startsWith(ANON_PREFIX)).toBe(true);
  });

  it("is one shared key when no address can be read", () => {
    expect(anonKey(null, DAY)).toBe(UNKNOWN_KEY);
  });
});

describe("observeAnonymousHit", () => {
  it("writes nothing and schedules nothing while the switch is off", async () => {
    h.env = {};
    await observeAnonymousHit(hdr({ "x-real-ip": "1.2.3.4" }));
    expect(h.after).toHaveLength(0);
    expect(h.recorded).toEqual([]);
  });

  it("swallows a failed switch read: counting never costs a visitor anything", async () => {
    h.envThrows = true;
    await expect(observeAnonymousHit(hdr({}))).resolves.toBeUndefined();
    expect(h.after).toHaveLength(0);
  });

  it("counts after the response under the visitor's key in the public-read bucket", async () => {
    await observeAnonymousHit(hdr({ "x-real-ip": "1.2.3.4" }));
    expect(h.recorded).toEqual([]);
    await flush();
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0][0]).toMatch(/^anon:[0-9a-f]{16}$/);
    expect(h.recorded[0][1]).toBe("public-read");
  });

  it("over the limit only warns, with the bucket, count and limit and never the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.hits = 121;
    await observeAnonymousHit(hdr({ "x-real-ip": "1.2.3.4" }));
    await flush();
    expect(warn).toHaveBeenCalledWith("[rate] would refuse bucket=public-read hits=121 limit=120");
    expect(String(warn.mock.calls[0][0])).not.toContain("anon:");
  });

  it("at the limit does not warn, and a failing write is swallowed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.hits = 120;
    await observeAnonymousHit(hdr({ "x-real-ip": "1.2.3.4" }));
    await flush();
    expect(warn).not.toHaveBeenCalled();
    h.recordThrows = true;
    await observeAnonymousHit(hdr({ "x-real-ip": "1.2.3.4" }));
    await expect(flush()).resolves.toBeUndefined();
  });
});

describe("overAnonymousLimit", () => {
  it("counts under the visitor's key in the named bucket, and the limit's own hit is let through", async () => {
    h.hits = 10;
    expect(await overAnonymousLimit(hdr({ "x-real-ip": "1.2.3.4" }), "launch-list")).toBe(false);
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0][0].startsWith(ANON_PREFIX)).toBe(true);
    expect(h.recorded[0][1]).toBe("launch-list");
  });

  it("refuses the hit past the limit, whatever RATE_LIMIT_ENABLED says", async () => {
    h.env = { RATE_LIMIT_ENABLED: "off" };
    h.hits = 11;
    expect(await overAnonymousLimit(hdr({ "x-real-ip": "1.2.3.4" }), "launch-list")).toBe(true);
  });

  it("lets a header-less request through without counting it under the shared key", async () => {
    h.hits = 99;
    expect(await overAnonymousLimit(hdr({}), "launch-list")).toBe(false);
    expect(h.recorded).toHaveLength(0);
  });

  it("fails open when counting fails", async () => {
    h.recordThrows = true;
    expect(await overAnonymousLimit(hdr({ "x-real-ip": "1.2.3.4" }), "launch-list")).toBe(false);
  });
});
