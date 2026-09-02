import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

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
});
