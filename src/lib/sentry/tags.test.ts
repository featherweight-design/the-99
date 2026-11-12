import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { tagEvent } from "./tags";

const event = (over: Partial<ErrorEvent> = {}): ErrorEvent => ({ type: undefined, ...over });

describe("tagEvent", () => {
  it("tags every event with the app and Next's route pattern when the error came through onRequestError", () => {
    const out = tagEvent(event({ contexts: { nextjs: { router_path: "/decks/[id]/page", request_path: "/decks/3f2a" } }, tags: { kept: "yes" } }));
    expect(out.tags).toEqual({ kept: "yes", app: "the-99", route: "/decks/[id]" });
  });

  it("reads Next's route FILE as its pattern: groups and page or route dropped, the request's path when it is no route", () => {
    const route = (router_path: string, request_path = "/x") => tagEvent(event({ contexts: { nextjs: { router_path, request_path } } })).tags?.route;
    expect(route("/decks/page")).toBe("/decks");
    expect(route("/commanders/(list)/page")).toBe("/commanders");
    expect(route("/page")).toBe("/");
    expect(route("/api/health/route")).toBe("/api/health");
    expect(route("/no/such/page", "/decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b")).toBe("/decks/[id]");
  });

  it("reads the route from the request's path, never the URL itself", () => {
    const out = tagEvent(event({ request: { url: "https://the-99.dev/friend/SECRET?x=1" } }));
    expect(out.tags?.route).toBe("/friend/[token]");
    expect(JSON.stringify(out.tags)).not.toContain("SECRET");
  });

  it("reads the address bar's path in the browser", () => {
    window.history.replaceState(null, "", "/decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b");
    expect(tagEvent(event()).tags).toEqual({ app: "the-99", route: "/decks/[id]" });
  });
});
