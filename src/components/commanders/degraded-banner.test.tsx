import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedBanner } from "./degraded-banner";
import { availabilityCopy } from "../../lib/copy/availability";

// Every assertion counts two matches: the banner ships a mobile and a desktop
// branch, both always in the DOM, with visibility left to Tailwind.
describe("DegradedBanner", () => {
  // The synergy variant is the shipped banner, and its four strings are NOT
  // sourced from the availability copy block: the two widths carry different
  // body copy, and the mobile button reads `Retry` where the copy block says
  // `Retry now`. Reading them from the block would change shipped mobile text
  // as a side effect of this ticket.
  it("keeps the shipped synergy copy unchanged", () => {
    render(<DegradedBanner />);
    expect(screen.getAllByText("Synergy data unavailable")).toHaveLength(2);
    // Both bodies pinned, not just the heading: they are the strings this ticket
    // most easily breaks, since the temptation is to source them from the block.
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
