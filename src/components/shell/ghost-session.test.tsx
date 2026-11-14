// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  isLoaded: true,
  user: null as unknown,
  sessions: 0 as number | null,
  signOut: vi.fn(async () => undefined),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: m.isLoaded, user: m.user }),
  useClerk: () => ({ client: m.sessions === null ? undefined : { sessions: { length: m.sessions } }, signOut: m.signOut }),
}));

import { GHOST_KEY, GhostSession } from "./ghost-session";

const replace = vi.fn();
beforeEach(() => {
  m.isLoaded = true;
  m.user = null;
  m.sessions = 0;
  m.signOut = vi.fn(async () => undefined);
  replace.mockReset();
  window.sessionStorage.clear();
  Object.defineProperty(window, "location", { value: { ...window.location, replace }, writable: true, configurable: true });
});
afterEach(cleanup);

describe("GhostSession", () => {
  it("signs the browser out and goes to the signed-out landing when the server drew a session Clerk no longer has", async () => {
    render(<GhostSession />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(m.signOut).toHaveBeenCalledTimes(1);
  });

  it("goes to the landing even when Clerk has nothing left to sign out", async () => {
    m.signOut = vi.fn(async () => {
      throw new Error("no session");
    });
    render(<GhostSession />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("does nothing for a reader Clerk knows", async () => {
    m.user = { id: "user_1" };
    m.sessions = 1;
    render(<GhostSession />);
    await Promise.resolve();
    expect(m.signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does nothing until Clerk has loaded, or without a client to say there is no session", async () => {
    m.isLoaded = false;
    render(<GhostSession />);
    cleanup();
    m.isLoaded = true;
    m.sessions = null;
    render(<GhostSession />);
    await Promise.resolve();
    expect(m.signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes once a minute at most, so a cookie that will not go cannot loop the page", async () => {
    window.sessionStorage.setItem(GHOST_KEY, String(Date.now() - 5_000));
    render(<GhostSession />);
    await Promise.resolve();
    expect(m.signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    cleanup();
    window.sessionStorage.setItem(GHOST_KEY, String(Date.now() - 120_000));
    render(<GhostSession />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
