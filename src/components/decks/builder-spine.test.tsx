// The commitments roll-up (#43, design table §12): one region, at most two
// lines, red always above muted, and NO region at all when neither count fires.
//
// The spine owns it because the roll-up is a claim about the whole deck, and
// the spine is the only thing on the page that already is.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import type { StatusPill } from "../../lib/decks/status";
import { availabilityCopy } from "../../lib/copy/availability";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { BuilderSpine } from "./builder-spine";

const deck = {
  id: "d1",
  name: "Kykar, Wind's Fury",
  createdAt: new Date(),
  commander: {
    oracleId: "o-kykar",
    name: "Kykar, Wind's Fury",
    colorIdentity: ["W", "U", "R"],
    manaCost: "{2}{U}{R}{W}",
    typeLine: "Legendary Creature",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  built: 62,
  ownedCount: 54,
  toBuyCount: 8,
} as unknown as DeckDetail;

type SpineProps = Omit<
  Parameters<typeof BuilderSpine>[0],
  "deck" | "counts" | "onExport" | "status"
> & { status?: StatusPill };

// `status` defaults here and nowhere in the component: the roll-up tests below
// say nothing about it, and a default on the prop itself would let a real call
// site render a status that is not the deck's.
function mount({ status = "Building", ...props }: SpineProps) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  return render(
    <CardDetailProvider fetchCard={fetchCard}>
      <BuilderSpine
        deck={deck}
        counts={{ built: 62, ownedCount: 54, toBuyCount: 8 }}
        onExport={vi.fn()}
        status={status}
        {...props}
      />
    </CardDetailProvider>,
  );
}

const region = () => screen.queryByRole("region", { name: availabilityCopy.deckRollup.regionAria });

describe("BuilderSpine commitments roll-up", () => {
  it("renders no region at all for a deck with nothing contested", () => {
    mount({ overCommitted: 0, softClaimed: 0 });
    expect(region()).toBeNull();
  });

  it("states the shortfall without offering a dismiss or a retry", () => {
    mount({ overCommitted: 2, softClaimed: 0 });
    // Two, and exactly two: each line renders a phone band and a desktop card,
    // so an exact count is what catches a third copy sneaking in.
    expect(screen.getAllByText(availabilityCopy.deckRollup.overHeading(2))).toHaveLength(2);
    // Not an error state.
    expect(screen.queryByRole("button", { name: /dismiss|retry/i })).toBeNull();
  });

  it("leads with the red line even when the soft count is far larger", () => {
    mount({ overCommitted: 1, softClaimed: 40 });
    const text = region()?.textContent ?? "";
    const red = text.indexOf(availabilityCopy.deckRollup.overHeading(1));
    const muted = text.indexOf(availabilityCopy.deckRollup.softHeadingAfterOver(40));
    expect(red).toBeGreaterThanOrEqual(0);
    expect(muted).toBeGreaterThanOrEqual(0);
    expect(red).toBeLessThan(muted);
  });

  // The disjointness proof: "more" only appears when there is something to be more than.
  it("says 'more' only when the over-committed line is also showing", () => {
    mount({ overCommitted: 1, softClaimed: 12 });
    expect(
      screen.getAllByText(availabilityCopy.deckRollup.softHeadingAfterOver(12)),
    ).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.deckRollup.softHeading(12))).toBeNull();
  });

  it("counts on its own when nothing is over-committed", () => {
    mount({ overCommitted: 0, softClaimed: 12 });
    expect(screen.getAllByText(availabilityCopy.deckRollup.softHeading(12))).toHaveLength(2);
    // A red band that leaked through at zero would announce itself as
    // "0 cards…", so that is the exact string worth ruling out.
    expect(screen.queryByText(availabilityCopy.deckSummary.ariaLabel(0))).toBeNull();
  });

  // Row 12.9. The named body is only truthful for a single card, so the plural
  // form has its own string rather than an interpolated first name.
  it("names the card when exactly one is over-committed", () => {
    mount({
      overCommitted: 1,
      softClaimed: 0,
      overCommittedCard: { name: "Arcane Signet", deckCount: 2, ownedQty: 1 },
    });
    expect(
      screen.getAllByText(availabilityCopy.deckSummary.body("Arcane Signet", 2, 1)),
    ).toHaveLength(2);
  });

  it("falls back to the countless body when more than one is over-committed", () => {
    mount({ overCommitted: 3, softClaimed: 0 });
    expect(screen.getAllByText(availabilityCopy.deckSummary.bodyMany(3))).toHaveLength(2);
  });

  // Row 17.10. The drawn heading says "here", which means nothing to a reader
  // who arrived at the region without the page around it.
  it("spells out which deck it means for a screen reader", () => {
    mount({ overCommitted: 2, softClaimed: 0 });
    expect(screen.getAllByText(availabilityCopy.deckSummary.ariaLabel(2))).toHaveLength(2);
    for (const drawn of screen.getAllByText(availabilityCopy.deckRollup.overHeading(2))) {
      expect(drawn).toHaveAttribute("aria-hidden", "true");
    }
  });

  // The heading-alone case must not leave the body's element behind: on desktop
  // it is a flex child inside an 11px gap, so an empty one draws as trailing
  // space the mock does not have.
  it("leaves no empty element behind when the heading carries the line alone", () => {
    mount({ overCommitted: 1, softClaimed: 0 });
    const empties = [...(region()?.querySelectorAll("div") ?? [])].filter(
      (n) => n.children.length === 0 && (n.textContent ?? "") === "",
    );
    expect(empties).toHaveLength(0);
  });

  // Rows 12.7/12.8 read as a straight width split, but that generalises from the
  // one mock where both lines fire. The soft-only phone mock (A2CV:454) runs the
  // long body and so does the desktop both-lines mock (A2CV:558): the short form
  // is a phone-under-pressure form, not a phone form.
  it("keeps the full soft body on both widths when no red line is above it", () => {
    mount({ overCommitted: 0, softClaimed: 12 });
    expect(screen.getAllByText(availabilityCopy.deckRollup.softBody)).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.deckRollup.softBodyShort)).toBeNull();
  });

  it("drops the trailing clause on the phone only when it is stacking two lines", () => {
    mount({ overCommitted: 1, softClaimed: 12 });
    expect(screen.getAllByText(availabilityCopy.deckRollup.softBodyShort)).toHaveLength(1);
    expect(screen.getAllByText(availabilityCopy.deckRollup.softBody)).toHaveLength(1);
  });
});

