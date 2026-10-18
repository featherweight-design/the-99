import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { useDialogA11y, visibleFocusables } from "../../lib/a11y/dialog";
import { HELP_STOP_ID, helpStop, useCardDetailsUp, usePanelIsBeside } from "../../lib/a11y/help-over-dialog";
import type { EntryPayload } from "../../lib/about/entries-payload";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import { TargetsProvider } from "../discovery/targets-provider";
import { useIsDesktop } from "../ui/use-is-desktop";
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

/** Card details as it wires the two hooks: modal, trapping, with the lifted ? as its extra stop. `back`: holding the
 *  page and a history entry, as the card modal does (the hook's default). */
function Details({ onClose, back = false }: { onClose: () => void; back?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, onClose, { lockScroll: back, extraStop: helpStop });
  useCardDetailsUp(true);
  const beside = usePanelIsBeside();
  return (
    <div data-backdrop data-beside={beside || undefined} style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      {/* Inert under the panel stacked on it, as card details is. */}
      <div ref={ref} role="dialog" aria-modal="true" aria-label="card" aria-owns={HELP_STOP_ID} inert={beside || undefined}>
        <button type="button">first</button>
        <button type="button">last</button>
      </div>
    </div>
  );
}

/** Drawn only from `md` (`desk`) or only below it, as the shell's rail and phone header are. */
function At({ desk, children }: { desk: boolean; children: ReactNode }) {
  const d = useIsDesktop();
  return <div style={d === desk ? undefined : { display: "none" }}>{children}</div>;
}

function Page({
  details,
  onClose = () => {},
  back = false,
  header = false,
}: {
  details: boolean;
  onClose?: () => void;
  back?: boolean;
  /** The shell's two ?s, each drawn at its own width; without it, the rail's alone, drawn at every width. */
  header?: boolean;
}) {
  const rail = (
    <nav data-rail>
      <HelpButton place="rail" />
    </nav>
  );
  return (
    <TargetsProvider>
      <HelpRoot on>
        {header ? (
          <>
            <At desk>{rail}</At>
            <At desk={false}>
              <header>
                <HelpButton place="header" />
              </header>
            </At>
          </>
        ) : (
          rail
        )}
        {details && <Details onClose={onClose} back={back} />}
      </HelpRoot>
    </TargetsProvider>
  );
}

