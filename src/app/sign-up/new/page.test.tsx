import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ userId: null as string | null }));
class Redirect extends Error {}
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: m.userId }) }));
vi.mock("../../../components/sign-up/sign-up-flow", () => ({ SignUpFlow: () => null }));

import { SignUpFlow } from "../../../components/sign-up/sign-up-flow";
import SignUpTicketPage, { metadata } from "./page";

type Props = { ticket: string | null; googleMissing: boolean };
const visit = async (query: Record<string, string | string[]> = {}) =>
  (await SignUpTicketPage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement<Props> }>;
const props = async (query: Record<string, string | string[]>) => (await visit(query)).props.children.props;

beforeEach(() => {
  m.userId = null;
});

describe("/sign-up/new", () => {
  it("is kept out of search", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("sends a reader already signed in Home", async () => {
    m.userId = "user_1";
    await expect(visit({ ticket: "tkt_1" })).rejects.toThrow(new Redirect("/"));
  });

  it("draws the sign-up with the link's ticket, or Clerk's own __clerk_ticket", async () => {
    const page = await visit({ ticket: "tkt_1" });
    expect(page.props.children.type).toBe(SignUpFlow);
    expect(page.props.children.props).toEqual({ ticket: "tkt_1", googleMissing: false });
    expect((await props({ __clerk_ticket: "tkt_2" })).ticket).toBe("tkt_2");
    expect((await props({ ticket: " tkt_3 " })).ticket).toBe("tkt_3");
  });

  it.each<Record<string, string | string[]>>([{}, { ticket: "" }, { ticket: "  " }, { ticket: ["a", "b"] }, { google: "other" }])(
    "with no ticket (%j) is the invite-only /sign-up (R1)",
    async (query) => {
      await expect(visit(query)).rejects.toThrow(new Redirect("/sign-up"));
    },
  );

  it("?google=missing draws Q6 with no ticket, whatever else the address carries", async () => {
    expect(await props({ google: "missing" })).toEqual({ ticket: null, googleMissing: true });
    expect(await props({ google: "missing", ticket: "tkt_1" })).toEqual({ ticket: null, googleMissing: true });
  });
});
