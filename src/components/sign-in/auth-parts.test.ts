// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { toLanding } from "./auth-parts";

const same = (u: string) => u;

describe("toLanding", () => {
  it("moves to the destination by the router, Home by default", () => {
    const go = vi.fn();
    const load = vi.fn();
    toLanding(go, "/decks", load)({ decorateUrl: same });
    toLanding(go)({ decorateUrl: same });
    expect(go.mock.calls).toEqual([["/decks"], ["/"]]);
    expect(load).not.toHaveBeenCalled();
  });

  it("loads a decorated URL that leaves the app in full", () => {
    const go = vi.fn();
    const load = vi.fn();
    toLanding(go, "/decks", load)({ decorateUrl: (u) => `https://clerk.the99.app/v1/sync?redirect_url=${encodeURIComponent(u)}` });
    expect(load).toHaveBeenCalledWith("https://clerk.the99.app/v1/sync?redirect_url=%2Fdecks");
    expect(go).not.toHaveBeenCalled();
  });

  // A session left pending reads as signed out on every page behind the destination, so it goes to its task, in full, since
  // `/sign-in/tasks` hands it on to Clerk's hosted page.
  it("sends a session Clerk left pending on a task to the task, carrying the destination as an absolute URL", () => {
    const go = vi.fn();
    const load = vi.fn();
    toLanding(go, "/decks", load)({ session: { currentTask: { key: "reset-password" } }, decorateUrl: same });
    expect(load).toHaveBeenCalledWith(`/sign-in/tasks/reset-password?redirect_url=${encodeURIComponent(`${window.location.origin}/decks`)}`);
    expect(go).not.toHaveBeenCalled();
  });
});
