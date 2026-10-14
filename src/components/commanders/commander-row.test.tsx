import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { CommanderRow, EAGER_ART_ROWS, type CommanderRowView } from "./commander-row";
import { commanderRowCopy } from "../../lib/copy/commander-row";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { discoveryCopy } from "../../lib/copy/commander-discovery";

const { price: priceCopy } = discoveryCopy;

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
  fitPool: 12,
  fitRoles: 20,
  fitSynergy: 26,
  deckCount: 24_012,
  price: { kind: "priced", cents: 340 },
  priceOk: true,
  href: "/commanders/atraxa",
  ...over,
});

const row = (over: Partial<CommanderRowView> = {}) => render(<CommanderRow item={view(over)} />);

/**
 * The gap sentence as the reader sees it: one line, mechanic names included.
 *
 * Each name is its own `<b>` now — the canvas emphasises them — so a
 * whole-string `getByText` finds nothing. Reading the paragraph's
 * `textContent` asserts the assembled sentence without asserting the runs,
 * which is the right granularity: the marking is asserted separately.
 */
function gapText(container: HTMLElement): string {
  // THE LAST paragraph, not one matched on its words. The gap slot is the last
  // `<p>` in every state — the sentence precedes it when present and the foot
  // line is not a paragraph — and matching on "decks play" only ever found the
  // `unplayed` occupant, so every assertion about the others read "" and passed
  // or failed for the wrong reason.
  const paragraphs = Array.from(container.querySelectorAll("p"));
  return paragraphs[paragraphs.length - 1]?.textContent ?? "";
}

describe("CommanderRow · state 1, full", () => {
  it("draws both sentences and all three figures", () => {
    const { container } = row();

    expect(screen.getByText("Atraxa decks grind value out of counters.")).toBeInTheDocument();
    expect(gapText(container)).toBe(
      "None of your decks play Counters Matter, Proliferate or Infect.",
    );
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(screen.getByText(discoverCopy.row.popularity(24_012))).toBeInTheDocument();
    expect(screen.getByText("$3.40")).toBeInTheDocument();
  });

  // THE NAME IS THE HALF THAT MATTERED. This link is an empty stretched box, so
  // its label is its whole accessible name — and the first version asserted
  // only `/58.*100/`, which passes on "58 out of 100 points" with no commander
  // in it. A screen reader got twenty-five links distinguished by score alone.
  it("names the link with the commander first, then the score", () => {
    row();

    const label = screen.getByRole("link").getAttribute("aria-label") ?? "";
    expect(label).toContain("Atraxa, Praetors' Voice");
    expect(label).toMatch(/58.*100/);
    expect(label.indexOf("Atraxa")).toBeLessThan(label.indexOf("58"));
  });
});

