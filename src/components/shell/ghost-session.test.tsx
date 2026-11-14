// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  isLoaded: true,
  user: null as unknown,
  sessions: 0 as number | null,
  signOut: vi.fn(async (_: unknown) => undefined),
  status: "ready",
  path: "/" as string | null,
  capture: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: m.isLoaded, user: m.user }),
  useClerk: () => ({ client: m.sessions === null ? undefined : { sessions: { length: m.sessions } }, signOut: m.signOut, status: m.status }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => m.path }));
vi.mock("@sentry/nextjs", () => ({ captureException: m.capture }));

import { GHOST_KEY, GhostSession, RECHECK_MS } from "./ghost-session";

const replace = vi.fn();
const realLocation = window.location;
/** Past the moment the answer must hold for, with every promise it started settled. */
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(RECHECK_MS + 50); });
const nothingHappened = () => {
  expect(m.signOut).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
  expect(m.capture).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.useFakeTimers();
  m.isLoaded = true;
  m.user = null;
  m.sessions = 0;
  m.status = "ready";
  m.path = "/";
  m.signOut = vi.fn(async () => undefined);
  m.capture.mockReset();
  replace.mockReset();
  window.sessionStorage.clear();
  Object.defineProperty(window, "location", { value: { ...window.location, replace }, writable: true, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(window, "location", { value: realLocation, writable: true, configurable: true });
});

describe("GhostSession", () => {
  it("signs the browser out and goes to the signed-out landing when the server drew a session Clerk no longer has, and reports it", async () => {
    render(<GhostSession />);
    await settle();
    expect(m.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    expect(replace).toHaveBeenCalledWith("/");
    expect(m.capture).toHaveBeenCalledTimes(1);
  });

  it("waits for the answer to hold: not before the moment is up", async () => {
    render(<GhostSession />);
    await act(async () => { await vi.advanceTimersByTimeAsync(RECHECK_MS - 100); });
    nothingHappened();
  });

  it("goes to the landing even when Clerk has nothing left to sign out", async () => {
    m.signOut = vi.fn(async () => {
      throw new Error("no session");
    });
    render(<GhostSession />);
    await settle();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does nothing for a reader Clerk knows", async () => {
    m.user = { id: "user_1" };
    m.sessions = 1;
    render(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it("does nothing right after a sign-in, while Clerk's client has not caught up with the server's cookie: the answer is gone when looked at again", async () => {
    const { rerender } = render(<GhostSession />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    m.user = { id: "user_1" };
    m.sessions = 1;
    rerender(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it("does nothing while Clerk has not loaded, offline or blocked, or without a client to say there is no session", async () => {
    m.isLoaded = false;
    render(<GhostSession />);
    await settle();
    nothingHappened();
    cleanup();
    m.isLoaded = true;
    m.sessions = null;
    render(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it("does nothing while Clerk is degraded or failed, whatever its client says", async () => {
    m.status = "degraded";
    render(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it.each(["/sign-in", "/sign-in/tasks/setup-mfa", "/sign-up", "/sso-callback"])("stays off %s, where a sign-in is being made", async (path) => {
    m.path = path;
    render(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it("leaves a reader who signs out while the page is open to the menu's own sign-out", async () => {
    m.user = { id: "user_1" };
    m.sessions = 1;
    const { rerender } = render(<GhostSession />);
    await settle();
    m.user = null;
    m.sessions = 0;
    rerender(<GhostSession />);
    await settle();
    nothingHappened();
  });

  it("goes once a minute at most, so a cookie that will not go cannot loop the page", async () => {
    window.sessionStorage.setItem(GHOST_KEY, String(Date.now() - 5_000));
    render(<GhostSession />);
    await settle();
    nothingHappened();
    cleanup();
    window.sessionStorage.setItem(GHOST_KEY, String(Date.now() - 120_000));
    render(<GhostSession />);
    await settle();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
