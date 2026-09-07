import { describe, expect, it } from "vitest";
import { scopeRedirectTarget } from "./scope-redirect";

describe("scopeRedirectTarget", () => {
  it("is null without the legacy parameter", () => {
    expect(scopeRedirectTarget(new URLSearchParams("c=b"))).toBeNull();
  });

  it("sends scope=play to discover", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play"))).toBe("/discover");
  });

  it("carries the colours and the order across", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&c=b,g&sort=new"))).toBe(
      "/discover?c=b%2Cg&s=new",
    );
  });

  it("drops availability, which the discover lane does not have", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&a=free"))).toBe("/discover");
  });

  it("leaves scope=own on the owned lane", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=own&c=b"))).toBe("/commanders?c=b");
  });

  it("rewrites the legacy join and avail keys onto the owned lane", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=own&join=exact&avail=free"))).toBe(
      "/commanders?m=exact&a=free",
    );
  });

  it("drops the legacy avail on the play redirect", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&avail=free&join=exact"))).toBe(
      "/discover?m=exact",
    );
  });
});
