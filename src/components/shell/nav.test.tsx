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
});
