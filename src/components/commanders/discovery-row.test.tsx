import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryItem } from "../../lib/discovery/list";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
import { FLOOR_PCT } from "../../lib/discovery/floor";
import { DiscoveryRow } from "./discovery-row";

const name = "Lathril, Blade of the Elves";

const item = (over: Partial<DiscoveryItem> = {}): DiscoveryItem => ({
  oracleId: "o1",
  slug: "lathril",
  name,
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

  // ── The archetype overflow (#343) ──────────────────────────────────────
  // The count clause IS the trigger, so a row with nothing hidden must be
  // byte-identical to what shipped: no glyph, no chevron, no control.
  it("leaves the sentence alone when every archetype is already named", () => {
    row({ unplayedLabels: ["elves", "tokens", "aristocrats"], unplayedCount: 3 }, "new");
    expect(screen.queryByRole("button", { name: /archetypes/ })).toBeNull();
    expect(screen.getAllByText("elves · tokens · aristocrats").length).toBeGreaterThan(0);
  });

  it("grows the sentence in place, and shrinks it back", () => {
    const { container } = row({}, "new");
    expect(container.textContent).toContain(
      discoveryCopy.justify.tagList(["elves", "tokens", "aristocrats"], 1),
    );

    const open = () => screen.getAllByRole("button", { name: planeCopy.overflow.moreAria(4, name) });
    fireEvent.click(open()[0]);
    expect(screen.getAllByText("elves · tokens · aristocrats · counters").length).toBeGreaterThan(0);

    // Both widths render the sentence, and one state drives both: a phone and a
    // desktop reading of the same row cannot disagree about what it is showing.
    const close = screen.getAllByRole("button", { name: planeCopy.overflow.fewerAria(name) });
    expect(close).toHaveLength(2);
    expect(close.every((b) => b.getAttribute("aria-expanded") === "true")).toBe(true);

    fireEvent.click(close[0]);
    expect(screen.queryByText("elves · tokens · aristocrats · counters")).toBeNull();
    expect(open()).toHaveLength(2);
  });

  // The prose around it is `aria-hidden`, and a control inside an aria-hidden
  // subtree is one no screen reader can find.
  it("keeps the trigger in the accessibility tree, and above the row's link", () => {
    row({}, "new");
    const trigger = screen.getAllByRole("button", {
      name: planeCopy.overflow.moreAria(4, name),
    })[0];
    expect(trigger.closest("[aria-hidden='true']")).toBeNull();
    expect(trigger.className).toContain("z-[2]");
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

  // The note claims the row cleared a bar, so it has to name the bar — and name the one the
  // ranking actually applied. Asserted against `FLOOR_PCT` rather than a literal 30, so a change
  // to the floor cannot leave the row printing the old figure.
  it("names the threshold the ranking applied in the floor note, at both widths", () => {
    const { container } = row({ supportPct: 47 }, "new");
    // `textContent` rather than `getByText`: the desktop note is emphasised, which splits the
    // sentence across spans, and only the mobile one is a single text node.
    expect(container.textContent).toContain(discoveryCopy.justify.floorNote(FLOOR_PCT, 47));
    expect(screen.getAllByText(discoveryCopy.justify.floorNoteShort(FLOOR_PCT, 47)).length)
      .toBeGreaterThan(0);
  });

  // A row sitting exactly on the floor prints the same percentage twice, and the mark used to
  // land on the first of them — the threshold, which the note names rather than claims.
  it("marks both figures when a row clears the floor by nothing at all", () => {
    const { container } = row({ supportPct: FLOOR_PCT }, "new");
    const marked = container.querySelectorAll("strong");
    const text = [...marked].map((el) => el.textContent);
    expect(text.filter((t) => t === `${FLOOR_PCT}%`)).toHaveLength(2);
  });

  it("explains an untagged commander instead of offering a retry", () => {
    row({ tagTotal: 0 });
    expect(screen.getAllByText(discoveryCopy.untagged.heading).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
