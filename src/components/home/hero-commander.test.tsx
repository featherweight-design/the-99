import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { HeroCommander } from "./hero-commander";

// Only the fields the hero renders, the same shape `ready-to-build.test.tsx`
// uses: `CommanderListItem` has fifteen more, and a fixture listing them all
// breaks when any of them moves.
function item(over = {}) {
  return {
    oracleId: "o1",
    slug: "atraxa-praetors-voice",
    name: "Atraxa, Praetors' Voice",
    colorIdentity: ["W", "U", "B", "G"],
    imageUri: null,
    artCropUri: "https://example.test/atraxa-crop.jpg",
    score: 74,
    measurableTotal: 100,
    colorPoolSize: 92,
    typeLine: "Legendary Creature — Phyrexian Angel Horror",
    ...over,
  } as unknown as CommanderListItem;
}

describe("HeroCommander", () => {
  // The page header band, 288, stated. It used to inherit the deck tile's
  // aspect and floor, which was the right instinct — one answer to one question
  // — and the wrong shape: a hero and a grid cell are different jobs, so they
  // take different bands and neither takes a ratio.
  it("states the header band rather than inheriting a ratio and a floor", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const band = container.querySelector<HTMLElement>(".hero-band");
    expect(band?.style.height).toBe("288px");
    expect(band?.className).not.toMatch(/aspect-\[/);
    expect(band?.className).not.toMatch(/min-h-\[/);
    expect(band?.firstElementChild).toHaveAttribute("data-art-wash-band", "288");
  });

  // Decision 7 for this surface: nothing is cut from the band, but the name, the
  // pips and the fit chip stop being three separate anchors — one at the top and
  // two pinned to opposite bottom corners — and become one row at the foot. That
  // is what makes a 38px block arithmetic rather than an estimate.
  it("condenses the band's three anchors into one block at the foot", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    expect(block.className).toContain("bottom-0");
    expect(block.textContent).toContain("Atraxa, Praetors' Voice");
    expect(block.querySelector(".hero-fit-chip")).not.toBeNull();
    expect(block.querySelector('[aria-hidden="true"]')).not.toBeNull();
    // Nothing pinned to the top edge any more. The wash's own root is `top-0`
    // and is not ink — it is the band.
    const pinnedToTop = Array.from(
      container.querySelectorAll<HTMLElement>(".hero-band .top-0"),
    ).filter((el) => !el.hasAttribute("data-art-wash-band"));
    expect(pinnedToTop).toHaveLength(0);
  });

  // Decision 3: a chip over art takes an opaque plate and a hairline, never an
  // alpha fill — the translucent chip was the worst-reading element in the bug
  // report.
  it("boxes the fit chip on an opaque plate behind a hairline", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const chip = container.querySelector(".hero-fit-chip") as HTMLElement;
    expect(chip.style.background).toBe("var(--bg)");
    expect(chip.style.border).toBe("1px solid var(--border-strong)");
  });

  it("puts the actions below the divider, not on the art", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const footer = container.querySelector(".hero-footer") as HTMLElement;
    expect(footer.style.borderTop).toBe("1px solid var(--border)");
    expect(footer.querySelector(".hero-band")).toBeNull();
  });

  // The route, not just the words. The old CTA pointed at
  // `/decks/new?commander=<oracleId>`, which reads identically to anyone
  // checking the label — and this round's whole ruling is that nobody builds a
  // deck without seeing the pool first.
  it("points its one action at the commander's own page", () => {
    render(<HeroCommander item={item()} inUse={0} />);
    expect(screen.getByRole("link", { name: "See the pool" }).getAttribute("href")).toBe(
      "/commanders/atraxa-praetors-voice",
    );
  });

  it("draws the frame-free crop, never the printed card", () => {
    const { container } = render(
      <HeroCommander item={item({ imageUri: "https://example.test/printed.jpg" })} inUse={0} />,
    );
    expect(container.innerHTML).toContain("atraxa-crop.jpg");
    expect(container.innerHTML).not.toContain("printed.jpg");
  });

  // STATES draws this block as one row of name · pips · type · fit chip, and
  // decision 7 condenses this surface without cutting anything from it — so
  // hiding the type line on a phone would have been a cut dressed as a condense.
  it("draws the type line at both widths, as the child that gives", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    const typeLine = Array.from(block.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Legendary"),
    )!;
    expect(typeLine).toBeDefined();
    expect(typeLine.className).not.toContain("hidden");
    // The name keeps its characters; a half-truncated name reads as a different
    // commander, while a half-truncated type line still reads as a type line.
    expect(typeLine.style.flexShrink).toBe("1000");
  });

  // Two rows, not one. A condensed single row truncated the name to
  // `Preston Garvey, Minutema…` at 390px, and a half-truncated name reads as a
  // different commander.
  it("puts the name and its pips on their own row, above the type line", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    expect(block.className).toContain("flex-col");
    // The figure the ramp is keyed to, pinned here: the contrast suite holds 71
    // as its own constant, so nothing but this ties the number to the render —
    // reverting the call site to 46 would leave every other check green.
    const wash = container.querySelector("[data-art-wash-band]")!;
    expect(wash).toHaveAttribute("data-art-wash-label-at", "71");
    // And it reserves NO corner: this card renders no card-details control —
    // that placement is the commander detail page's phone band — so a reservation
    // here would narrow both rows for a control that never arrives.
    expect(block.className).not.toContain("pr-[46px]");
    expect(container.querySelector('[aria-label="View card details"]')).toBeNull();
    const [nameRow, typeRow] = Array.from(block.children) as HTMLElement[];
    expect(nameRow.textContent).toContain("Atraxa, Praetors' Voice");
    expect(nameRow.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(typeRow.textContent).toContain("Legendary Creature");
    // The fit chip rides at the type line's right, not on the name's row.
    expect(typeRow.querySelector(".hero-fit-chip")).not.toBeNull();
    expect(nameRow.querySelector(".hero-fit-chip")).toBeNull();
  });

  // The card's only action spans it. Sized to its words, the footer read as a
  // row that had lost its second button — which is what happened when
  // `Start this deck` was cut.
  it("spans the card with its one action at both widths", () => {
    render(<HeroCommander item={item()} inUse={0} />);
    const cta = screen.getByRole("link", { name: "See the pool" });
    expect(cta.className).toContain("w-full");
    expect(cta.className).not.toContain("sm:flex-none");
  });

  it("opens the commander's page from its art, without a second named link (H4)", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const band = container.querySelector(".hero-band")!;
    const art = band.querySelector('[data-testid="hero-art-link"]')!;
    expect(art.getAttribute("href")).toBe("/commanders/atraxa-praetors-voice");
    expect(art.getAttribute("aria-hidden")).toBe("true");
    expect(art.getAttribute("tabindex")).toBe("-1");
    // Covers the whole band, which is the positioned box it fills.
    expect(art.className).toMatch(/absolute inset-0/);
    expect(band.className).toMatch(/\brelative\b/);
  });
});