describe("CommanderRow · the name is the copy the reader owns", () => {
  // `/commanders` lists commanders the reader OWNS, and the row's wash is that copy's
  // art — so the name over it has to be the one printed on it.
  it("draws the printed name when the row carries one", () => {
    row({ name: "Iroas, God of Victory", printedName: "Freya, Queen of the Valkyries" });

    expect(screen.getByText("Freya, Queen of the Valkyries")).toBeTruthy();
    expect(screen.queryByText("Iroas, God of Victory")).toBeNull();
  });

  it("names the link with the printed name too", () => {
    row({ name: "Iroas, God of Victory", printedName: "Freya, Queen of the Valkyries" });

    expect(
      screen.getByRole("link", { name: /^Freya, Queen of the Valkyries ·/ }),
    ).toBeTruthy();
  });

  // The DISCOVER lane sets nothing here — those commanders are ones the reader does not
  // own, so there is no copy of theirs to read a name off. Absent must draw the oracle
  // name rather than an empty string.
  it("keeps the oracle name when no printed name is carried", () => {
    row();

    expect(screen.getByText("Atraxa, Praetors' Voice")).toBeTruthy();
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
    expect(gapText(container)).toBe(
      "None of your decks play Counters Matter, Proliferate or Infect.",
    );
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
    const { container } = row({ gapSlot: { kind: "unplayed", labels } });

    expect(gapText(container)).toBe(text);

    // EACH NAME IS MARKED, not merely present — the emphasis is what the line
    // is scanned for. Asserted per label, so a build that bolded the first and
    // dropped the rest fails rather than passing on the sentence alone.
    const marked = Array.from(container.querySelectorAll("b")).map((b) => b.textContent);
    for (const label of labels) expect(marked).toContain(label);

    // And the marking is the LABELS, nothing else: the eleven words around them
    // stay unmarked, which a `<b>` wrapped round the whole sentence would not.
    expect(marked).toHaveLength(labels.length);
  });

  // State 4, and it NO LONGER CLAIMS COVERAGE. It used to read "you already play
  // every mechanic this commander leans on", which measurement showed is both
  // the majority voice of both lanes and unsupportable — `played` is built from
  // each built deck's commander tag list, so a reader whose Kenrith deck is
  // Politics still has Group Hug in their played set. It names the commander's
  // own top themes instead.
  it("names the commander's top play styles rather than claiming coverage", () => {
    const { container } = row({
      gapSlot: { kind: "allPlayed", labels: ["Group Hug", "Politics", "Reanimator"], capped: true },
    });

    expect(gapText(container)).toBe(
      commanderRowCopy.gap.topStyles(["Group Hug", "Politics", "Reanimator"], true),
    );
    // The names are MARKED here too — both named states mark, so the line reads
    // the same way whichever occupant it drew.
    const marked = Array.from(container.querySelectorAll("b")).map((b) => b.textContent);
    expect(marked).toEqual(["Group Hug", "Politics", "Reanimator"]);

    // THE RETIRED CLAIM IS ABSENT, asserted rather than assumed gone: the copy
    // key is deleted, so nothing but a literal can pin it.
    expect(container.textContent).not.toContain("You already play");
  });

  // `capped` is the difference between "top three" and a plain list, and a
  // commander with exactly three has had nothing cut.
  it.each([
    { capped: true, says: "top three play styles" },
    { capped: false, says: "play styles are" },
  ])("says $says when capped is $capped", ({ capped, says }) => {
    const { container } = row({
      gapSlot: { kind: "allPlayed", labels: ["Group Hug", "Politics", "Reanimator"], capped },
    });

    expect(gapText(container)).toContain(says);
    if (!capped) expect(gapText(container)).not.toContain("top three");
  });

  // One theme is not a list. The singular lead is its own string rather than a
  // plural template with one item in it.
  it("reads as a singular when only one theme is named", () => {
    const { container } = row({
      gapSlot: { kind: "allPlayed", labels: ["Politics"], capped: false },
    });

    expect(gapText(container)).toBe("This commander's play style is Politics.");
  });

  // State 3, and the ruling that keeps state 4 honest: a commander with no
  // mechanic tags — including one whose every tag is a creature type — draws the
  // shipped note and NEVER `allPlayed`, which would assert something about a
  // commander with nothing on file.
  it("draws the No theme data note rather than allPlayed when there are no mechanics", () => {
    const { container } = row({ gapSlot: { kind: "noMechanics" } });

    expect(screen.getByText(discoveryCopy.untagged.heading)).toBeInTheDocument();
    expect(container.textContent).not.toContain("play style");
    // LANE-NEUTRAL. The shared row draws this on both lanes, so the body may not
    // name a sort only one of them has: it used to end "cannot appear under
    // Something new", which is false on /commanders.
    expect(container.textContent).not.toContain("Something new");
  });
});

