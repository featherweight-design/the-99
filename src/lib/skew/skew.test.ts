import { describe, expect, it } from "vitest";
import {
  SKEW_RELOAD_GAP_MS,
  deploymentsDiffer,
  isSkewError,
  mayReload,
  mayReloadNow,
} from "./skew";

describe("isSkewError", () => {
  it("names a stale chunk and a stale Server Action", () => {
    const chunk = Object.assign(new Error("x"), { name: "ChunkLoadError" });
    expect(isSkewError(chunk)).toBe(true);
    expect(isSkewError(new Error("Loading chunk 12 failed."))).toBe(true);
    expect(isSkewError(new Error('Failed to find Server Action "abc". This request might be from an older or newer deployment.'))).toBe(true);
  });
  it("leaves every other error alone", () => {
    expect(isSkewError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isSkewError(null)).toBe(false);
  });
});

describe("deploymentsDiffer", () => {
  it("is skew only when both ids are known and unequal", () => {
    expect(deploymentsDiffer("dpl_a", "dpl_b")).toBe(true);
    expect(deploymentsDiffer("dpl_a", "dpl_a")).toBe(false);
    expect(deploymentsDiffer("dpl_a", null)).toBe(false);
    expect(deploymentsDiffer(null, "dpl_b")).toBe(false);
  });
});

describe("mayReload", () => {
  it("allows the first reload and refuses one inside the gap", () => {
    expect(mayReload(() => null, 1_000_000)).toBe(true);
    expect(mayReload(() => String(1_000_000 - 1000), 1_000_000)).toBe(false);
    expect(mayReload(() => String(1_000_000 - SKEW_RELOAD_GAP_MS), 1_000_000)).toBe(true);
  });
  it("treats a corrupt stamp as no reload yet", () => {
    expect(mayReload(() => "abc", 1_000_000)).toBe(true);
  });
  it("refuses when the store cannot be read", () => {
    expect(
      mayReload(() => {
        throw new Error("denied");
      }, 1),
    ).toBe(false);
  });
});

describe("mayReloadNow", () => {
  const idle = { editing: false, dirtyForm: false };
  it("always lets a route change through", () => {
    expect(mayReloadNow({ editing: true, dirtyForm: true }, "route")).toBe(true);
  });
  it("holds a blur or detection while input is typed or a form is dirty", () => {
    expect(mayReloadNow(idle, "blur")).toBe(true);
    expect(mayReloadNow(idle, "detected")).toBe(true);
    expect(mayReloadNow({ editing: true, dirtyForm: false }, "blur")).toBe(false);
    expect(mayReloadNow({ editing: false, dirtyForm: true }, "detected")).toBe(false);
  });
});
