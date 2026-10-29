import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useUser, startAnalytics, identifyReader, resetReader } = vi.hoisted(() => ({
  useUser: vi.fn(),
  startAnalytics: vi.fn(() => Promise.resolve(null)),
  identifyReader: vi.fn(),
  resetReader: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useUser }));
vi.mock("../../lib/analytics/posthog", () => ({ startAnalytics, identifyReader, resetReader }));

import { Analytics } from "./analytics";

beforeEach(() => vi.clearAllMocks());

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

  it("identifies a signed-in reader by Clerk id and display name, never the email", () => {
    useUser.mockReturnValue({
      isLoaded: true,
      user: { id: "user_1", fullName: "Ada Lovelace", username: "ada", primaryEmailAddress: { emailAddress: "ada@example.com" } },
    });
    render(<Analytics />);
    expect(identifyReader).toHaveBeenCalledWith("user_1", "Ada Lovelace");
  });

  it("falls back to the username", () => {
    useUser.mockReturnValue({ isLoaded: true, user: { id: "user_2", fullName: null, username: "grace" } });
    render(<Analytics />);
    expect(identifyReader).toHaveBeenCalledWith("user_2", "grace");
  });

  it("resets when signed out", () => {
    useUser.mockReturnValue({ isLoaded: true, user: null });
    render(<Analytics />);
    expect(resetReader).toHaveBeenCalledTimes(1);
    expect(identifyReader).not.toHaveBeenCalled();
  });
});
