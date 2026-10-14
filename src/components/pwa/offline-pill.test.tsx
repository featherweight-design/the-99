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
  it("keeps one live region mounted, empty online, and fills it when the browser goes offline", () => {
    setOnline(true);
    render(<OfflinePill place="header" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.textContent).toBe("");
    act(() => setOnline(false));
    // The SAME element: an announcement is a change to a region already there.
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toContain(pwaCopy.offline.pillAria);
    expect(region.querySelector("[data-offline-pill]")?.textContent).toContain(pwaCopy.offline.pill);
    act(() => setOnline(true));
    expect(region.textContent).toBe("");
  });

  it("speaks the sentence, and keeps the dot and the short label out of the accessibility tree", () => {
    setOnline(false);
    render(<OfflinePill place="rail" />);
    const pill = screen.getByRole("status").querySelector("[data-offline-pill]")!;
    const hidden = [...pill.querySelectorAll('[aria-hidden="true"]')];
    expect(hidden).toHaveLength(2);
    expect(hidden[1]!.textContent).toBe(pwaCopy.offline.pill);
  });
});
