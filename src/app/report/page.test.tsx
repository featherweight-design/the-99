// /report: answers 404 while Report a problem is off for THIS reader (a signed-in reader's own switches, a signed-out
// reader's variable and app-wide override), reads `ref` and `from` as the action stores them, and picks the door.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({
  userId: null as string | null,
  requestEnv: vi.fn(async (_u: string): Promise<NodeJS.ProcessEnv> => envViewWith({})),
  resolveEnv: vi.fn(async (_u: string | null): Promise<NodeJS.ProcessEnv> => envViewWith({})),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("../../lib/auth", () => ({ currentUserId: async () => stub.userId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: stub.requestEnv }));
vi.mock("../../lib/switches/snapshot", () => ({ resolveSwitchEnv: stub.resolveEnv }));
vi.mock("../../components/feedback/report-page", () => ({ ReportPage: () => null }));

import ReportRoute from "./page";
import { ReportPage } from "../../components/feedback/report-page";
import { NEWCOMER_MAIN } from "../../components/join/newcomer-column";

const render = (q: Record<string, string | string[] | undefined> = {}) => ReportRoute({ searchParams: Promise.resolve(q) });
const pageOf = (el: ReactElement) => {
  const kids = (el.props as { children: ReactElement[] }).children;
  return kids.find((k) => k.type === ReportPage)!.props as { source: string; signedOut: boolean; digest: string | null; page: string | null };
};

beforeEach(() => {
  stub.userId = null;
  stub.requestEnv.mockReset().mockResolvedValue(envViewWith({ FEEDBACK_ENABLED: "true" }));
  stub.resolveEnv.mockReset().mockResolvedValue(envViewWith({ FEEDBACK_ENABLED: "true" }));
});

describe("/report", () => {
  it("is a 404 while the switch is off for a signed-out reader, decided with no account", async () => {
    stub.resolveEnv.mockResolvedValue(envViewWith({ FEEDBACK_ENABLED: "false" }));
    await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(stub.resolveEnv).toHaveBeenCalledWith(null);
    expect(stub.requestEnv).not.toHaveBeenCalled();
  });

  it("is a 404 while the switch is off for a signed-in reader, decided from the request's own switches", async () => {
    stub.userId = "user_1";
    stub.requestEnv.mockResolvedValue(envViewWith({ FEEDBACK_ENABLED: "false" }));
    await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(stub.requestEnv).toHaveBeenCalledWith("user_1");
    expect(stub.resolveEnv).not.toHaveBeenCalled();
  });

  it("draws the newcomer's frame for a signed-out reader, with the signed-out door and no promise of a reply", async () => {
    const el = (await render({ ref: "7f3a91c2", from: "/decks/abc?x=1" })) as ReactElement;
    expect((el.props as { className: string }).className).toBe(NEWCOMER_MAIN);
    expect(pageOf(el)).toEqual({ source: "report", signedOut: true, digest: "7f3a91c2", page: "/decks/abc" });
  });

  it("draws the same frame for a signed-in reader, who cannot claim the signed-out door", async () => {
    stub.userId = "user_1";
    const withRef = (await render({ ref: "d1" })) as ReactElement;
    expect((withRef.props as { className: string }).className).toBe(NEWCOMER_MAIN);
    expect(pageOf(withRef)).toMatchObject({ source: "error", signedOut: false, digest: "d1" });
    expect(pageOf((await render()) as ReactElement)).toMatchObject({ source: "about", signedOut: false, digest: null, page: null });
  });

  it("ignores a ref that is not a short code and a from that is not a path", async () => {
    const el = (await render({ ref: "not a code!", from: "https://evil.example/x" })) as ReactElement;
    expect(pageOf(el)).toMatchObject({ digest: null, page: null });
  });
});
