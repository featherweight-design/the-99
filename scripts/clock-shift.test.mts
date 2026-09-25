// @vitest-environment jsdom
//
// Proves the clock shift APPLIED. Without this the CI step cannot fail for the
// right reason: a preload that silently did not patch `Date` runs the suite
// against today's clock and reports a green that means nothing — the same shape
// as a suite with no date rot.
//
// Unshifted, these assert the opposite: that nothing was patched.
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

const DAYS = Number(process.env.CLOCK_SHIFT_DAYS ?? "0");

/** The globals `clock-shift.mjs` stashes so this file can prove the shift landed. */
const shifted = globalThis as unknown as {
  __REAL_DATE__?: { now(): number };
  __CLOCK_SHIFT_DAYS__?: number;
};
const DAY_MS = 24 * 60 * 60 * 1000;

describe("clock shift", () => {
  if (DAYS === 0) {
    it("leaves Date alone when CLOCK_SHIFT_DAYS is unset", () => {
      expect(shifted.__CLOCK_SHIFT_DAYS__).toBeUndefined();
      expect(Math.abs(Date.now() - new Date().getTime())).toBeLessThan(1000);
    });
    return;
  }

  it("reports the offset it was asked for", () => {
    expect(shifted.__CLOCK_SHIFT_DAYS__).toBe(DAYS);
  });

  it("moves Date.now() forward by exactly that many days", () => {
    const real = shifted.__REAL_DATE__;
    expect(real, "the preload did not run").toBeTruthy();
    const delta = Date.now() - real!.now();
    // A second of slack for the clock ticking between the two reads.
    expect(Math.abs(delta - DAYS * DAY_MS)).toBeLessThan(1000);
  });

  it("moves a bare `new Date()` too, not only Date.now()", () => {
    const real = shifted.__REAL_DATE__;
    expect(real, "the preload did not run").toBeTruthy();
    const delta = new Date().getTime() - real!.now();
    expect(Math.abs(delta - DAYS * DAY_MS)).toBeLessThan(1000);
  });

  // The line between a clock reading and a stated value. Shifting explicit dates
  // would move fixtures as well as "now", so every relative assertion would keep
  // passing because both sides moved together — a shifted run that proves
  // nothing while looking like it works.
  it("leaves an explicitly constructed date alone", () => {
    expect(new Date("2026-01-01T00:00:00.000Z").toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(new Date(0).getTime()).toBe(0);
  });

  // NOT `new Date() instanceof Date`, which passes with the shim deleted and
  // for any subclass whatsoever. The direction worth asserting is the one
  // plain subclassing BREAKS: a Date from native or host code comes from the
  // real constructor, and without the widened check reads false.
  it("keeps a natively-built Date instanceof Date", () => {
    expect(structuredClone(new Date()) instanceof Date).toBe(true);
    expect(new Date() instanceof Date).toBe(true);
    expect({} instanceof Date).toBe(false);
  });

  // The case `instanceof RealDate` cannot answer: a Date from another realm
  // has a different constructor entirely. Nothing in this suite produces one
  // today -- `structuredClone` and `fs.statSync` are both same-realm under
  // vitest's jsdom, measured -- so this asserts the brand check rather than a
  // live failure, and `vm` is how a second realm is reached deliberately.
  it("accepts a Date from another realm, and still rejects a lookalike", () => {
    const foreign = runInNewContext("new Date()");
    expect(foreign instanceof Date).toBe(true);
    expect({ getTime: () => 0 } instanceof Date).toBe(false);
    // `null instanceof Date` will not typecheck, so the non-object case goes
    // through a widened binding rather than being dropped.
    expect((null as unknown as object) instanceof Date).toBe(false);
  });

  it("carries the real Date's statics across", () => {
    expect(Date.parse("2026-01-01T00:00:00.000Z")).toBe(1767225600000);
    expect(Date.UTC(2026, 0, 1)).toBe(1767225600000);
  });
});
