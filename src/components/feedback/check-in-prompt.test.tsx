// The Home check-in prompt (flyer trial PR 6): it asks only after the page settles, draws nothing unless the answer is
// due, tells PostHog once when it opens, and a failed ask is silence.
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const due = vi.fn();
const shown = vi.fn();
vi.mock("../../app/check-in-actions", () => ({ checkInDue: () => due(), sendCheckIn: vi.fn(), dismissCheckIn: vi.fn() }));
vi.mock("../../lib/analytics/posthog", () => ({ captureSurveyShown: () => shown() }));

import { checkInCopy as copy } from "../../lib/copy/report";
import { CHECK_IN_DELAY_MS, CheckInPrompt } from "./check-in-prompt";

beforeEach(() => {
  vi.useFakeTimers();
  due.mockReset();
  shown.mockReset();
});
afterEach(() => vi.useRealTimers());

const settle = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(CHECK_IN_DELAY_MS);
  });
};

describe("CheckInPrompt", () => {
  it("asks nothing before the page has settled", async () => {
    due.mockResolvedValue(true);
    render(<CheckInPrompt />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_IN_DELAY_MS - 1);
    });
    expect(due).not.toHaveBeenCalled();
    expect(screen.queryByText(copy.intro)).toBeNull();
  });

  it("opens the sheet when due, and tells PostHog once", async () => {
    due.mockResolvedValue(true);
    render(<CheckInPrompt />);
    await settle();
    expect(due).toHaveBeenCalledTimes(1);
    expect(screen.getByText(copy.intro)).toBeTruthy();
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it("draws nothing when not due", async () => {
    due.mockResolvedValue(false);
    render(<CheckInPrompt />);
    await settle();
    expect(screen.queryByText(copy.intro)).toBeNull();
    expect(shown).not.toHaveBeenCalled();
  });

  it("draws nothing when the ask fails", async () => {
    due.mockRejectedValue(new Error("down"));
    render(<CheckInPrompt />);
    await settle();
    expect(screen.queryByText(copy.intro)).toBeNull();
  });

  it("never asks if it unmounts before the page settles", async () => {
    due.mockResolvedValue(true);
    const { unmount } = render(<CheckInPrompt />);
    unmount();
    await settle();
    expect(due).not.toHaveBeenCalled();
  });
});
