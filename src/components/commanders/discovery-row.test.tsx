import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DiscoveryItem } from "../../lib/discovery/list";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { DiscoveryRow } from "./discovery-row";

const item = (over: Partial<DiscoveryItem> = {}): DiscoveryItem => ({
  oracleId: "o1",
  slug: "lathril",
  name: "Lathril, Blade of the Elves",
  colorIdentity: ["B", "G"],
  imageUri: null,
  rank: 1,
  owned: false,
  ownedSupport: 126,
  edhrecTotal: 264,
  colorPoolSize: 34,
  roleCounts: { ramp: 9, draw: 6, removal: 7, wipes: 2 },
  counts: null,
  price: { kind: "absent" },
  tagTotal: 5,
  unplayedLabels: ["elves", "tokens", "aristocrats", "counters"],
  unplayedCount: 4,
  nearestDeck: null,
  supportPct: 47,
  ...over,
});

function row(over: Partial<DiscoveryItem> = {}, sort: "fit" | "new" = "fit") {
  return render(
    <DiscoveryRow item={item(over)} rank={1} sort={sort} avail="all" counts={null} />,
  );
}

describe("DiscoveryRow", () => {
  it("prints the overlap sentence under fit, at both widths", () => {
    row();
    expect(
      screen.getAllByText((_, el) => el?.textContent === discoveryCopy.justify.overlap(126, 264))
        .length,
    ).toBeGreaterThan(0);
  });

  // Both figures are emphasised by searching the finished sentence for them, so
  // the case where they are the same string is the one that could lose the
  // second match.
  it("emphasises both figures even when the whole support list is owned", () => {
    const { container } = row({ ownedSupport: 264, edhrecTotal: 264 });
    const bolded = [...container.querySelectorAll("strong")].map((el) => el.textContent);
    expect(bolded.filter((t) => t === "264").length).toBeGreaterThanOrEqual(2);
  });

  // The denominator is `edhrec_total`, and nothing substitutes for it — not 99,
  // not the pool size.
  it("prints neither figure when the denominator is missing", () => {
    row({ edhrecTotal: null });
    expect(screen.queryByText(discoveryCopy.justify.overlapLabel)).toBeNull();
    expect(screen.queryByText(discoveryCopy.justify.figureLabelFit)).toBeNull();
    // The receipt line still stands: it is a claim about the collection, which
    // every commander has, including the ones EDHREC does not index.
    expect(screen.getAllByText(discoveryCopy.ownership.unowned).length).toBeGreaterThan(0);
  });

  it("names the unplayed tags under novelty, and draws no bar", () => {
    const { container } = row({}, "new");
    expect(screen.getAllByText("elves · tokens · aristocrats").length).toBeGreaterThan(0);
    expect(screen.getAllByText(discoveryCopy.justify.figureLabelNew).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".rounded-full.overflow-hidden").length).toBe(0);
  });

  it("says what the nearest deck shares when one overlaps", () => {
    const { container } = row(
      { nearestDeck: { deckName: "Meren", sharedLabels: ["tokens", "aristocrats"], extraShared: 0 } },
      "new",
    );
    const shared = discoveryCopy.justify.sharedList(["tokens", "aristocrats"], 0);
    // A substring, not a `RegExp` built from the copy: the clause ends in a full
    // stop, and a deck name is whatever the player typed.
    expect(container.textContent).toContain(discoveryCopy.justify.distanceNear("Meren", shared));
  });

  // A commander whose every archetype the player has already built still ranks,
  // it just has no names to lead the sentence with. The separator goes with them.
  it("opens on the nearest-deck clause when there is no unplayed tag to name", () => {
    const { container } = row(
      {
        unplayedLabels: [],
        unplayedCount: 0,
        nearestDeck: { deckName: "Meren", sharedLabels: ["tokens", "aristocrats"], extraShared: 0 },
      },
      "new",
    );
    const shared = discoveryCopy.justify.sharedList(["tokens", "aristocrats"], 0);
    expect(container.textContent).toContain(discoveryCopy.justify.distanceNear("Meren", shared));
    expect(container.textContent).not.toContain(". Closest");
  });

  it("leads the row's accessible name with ownership, before any figure", () => {
    row({ owned: true });
    const link = screen.getByRole("link");
    const label = link.getAttribute("aria-label") ?? "";
    expect(label.indexOf(discoveryCopy.ownership.ownedAria)).toBeGreaterThan(-1);
    expect(label.indexOf(discoveryCopy.ownership.ownedAria)).toBeLessThan(
      label.indexOf(discoveryCopy.justify.overlap(126, 264)),
    );
  });

  // The label opens on the name, so the overlap clause says "this commander"
  // rather than naming it a second time.
  it("names the commander once in the row's accessible name", () => {
    row({ owned: true });
    const label = screen.getByRole("link").getAttribute("aria-label") ?? "";
    expect(label.split("Lathril, Blade of the Elves").length - 1).toBe(1);
  });

  it("renders the price with its provenance, and speaks it", () => {
    row({ price: { kind: "priced", cents: 1840 } });
    expect(screen.getAllByText("$18.40").length).toBeGreaterThan(0);
    expect(screen.getAllByText(discoveryCopy.price.source).length).toBeGreaterThan(0);
    expect(screen.getAllByText(discoveryCopy.price.aria("$18.40")).length).toBeGreaterThan(0);
  });

  // The hairline belongs to the slot, so an absent price leaves no orphaned
  // divider behind it.
  it("unmounts the price slot and its hairline when there is no price", () => {
    const { container } = row({ price: { kind: "absent" } });
    expect(screen.queryByText(discoveryCopy.price.source)).toBeNull();
    expect(
      [...container.querySelectorAll<HTMLElement>("[style]")].some((el) =>
        el.style.borderTop.includes("--border"),
      ),
    ).toBe(false);
  });

  it("explains an untagged commander instead of offering a retry", () => {
    row({ tagTotal: 0 });
    expect(screen.getAllByText(discoveryCopy.untagged.heading).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
