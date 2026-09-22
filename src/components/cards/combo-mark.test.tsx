import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { ComboMark } from "./combo-mark";
import { OPEN_DELAY_MS } from "./fact-tooltip";

/** Hover the glyph and wait past the shipped open delay. */
async function hover() {
  fireEvent.pointerEnter(screen.getByTestId("combo-glyph"));
}

/** The tooltip is pointer-fine only, so the media query decides whether it exists at all. */
function stubPointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("pointer: fine") ? fine : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("ComboMark", () => {
  it("draws the glyph and nothing else", () => {
    stubPointer(true);
    const { container } = render(<ComboMark partnerName="Demonic Consultation" />);
    expect(screen.getByTestId("combo-glyph")).toBeInTheDocument();
    // NO TARGET. The state is in the row's accessible name; the glyph is decoration.
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  // THE TOOLTIP NAMES ONE PARTNER, and counts the rest as what it is NOT naming — never as a
  // claim about what exists, which is the one licence a number has in this feature.
  it("names the partner, and counts only the others", async () => {
    stubPointer(true);
    const one = render(<ComboMark partnerName="Demonic Consultation" />);
    await hover();
    await waitFor(() =>
      expect(
        screen.getByText(comboAwarenessCopy.markerTooltip.ownBoth("Demonic Consultation")),
      ).toBeTruthy(),
    );
    one.unmount();

    render(<ComboMark partnerName="Demonic Consultation" otherPartners={3} />);
    await hover();
    await waitFor(() =>
      expect(
        screen.getByText(
          comboAwarenessCopy.markerTooltip.ownBothMore("Demonic Consultation", 3),
        ),
      ).toBeTruthy(),
    );
  });

  // SINGULAR AT ONE. The handoff's string is `and N others` unconditionally, so a card with
  // exactly two partners read `and 1 others` — and two is the MEDIAN shape, not an edge.
  it("says 'and 1 other', not 'and 1 others'", async () => {
    stubPointer(true);
    render(<ComboMark partnerName="Demonic Consultation" otherPartners={1} />);
    await hover();
    await waitFor(() => expect(screen.getByText(/and 1 other\./)).toBeTruthy());
    expect(screen.queryByText(/and 1 others/)).toBeNull();
  });

  // A LONE PARTNER GETS THE PLAIN SENTENCE, never `and 0 others`.
  it("does not say 'and 0 others'", async () => {
    stubPointer(true);
    render(<ComboMark partnerName="Demonic Consultation" otherPartners={0} />);
    await hover();
    await waitFor(() =>
      expect(
        screen.getByText(comboAwarenessCopy.markerTooltip.ownBoth("Demonic Consultation")),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/0 others/)).toBeNull();
  });

  // NO TOOLTIP ON TOUCH. The row's own tap opens the modal, where every partner and state is
  // listed — the behaviour the Game Changer bolt already has.
  it("draws no tooltip on a coarse pointer", async () => {
    stubPointer(false);
    render(<ComboMark partnerName="Demonic Consultation" />);
    await hover();
    // WAIT PAST THE OPEN DELAY before asserting absence: checking immediately reads "absent"
    // whether or not the pointer gate exists, which is how the shipped tooltip's own case
    // once passed with the gate deleted.
    await new Promise((r) => setTimeout(r, OPEN_DELAY_MS + 150));
    expect(screen.queryByText(/Two-card combo with/)).toBeNull();
  });
});
