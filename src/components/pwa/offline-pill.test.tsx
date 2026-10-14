import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OfflinePill } from "./offline-pill";
import { pwaCopy } from "../../lib/copy/pwa";

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
  window.dispatchEvent(new Event(online ? "online" : "offline"));
}

afterEach(() => {
  cleanup();
  setOnline(true);
});

describe("OfflinePill", () => {
  it("draws nothing online, and appears and leaves with the browser's own events", () => {
    setOnline(true);
    render(<OfflinePill place="header" />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => setOnline(false));
    const pill = screen.getByRole("status");
    expect(pill).toHaveAttribute("aria-live", "polite");
    expect(pill).toHaveAttribute("aria-label", pwaCopy.offline.pillAria);
    expect(pill.textContent).toBe(pwaCopy.offline.pill);
    act(() => setOnline(true));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the dot out of the accessibility tree: color is never the only signal", () => {
    setOnline(false);
    render(<OfflinePill place="rail" />);
    expect(screen.getByRole("status").querySelector("span")).toHaveAttribute("aria-hidden", "true");
  });
});
