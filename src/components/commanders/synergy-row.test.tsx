import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SynergyRow } from "./synergy-row";
import { avail, heldBy } from "./availability-fixture";
import { availabilityCopy } from "../../lib/copy/availability";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import type { CardFacet } from "../../lib/cards/facet";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

const base: SynergyCard = {
  oracleId: "a", name: "Command Tower", typeLine: "Land — Gate",
  facet: "land", inclusionPct: 82, imageUri: null, synergyPts: 1, owned: true, committedTo: null, availability: null, price: null,
  manaCost: null,
};

type MountProps = {
  card?: SynergyCard;
  selected?: boolean;
  onToggle?: () => void;
  siblings?: string[];
  width?: "desktop" | "phone";
  facet?: CardFacet | "all";
  newestAsOf?: Date | null;
};

function mount(props: MountProps = {}) {
  const {
    card = base,
    selected = false,
    onToggle = () => {},
    siblings = ["a"],
    width = "desktop",
    facet = "land",
    newestAsOf = null,
  } = props;
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <SynergyRow card={card} selected={selected} onToggle={onToggle} siblings={siblings} width={width} facet={facet} newestAsOf={newestAsOf} />
    </CardDetailProvider>,
  );
}

describe("SynergyRow", () => {
  it("states a single point in the singular", () => {
    mount();
    expect(screen.getByText("+1 pt")).toBeInTheDocument();
  });

  it("draws a negative figure with a minus sign, not a hyphen", () => {
    mount({ card: { ...base, synergyPts: -5 } });
    expect(screen.getByText("−5 pts")).toBeInTheDocument();
  });

  // An absent synergy must not suppress a real inclusion beside it.
  it("draws each figure's absence independently", () => {
    mount({ card: { ...base, synergyPts: null } });
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(1);
  });

  // Slot 3: under a single facet the pill already names the bucket, so the
  // column earns its width by printing the subtype.
  it("prints the full type line under a single facet", () => {
    mount({ facet: "land" });
    expect(screen.getByText("Land — Gate")).toBeInTheDocument();
  });

  // …and under All the list is mixed, so the bucket is the useful thing.
  it("prints the bucket alone under the All facet", () => {
    mount({ facet: "all" });
    expect(screen.getByText("Land")).toBeInTheDocument();
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
  });

  it("names ownership in the accessible name rather than by colour alone", () => {
    mount({ card: { ...base, owned: false } });
    expect(screen.getByRole("listitem", { name: /Not in your collection/ })).toBeInTheDocument();
  });

  // Three states in one dot, and the third must not cost the row any width.
  // The dot no longer moves for a claim — severity is the marker's. `committedTo`
  // is set here ON PURPOSE: left null, the retired three-state dot would also
  // paint --success and this assertion would pass against the code it replaces.
  it("keeps the owned fill for a card a deck is holding, and marks it instead", () => {
    const { container } = mount({
      card: { ...base, committedTo: "Atraxa", availability: heldBy("Atraxa") },
    });
    const dot = container.querySelector("li > span[aria-hidden]") as HTMLElement;
    expect(dot.className).toContain("bg-[color:var(--success)]");
    expect(dot.className).not.toContain("--avail-hard-fg");
    expect(dot.style.width).toBe("7px");
    // Count-only in the drawn label, deck named in the row's own name.
    expect(screen.getByText(availabilityCopy.marker.hard)).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: new RegExp(availabilityCopy.marker.hardAria("Atraxa")) }),
    ).toBeInTheDocument();
  });

  it("keeps the green dot for an owned card no deck has claimed, and says nothing", () => {
    const { container } = mount();
    const dot = container.querySelector("li > span[aria-hidden]") as HTMLElement;
    expect(dot.className).toContain("bg-[color:var(--success)]");
    expect(screen.queryByText(availabilityCopy.marker.hard)).toBeNull();
    expect(screen.queryByRole("listitem", { name: /Already in/ })).toBeNull();
  });

  // A card you do not own cannot sit in a deck, so the hollow dot has no third
  // state to grow. Dashed rather than solid: hollow is reserved for absence,
  // and a solid ring reads as a state of something present.
  it("leaves the unowned dot hollow and dashed", () => {
    const { container } = mount({ card: { ...base, owned: false } });
    const dot = container.querySelector("li > span[aria-hidden]") as HTMLElement;
    expect(dot.className).toContain("bg-transparent");
    expect(dot.className).toContain("[border:1px_dashed_var(--fg-locked)]");
  });

  it("toggles through an aria-pressed button", () => {
    const onToggle = vi.fn();
    mount({ onToggle });
    const toggle = screen.getByRole("button", { name: synergyCopy.select.addAria("Command Tower") });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("offers the remove label once selected", () => {
    mount({ selected: true });
    expect(
      screen.getByRole("button", { name: synergyCopy.select.removeAria("Command Tower") }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the type column at phone width and prefixes the inclusion figure", () => {
    mount({ width: "phone" });
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
    expect(screen.getByText(/edhrec 82%/)).toBeInTheDocument();
  });
});

describe("the availability slot (§4.6, §4.7)", () => {
  // ── The availability slot (§4.6, §4.7) ─────────────────────────────────

  // The gate is `owned`, NOT "has a free copy". The two shipped surfaces
  // disagree — the diff row buys whenever nothing is free — and this surface
  // takes the deck tile's reading, because the useful fact about an owned card
  // with no free copy is that you have one, not what a second would cost.
  it("marks an owned card with no free copy rather than pricing it", () => {
    mount({ card: { ...base, owned: true, availability: heldBy("Atraxa") } });
    expect(screen.getByText(availabilityCopy.marker.hard)).toBeInTheDocument();
    expect(screen.queryByText(/buy/i)).toBeNull();
  });

  // STATES gives the over tint to all four geometries, this row included. It is
  // the one severity loud enough to touch a container, and the marker alone
  // would leave an over-committed synergy card quieter than the same card on a
  // Role Coverage chip.
  it("tints the container at over, and leaves the other readings alone", () => {
    const over = { ...avail("over") };
    const { container: o } = mount({ card: { ...base, availability: over } });
    expect((o.querySelector("li") as HTMLElement).style.border).toContain("--danger");

    for (const reading of ["free", "soft", "hard"] as const) {
      const { container } = mount({ card: { ...base, availability: avail(reading) } });
      expect((container.querySelector("li") as HTMLElement).style.border).not.toContain("--danger");
    }
  });

  // Selection is the louder statement: the reader chose this row, and its marker
  // is still carrying the shortfall.
  it("lets selection win over the over tint", () => {
    const { container } = mount({ card: { ...base, availability: avail("over") }, selected: true });
    expect((container.querySelector("li") as HTMLElement).style.border).toContain("--accent-shadow");
  });

  // The figure has to be VISIBLE, not only spoken: `density="collapsed"` draws a
  // bare `$` and moves the amount to sr-only, which is the wrong trade on the
  // one surface whose job is to say what a card costs.
  it("shows the price on the phone rather than collapsing it to a glyph", () => {
    mount({
      width: "phone",
      card: {
        ...base,
        owned: false,
        price: { cents: 450, foilCents: null, etchedCents: null, asOf: new Date("2026-09-15") },
      },
      newestAsOf: new Date("2026-09-15"),
    });
    // The discriminator is the GLYPH, not the figure. Collapsed draws an
    // `aria-hidden` `$` and moves `buy $4.50` into `sr-only`, so a query for the
    // figure finds it either way and passes on the collapsed build — which is
    // exactly what the first version of this test did.
    const glyphOnly = screen
      .queryAllByText("$", { selector: '[aria-hidden="true"]' })
      .filter((el) => el.textContent === "$");
    expect(glyphOnly).toHaveLength(0);

    // And the figure is reachable without a screen reader.
    const sr = screen.getAllByText(/\$4\.50/).every((el) => el.closest(".sr-only") !== null);
    expect(sr).toBe(false);
  });

  it("prices an unowned card", () => {
    mount({
      card: {
        ...base,
        owned: false,
        price: { cents: 450, foilCents: null, etchedCents: null, asOf: new Date("2026-09-15") },
      },
      newestAsOf: new Date("2026-09-15"),
    });
    expect(screen.getByText(/\$4\.50/)).toBeInTheDocument();
  });

  // §4.7 — the <li>'s aria-label REPLACES its descendants, so the tag's own
  // text is drawn and never spoken. The clause has to be composed into the row
  // name or the price reaches nobody using a screen reader.
  it("speaks the price in the row's own name", () => {
    mount({
      card: {
        ...base,
        owned: false,
        price: { cents: 450, foilCents: null, etchedCents: null, asOf: new Date("2026-09-15") },
      },
      newestAsOf: new Date("2026-09-15"),
    });
    expect(
      screen.getByRole("listitem", { name: /buy for \$4\.50/ }),
    ).toBeInTheDocument();
  });

  // A price history with no live printing is a different fact from never having
  // been stocked, and the row says which.
  it("speaks sold out rather than a price when no printing is live", () => {
    mount({
      card: {
        ...base,
        owned: false,
        price: { cents: 450, foilCents: null, etchedCents: null, asOf: new Date("2026-09-01") },
      },
      newestAsOf: new Date("2026-09-15"),
    });
    expect(screen.getByRole("listitem", { name: /sold out/ })).toBeInTheDocument();
  });

  it("speaks a bare buy when the feed has never stocked the card", () => {
    mount({ card: { ...base, owned: false, price: null }, newestAsOf: new Date("2026-09-15") });
    expect(screen.getByRole("listitem", { name: /available to buy/ })).toBeInTheDocument();
  });

  // Free owned cards produce the string this row has always produced — the
  // round's one unusual constraint, and the slot is where it would break. The
  // assertion is the ABSENCE of a trailing clause, not a rebuilt sentence:
  // rebuilding it here would pass whatever `rowAria` did.
  it("adds no clause for a free owned card", () => {
    mount();
    const label = screen.getByRole("listitem").getAttribute("aria-label")!;
    expect(label.endsWith("of decks.")).toBe(true);
    expect(label).not.toMatch(/buy|sold out|free|brew/i);
  });
});
