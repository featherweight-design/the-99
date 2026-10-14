import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedBanner } from "./degraded-banner";
import { availabilityCopy } from "../../lib/copy/availability";

// Every assertion counts two matches: the banner ships a mobile and a desktop
// branch, both always in the DOM, with visibility left to Tailwind.
describe("DegradedBanner", () => {
  // The synergy variant's four strings are NOT sourced from the availability
  // copy block: the two widths carry different body copy, and the mobile button
  // reads `Retry` where the copy block says `Retry now`. This pins the literal,
  // width-specific wording each width draws.
  it("pins the synergy variant's literal, width-specific copy", () => {
    render(<DegradedBanner />);
    expect(screen.getAllByText("Synergy data unavailable")).toHaveLength(2);
    // Both bodies pinned, not just the heading: sourcing them from the block
    // would make the two widths read the same.
    expect(
      screen.getByText(
        "EDHREC is unreachable, so scores count only your cards and the roles they fill.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "EDHREC is unreachable, so fit scores count only your cards and the roles they fill. Synergy details come back when it does.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Retry now" })).toHaveLength(1);
  });

  // The banner is raised when ANY row is degraded, so when only some are the
  // sentence says "some" rather than claiming the whole ranking fell back.
  it("says some scores when only some commanders lost their synergy data", () => {
    render(<DegradedBanner partial />);
    expect(
      screen.getByText(
        "EDHREC is unreachable, so some scores count only your cards and the roles they fill.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "EDHREC is unreachable, so some fit scores count only your cards and the roles they fill. Synergy details come back when it does.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "EDHREC is unreachable, so scores count only your cards and the roles they fill.",
      ),
    ).toBeNull();
  });

  it("keeps the all-degraded wording when every commander lost it", () => {
    render(<DegradedBanner partial={false} />);
    expect(
      screen.getByText(
        "EDHREC is unreachable, so scores count only your cards and the roles they fill.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/some scores|some fit scores/)).toBeNull();
  });

  it("scopes the folded banner the same way", () => {
    const { unmount } = render(<DegradedBanner variant="both" partial />);
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSomeSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.degraded.bodyWithSynergy)).toBeNull();
    unmount();
    render(<DegradedBanner variant="both" />);
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.degraded.bodyWithSomeSynergy)).toBeNull();
  });

  it("says what is unavailable when the deck read failed", () => {
    render(<DegradedBanner variant="availability" />);
    expect(screen.getAllByText(availabilityCopy.degraded.heading)).toHaveLength(2);
    expect(screen.getAllByText(availabilityCopy.degraded.body)).toHaveLength(2);
  });

  // Two failures, one banner. Stacking them would put two Retry buttons on the
  // page for what is, to the player, a single "try again".
  it("folds both failures into one banner", () => {
    render(<DegradedBanner variant="both" />);
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText("Synergy data unavailable")).toBeNull();
  });

  // The heading is the availability one in both new variants, because that is
  // the failure the player can act on: EDHREC being down changes no control.
  it("heads both variants with the deck-read failure", () => {
    render(<DegradedBanner variant="both" />);
    expect(screen.getAllByText(availabilityCopy.degraded.heading)).toHaveLength(2);
  });

  // `Retry now` is the copy block's string and already the shipped desktop
  // label, so the new variants use it at both widths.
  it("offers one retry per width in every variant", () => {
    render(<DegradedBanner variant="availability" />);
    expect(
      screen.getAllByRole("button", { name: availabilityCopy.degraded.retry }),
    ).toHaveLength(2);
  });
});
