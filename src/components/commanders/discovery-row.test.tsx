import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryItem } from "../../lib/discovery/list";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { planeCopy } from "../../lib/copy/commanders-plane";
import { FLOOR_PCT } from "../../lib/discovery/floor";
import { DiscoveryRow } from "./discovery-row";

const name = "Lathril, Blade of the Elves";

const item = (over: Partial<DiscoveryItem> = {}): DiscoveryItem => ({
  slug: "lathril",
  name,
  colorIdentity: ["B", "G"],
  artCropUri: null,
  releasedAt: "2021-04-23",
  deckCount: 1209,
  rank: 1,
  ownedSupport: 126,
  edhrecTotal: 264,
  colorPoolSize: 34,
  roleCounts: { ramp: 9, draw: 6, removal: 7, wipes: 2 },
  price: { kind: "absent" },
  tagTotal: 5,
  unplayedLabels: ["elves", "tokens", "aristocrats", "counters"],
  unplayedCount: 4,
  nearestDeck: null,
  supportPct: 47,
  ...over,
});

function row(over: Partial<DiscoveryItem> = {}, sort: "fit" | "new" = "fit") {
  return render(<DiscoveryRow item={item(over)} rank={1} sort={sort} />);
}

/** Both breakpoints render, so every figure on this row appears twice. The
    counts are the exception: the phone folds them onto one line and the desktop
    stacks them, but each width prints each count once. */
const both = 2;

