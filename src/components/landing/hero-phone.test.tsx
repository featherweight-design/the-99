import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { commandersPlaceCopy } from "../../lib/copy/commanders-place";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingCommander } from "../../lib/public/landing-commanders";
import { INK_SHADOW } from "../ui/art-wash";
import { HeroShot, HeroSideCards, NAME_INK_SHADOW } from "./hero-phone";

const cmd = (name: string, over: Partial<LandingCommander> = {}): LandingCommander => ({
  name, slug: "slug-0123456789ab", colorIdentity: ["U"], artCropUri: "https://cards.scryfall.io/art/x.jpg", imageUri: "https://cards.scryfall.io/n/x.jpg", prose: `${name} read.`, ...over,
});
const THREE = [cmd("Jace, Multiverse Architect"), cmd("Y'shtola, Night's Blessed"), cmd("Tam, the Possibility")];

describe("hero phone", () => {
  it("keeps the name ink shadow the shipped commander row uses", () => {
    expect(NAME_INK_SHADOW).toBe(INK_SHADOW);
  });

  it("draws the Commanders page with two rows, each with the example's fit beside the stored read", () => {
    render(<HeroShot commanders={THREE} />);
    const phone = screen.getByTestId("landing-phone");
    expect(phone).toHaveTextContent(commandersPlaceCopy.title);
    expect(phone).toHaveTextContent("Jace, Multiverse Architect");
    expect(phone).toHaveTextContent("84");
    expect(phone).toHaveTextContent("Y'shtola, Night's Blessed");
    expect(phone).toHaveTextContent("79");
    expect(phone).not.toHaveTextContent("Tam, the Possibility");
    expect(phone).toHaveTextContent("Jace, Multiverse Architect read.");
  });

  it("is labelled as an example drawn with a made-up collection", () => {
    render(<HeroShot commanders={THREE} />);
    expect(screen.getByTestId("landing-phone")).toHaveAccessibleName(landingCopy.phone.label);
  });

  it("draws a row with no stored read as the art and name alone, never a made-up sentence", () => {
    render(<HeroShot commanders={[cmd("Jace, Multiverse Architect", { prose: null })]} />);
    expect(screen.getByTestId("landing-phone").querySelectorAll("p")).toHaveLength(0);
  });

  it("the side cards are phone-only and decorative", () => {
    const { container } = render(<HeroSideCards commanders={THREE} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild?.className).toContain("md:hidden");
  });

  it("draws no side cards when neither commander was read", () => {
    const { container } = render(<HeroSideCards commanders={[cmd("Tam, the Possibility")]} />);
    expect(container.firstElementChild).toBeNull();
  });
});
