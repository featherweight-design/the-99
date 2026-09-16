import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CommanderRow, type CommanderRowView } from "./commander-row";
import { commanderRowCopy } from "../../lib/copy/commander-row";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { discoveryCopy } from "../../lib/copy/commander-discovery";

// The handoff's five states, and the independence that makes them five branches
// rather than a matrix: no slot reads another, so the sentence, the gap line and
// the figures are asserted separately.

const view = (over: Partial<CommanderRowView> = {}): CommanderRowView => ({
  slug: "atraxa",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  artCropUri: null,
  rank: 1,
  prose: "Atraxa decks grind value out of counters.",
  gapSlot: { kind: "unplayed", labels: ["Counters Matter", "Proliferate", "Infect"] },
  score: 58,
  measurableTotal: 100,
  deckCount: 24_012,
  price: { kind: "priced", cents: 340 },
  priceOk: true,
  href: "/commanders/atraxa",
  ...over,
});

const row = (over: Partial<CommanderRowView> = {}) => render(<CommanderRow item={view(over)} />);

describe("CommanderRow · state 1, full", () => {
  it("draws both sentences and all three figures", () => {
    row();

    expect(screen.getByText("Atraxa decks grind value out of counters.")).toBeInTheDocument();
    expect(
      screen.getByText("None of your decks play Counters Matter, Proliferate or Infect."),
    ).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(screen.getByText(discoverCopy.row.popularity(24_012))).toBeInTheDocument();
    expect(screen.getByText("$3.40")).toBeInTheDocument();
  });

  // The link's name carries the reading, so the chip's figure and denominator
  // are `aria-hidden` and nothing restates them.
  it("names the link with the score and its denominator", () => {
    row();

    expect(screen.getByRole("link").getAttribute("aria-label")).toMatch(/58.*100/);
  });
});

describe("CommanderRow · state 2, no sentence", () => {
  // UNMOUNTS. No placeholder, no reserved height, nothing synthesised and
  // nothing truncated into the gap — a null is a legitimate output of the
  // generator, not a gap to fill.
  it("draws no sentence element at all", () => {
    const { container } = row({ prose: null });

    expect(container.textContent).not.toContain("grind value");
    // The gap line is untouched by the sentence's absence: the slots are
    // independent, which is what makes these five states and not a matrix.
    expect(
      screen.getByText("None of your decks play Counters Matter, Proliferate or Infect."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});

describe("CommanderRow · the gap slot is never empty", () => {
  it.each([
    { labels: ["Aristocrats"], text: "None of your decks play Aristocrats." },
    { labels: ["Aristocrats", "Blink"], text: "None of your decks play Aristocrats or Blink." },
    {
      labels: ["Aristocrats", "Blink", "Landfall"],
      text: "None of your decks play Aristocrats, Blink or Landfall.",
    },
  ])("prints $labels.length name(s) in the right form", ({ labels, text }) => {
    row({ gapSlot: { kind: "unplayed", labels } });

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // State 4. Not congratulatory: under `Something new` this same fact is why the
  // row ranks last.
  it("states the overlap when every mechanic is already played", () => {
    row({ gapSlot: { kind: "allPlayed" } });

    expect(screen.getByText(commanderRowCopy.gap.allPlayed)).toBeInTheDocument();
  });

  // State 3, and the ruling that keeps state 4 honest: a commander with no
  // mechanic tags — including one whose every tag is a creature type — draws the
  // shipped note and NEVER `allPlayed`, which would assert something about a
  // commander with nothing on file.
  it("draws the No tag data note rather than allPlayed when there are no mechanics", () => {
    const { container } = row({ gapSlot: { kind: "noMechanics" } });

    expect(screen.getByText(discoveryCopy.untagged.heading)).toBeInTheDocument();
    expect(container.textContent).not.toContain(commanderRowCopy.gap.allPlayed);
  });
});

describe("CommanderRow · state 5, unpriced", () => {
  // The figure UNMOUNTS. No dash, no zero, no reason given — and the deck count
  // stays, because it is a different reading.
  it("omits the price and keeps the deck count", () => {
    const { container } = row({ price: { kind: "absent" } });

    expect(container.textContent).not.toContain("$");
    expect(screen.getByText(discoverCopy.row.popularity(24_012))).toBeInTheDocument();
  });

  // A FAILED READ IS NOT AN ABSENT PRICE. `absent` means the feed has never
  // carried the printing, which a lost read has no standing to claim, so the
  // figure is omitted rather than drawn — ruling D3 applied to the reading.
  it("omits the price when the read failed, even with rows in hand", () => {
    const { container } = row({ priceOk: false, price: { kind: "priced", cents: 1840 } });

    expect(container.textContent).not.toContain("$18.40");
  });

  it("draws the price when the read succeeded", () => {
    row({ priceOk: true, price: { kind: "priced", cents: 1840 } });

    expect(screen.getByText("$18.40")).toBeInTheDocument();
  });
});

describe("CommanderRow · figures", () => {
  // The row prints the denominator it was GIVEN (D4) — never a bare `40/100`.
  it("prints the measurable denominator when synergy was not measured", () => {
    row({ score: 32, measurableTotal: 40 });

    expect(
      screen.getByText(commandersCopy.row.fitDenominatorMeasurable(40)),
    ).toBeInTheDocument();
    expect(screen.queryByText(commandersCopy.row.fitDenominator)).not.toBeInTheDocument();
  });

  it("prints the full denominator when it was", () => {
    row({ score: 58, measurableTotal: 100 });

    expect(screen.getByText(commandersCopy.row.fitDenominator)).toBeInTheDocument();
  });

  // A figure with no reading is omitted, never zeroed (D3). Nobody has built it
  // is a claim an absent deck count cannot make.
  it("omits the deck count rather than printing zero", () => {
    const { container } = row({ deckCount: null });

    expect(container.textContent).not.toContain("decks tracked");
    expect(container.textContent).not.toContain("0 decks");
  });
});

describe("CommanderRow · nothing is read off ownership", () => {
  // D1. One component, two populations: every `/discover` row is unowned and
  // every `/commanders` row is owned, so a line about ownership distinguishes
  // nothing. The retired strings are asserted ABSENT rather than trusted gone,
  // because the component compiles perfectly well while still drawing them.
  it.each([
    "not in your collection",
    "in your collection",
    "new to you",
    "clears the",
    "Your closest build",
  ])("never says %s", (phrase) => {
    const { container } = row();

    expect(container.textContent?.toLowerCase()).not.toContain(phrase.toLowerCase());
  });

  it("has no control on it, so there is exactly one interactive element", () => {
    row();

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
