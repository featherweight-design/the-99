import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
