import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cardMarkCopy } from "../../lib/copy/card-mark";
import { EDGE_PX, FactTooltip, MAX_BUBBLE_PX, OPEN_DELAY_MS, placeBubble, ROOM_ABOVE_PX } from "./fact-tooltip";

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
    // the parent, the coarse branch merely stops drawing the wrapper while both survive.
    const media = livePointer(true);
    render(<FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>);

    fireEvent.pointerEnter(screen.getByTestId("mark"));
    await waitFor(
      () => expect(screen.getByText(cardMarkCopy.tooltip.gameChanger)).toBeTruthy(),
      { timeout: OPEN_DELAY_MS + 400 },
    );

    // Mouse unplugged while the tooltip is OPEN.
    await act(async () => { media.set(false); });
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();

    // Plugged back in: the child remounts with fresh state, so nothing is open until the
    // pointer enters again.
    await act(async () => { media.set(true); });
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();
  });

  it("drops a timer that was still pending when the pointer went coarse", async () => {
    // THE OTHER HALF, and the first version of this file did not reach it: after a `waitFor`
    // the 400ms timer has already fired, so asserting again afterwards only restates the
    // previous line and would hold on a build where a pending timer DOES fire into the coarse
    // branch. The timer has to still be in flight at the transition.
    const media = livePointer(true);
    render(<FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>);

    fireEvent.pointerEnter(screen.getByTestId("mark"));
    // Deliberately do NOT wait for it to open — the timer is armed and has not fired.
    await act(async () => { media.set(false); });

    // Past the delay the armed timer would have fired at, still coarse.
    await new Promise((r) => setTimeout(r, OPEN_DELAY_MS + 200));
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();

    // And back to fine: a surviving timer would open a tooltip nobody pointed at.
    await act(async () => { media.set(true); });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(cardMarkCopy.tooltip.gameChanger)).toBeNull();
  });
});

// The bubble is absolute inside its mark, so a scroller around the mark clips whatever leaves
// its box. Two hosts draw marks in one — the quick-add results and the top-off list — and on
// the first row there the bubble drawn ABOVE was cut off. jsdom lays nothing out, so the
// geometry is stated: the scroller's top edge, and the mark's.
describe("FactTooltip — the side it opens on", () => {
  function mount(markTop: number) {
    pointer(true);
    render(
      <div data-testid="scroller" style={{ overflowY: "auto" }}>
        <FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>
      </div>,
    );
    const scroller = screen.getByTestId("scroller");
    const anchor = screen.getByTestId("mark").parentElement as HTMLElement;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ top: 100, left: 0, right: 1300 } as DOMRect);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({ top: markTop, left: 600, width: 16 } as DOMRect);
    fireEvent.pointerEnter(screen.getByTestId("mark"));
  }
  const bubble = () => screen.getByText(cardMarkCopy.tooltip.gameChanger);

  it("opens below a mark too near the top of the box that would clip it", async () => {
    mount(100 + 23);
    await waitFor(() => expect(bubble()).toHaveAttribute("data-side", "below"), {
      timeout: OPEN_DELAY_MS + 500,
    });
  });

  it("opens above when the room is there", async () => {
    mount(100 + ROOM_ABOVE_PX + 1);
    await waitFor(() => expect(bubble()).toHaveAttribute("data-side", "above"), {
      timeout: OPEN_DELAY_MS + 500,
    });
  });
});

