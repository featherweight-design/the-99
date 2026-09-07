import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

const LABELS = ["Home", "Collection", "Commanders", "Decks"];

vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "Ana",
      lastName: "Ruiz",
      fullName: "Ana Ruiz",
      primaryEmailAddress: { emailAddress: "ana.ruiz@example.com" },
    },
  }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

describe("NavRail", () => {
  // The rail is `sticky`, which makes it a stacking context, so the account
  // popover's own z-index cannot lift it past the main column. Routes put
  // positive z-index on ordinary content — the collection filter bar is
  // `md:z-[2]`, a rec card's overlay is `z-[1]` — and that content comes later
  // in the DOM, so without a rank on the rail it paints over the open menu.
  it("outranks the main column, so an open popover is not painted over", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const rail = container.querySelector("aside");
    expect(rail?.className).toContain("z-30");
  });

  // Ranked below the tab bar, the menu's backdrop (z-45) and the modals (z-50),
  // all of which are meant to cover the rail rather than sit under it.
  it("ranks below the mobile tab bar", () => {
    render(<TabBar locked={false} />);
    const tabs = screen.getByRole("navigation", { name: "Primary" });
    expect(tabs.className).toContain("z-40");
  });

  it("is icon-only, so every item carries its label as an accessible name and a tooltip", () => {
    render(<NavRail locked={false} theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      const item = within(nav).getByRole("link", { name: label });
      expect(item).toHaveAttribute("title", label);
      // Icon-only: the label must NOT also sit in the row as visible text, or
      // the 62px rail overflows.
      expect(item).not.toHaveTextContent(label);
    }
  });

  it("carries the app mark once, not once per row", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    expect(container.querySelectorAll("[data-nav-diamond]")).toHaveLength(1);
  });

  it("states the reason a locked item is locked, in its accessible name", () => {
    render(<NavRail locked theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getByRole("link", { name: "Decks — unlocks once a collection is read" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Home is never lockable.
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-disabled");
  });

  // The handoff takes locked items out of the tab order. An <a> without an
  // href is not focusable either, but it would still offer a dead navigation
  // target to a pointer; a <span> offers neither and keeps the name and role.
  it("does not leave a locked item focusable or navigable", () => {
    render(<NavRail locked theme="amonkhet" />);
    const item = screen.getByRole("link", { name: "Decks — unlocks once a collection is read" });
    expect(item.tagName).toBe("SPAN");
    expect(item).not.toHaveAttribute("href");
    expect(item).not.toHaveAttribute("tabindex");
  });
});

describe("TabBar", () => {
  it("keeps its visible labels — the phone bar has room and the rail does not", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the same four slots in the same order as the rail", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/collection", "/commanders", "/decks"]);
  });

  it("states the unlock reason on locked tabs too", () => {
    render(<TabBar locked />);
    expect(
      screen.getByRole("link", { name: "Collection — unlocks once a collection is read" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  // Only the locked slot may override the name. An unlocked tab already shows
  // its label, so an aria-label there would be a second, competing copy of it.
  it("leaves an unlocked tab's name to its visible label", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const item of within(nav).getAllByRole("link")) {
      expect(item).not.toHaveAttribute("aria-label");
    }
  });
});

// One icon set for both chromes, so slot N cannot draw a different glyph in
// the rail than it does in the tab bar — the transposition the handoff says
// was caught in review once already.
describe("Nav glyphs", () => {
  it("draws the same shape in the same slot in both chromes", () => {
    const rail = render(<NavRail locked={false} theme="amonkhet" />);
    const railShapes = [...rail.container.querySelectorAll("nav a svg")].map((s) => s.innerHTML);
    const tabs = render(<TabBar locked={false} />);
    const tabShapes = [...tabs.container.querySelectorAll("nav a svg")].map((s) => s.innerHTML);
    expect(railShapes).toHaveLength(4);
    expect(tabShapes).toEqual(railShapes);
  });

  // 19px drawn on 20 units is what the handoff frames specify; reading the
  // viewBox off the rendered size instead rescales every stroke.
  it("renders 19px glyphs on the handoff's 20-unit viewBox", () => {
    const { container } = render(<TabBar locked={false} />);
    for (const svg of container.querySelectorAll("nav a svg")) {
      expect(svg.getAttribute("width")).toBe("19");
      expect(svg.getAttribute("viewBox")).toBe("0 0 20 20");
      expect(svg.getAttribute("stroke-width")).toBe("1.5");
    }
  });
});
