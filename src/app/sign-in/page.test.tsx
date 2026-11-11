import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ userId: null as string | null, host: "the99.test" }));
class Redirect extends Error {
  constructor(readonly to: string, readonly permanent = false) {
    super(`${permanent ? "308" : "307"} ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Redirect(to); },
  permanentRedirect: (to: string) => { throw new Redirect(to, true); },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: m.host }) }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: m.userId }) }));
vi.mock("../../components/sign-in/sign-in-flow", () => ({ SignInFlow: () => null }));
vi.mock("../../components/sign-in/sso-callback", () => ({ SsoCallback: () => null }));

import { SignInFlow } from "../../components/sign-in/sign-in-flow";
import { SsoCallback } from "../../components/sign-in/sso-callback";
import SignInPage, { metadata } from "./page";
import OldSignInPage from "./new/page";
import SignInTasksPage, { metadata as tasksMetadata } from "./tasks/[[...task]]/page";
import SsoCallbackPage, { metadata as callbackMetadata } from "../sso-callback/page";

type FlowProps = { landing: string; googleRefused: boolean; googleCode: boolean };
type Query = Record<string, string | string[]>;
const visit = async (query: Query = {}) =>
  (await SignInPage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement<FlowProps> }>;

beforeEach(() => {
  m.userId = null;
  m.host = "the99.test";
});

describe("/sign-in and /sso-callback", () => {
  it("are kept out of search, both", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(callbackMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("sends a reader already signed in Home, or to the safe page they were sent from", async () => {
    m.userId = "user_1";
    await expect(visit()).rejects.toThrow(new Redirect("/"));
    await expect(visit({ redirect_url: "https://the99.test/decks?x=1" })).rejects.toThrow(new Redirect("/decks?x=1"));
    await expect(visit({ redirect_url: "https://evil.com/decks" })).rejects.toThrow(new Redirect("/"));
  });

  it("draws the sign-in for a stranger, with G1's line only on ?google=refused", async () => {
    const page = await visit();
    expect(page.props.children.type).toBe(SignInFlow);
    expect(page.props.children.props.googleRefused).toBe(false);
    expect((await visit({ google: "refused" })).props.children.props.googleRefused).toBe(true);
    expect((await visit({ google: "other" })).props.children.props.googleRefused).toBe(false);
    expect(page.props.children.props.googleCode).toBe(false);
    const code = await visit({ google: "code" });
    expect(code.props.children.props.googleCode).toBe(true);
    expect(code.props.children.props.googleRefused).toBe(false);
  });

  it("hands the flow where to land: Clerk's redirect_url or forced destination made safe, else Home", async () => {
    const landing = async (query: Query) => (await visit(query)).props.children.props.landing;
    expect(await landing({})).toBe("/");
    expect(await landing({ redirect_url: "https://the99.test/collection#top" })).toBe("/collection#top");
    expect(await landing({ redirect_url: "/decks" })).toBe("/decks");
    expect(await landing({ sign_in_force_redirect_url: "https://the99.test/friend/abc", redirect_url: "/decks" })).toBe("/friend/abc");
    expect(await landing({ redirect_url: "//evil.com" })).toBe("/");
    expect(await landing({ redirect_url: "https://evil.com/" })).toBe("/");
    expect(await landing({ redirect_url: ["/decks", "/collection"] })).toBe("/");
    // The host is the request's own: the same address on another host is refused.
    m.host = "other.test";
    expect(await landing({ redirect_url: "https://the99.test/decks" })).toBe("/");
  });

  it("the callback page draws the callback, read as the invitation's only on ?from=invite", async () => {
    const callback = async (query: Query = {}) =>
      (await SsoCallbackPage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement<{ fromInvite: boolean; landing: string }> }>;
    const page = await callback();
    expect(page.props.children.type).toBe(SsoCallback);
    expect(page.props.children.props.fromInvite).toBe(false);
    expect(page.props.children.props.landing).toBe("/");
    expect((await callback({ from: "invite" })).props.children.props.fromInvite).toBe(true);
    expect((await callback({ from: "other" })).props.children.props.fromInvite).toBe(false);
  });

  it("the callback page checks the sign-in's destination again, and an invitation's new account lands Home", async () => {
    const landing = async (query: Query) =>
      ((await SsoCallbackPage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement<{ landing: string }> }>).props.children.props.landing;
    expect(await landing({ redirect_url: "/decks?x=1" })).toBe("/decks?x=1");
    expect(await landing({ redirect_url: "/%2F%2Fevil.com" })).toBe("/");
    expect(await landing({ redirect_url: "https://evil.com/x" })).toBe("/");
    expect(await landing({ from: "invite", redirect_url: "/decks" })).toBe("/");
  });
});

describe("/sign-in/new, the address before the cutover", () => {
  const old = (query: Query) => OldSignInPage({ searchParams: Promise.resolve(query) });

  // Temporary (307), never permanent: a browser caches a 308 for good, so the old address could never be used again.
  it("sends a reader on to /sign-in with a temporary redirect, keeping the query", async () => {
    await expect(old({})).rejects.toThrow(new Redirect("/sign-in"));
    await expect(old({ google: "refused", redirect_url: "/decks" })).rejects.toThrow(new Redirect("/sign-in?google=refused&redirect_url=%2Fdecks"));
    await expect(old({ google: "code" })).rejects.toThrow(new Redirect("/sign-in?google=code"));
  });
});

describe("/sign-in/tasks, a pending session's way to Clerk's hosted task page", () => {
  // `pk_test_` + base64("clerk.the99.app$"): the key names the Frontend API host, which names the Account Portal.
  const KEY = `pk_test_${Buffer.from("clerk.the99.app$").toString("base64")}`;
  const tasks = (query: Query) => SignInTasksPage({ searchParams: Promise.resolve(query) });

  it("sends the reader on to the hosted task page with the query kept, and is kept out of search", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", KEY);
    try {
      expect(tasksMetadata.robots).toEqual({ index: false, follow: false });
      await expect(tasks({ redirect_url: "https://the99.app/decks" })).rejects.toThrow(
        new Redirect("https://accounts.the99.app/sign-in/tasks?redirect_url=https%3A%2F%2Fthe99.app%2Fdecks"));
      await expect(tasks({})).rejects.toThrow(new Redirect("https://accounts.the99.app/sign-in/tasks"));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("goes Home, never back to itself, when no publishable key names the hosted page", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    try {
      await expect(tasks({ redirect_url: "/decks" })).rejects.toThrow(new Redirect("/"));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