// ACROSS, as well as up and down. The bubble is centred on its mark, and a mark near the left
// or right edge of whatever clips it cannot be centred without crossing that edge — which the
// combo clause's lemniscate is, since it LEADS its line: on the quick-add results the bubble
// began 17px past the scroller's edge. jsdom lays nothing out, so the geometry is stated.
describe("FactTooltip — where it sits across its mark", () => {
  function mount(markLeft: number) {
    pointer(true);
    render(
      <div data-testid="scroller" style={{ overflowY: "auto" }}>
        <FactTooltip fact="gameChanger"><i data-testid="mark" /></FactTooltip>
      </div>,
    );
    const scroller = screen.getByTestId("scroller");
    const anchor = screen.getByTestId("mark").parentElement as HTMLElement;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ top: 0, left: 100, right: 900 } as DOMRect);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({ top: 400, left: markLeft, width: 16 } as DOMRect);
    fireEvent.pointerEnter(screen.getByTestId("mark"));
  }
  const bubble = () => screen.getByText(cardMarkCopy.tooltip.gameChanger);
  const wait = { timeout: OPEN_DELAY_MS + 500 };

  it("aligns to the left edge when the mark is too near it to centre", async () => {
    mount(100 + 20);
    await waitFor(() => expect(bubble()).toHaveAttribute("data-align", "start"), wait);
  });

  it("aligns to the right edge when the mark is too near that one", async () => {
    mount(900 - 30);
    await waitFor(() => expect(bubble()).toHaveAttribute("data-align", "end"), wait);
  });

  it("centres when there is room either side", async () => {
    mount(100 + MAX_BUBBLE_PX / 2 + EDGE_PX + 10);
    await waitFor(() => expect(bubble()).toHaveAttribute("data-align", "center"), wait);
  });
});

// THE GEOMETRY ITSELF, from the numbers the browser measured. jsdom lays nothing out, so the
// component cases above can only state the mark's and the box's rects; these state all three.
describe("placeBubble", () => {
  const fits = (p: ReturnType<typeof placeBubble>, mark: { left: number }, w: number, box: { left: number; right: number }) =>
    mark.left + p.left >= box.left + EDGE_PX - 0.5 && mark.left + p.left + w <= box.right - EDGE_PX + 0.5;

  // The collection grid tile: `overflow-hidden`, 178px wide at 1300 (96 to 274), and a mark near
  // its left. A 220px bubble in it was cut 53px on the right whatever it was aligned to.
  it("is never wider than the box that clips it, and lands inside it", () => {
    const box = { top: 307, left: 96, right: 274 };
    const mark = { top: 560, left: 107, width: 16 };
    const p = placeBubble(mark, { width: 0, height: 0 }, box);
    expect(p.maxWidth).toBe(274 - 96 - 2 * EDGE_PX);
    expect(fits(p, mark, p.maxWidth, box)).toBe(true);
  });

  // The quick-add results: the lemniscate LEADS its line, so a centred bubble crossed the left.
  it("clamps a bubble centred past the left edge back inside", () => {
    const box = { top: 666, left: 62, right: 1300 };
    const mark = { top: 690, left: 147, width: 16 };
    const p = placeBubble(mark, { width: 220, height: 48 }, box);
    expect(p.align).toBe("start");
    expect(fits(p, mark, 220, box)).toBe(true);
  });

  it("clamps one centred past the right edge back inside", () => {
    const box = { top: 0, left: 0, right: 500 };
    const mark = { top: 300, left: 480, width: 16 };
    const p = placeBubble(mark, { width: 220, height: 48 }, box);
    expect(p.align).toBe("end");
    expect(fits(p, mark, 220, box)).toBe(true);
  });

  it("stays centred on its mark when there is room", () => {
    const box = { top: 0, left: 0, right: 1300 };
    const mark = { top: 300, left: 600, width: 16 };
    const p = placeBubble(mark, { width: 220, height: 48 }, box);
    expect(p.align).toBe("center");
    expect(p.left).toBe(8 - 110);
  });

  // A sentence wrapped to three lines by a narrow cap is TALLER than the two-line estimate, and
  // the flip below has to use the height it actually has.
  it("opens below on its measured height, not a two-line guess", () => {
    const box = { top: 100, left: 0, right: 1300 };
    const mark = { top: 100 + 60, left: 600, width: 16 };
    expect(placeBubble(mark, { width: 170, height: 48 }, box).below).toBe(false);
    expect(placeBubble(mark, { width: 170, height: 64 }, box).below).toBe(true);
  });
});
