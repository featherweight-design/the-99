import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerSlot } from "./partner-slot";

const PROPS = {
  primaryName: "Ishai, Ojutai Dragonspeaker",
  ability: { kind: "generic" } as const,
  pairableCount: 3,
  onAdd: () => {},
  onChange: () => {},
  onRemove: () => {},
};

const PARTNER = {
  name: "Bruse Tarl, Boorish Herder",
  imageUri: "https://example.test/bruse.jpg",
  colorIdentity: ["R", "W"],
  caption: "Partner",
  ariaLabel: "Partner — Bruse Tarl, Boorish Herder",
};

describe("PartnerSlot — the thumb", () => {
  // The dash is the app's vocabulary for an unsettled claim, shared with
  // Building's chip. A slot holding a partner is not unsettled, so the filled
  // state keeps the thumb's ring and drops the border it used to draw on top of
  // it — the shipped plate carried the dash in BOTH states.
  it("draws the shared thumb filled, with no dashed border", () => {
    const { container } = render(<PartnerSlot {...PROPS} partner={PARTNER} />);
    const thumb = container.querySelector<HTMLElement>('span[aria-hidden="true"].rounded-\\[6px\\]');
    expect(thumb).not.toBeNull();
    expect([thumb!.style.width, thumb!.style.height]).toEqual(["44px", "62px"]);
    expect(thumb!.style.boxShadow).toBe("inset 0 0 0 1px rgba(0,0,0,0.4)");
    expect(thumb!.className).not.toContain("border-dashed");
  });

  // Same box as the filled thumb, so the row does not move when a partner
  // arrives — which is the reason the empty plate has a size at all.
  it("keeps the dash on the empty plate, at the thumb's own box", () => {
    const { container } = render(<PartnerSlot {...PROPS} partner={null} />);
    const plate = container.querySelector<HTMLElement>(".border-dashed");
    expect(plate).not.toBeNull();
    expect(plate!.className).toContain("w-[44px]");
    expect(plate!.className).toContain("h-[62px]");
  });
});
