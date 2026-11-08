import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useUser, startAnalytics, identifyReader, resetReader, captureSignOutEvidence, isProductionHostname, clerk } = vi.hoisted(() => ({
  useUser: vi.fn(),
  startAnalytics: vi.fn(() => Promise.resolve(null)),
  identifyReader: vi.fn(),
  resetReader: vi.fn(),
  captureSignOutEvidence: vi.fn(),
  isProductionHostname: vi.fn(() => false),
  clerk: { client: { sessions: [] }, addListener: vi.fn(() => () => {}) },
}));
vi.mock("@clerk/nextjs", () => ({ useUser, useClerk: () => clerk }));
vi.mock("../../lib/analytics/posthog", () => ({
  startAnalytics, identifyReader, resetReader, captureSignOutEvidence, isProductionHostname,
}));

import { Analytics } from "./analytics";
import { PRESSED_KEY, SEEN_KEY } from "../../lib/analytics/sign-out-evidence";

beforeEach(() => {
  vi.clearAllMocks();
  isProductionHostname.mockReturnValue(false);
  window.localStorage.clear();
});

describe("Analytics", () => {
  it("starts nothing until Clerk has loaded, and renders nothing", () => {
    useUser.mockReturnValue({ isLoaded: false, user: undefined });
    const { container } = render(<Analytics />);
    expect(container.innerHTML).toBe("");
    expect(startAnalytics).not.toHaveBeenCalled();
    expect(identifyReader).not.toHaveBeenCalled();
    expect(resetReader).not.toHaveBeenCalled();
  });

  it("starts once Clerk loads, with the page hostname, and reconciles the identity in the same effect", () => {
    useUser.mockReturnValue({ isLoaded: false, user: undefined });
    const { rerender } = render(<Analytics />);
    useUser.mockReturnValue({ isLoaded: true, user: null });
    rerender(<Analytics />);
    expect(startAnalytics).toHaveBeenCalledTimes(1);
    expect(startAnalytics).toHaveBeenCalledWith(expect.objectContaining({ hostname: window.location.hostname }));
    expect(resetReader).toHaveBeenCalledTimes(1);
    expect(startAnalytics.mock.invocationCallOrder[0]).toBeLessThan(resetReader.mock.invocationCallOrder[0]);
  });

  it("identifies a signed-in reader by Clerk id alone, whatever name or email the account has", () => {
    useUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_1",
        firstName: "  Ada ",
        fullName: "Ada Lovelace",
        username: "ada",
        primaryEmailAddress: { emailAddress: "ada@example.com" },
      },
    });
    render(<Analytics />);
    expect(identifyReader).toHaveBeenCalledWith("user_1");
  });

  it("resets when signed out", () => {
    useUser.mockReturnValue({ isLoaded: true, user: null });
    render(<Analytics />);
    expect(resetReader).toHaveBeenCalledTimes(1);
    expect(identifyReader).not.toHaveBeenCalled();
  });

  describe("sign-out evidence", () => {
    const signedIn = { isLoaded: true, user: { id: "user_1" } };
    const signedOut = { isLoaded: true, user: null };

    it("reports a session that ends while the page is open, before the reset, then forgets the stamp", () => {
      isProductionHostname.mockReturnValue(true);
      useUser.mockReturnValue(signedIn);
      const { rerender } = render(<Analytics />);
      expect(window.localStorage.getItem(SEEN_KEY)).not.toBeNull();
      useUser.mockReturnValue(signedOut);
      rerender(<Analytics />);
      expect(captureSignOutEvidence).toHaveBeenCalledTimes(1);
      expect(captureSignOutEvidence).toHaveBeenCalledWith(expect.objectContaining({
        kind: "session_ended", pressedSignOut: false, clientSessions: 0,
      }));
      expect(captureSignOutEvidence.mock.invocationCallOrder[0]).toBeLessThan(resetReader.mock.invocationCallOrder[0]);
      expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
    });

    it("reports a signed-out load once, and a pressed Sign out as pressed", () => {
      isProductionHostname.mockReturnValue(true);
      window.localStorage.setItem(SEEN_KEY, String(Date.now() - 3 * 3_600_000));
      window.localStorage.setItem(PRESSED_KEY, String(Date.now()));
      useUser.mockReturnValue(signedOut);
      render(<Analytics />).unmount();
      expect(captureSignOutEvidence).toHaveBeenCalledWith(expect.objectContaining({
        kind: "signed_out_load", hoursSinceSeen: 3, pressedSignOut: true,
      }));
      render(<Analytics />);
      expect(captureSignOutEvidence).toHaveBeenCalledTimes(1);
    });

    it("sends nothing for a browser that never saw the reader signed in", () => {
      isProductionHostname.mockReturnValue(true);
      useUser.mockReturnValue(signedOut);
      render(<Analytics />);
      expect(captureSignOutEvidence).not.toHaveBeenCalled();
    });

    it("stores and sends nothing off the production hostnames", () => {
      useUser.mockReturnValue(signedIn);
      const { rerender } = render(<Analytics />);
      useUser.mockReturnValue(signedOut);
      rerender(<Analytics />);
      expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
      expect(captureSignOutEvidence).not.toHaveBeenCalled();
    });
  });
});
