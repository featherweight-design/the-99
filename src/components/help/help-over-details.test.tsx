import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { useDialogA11y, visibleFocusables } from "../../lib/a11y/dialog";
import { helpStop, useCardDetailsUp } from "../../lib/a11y/help-over-dialog";
import type { EntryPayload } from "../../lib/about/entries-payload";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import { TargetsProvider } from "../discovery/targets-provider";
import { HelpButton, HelpRoot } from "./help-root";

// The ? over card details at 1280 (discovery R2·9, readiness gap 5).

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));

const ENTRIES: EntryPayload[] = [{ id: "card-a", title: "Title card-a", caption: "First. Rest.", keys: [], screen: "card-details" }];

beforeEach(() => {
  window.history.replaceState(null, "", "/collection?card=x");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ entries: ENTRIES }) })));
  // jsdom draws nothing; the traps only step through controls that have a box.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Card details as it wires the two hooks: modal, trapping, with the lifted ? as its extra stop. */
function Details({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, onClose, { lockScroll: false, extraStop: helpStop });
  useCardDetailsUp(true);
  return (
    <div data-backdrop style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="card">
        <button type="button">first</button>
        <button type="button">last</button>
      </div>
    </div>
  );
}

function Page({ details, onClose = () => {} }: { details: boolean; onClose?: () => void }) {
  return (
    <TargetsProvider>
      <HelpRoot on>
        <nav data-rail>
          <HelpButton place="rail" />
        </nav>
        {details && <Details onClose={onClose} />}
      </HelpRoot>
    </TargetsProvider>
  );
}

const q = () => screen.getByRole("button", { name: helpPanelCopy.button });
const named = (name: string) => screen.getByRole("button", { name });
const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });
const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

describe("the ? over card details at 1280", () => {
  it("leaves the rail for a layer above the backdrop, keeping its slot", () => {
    stubViewport(1300);
    const { container, rerender } = render(<Page details={false} />);
    expect(q().closest("[data-rail]")).not.toBeNull();
    rerender(<Page details />);
    expect(q().closest("[data-rail]")).toBeNull();
    expect(q().parentElement).toBe(document.body);
    expect(q().style.position).toBe("fixed");
    expect(q().style.zIndex).toBe("51");
    expect(container.querySelector("[data-rail] > span[aria-hidden]")).not.toBeNull();
    rerender(<Page details={false} />);
    expect(q().closest("[data-rail]")).not.toBeNull();
  });

  it("is one extra Tab stop after card details' last control", () => {
    stubViewport(1300);
    render(<Page details />);
    named("last").focus();
    tab();
    expect(document.activeElement).toBe(q());
    tab();
    expect(document.activeElement).toBe(named("first"));
    tab(true);
    expect(document.activeElement).toBe(q());
  });

  it("opens the panel as a stacked dialog holding the trap, and Escape peels one layer at a time", async () => {
    stubViewport(1300);
    const onClose = vi.fn();
    render(<Page details onClose={onClose} />);
    fireEvent.click(q());
    const panel = await screen.findByRole("dialog", { name: helpPanelCopy.button });
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.className).toContain("z-[51]");
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    // The trap is the panel's while it is open: Tab wraps inside it rather than leaving for card details or the ?.
    const own = visibleFocusables(panel);
    act(() => own[own.length - 1].focus());
    tab();
    expect(document.activeElement).toBe(own[0]);
    tab(true);
    expect(document.activeElement).toBe(own[own.length - 1]);
    escape();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: helpPanelCopy.button })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(q());
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hands focus back to the ? in the rail when card details closed under the open panel", async () => {
    stubViewport(1300);
    const { rerender } = render(<Page details />);
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    rerender(<Page details={false} />);
    const panel = screen.getByRole("dialog", { name: helpPanelCopy.button });
    // Back to the non-modal panel once nothing is under it.
    expect(panel.getAttribute("aria-modal")).toBe("false");
    act(() => panel.querySelector<HTMLElement>("button")?.focus());
    escape();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: helpPanelCopy.button })).toBeNull());
    expect(document.activeElement).toBe(q());
    expect(q().closest("[data-rail]")).not.toBeNull();
  });

  it("adds nothing at 390: the ? is not lifted and card details takes no stop", () => {
    stubViewport(390);
    render(<Page details />);
    expect(q().closest("[data-rail]")).not.toBeNull();
    expect(helpStop()).toBeNull();
    named("last").focus();
    tab();
    expect(document.activeElement).toBe(named("first"));
  });
});
