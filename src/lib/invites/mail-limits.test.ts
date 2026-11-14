import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for `recordHit`: one counter per (key, bucket), as the real window row is.
const store = vi.hoisted(() => ({ counts: new Map<string, number>(), fail: false }));
const sweep = vi.hoisted(() => vi.fn());
vi.mock("../rate/observe", () => ({
  recordHit: vi.fn(async (key: string, bucket: string) => {
    if (store.fail) throw new Error("db down");
    const k = `${key}|${bucket}`;
    store.counts.set(k, (store.counts.get(k) ?? 0) + 1);
    return store.counts.get(k)!;
  }),
  sweepAfterResponse: sweep,
}));
const sentry = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn() }));
vi.mock("../sentry/capture", () => ({ captureServerWarning: sentry.warning, captureServerError: sentry.error }));
const SALT = "s".repeat(40);
vi.mock("../rate/anon", () => ({ anonSalt: () => SALT }));

import { RATE_RULES } from "../rate/rules";
import { DEFAULT_DAILY_MAIL_CAP, mailDailyCap, mailRefusal, recipientKey, reachesWarning } from "./mail-limits";

const NOW = new Date("2026-11-14T10:30:00Z");

beforeEach(() => {
  store.counts.clear();
  store.fail = false;
  sentry.warning.mockClear();
  sentry.error.mockClear();
  delete process.env.RESEND_DAILY_SEND_CAP;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("mailDailyCap", () => {
  it("is 70 by default, and the env number when it is a positive whole number", () => {
    expect(DEFAULT_DAILY_MAIL_CAP).toBe(70);
    expect(mailDailyCap(undefined)).toBe(70);
    expect(mailDailyCap("1000")).toBe(1000);
    expect(mailDailyCap(" 250 ")).toBe(250);
    for (const bad of ["", "0", "-5", "12.5", "lots", "NaN", "1e3", "0x10", "+5", "1e308", "99999999"]) expect(mailDailyCap(bad), bad).toBe(70);
  });
});

describe("the rules table", () => {
  it("states the free plan's default for the global row, and the walls the brief set", () => {
    expect(RATE_RULES["mail-all-day"]).toEqual({ limit: DEFAULT_DAILY_MAIL_CAP, windowMs: 86_400_000 });
    expect(RATE_RULES["mail-recipient"]).toEqual({ limit: 3, windowMs: 3_600_000 });
    expect(RATE_RULES["mail-recipient-day"]).toEqual({ limit: 10, windowMs: 86_400_000 });
  });
});

describe("recipientKey", () => {
  it("is one key for one inbox: tags, Gmail dots, googlemail and case fold together; another inbox differs", () => {
    const key = recipientKey("sam.smith@gmail.com");
    expect(recipientKey("SamSmith+flyer@googlemail.com")).toBe(key);
    expect(recipientKey("s.a.m.smith+x@gmail.com")).toBe(key);
    expect(recipientKey("sam.smith@outlook.com")).not.toBe(key);
  });

  it("never carries the address", () => {
    expect(recipientKey("sam.smith@gmail.com")).toMatch(/^mail:[0-9a-f]{16}$/);
  });
});

describe("mailRefusal, per recipient", () => {
  it("lets three through in an hour and refuses the fourth, with the seconds left in the hour", async () => {
    for (let i = 0; i < 3; i++) expect(await mailRefusal("a@x.dev", NOW)).toBeNull();
    expect(await mailRefusal("a@x.dev", NOW)).toEqual({ reason: "limited", waitSec: 1800 });
  });

  it("counts an alias as the same recipient", async () => {
    expect(await mailRefusal("sam.smith@gmail.com", NOW)).toBeNull();
    expect(await mailRefusal("samsmith+a@gmail.com", NOW)).toBeNull();
    expect(await mailRefusal("SAM.SMITH+b@googlemail.com", NOW)).toBeNull();
    expect(await mailRefusal("s.a.m.smith@gmail.com", NOW)).toMatchObject({ reason: "limited" });
  });

  it("refuses the eleventh in a day, though each hour was under its three", async () => {
    // The hourly bucket is keyed by the same key, so spread the sends across hours by resetting only that bucket.
    for (let i = 0; i < 10; i++) {
      for (const k of [...store.counts.keys()]) if (k.endsWith("|mail-recipient")) store.counts.delete(k);
      expect(await mailRefusal("a@x.dev", NOW), String(i)).toBeNull();
    }
    for (const k of [...store.counts.keys()]) if (k.endsWith("|mail-recipient")) store.counts.delete(k);
    expect(await mailRefusal("a@x.dev", NOW)).toEqual({ reason: "limited", waitSec: 13 * 3600 + 1800 });
  });

  it("schedules the retention sweep after the response for each recipient bucket it counts", async () => {
    sweep.mockClear();
    await mailRefusal("a@x.dev", NOW);
    expect(sweep.mock.calls.map(([bucket]) => bucket)).toEqual(["mail-recipient", "mail-recipient-day"]);
  });

  it("does not spend the day's ceiling on a refused recipient", async () => {
    for (let i = 0; i < 3; i++) await mailRefusal("a@x.dev", NOW);
    const before = store.counts.get("mail:all|mail-all-day");
    await mailRefusal("a@x.dev", NOW);
    expect(store.counts.get("mail:all|mail-all-day")).toBe(before);
  });
});

describe("mailRefusal, the day's cap", () => {
  it("sends up to the cap, warns once at 80%, and refuses past it", async () => {
    process.env.RESEND_DAILY_SEND_CAP = "10";
    for (let i = 1; i <= 10; i++) {
      expect(await mailRefusal(`r${i}@x.dev`, NOW), String(i)).toBeNull();
      // The 80% warning is the 8th send, once.
      expect(sentry.warning.mock.calls.filter(([, m]) => /80%/.test(m))).toHaveLength(i >= 8 ? 1 : 0);
    }
    expect(await mailRefusal("r11@x.dev", NOW)).toEqual({ reason: "capped" });
    expect(await mailRefusal("r12@x.dev", NOW)).toEqual({ reason: "capped" });
  });

  it("warns with a fixed tag and message, never an address", async () => {
    process.env.RESEND_DAILY_SEND_CAP = "5";
    for (let i = 1; i <= 4; i++) await mailRefusal(`secret${i}@x.dev`, NOW);
    expect(sentry.warning).toHaveBeenCalledWith("mail-cap", "Daily mail cap reached 80%");
    expect(JSON.stringify([...sentry.warning.mock.calls, ...vi.mocked(console.warn).mock.calls])).not.toContain("secret");
  });

  it("follows a raised cap", async () => {
    process.env.RESEND_DAILY_SEND_CAP = "1000";
    for (let i = 1; i <= 100; i++) expect(await mailRefusal(`r${i}@x.dev`, NOW)).toBeNull();
  });

  it("reaches 80% at the ceiling of cap times 0.8", () => {
    expect(reachesWarning(56, 70)).toBe(true);
    expect(reachesWarning(55, 70)).toBe(false);
    expect(reachesWarning(57, 70)).toBe(false);
  });
});

describe("mailRefusal, when counting fails", () => {
  it("lets the send through and reports the failure once", async () => {
    store.fail = true;
    expect(await mailRefusal("a@x.dev", NOW)).toBeNull();
    expect(await mailRefusal("b@x.dev", NOW)).toBeNull();
    expect(sentry.error).toHaveBeenCalledTimes(1);
  });
});
