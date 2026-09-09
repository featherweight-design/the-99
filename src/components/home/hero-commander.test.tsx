import { render } from "@testing-library/react";
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
  it("inherits the deck card's band exactly", () => {
    const { container } = render(<HeroCommander item={item()} inUse={0} />);
    const band = container.querySelector(".hero-band");
    expect(band?.className).toContain("aspect-[2.2/1]");
    expect(band?.className).toContain("min-h-[104px]");
    expect(band?.className).not.toContain("h-[186px]");
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

  it("draws the frame-free crop, never the printed card", () => {
    const { container } = render(
      <HeroCommander item={item({ imageUri: "https://example.test/printed.jpg" })} inUse={0} />,
    );
    expect(container.innerHTML).toContain("atraxa-crop.jpg");
    expect(container.innerHTML).not.toContain("printed.jpg");
  });
});
