import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingStats } from "../../lib/public/landing-stats";
import { numbersOf, Landing } from "./landing";

const FULL = { commanders: 3469, commandersWithProse: 3379, precons: 206, combos: 114223, cards: 35986 };
const action = vi.fn(async () => ({ ok: true as const }));
const draw = (stats: LandingStats = FULL, commanders: Parameters<typeof Landing>[0]["commanders"] = []) =>
  render(<Landing stats={stats} commanders={commanders} launchAction={action} />);

describe("numbersOf", () => {
  it("draws the five figures with thousands separators, in the strip's order", () => {
    expect(numbersOf(FULL)?.map((f) => f.value)).toEqual(["3,469", "3,379", "206", "114,223", "35,986"]);
  });

  it("drops the whole strip when any one count is missing, never a zero", () => {
    for (const key of Object.keys(FULL) as (keyof typeof FULL)[]) {
      const { [key]: _gone, ...rest } = FULL;
      expect(numbersOf(rest)).toBeNull();
    }
    expect(numbersOf({})).toBeNull();
    // A real zero is still a read figure: only an absent key drops the strip.
    expect(numbersOf({ ...FULL, precons: 0 })?.[2]?.value).toBe("0");
  });
});

describe("Landing", () => {
  it("draws the sections in order: top bar, hero, numbers, close, credit line", () => {
    draw();
    const main = screen.getByTestId("landing");
    const order = [...main.children].map((e) => e.tagName.toLowerCase() + (e.getAttribute("data-testid") ? `:${e.getAttribute("data-testid")}` : ""));
    expect(order).toEqual(["header", "section", "section:landing-numbers", "section", "p"]);
    expect(within(main).getByRole("heading", { level: 1 }).textContent).toBe(landingCopy.hero.title);
    expect(within(main).getByRole("heading", { level: 2, name: landingCopy.close.title })).toBeInTheDocument();
    expect(screen.getByText(landingCopy.footer.credit)).toBeInTheDocument();
  });

  it("leaves the strip out when a count failed, and draws everything else", () => {
    const { commanders: _c, ...partial } = FULL;
    draw(partial);
    expect(screen.queryByTestId("landing-numbers")).toBeNull();
    expect(screen.getAllByTestId("launch-panel")).toHaveLength(2);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("has the launch panel in the hero and again in the close, and Sign in as a link to the shared sign-in path", () => {
    draw();
    expect(screen.getAllByRole("button", { name: landingCopy.launch.press })).toHaveLength(2);
    expect(screen.getByRole("link", { name: landingCopy.topBar.signIn })).toHaveAttribute("href", "/sign-in");
  });

  it("repeats no Fan Content notice (the shell draws it)", () => {
    draw();
    expect(document.querySelector("[data-fan-content-notice]")).toBeNull();
  });

  it("draws the hero phone only for commanders that were read, and no phone for none", () => {
    draw(FULL, []);
    expect(screen.queryByTestId("landing-phone")).toBeNull();
    draw(FULL, [{ name: "Jace, Multiverse Architect", colorIdentity: ["W", "U"], artCropUri: null, imageUri: null, prose: "A stored read." }]);
    expect(screen.getByTestId("landing-phone")).toHaveAttribute("aria-label", landingCopy.phone.label);
    expect(screen.getByText("A stored read.")).toBeInTheDocument();
  });
});
