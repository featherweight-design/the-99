import { describe, expect, it } from "vitest";
import { buildRefusal } from "./builds";

const done = { ok: true, finishedAt: new Date(), catalogFingerprint: "10:a" };

describe("buildRefusal", () => {
  it("allows a finished, successful build whose catalog both sides still hold", () => {
    expect(buildRefusal(done, "10:a", "10:a")).toBeNull();
  });
  it("refuses when there is no build", () => {
    expect(buildRefusal(null, "10:a", "10:a")).toMatch(/no build/);
  });
  it("refuses an unfinished build", () => {
    expect(buildRefusal({ ...done, ok: null, finishedAt: null }, "10:a", "10:a")).toMatch(/not finished/);
  });
  it("refuses a failed build", () => {
    expect(buildRefusal({ ...done, ok: false }, "10:a", "10:a")).toMatch(/failed/);
  });
  it("refuses when the source's catalog moved since the build", () => {
    expect(buildRefusal(done, "10:b", "10:b")).toMatch(/moved since the build/);
  });
  it("refuses when the target's catalog differs", () => {
    expect(buildRefusal(done, "10:a", "10:c")).toMatch(/catalogs disagree/);
  });
});
