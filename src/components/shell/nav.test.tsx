import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

const LABELS = ["Home", "Collection", "Commanders", "Discover", "Decks"];

let pathname = "/collection";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(() => {
  pathname = "/collection";
});

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

  // The mark is the crowned numeral, not the bare diamond the rail drew until
  // 2026-09-08 — that was the crown's middle diamond alone, which is also the
  // shape Discover's nav glyph is built from. Asserted by role and name rather
  // than a test-only attribute, so this covers the accessible name as well.
  it("carries the app mark once, at the top, not once per row", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const rail = container.querySelector("aside")!;
    const marks = within(rail).getAllByRole("img", { name: "The 99" });
    expect(marks).toHaveLength(1);
    // Before the Primary landmark, so a screen reader reads the app's name and
    // then the nav, rather than meeting the name somewhere inside it.
    const nav = within(rail).getByRole("navigation", { name: "Primary" });
    // A bitmask, so test the one bit — an equality check would break the day
    // either element gains an ancestor relationship to the other.
    expect(marks[0].compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("states the reason a locked item is locked, in its accessible name", () => {
    render(<NavRail locked theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getByRole("link", { name: "Decks: unlocks once a collection is read" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Home is never lockable.
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-disabled");
  });

  // /collection with no cards renders its empty state rather than redirecting,
  // so a locked slot can be the page the reader is on. Being unfollowable and
  // being current are separate facts, and only the first of them is locked.
  it("still marks a locked item as the current page when it is one", () => {
    const { container } = render(<NavRail locked theme="amonkhet" />);
    const item = screen.getByRole("link", {
      name: "Collection: unlocks once a collection is read",
    });
    expect(item).toHaveAttribute("aria-current", "page");
    // …without taking the active fill, which would advertise a destination the
    // reader cannot reach from here.
    expect(item.className).toContain("bg-transparent");
    expect(container.querySelector(".bg-elevated")).toBeNull();
  });

  // The two lanes are separate routes, so each marks itself current on its own
  // pathname and neither claims the other's.
  it("marks Discover current on the discover route, and Commanders not", () => {
    pathname = "/discover";
    render(<NavRail locked={false} theme="amonkhet" />);
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Commanders" })).not.toHaveAttribute("aria-current");
  });

  // The handoff takes locked items out of the tab order. An <a> without an
  // href is not focusable either, but it would still offer a dead navigation
  // target to a pointer; a <span> offers neither and keeps the name and role.
  it("does not leave a locked item focusable or navigable", () => {
    render(<NavRail locked theme="amonkhet" />);
    const item = screen.getByRole("link", { name: "Decks: unlocks once a collection is read" });
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

  // Discover sits after Commanders and before Decks: owned before unowned, and
  // the two commander lanes read as one shelf.
  it("renders the same five slots in the same order as the rail", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/collection", "/commanders", "/discover", "/decks"]);
  });

  // 320pt is the narrowest phone the bar is measured against, and `Commanders`
  // at the shipped 9px leaves 3.4px of air there. The label drops to 8.5px and
  // loses its tracking below 360px, which buys back 3px per label.
  it("shrinks the label below 360px so the longest one still clears", () => {
    render(<TabBar locked={false} />);
    const label = screen.getByText("Commanders");
    expect(label.className).toContain("max-[359px]:text-[8.5px]");
    expect(label.className).toContain("max-[359px]:tracking-normal");
  });

  it("states the unlock reason on locked tabs too", () => {
    render(<TabBar locked />);
    expect(
      screen.getByRole("link", { name: "Collection: unlocks once a collection is read" }),
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
    expect(railShapes).toHaveLength(5);
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
