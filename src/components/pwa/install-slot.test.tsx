import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstallSlot } from "./install-slot";
import { pwaInstallCopy as copy } from "../../lib/copy/pwa-install";
import { DISMISSAL_KEY } from "../../lib/pwa/install-dismissal";
import { removeRaw } from "../ui/local-store";

const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function as(ua: string, standalone = false) {
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: standalone, addEventListener() {}, removeEventListener() {} });
}

function offerInstall() {
  const prompt = vi.fn(async () => {});
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    platforms: ["web"],
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { prompt, event };
}

beforeEach(() => removeRaw(DISMISSAL_KEY));
afterEach(cleanup);

describe("InstallSlot", () => {
  it("draws nothing until the browser offers an install, then holds the offer and shows it on a press", async () => {
    as(ANDROID);
    render(<InstallSlot />);
    expect(screen.queryByRole("button", { name: copy.slotAria })).toBeNull();
    const { prompt, event } = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.slotAria }));
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    // An offer is good once: the slot goes.
    expect(screen.queryByRole("button", { name: copy.slotAria })).toBeNull();
  });

  it("takes an offer that arrived before it mounted", async () => {
    as(ANDROID);
    const prompt = vi.fn(async () => {});
    window.__the99InstallPrompt = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    // Strict Mode replays the mount effect, and the replay must not drop the offer the first took.
    render(
      <StrictMode>
        <InstallSlot />
      </StrictMode>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.slotAria }));
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(window.__the99InstallPrompt).toBeUndefined();
  });

  it("on iPhone Safari, with no offer to hold, opens the how-to sheet and Got it closes it", () => {
    as(IPHONE);
    render(
      <main>
        <header>
          <InstallSlot />
        </header>
      </main>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.slotAria }));
    const sheet = screen.getByRole("dialog", { name: copy.sheet.ariaLabel });
    // Out of the phone header (hidden from md up, which a sideways iPhone can cross) and out of
    // <main> (inert while a navigation is pending).
    expect(sheet.closest("header")).toBeNull();
    expect(sheet.closest("main")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: copy.sheet.done }));
    expect(screen.queryByRole("dialog", { name: copy.sheet.ariaLabel })).toBeNull();
  });

  it("goes for 30 days when dismissed, and stays gone on the next visit", () => {
    as(IPHONE);
    render(<InstallSlot />);
    fireEvent.click(screen.getByRole("button", { name: copy.dismissAria }));
    expect(screen.queryByRole("button", { name: copy.slotAria })).toBeNull();
    cleanup();
    render(<InstallSlot />);
    expect(screen.queryByRole("button", { name: copy.slotAria })).toBeNull();
  });

  it("draws nothing once the app is installed", () => {
    as(IPHONE, true);
    render(<InstallSlot />);
    offerInstall();
    expect(screen.queryByRole("button", { name: copy.slotAria })).toBeNull();
  });
});
