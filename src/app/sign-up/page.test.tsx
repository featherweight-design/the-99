import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ userId: null as string | null }));
class Redirect extends Error {
  constructor(readonly to: string, readonly permanent = false) {
    super(`${permanent ? "308" : "307"} ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Redirect(to); },
  permanentRedirect: (to: string) => { throw new Redirect(to, true); },
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: m.userId }) }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: () => null }));
vi.mock("../../components/sign-up/sign-up-flow", () => ({ SignUpFlow: () => null }));

import { SignUpFlow } from "../../components/sign-up/sign-up-flow";
import { FLYER_MAIN, INVITE_MAIN } from "../../components/join/newcomer-column";
import SignUpPage, { generateMetadata } from "./page";

type Props = { ticket: string | null; googleMissing: boolean };
type Query = Record<string, string | string[]>;
type Page = ReactElement<{ className: string; children: ReactElement<Props> }>;
const visit = async (query: Query = {}) => (await SignUpPage({ searchParams: Promise.resolve(query) })) as Page;
const props = async (query: Query) => (await visit(query)).props.children.props;
const robots = async (query: Query) => (await generateMetadata({ searchParams: Promise.resolve(query) })).robots;

beforeEach(() => {
  m.userId = null;
});

describe("/sign-up", () => {
  it("sends a reader already signed in Home, with a ticket or without", async () => {
    m.userId = "user_1";
    await expect(visit({ __clerk_ticket: "tkt_1" })).rejects.toThrow(new Redirect("/"));
    await expect(visit({ google: "missing" })).rejects.toThrow(new Redirect("/"));
    await expect(visit()).rejects.toThrow(new Redirect("/"));
  });

  it("draws the sign-up with Clerk's own __clerk_ticket, the name its accept link hands back, or the link's ticket", async () => {
    const page = await visit({ __clerk_ticket: "tkt_1" });
    expect(page.props.className).toBe(FLYER_MAIN);
    expect(page.props.children.type).toBe(SignUpFlow);
    expect(page.props.children.props).toEqual({ ticket: "tkt_1", googleMissing: false });
    expect(page.props.children.key).toBe("tkt_1");
    expect((await props({ ticket: "tkt_2" })).ticket).toBe("tkt_2");
    expect((await props({ ticket: " tkt_3 " })).ticket).toBe("tkt_3");
  });

  it("?google=missing draws Q6 with no ticket, whatever else the address carries", async () => {
    const page = await visit({ google: "missing" });
    expect(page.props.children.type).toBe(SignUpFlow);
    expect(page.props.children.key).toBe("google");
    expect(page.props.children.props).toEqual({ ticket: null, googleMissing: true });
    expect(await props({ google: "missing", ticket: "tkt_1" })).toEqual({ ticket: null, googleMissing: true });
  });

  // A render, never a redirect: a redirect to /sign-up from here would send the reader to itself.
  it.each<Query>([{}, { ticket: "" }, { __clerk_ticket: "  " }, { ticket: ["a", "b"] }, { google: "other" }])(
    "with no ticket (%j) is the invite-only page (R1), drawn here",
    async (query) => {
      const page = await visit(query);
      expect(page.type).toBe("main");
      expect(page.props.className).toBe(INVITE_MAIN);
    },
  );

  it("keeps the sign-up out of search, and leaves R1 its own metadata", async () => {
    expect(await robots({ __clerk_ticket: "tkt_1" })).toEqual({ index: false, follow: false });
    expect(await robots({ google: "missing" })).toEqual({ index: false, follow: false });
    expect(await robots({})).toBeUndefined();
    expect(await robots({ ticket: "" })).toBeUndefined();
  });
});