describe("BuilderSpine header", () => {
  it("names the deck's status with the shared pill", () => {
    mount({ overCommitted: 0, softClaimed: 0, status: "To buy" });
    expect(screen.getAllByText("To buy").length).toBeGreaterThan(0);
  });

  // Rule 2 of the refresh: one filled primary per screen. The assertion reads
  // the class the bone PRIMARY sets, because a test that cannot see the fill
  // cannot enforce the rule.
  it("draws exactly one filled button", () => {
    const { container } = mount({ overCommitted: 0, softClaimed: 0 });
    expect(container.querySelectorAll(".bg-\\[color\\:var\\(--fg\\)\\]")).toHaveLength(1);
  });
});

describe("BuilderSpine after the marks", () => {
  // The marks are gone from both bands, and so is the phase LINE the desktop
  // head drew under its bar — the pill says it in a word now, and two
  // statements of one fact is what this round removes.
  it("draws no phase line and no mark at either width", () => {
    const { container } = mount({ overCommitted: 0, softClaimed: 0, status: "Draft" });
    expect(screen.queryByText("Not committed yet")).not.toBeInTheDocument();
    expect(container.querySelector("[data-deck-phase]")).toBeNull();
    for (const el of container.querySelectorAll("span")) {
      expect((el as HTMLElement).style.borderLeft).not.toBe("2px solid var(--fg)");
    }
    for (const el of container.querySelectorAll("div")) {
      expect((el as HTMLElement).style.opacity).not.toBe("0.5");
    }
  });

  // Both bands render from one mount, so a count of two is the parity check.
  it("prints the status word on both bands", () => {
    mount({ overCommitted: 0, softClaimed: 0, status: "Draft" });
    expect(screen.getAllByText("Draft")).toHaveLength(2);
  });
});