describe("DiscoveryRow", () => {
  // §4 — the wash owns one band, which states its own height. The row's old
  // floor let a long tag sentence stretch the wash and over-scale the crop.
  // 208, the row band: a full-width result row you scan down is the one class
  // priced by scroll, so it is the shortest of the three bands that grew. The
  // height is still stated rather than a floor — the sharp portrait resolves
  // `auto 100%` against it, so a row grown by a long tag sentence would
  // over-scale the crop.
  it("confines the wash to a 208px band", () => {
    // With a crop, because the portrait's own width is asserted below and the
    // gradient fallback draws no sharp layer to measure.
    const { container } = row({ artCropUri: "https://example.test/crop.jpg" });
    const band = container.querySelector<HTMLElement>(".discovery-band")!;
    // On the BAND, which is what would carry a floor — the row wrapper never had
    // one, so asserting there passed whatever the band did. And no floor at all
    // rather than "not the old one": a regression restoring `min-h-[148px]` has
    // to fail this.
    expect(band.className).not.toMatch(/min-h-\[/);
    expect(band.style.height).toBe("208px");
    expect(band.firstElementChild).toHaveAttribute("data-art-wash-band", "208");
    // Keyed to the rank column, which is the taller of the row's two blocks.
    // Pinned for the same reason the band is: the probe validates the hold
    // against this number rather than deciding it.
    expect(band.firstElementChild).toHaveAttribute("data-art-wash-label-at", "56");
    // The portrait's own width, which is the crop this row settles. Nothing else
    // pins it: the band and the label figure would both survive a change to 230
    // or 340, and the reader would get a different crop with every check green.
    const sharp = band.querySelector<HTMLElement>(".art-wash-art")!;
    expect(sharp.style.width).toBe("285px");
  });

  it("keeps the data zone off the art", () => {
    const { container } = row();
    const zone = container.querySelector<HTMLElement>(".discovery-data-zone")!;
    expect(zone.style.borderTop).toBe("1px solid var(--border)");
    expect(zone.querySelector(".discovery-band")).toBeNull();
  });

  // The printed card is no longer reachable from here to draw by mistake: the
  // list stopped shipping `imageUri` once nothing on this lane read it.
  it("draws the frame-free crop", () => {
    const { container } = row({ artCropUri: "https://example.test/crop.jpg" });
    expect(container.innerHTML).toContain("crop.jpg");
  });

  it("prints the support count over the EDHREC total", () => {
    row({ ownedSupport: 84, edhrecTotal: 236 });
    expect(screen.getAllByText("84")).toHaveLength(both);
    expect(screen.getAllByText("OF TOP 236 OWNED")).toHaveLength(both);
  });

  // Discovery does not blend, so there is no 0–100 reading to print and no
  // previous one to delta against.
  it("prints no score out of 100, no FIT stack and no delta", () => {
    const { container } = row();
    expect(container.textContent).not.toContain("/100");
    expect(container.textContent).not.toContain("FIT ");
    expect(container.textContent).not.toMatch(/[↑↓]\d+ from/);
  });

  it("prints the deck count and the novelty count", () => {
    row({ deckCount: 1209, unplayedCount: 172 });
    expect(
      screen.getAllByText((_, el) => el?.textContent === "1,209 decks tracked"),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText((_, el) => el?.textContent === "172 of its top cards new to you"),
    ).not.toHaveLength(0);
  });

  // Nobody has counted is not nobody has built, so an absent deck count prints
  // no line rather than a zero.
  it("drops the popularity line when EDHREC carried no deck count", () => {
    const { container } = row({ deckCount: null });
    expect(container.textContent).not.toContain("decks tracked");
  });

  // The denominator is `edhrec_total`, and nothing substitutes for it — not 99,
  // not the pool size.
  it("prints neither figure when the denominator is missing", () => {
    const { container } = row({ edhrecTotal: null });
    expect(container.textContent).not.toContain("OF TOP");
    // Ownership still stands: it is a claim about the collection, which every
    // commander has, including the ones EDHREC does not index.
    expect(screen.getAllByText(discoveryCopy.ownership.unowned).length).toBeGreaterThan(0);
  });

  it("ends the content column on ownership, at both widths", () => {
    row();
    expect(screen.getAllByText(discoverCopy.row.notOwned)).toHaveLength(both);
  });

  // The row is the action. It carries no named button of its own: the hover pill
  // restated the destination the whole row already goes to, and cost the row the
  // grid column it was clipping against.
  it("names no action beside the row itself", () => {
    row();
    expect(
      screen.queryByRole("link", { name: commandersCopy.row.action }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("See the pool")).not.toBeInTheDocument();
  });

  // The art is the wash behind the row, not a printing in a box. `I3` is the
  // only frame with a thumbnail, and it applies only if a printing is named.
  it("shows no image at rest", () => {
    const { container } = row({ artCropUri: "https://example.test/art.jpg" });
    expect(container.querySelector("img")).toBeNull();
  });

  it("names the unplayed tags under novelty", () => {
    row({}, "new");
    expect(screen.getAllByText("elves · tokens · aristocrats").length).toBeGreaterThan(0);
    expect(screen.getAllByText(discoveryCopy.justify.distanceLabel).length).toBeGreaterThan(0);
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

  // The owned wording this once asserted has no row left to render it: discover
  // lists only commanders the player does not own. The ordering it was really
  // about — ownership ahead of any figure — is unchanged, so it is pinned on the
  // clause that survived.
  it("leads the row's accessible name with ownership, before any figure", () => {
    row({});
    // The stretched link, not the trailing pill: the pill's name is its own.
    const link = screen.getAllByRole("link")[0];
    const label = link.getAttribute("aria-label") ?? "";
    expect(label.indexOf(discoveryCopy.ownership.unownedAria)).toBeGreaterThan(-1);
    expect(label.indexOf(discoveryCopy.ownership.unownedAria)).toBeLessThan(
      label.indexOf(discoveryCopy.justify.overlap(126, 264)),
    );
  });

  // The label opens on the name, so the overlap clause says "this commander"
  // rather than naming it a second time.
  it("names the commander once in the row's accessible name", () => {
    row({});
    const label = screen.getAllByRole("link")[0].getAttribute("aria-label") ?? "";
    expect(label.split("Lathril, Blade of the Elves").length - 1).toBe(1);
  });

  // The separator before "view commander details" is a screen-reader PAUSE, and
  // the two assertions above pass on either punctuation because they test for
  // substrings. So it is pinned literally: a revert to the em dash fails here
  // and nowhere else.
  it("ends the accessible name on a colon before the destination", () => {
    row({});
    const label = screen.getAllByRole("link")[0].getAttribute("aria-label") ?? "";
    expect(label.endsWith(": view commander details")).toBe(true);
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
    // §4's divider is excluded by name: it separates the band from the data and
    // is drawn whatever the price does.
    expect(
      [...container.querySelectorAll<HTMLElement>("[style]")].filter(
        (el) =>
          el.style.borderTop.includes("--border") &&
          !el.classList.contains("discovery-data-zone"),
      ),
    ).toHaveLength(0);
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