describe("CommanderRow · state 5, unpriced", () => {
  // The figure UNMOUNTS. No dash, no zero, no reason given — and the deck count
  // stays, because it is a different reading.
  // `not.toContain("$")` ALONE IS NOT ENOUGH, and that was the first version:
  // drop the `absent` guard and the slot renders the hollow dot, `not stocked`
  // and its sr-only reading — no `$` anywhere, test still green, while the row
  // claims the feed has never carried the printing. That is the exact claim D3
  // forbids, so the absent state is asserted by the STRINGS it must not say and
  // by the separator that would orphan beside it.
  it("omits the price entirely and keeps the deck count", () => {
    const { container } = row({ price: { kind: "absent" } });

    expect(container.textContent).not.toContain("$");
    expect(container.textContent).not.toContain(priceCopy.notStocked);
    expect(screen.queryByText(priceCopy.notStockedAria)).not.toBeInTheDocument();
    // ONE figure left — the deck count — so no separator at all. Fit moved up
    // to the band's chip, so the foot line no longer holds an unconditional
    // figure for an orphaned separator to sit beside.
    expect(
      container.textContent?.split(commanderRowCopy.figures.separator).length,
    ).toBe(1);
    expect(screen.getByText(discoverCopy.row.popularity(24_012))).toBeInTheDocument();
  });

  // A FAILED READ IS NOT AN ABSENT PRICE. `absent` means the feed has never
  // carried the printing, which a lost read has no standing to claim, so the
  // figure is omitted rather than drawn — ruling D3 applied to the reading.
  it("omits the price when the read failed, even with rows in hand", () => {
    const { container } = row({ priceOk: false, price: { kind: "priced", cents: 1840 } });

    expect(container.textContent).not.toContain("$18.40");
    expect(container.textContent).not.toContain(priceCopy.notStocked);
    expect(
      container.textContent?.split(commanderRowCopy.figures.separator).length,
    ).toBe(1);
  });

  it("draws the price when the read succeeded", () => {
    row({ priceOk: true, price: { kind: "priced", cents: 1840 } });

    expect(screen.getByText("$18.40")).toBeInTheDocument();
  });

  // §C names PriceSlot unchanged — "its dot, its source label, its absent rule".
  // The row dropped the source word once, with a layout detail standing in for a
  // ruling.
  it("keeps the ManaPool source stamp beside the figure", () => {
    row({ priceOk: true, price: { kind: "priced", cents: 1840 } });

    expect(screen.getByText(priceCopy.source)).toBeInTheDocument();
  });

  it("takes the source stamp with the figure when there is none", () => {
    row({ price: { kind: "absent" } });

    expect(screen.queryByText(priceCopy.source)).not.toBeInTheDocument();
  });
});

