import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const setTags = vi.fn();
vi.mock("@sentry/nextjs", () => ({ setTags: (...a: unknown[]) => setTags(...a) }));

const { SentryReaderTags } = await import("./sentry-reader-tags");

describe("SentryReaderTags", () => {
  it("tags the browser's events with the reader's hash and tier, and clears the hash when signed out", () => {
    const { rerender } = render(<SentryReaderTags user="0123456789abcdef" tier="plan" />);
    expect(setTags).toHaveBeenLastCalledWith({ tier: "plan", user: "0123456789abcdef" });
    rerender(<SentryReaderTags user={null} tier="anon" />);
    expect(setTags).toHaveBeenLastCalledWith({ tier: "anon", user: undefined });
  });
});
