import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ userId: null as string | null }));
class Redirect extends Error {}
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: m.userId }) }));
vi.mock("../../../components/sign-in/sign-in-flow", () => ({ SignInFlow: () => null }));
vi.mock("../../../components/sign-in/sso-callback", () => ({ SsoCallback: () => null }));

import { SignInFlow } from "../../../components/sign-in/sign-in-flow";
import { SsoCallback } from "../../../components/sign-in/sso-callback";
import SignInPage, { metadata } from "./page";
import SsoCallbackPage, { metadata as callbackMetadata } from "../../sso-callback/page";

const visit = async (query: Record<string, string> = {}) =>
  (await SignInPage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement<{ googleRefused: boolean; googleCode: boolean }> }>;

beforeEach(() => {
  m.userId = null;
});

describe("/sign-in/new and /sso-callback", () => {
  it("are kept out of search, both", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(callbackMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("sends a reader already signed in Home", async () => {
    m.userId = "user_1";
    await expect(visit()).rejects.toThrow(new Redirect("/"));
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

  it("the callback page draws the callback", () => {
    const page = SsoCallbackPage() as ReactElement<{ children: ReactElement }>;
    expect(page.props.children.type).toBe(SsoCallback);
  });
});
