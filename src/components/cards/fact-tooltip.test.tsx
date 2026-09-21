import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cardMarkCopy } from "../../lib/copy/card-mark";
import { FactTooltip, OPEN_DELAY_MS } from "./fact-tooltip";

/** jsdom has no matchMedia, so each case states the pointer it is testing. */
function pointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("pointer: fine") ? fine : false,
    media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

/**
 * A matchMedia whose `matches` can be flipped, with the listeners it was given.
 *
 * The component reads the pointer through `useSyncExternalStore`, so `subscribe` is a live
 * code path rather than a formality: a subscribe that never registers its listener passes
 * every other case here, because the initial snapshot alone decides the first render.
 */
function livePointer(initial: boolean) {
  const listeners = new Set<() => void>();
  let matches = initial;
  vi.stubGlobal("matchMedia", (q: string) => ({
    get matches() { return q.includes("pointer: fine") ? matches : false; },
    media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    dispatchEvent: vi.fn(),
  }));
  return {
    set(next: boolean) { matches = next; listeners.forEach((fn) => fn()); },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("FactTooltip", () => {
  it("renders nothing of its own under a coarse pointer", async () => {
    // The rule the retired deck-status marks bought: the tooltip is an enhancement, so a
    // phone must lose it and lose nothing — the key and the modal carry the vocabulary.
    pointer(false);
    render(<FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>);
    fireEvent.pointerEnter(screen.getByTestId("mark"));
    // WAIT PAST THE OPEN DELAY before asserting absence. Checking immediately reads
    // "absent" whether or not the pointer gate exists — the 400ms timer has not fired
    // yet either way — so the test passed with the gate deleted and measured nothing.
    await new Promise((r) => setTimeout(r, OPEN_DELAY_MS + 150));
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();
  });

  it("opens on hover under a fine pointer, and closes on leave", async () => {
    pointer(true);
    render(<FactTooltip fact="massLandDenial"><i data-testid="mark" /></FactTooltip>);
    expect(screen.queryByText(cardMarkCopy.tooltip.massLandDenial)).toBeNull();
    fireEvent.pointerEnter(screen.getByTestId("mark"));
    await waitFor(() => expect(screen.getByText(cardMarkCopy.tooltip.massLandDenial)).toBeTruthy(), {
      timeout: 2000,
    });
    fireEvent.pointerLeave(screen.getByTestId("mark"));
    await waitFor(() => expect(screen.queryByText(cardMarkCopy.tooltip.massLandDenial)).toBeNull());
  });

  it("says only what a MARKED card is, and never a threshold or a bracket", () => {
    // The claim limit: detection on two of the three is partial, so nothing here may
    // imply completeness, a count, or what bracket the card pushes a deck toward.
    const all = Object.values(cardMarkCopy.tooltip).join(" ").toLowerCase();
    for (const banned of ["bracket", "allowed", "limit", "too many", "no ", "none", "clean"]) {
      expect(all).not.toContain(banned);
    }
  });

  it("is aria-hidden, because the mark it wraps already speaks the fact", async () => {
    pointer(true);
    const { container } = render(
      <FactTooltip fact="extraTurns"><i data-testid="mark" /></FactTooltip>,
    );
    fireEvent.pointerEnter(screen.getByTestId("mark"));
    await waitFor(() => expect(screen.getByText(cardMarkCopy.tooltip.extraTurns)).toBeTruthy(), {
      timeout: 2000,
    });
    expect(container.querySelector("[aria-hidden]")?.textContent).toBe(
      cardMarkCopy.tooltip.extraTurns,
    );
  });

  it("turns on when a fine pointer arrives, and unsubscribes on unmount", async () => {
    // The behaviour the store buys over the mount-once read it replaced: docking a laptop to
    // a mouse now reaches the component. The old effect read once and stayed false forever.
    const media = livePointer(false);
    const view = render(<FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>);

    // Subscribed, not merely rendered — a subscribe that drops its listener passes every
    // other case in this file, because the first snapshot alone decides the first render.
    expect(media.listenerCount()).toBe(1);

    await act(async () => { media.set(true); });

    fireEvent.pointerEnter(screen.getByTestId("mark"));
    await waitFor(
      () => expect(screen.getByText(cardMarkCopy.tooltip.gameChanger)).toBeTruthy(),
      { timeout: OPEN_DELAY_MS + 400 },
    );

    // The teardown React owns. A leaked listener on a module-level media query outlives every
    // deck row that ever drew a mark.
    view.unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it("does not come back already open after a fine to coarse to fine round trip", async () => {
    // Reachable ONLY because the pointer is now reactive. With `open` and the timer held in
    // the parent, the coarse branch merely stops drawing the wrapper while both survive, so
    // the tooltip reappears with no pointerenter and a timer armed before the change can
    // still fire into the coarse branch.
    const media = livePointer(true);
    render(<FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>);

    fireEvent.pointerEnter(screen.getByTestId("mark"));
    await waitFor(
      () => expect(screen.getByText(cardMarkCopy.tooltip.gameChanger)).toBeTruthy(),
      { timeout: OPEN_DELAY_MS + 400 },
    );

    // Mouse unplugged while the tooltip is open.
    await act(async () => { media.set(false); });
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();

    // Plugged back in. The child remounts with fresh state, so nothing is open until the
    // pointer enters again.
    await act(async () => { media.set(true); });
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();

    // And wait past the old delay: a timer armed before the transition would land here.
    await new Promise((r) => setTimeout(r, OPEN_DELAY_MS + 150));
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();
  });
});
