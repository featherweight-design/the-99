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
      "/discover?c=b%2Cg&o=new",
    );
  });

  it("drops availability, which the discover lane does not have", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&a=free"))).toBe("/discover");
  });

  // The shipped control wrote `owned`, so this is the spelling real bookmarks
  // carry. The two below it are the values a hand-edited URL can hold.
  it("sends scope=owned to the owned lane, shedding the parameter", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=owned&c=b"))).toBe("/commanders?c=b");
  });

  it("reads an empty scope as the owned lane", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=&c=b"))).toBe("/commanders?c=b");
  });

  it("reads an unknown scope as the owned lane rather than ignoring it", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=nonsense"))).toBe("/commanders");
  });

  it("rewrites the legacy join and avail keys onto the owned lane", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=owned&join=exact&avail=free"))).toBe(
      "/commanders?m=exact&a=free",
    );
  });

  it("keeps an explicit a=all on the owned lane, which wins over a saved Free", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=owned&a=all"))).toBe("/commanders?a=all");
    expect(scopeRedirectTarget(new URLSearchParams("scope=owned&avail=all&c=r"))).toBe("/commanders?c=r&a=all");
  });

  it("drops the legacy avail on the play redirect", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&avail=free&join=exact"))).toBe(
      "/discover?m=exact",
    );
  });
});