const q = () => screen.getByRole("button", { name: helpPanelCopy.button });
const named = (name: string) => screen.getByRole("button", { name });
const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });
/** Lets a dialog's history release (a task, then its self-pop) land, so no pop is still owed to the next case. */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
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
    // Named by card details' aria-owns: inside the modal's accessibility tree.
    expect(q().id).toBe(HELP_STOP_ID);
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
    expect(panel.className).toContain("z-[52]");
    // Card details gives the panel its room, so the panel opens beside it.
    expect(document.querySelector("[data-backdrop]")?.hasAttribute("data-beside")).toBe(true);
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
    expect(document.querySelector("[data-backdrop]")?.hasAttribute("data-beside")).toBe(false);
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

  it("keeps the card under the panel when the window narrows to the sheet", async () => {
    const view = stubViewport(1300);
    render(<Page details />);
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    act(() => view.resizeTo(390));
    const sheet = await screen.findByRole("dialog", { name: helpPanelCopy.button });
    await waitFor(() => expect(sheet.getAttribute("data-help-panel")).toBe("sheet"));
    expect(sheet.className).toContain("z-[52]");
    expect(document.querySelector("[data-help-scrim]")?.className).toContain("z-[51]");
    expect(document.querySelector("[data-backdrop]")?.hasAttribute("data-beside")).toBe(true);
  });

  it("leaves a card opened over the open panel in front, holding focus and keys", async () => {
    const view = stubViewport(1300);
    const onClose = vi.fn();
    const { rerender } = render(<Page details={false} onClose={onClose} />);
    fireEvent.click(q());
    const panel = await screen.findByRole("dialog", { name: helpPanelCopy.button });
    rerender(<Page details onClose={onClose} />);
    expect(panel.getAttribute("aria-modal")).toBe("false");
    // Under the card's backdrop, and the card does not give the panel its room.
    expect(panel.className).toContain("z-[49]");
    expect(document.querySelector("[data-backdrop]")?.hasAttribute("data-beside")).toBe(false);
    act(() => named("first").focus());
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: helpPanelCopy.button })).toBe(panel);
    // Narrowed to the sheet, the card stays in front of the panel.
    act(() => view.resizeTo(390));
    const sheet = () => screen.getByRole("dialog", { name: helpPanelCopy.button, hidden: true });
    await waitFor(() => expect(sheet().getAttribute("data-help-panel")).toBe("sheet"));
    expect(sheet().className).toContain("z-[49]");
    expect(document.querySelector("[data-help-scrim]")?.className).toContain("z-[48]");
    act(() => view.resizeTo(1300));
    // A second card, opened while the panel is still open, is in front too.
    rerender(<Page details={false} onClose={onClose} />);
    rerender(<Page details onClose={onClose} />);
    expect(panel.getAttribute("aria-modal")).toBe("false");
  });

  // PR #2040 round 7: the panel at 1280 holds no history entry; narrowed to the sheet under a card opened over it, it
  // took one above the card's, so Back closed the hidden sheet and left the card in front.
  it("leaves Back to the card in front after the window narrows to the sheet, then Back closes the sheet", async () => {
    const view = stubViewport(1300);
    const onClose = vi.fn();
    const { rerender } = render(<Page details={false} onClose={onClose} back />);
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    rerender(<Page details onClose={onClose} back />);
    act(() => view.resizeTo(390));
    const sheet = () => screen.queryByRole("dialog", { name: helpPanelCopy.button, hidden: true });
    await waitFor(() => expect(sheet()?.getAttribute("data-help-panel")).toBe("sheet"));
    await settle();
    act(() => window.history.back());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(sheet()).not.toBeNull();
    // The card closes; the sheet now holds the top entry, and the next Back is its.
    rerender(<Page details={false} onClose={onClose} back />);
    await settle();
    expect(sheet()).not.toBeNull();
    act(() => window.history.back());
    await waitFor(() => expect(sheet()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
    await settle();
  });

  it("keeps the sheet's entry under a card opened over it at 390, so Back closes the card first", async () => {
    stubViewport(390);
    const onClose = vi.fn();
    const { rerender } = render(<Page details={false} onClose={onClose} back />);
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    const back = vi.spyOn(window.history, "back");
    rerender(<Page details onClose={onClose} back />);
    await settle();
    // The sheet kept its entry: it took nothing back off the history as the card opened over it.
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
    act(() => window.history.back());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog", { name: helpPanelCopy.button, hidden: true })).not.toBeNull();    cleanup();
    await settle();
  });

  // PR #2040 round 7: help stacked over a card, the window narrowed below `md`, then help closed. Focus went back to the
  // rail's ?, which is not drawn there, and fell to the body. The header's ? is drawn but under the card, outside its
  // modal, so focus goes into the card left up.
  it("hands focus into the card left up when help, stacked over it, closes after the window narrows", async () => {
    const view = stubViewport(1300);
    render(<Page details header />);
    // A press focuses the ?, as a browser's does, so the panel's capture at open reads it rather than the card.
    act(() => q().focus());
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    act(() => view.resizeTo(390));
    await waitFor(() => expect(screen.getByRole("dialog", { name: helpPanelCopy.button }).getAttribute("data-help-panel")).toBe("sheet"));
    fireEvent.click(screen.getByRole("button", { name: helpPanelCopy.close }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: helpPanelCopy.button })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(named("first")));
    await settle();
  });

  it("hands focus to the ? drawn at the new width when the sheet closes after the window narrows", async () => {
    const view = stubViewport(1300);
    render(<Page details={false} header />);
    fireEvent.click(q());
    await screen.findByRole("dialog", { name: helpPanelCopy.button });
    act(() => view.resizeTo(390));
    await waitFor(() => expect(screen.getByRole("dialog", { name: helpPanelCopy.button }).getAttribute("data-help-panel")).toBe("sheet"));
    fireEvent.click(screen.getByRole("button", { name: helpPanelCopy.close }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: helpPanelCopy.button })).toBeNull());
    expect(document.activeElement).toBe(q());
    expect(q().getAttribute("data-help-button")).toBe("header");
    await settle();
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