describe("CommanderRow · figures", () => {
  // THE SEPARATORS FALL OUT WITH THEIR FIGURES. One list joined by them, so a
  // figure with no reading takes its separator with it rather than leaving one
  // beside nothing.
  //
  // TWO figures, not three: Fit is the plated chip up in the band now, per the
  // canvas, and the foot line is the deck count and the price. Both of those
  // are conditional, so the line can empty completely — which is state 5 on a
  // `/commanders` row, where the price is always absent and a commander with no
  // tracked decks draws nothing here at all.
  it.each([
    { over: {}, figures: 2 },
    { over: { deckCount: null }, figures: 1 },
    { over: { price: { kind: "absent" as const } }, figures: 1 },
    { over: { deckCount: null, price: { kind: "absent" as const } }, figures: 0 },
    { over: { priceOk: false }, figures: 1 },
    { over: { deckCount: null, priceOk: false }, figures: 0 },
  ])("draws $figures figure(s) and one separator fewer", ({ over, figures }) => {
    const { container } = row(over);

    const seps =
      (container.textContent?.split(commanderRowCopy.figures.separator).length ?? 1) - 1;
    // `Math.max(0, …)`: an empty line has no separator, not minus one.
    expect(seps).toBe(Math.max(0, figures - 1));
  });

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

describe("CommanderRow · the Fit bar", () => {
  // Hugh's ruling of 2026-09-17, which OVERRIDES the spec: the ratio bar was cut
  // and one number was meant to replace the segments. Read on the shipped row
  // the trade went the other way.
  //
  // Both widths draw it — band-right from `sm` up, under the foot line on the
  // phone — so a build that mounted only one would halve the feature silently.
  // ONE bar, not one per width. An earlier build mounted it twice — in the band
  // from `sm` up and under the figures below it — which drew the figure's parts
  // beside the art at one width and beneath the figure at the other. The order
  // is the same at both widths now: figure, then its parts under it.
  it("mounts exactly one bar, below the figures, at every width", () => {
    const { container } = row();

    // `.rounded-full` is what makes this the TRACK. Scoping on
    // `div.overflow-hidden` alone matched the BAND — it carries the same class —
    // so the segment counts below were reading ArtWash's layers and the
    // three-segment case passed for the wrong reason.
    const bars = container.querySelectorAll("div.rounded-full.overflow-hidden");
    expect(bars.length).toBe(1);

    // No `sm:hidden` / `hidden sm:` fork on the mount, which is what a
    // per-width pair would need. Asserted on the wrapper rather than by
    // counting, so a second mount added without the classes still fails above.
    const mount = bars[0]!.closest("[aria-hidden='true']");
    expect(mount?.className).not.toMatch(/hidden/);

    // BELOW the foot line in document order — the whole point of the move.
    const figures = container.querySelector("[data-testid='row-figures']");
    expect(figures).not.toBeNull();
    expect(
      figures!.compareDocumentPosition(bars[0]!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // THREE SEGMENTS WHEN SYNERGY WAS MEASURED, TWO WHEN IT WAS NOT. A null
  // component is absent, not zero — a zero-width third segment would claim a
  // reading nobody took, which is the same rule `measurableTotal` carries at 40.
  it("splits into three segments with a synergy reading", () => {
    const { container } = row({ fitPool: 12, fitRoles: 20, fitSynergy: 26 });

    const filled = container.querySelector("div.rounded-full.overflow-hidden > div");
    expect(filled?.children.length).toBe(3);
  });

  it("splits into two when synergy could not be measured", () => {
    const { container } = row({
      score: 32,
      measurableTotal: 40,
      fitPool: 12,
      fitRoles: 20,
      fitSynergy: null,
    });

    const filled = container.querySelector("div.rounded-full.overflow-hidden > div");
    expect(filled?.children.length).toBe(2);
  });

  // The bar is decorative: the link's own name carries the figure, and the foot
  // line prints it. A second spoken reading of one number is what `aria-hidden`
  // is for here.
  it("adds nothing to the accessible name", () => {
    row();

    const label = screen.getByRole("link").getAttribute("aria-label") ?? "";
    expect(label).not.toContain("Pool");
    expect(label).not.toContain("Synergy");
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

describe("the row's art and its position", () => {
  const ART = "https://cards.scryfall.io/art_crop/front/a/b/ab.jpg";
  const art = (container: HTMLElement) => container.querySelector<HTMLElement>(".art-wash-art")!;

  it("draws the first screen's art at once, never waiting on the viewport", () => {
    // An observer that never reports: with jsdom's missing one, every row would load at once and
    // this would pass over a gate that deferred the first screen too.
    class SilentObserver {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", SilentObserver);
    try {
      const { container } = render(<CommanderRow item={view({ artCropUri: ART })} position={EAGER_ART_ROWS - 1} />);
      expect(art(container).style.backgroundImage).toContain(ART);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("holds a lower row's art until it nears the viewport, keeping the layer's box", () => {
    let fire: (() => void) | null = null;
    class FakeObserver {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(el: Element) {
        fire = () => this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    try {
      const { container } = render(<CommanderRow item={view({ artCropUri: ART })} position={EAGER_ART_ROWS} />);
      expect(art(container).style.backgroundImage).toBe("");
      expect(art(container).style.width).not.toBe("");
      act(() => fire!());
      expect(art(container).style.backgroundImage).toContain(ART);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
