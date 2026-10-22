import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ value: {} as unknown as NodeJS.ProcessEnv }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../switches/request", () => ({ requestSwitchEnv: async () => env.value }));

const { pathWithQuery, placeRedirect } = await import("./place-redirect");

describe("pathWithQuery", () => {
  it("keeps the query, repeated parameters included", () => {
    expect(pathWithQuery("/commanders/discover", { c: "R,G", m: "exact", q: ["a", "b"] })).toBe(
      "/commanders/discover?c=R%2CG&m=exact&q=a&q=b",
    );
  });
  it("is the bare path with no query", () => {
    expect(pathWithQuery("/commanders/choose", {})).toBe("/commanders/choose");
    expect(pathWithQuery("/commanders/choose", { x: undefined })).toBe("/commanders/choose");
  });
});

describe("placeRedirect", () => {
  beforeEach(() => {
    env.value = {} as unknown as NodeJS.ProcessEnv;
  });
  it("answers null while the switch is off, so the retired route renders in place", async () => {
    expect(await placeRedirect("/commanders/discover", { q: "a" })).toBeNull();
  });
  it("sends the reader to the tab with the query kept while it is on", async () => {
    env.value = { COMMANDERS_PLACE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(await placeRedirect("/commanders/choose", { t: "dinosaurs", v: "results" })).toBe(
      "/commanders/choose?t=dinosaurs&v=results",
    );
  });
});
