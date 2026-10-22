import { refreshCopy } from "../../lib/copy/refresh";
// The bar with the Commanders place (menu and Home handoff, R1 Menu; plan `2026-10-22-menu-home.md`, PR 2): Discover
// leaves it, Friends takes the fifth slot with `SOCIAL_FRIENDS_ENABLED`, Friends never locks, and the phone bracket
// spans the locked run alone. Off, the shipped bar stands; nav.test.tsx pins that whole.
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(),
}));

let pathname = "/";
vi.mock("./pending-push", () => ({ usePendingPush: () => ({ go: () => {} }) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: () => {} }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ redirectToUserProfile: vi.fn(), signOut: vi.fn() }),
}));

afterEach(() => {
  pathname = "/";
  document.body.innerHTML = "";
});

const FIRST_RUN = { hasDecks: false };
const primary = () => screen.getByRole("navigation", { name: "Primary" });
/** The bar's slots in document order: a live link's href, or a locked slot's label. */
const order = () =>
  Array.from(primary().querySelectorAll("a, button[data-locked-slot]")).map(
    (el) => el.getAttribute("data-locked-slot") ?? el.getAttribute("href"),
  );
const bracket = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-lock-bracket]")!;

describe("the bar's shape", () => {
  it("is the shipped bar with the Commanders place off, Friends or not", () => {
    render(<TabBar locked={false} friends />);
    expect(order()).toEqual(["/", "/collection", "/commanders", "/discover", "/decks"]);
    document.body.innerHTML = "";
    render(<NavRail locked={false} theme="amonkhet" friends />);
    expect(order()).toEqual(["/", "/collection", "/commanders", "/discover", "/decks"]);
  });

  it("drops Discover and puts Friends fifth, last, in both chromes", () => {
    render(<TabBar locked={false} commandersPlace friends />);
    expect(order()).toEqual(["/", "/collection", "/commanders", "/decks", "/friends"]);
    expect(within(primary()).getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
    document.body.innerHTML = "";
    render(<NavRail locked={false} theme="amonkhet" commandersPlace friends />);
    expect(order()).toEqual(["/", "/collection", "/commanders", "/decks", "/friends"]);
  });

  it("draws four slots with the Commanders place on and Friends off", () => {
    render(<TabBar locked={false} commandersPlace />);
    expect(order()).toEqual(["/", "/collection", "/commanders", "/decks"]);
  });

  it("draws Friends with its own glyph, at the others' geometry", () => {
    render(<TabBar locked={false} commandersPlace friends />);
    const svgs = [...primary().querySelectorAll("a svg")];
    const friends = within(primary()).getByRole("link", { name: "Friends" }).querySelector("svg")!;
    expect(friends.getAttribute("viewBox")).toBe("0 0 20 20");
    expect(friends.getAttribute("stroke-width")).toBe("1.5");
    expect(new Set(svgs.map((s) => s.innerHTML)).size).toBe(5);
  });
});

describe("the lock with the Commanders place", () => {
  it("never holds Friends: it stays a live link after the locked run on the phone", () => {
    render(<TabBar locked commandersPlace friends />);
    expect(order()).toEqual(["/", "Collection", "Commanders", "Decks", "/friends"]);
    expect(screen.queryByRole("button", { name: "Friends, locked" })).toBeNull();
  });

  it("holds Commanders and Decks alone with the lock open, Collection and Friends live either side", () => {
    render(<TabBar locked openLock={FIRST_RUN} commandersPlace friends />);
    expect(order()).toEqual(["/", "/collection", "Commanders", "Decks", "/friends"]);
  });

  it("puts Friends above the rail's well with Home, live, and names no Discover in a note", () => {
    const { container } = render(<NavRail locked openLock={FIRST_RUN} theme="amonkhet" commandersPlace friends />);
    const well = container.querySelector<HTMLElement>("[data-lock-well]")!;
    expect(within(well).getAllByRole("button", { name: /, locked$/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Commanders, locked",
      "Decks, locked",
    ]);
    const friends = within(primary()).getByRole("link", { name: "Friends" });
    expect(well.contains(friends)).toBe(false);
    // Drawn before the well, as the board's "Rail · first run" draws it.
    expect(friends.compareDocumentPosition(well) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Decks, locked" })).toHaveAccessibleDescription(
      "Decks opens once your cards are in. So do Commanders.",
    );
  });

  it("holds Collection too with the lock shut, as shipped", () => {
    const { container } = render(<NavRail locked theme="amonkhet" commandersPlace friends />);
    const well = container.querySelector<HTMLElement>("[data-lock-well]")!;
    expect(within(well).getAllByRole("button", { name: /, locked$/ })).toHaveLength(3);
    expect(within(primary()).getByRole("link", { name: "Friends" })).toBeInTheDocument();
  });
});

describe("the phone bracket spans the locked slots alone", () => {
  it.each([
    // [label, props, left, width]
    ["five slots, lock shut: tabs 2 to 4", { friends: true, openLock: null }, "20%", "60%"],
    ["five slots, lock open: tabs 3 to 4", { friends: true, openLock: FIRST_RUN }, "40%", "40%"],
    ["four slots, lock shut: tabs 2 to 4", { friends: false, openLock: null }, "25%", "75%"],
    ["four slots, lock open: tabs 3 to 4", { friends: false, openLock: FIRST_RUN }, "50%", "50%"],
  ] as const)("%s", (_, { friends, openLock }, left, width) => {
    const { container } = render(<TabBar locked commandersPlace friends={friends} openLock={openLock} />);
    expect(bracket(container).style.marginLeft).toBe(left);
    expect(bracket(container).style.width).toBe(width);
  });

  it("keeps the shipped spans with the Commanders place off", () => {
    const shut = render(<TabBar locked friends />);
    expect(bracket(shut.container).style.marginLeft).toBe("20%");
    expect(bracket(shut.container).style.width).toBe("80%");
    shut.unmount();
    const open = render(<TabBar locked friends openLock={FIRST_RUN} />);
    expect(bracket(open.container).style.marginLeft).toBe("40%");
    expect(bracket(open.container).style.width).toBe("60%");
  });
  it("says less over a two-slot run, where the full line would hide the bracket", () => {
    const label = (c: HTMLElement) => c.querySelector("[data-lock-bracket-label]")!;
    const two = render(<TabBar locked commandersPlace friends openLock={FIRST_RUN} />);
    expect(label(two.container)).toHaveTextContent(refreshCopy.firstRun.lock.tabBracketShort);
    two.unmount();
    const three = render(<TabBar locked commandersPlace friends openLock={null} />);
    expect(label(three.container)).toHaveTextContent(refreshCopy.firstRun.lock.tabBracket);
    three.unmount();
    const shipped = render(<TabBar locked friends openLock={FIRST_RUN} />);
    expect(label(shipped.container)).toHaveTextContent(refreshCopy.firstRun.lock.tabBracket);
  });
});

describe("the slot badge", () => {
  const badgeOn = (link: HTMLElement) => link.querySelector<HTMLElement>("[data-nav-badge]");
  // Off Home: on Home the Home count is the page being read, so it is not drawn (below).
  beforeEach(() => {
    pathname = "/decks";
  });

  it("draws the count as an accent pill with --bg ink, and says it in words", () => {
    render(<TabBar locked={false} commandersPlace friends badges={{ home: 3, friends: 1 }} />);
    const home = within(primary()).getByRole("link", { name: /^Home/ });
    expect(badgeOn(home)).toHaveTextContent(/^3$/);
    expect(badgeOn(home)).toHaveAttribute("aria-hidden", "true");
    expect(badgeOn(home)!.className).toContain("bg-[color:var(--accent)]");
    expect(badgeOn(home)!.className).toContain("text-[color:var(--bg)]");
    expect(badgeOn(home)!.className).toContain("h-[16px]");
    expect(home).toHaveAccessibleName("Home, 3 new");
    const friends = within(primary()).getByRole("link", { name: /^Friends/ });
    expect(badgeOn(friends)).toHaveTextContent(/^1$/);
    expect(friends).toHaveAccessibleName("Friends, 1 waiting on you");
  });

  it("adds the spare requests waiting on the reader to the Friends count", () => {
    render(<TabBar locked={false} commandersPlace friends badges={{ friends: 1, friendsWaiting: 2 }} />);
    const friends = within(primary()).getByRole("link", { name: /^Friends/ });
    expect(badgeOn(friends)).toHaveTextContent(/^3$/);
    expect(friends).toHaveAccessibleName("Friends, 3 waiting on you");
  });

  // Both bars clear the Friends count once the reader has been to /friends and left (useSeenBadges).
  it.each([
    ["the tab bar", (b: { home: number; friends: number }) => <TabBar locked={false} commandersPlace friends badges={b} />],
    ["the rail", (b: { home: number; friends: number }) => <NavRail locked={false} theme="amonkhet" commandersPlace friends badges={b} />],
  ])("clears the Friends count in %s after a /friends visit, and keeps Home's", (_bar, bar) => {
    const badges = { home: 2, friends: 1 };
    pathname = "/friends";
    const { rerender } = render(bar(badges));
    expect(within(primary()).getByRole("link", { name: "Friends, 1 waiting on you" })).toBeInTheDocument();
    pathname = "/decks";
    rerender(bar(badges));
    expect(within(primary()).getByRole("link", { name: "Friends" })).toBeInTheDocument();
    expect(within(primary()).getByRole("link", { name: "Home, 2 new" })).toBeInTheDocument();
  });

  it("caps the drawn count at 9+, and keeps the exact count in words", () => {
    render(<NavRail locked={false} theme="amonkhet" commandersPlace friends badges={{ home: 9, friends: 12 }} />);
    expect(badgeOn(within(primary()).getByRole("link", { name: "Home, 9 new" }))).toHaveTextContent(/^9$/);
    expect(badgeOn(within(primary()).getByRole("link", { name: "Friends, 12 waiting on you" }))).toHaveTextContent(/^9\+$/);
  });

  it("draws nothing at 0 or with no count, and the name is the label alone", () => {
    render(<NavRail locked={false} theme="amonkhet" commandersPlace friends badges={{ home: 0 }} />);
    expect(primary().querySelector("[data-nav-badge]")).toBeNull();
    expect(within(primary()).getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(within(primary()).getByRole("link", { name: "Friends" })).toBeInTheDocument();
  });

  it("clears Home's count on a Home visit, and keeps it cleared until the shell renders a new count", () => {
    const home = () => within(primary()).getByRole("link", { name: /^Home/ });
    const badges = { home: 3, friends: 1 };
    const { rerender } = render(<TabBar locked={false} commandersPlace friends badges={badges} />);
    expect(badgeOn(home())).toHaveTextContent(/^3$/);
    pathname = "/";
    rerender(<TabBar locked={false} commandersPlace friends badges={badges} />);
    expect(badgeOn(home())).toBeNull();
    expect(home()).toHaveAccessibleName("Home");
    // Friends' count is not Home's to clear.
    expect(badgeOn(within(primary()).getByRole("link", { name: /^Friends/ }))).toHaveTextContent(/^1$/);
    pathname = "/decks";
    rerender(<TabBar locked={false} commandersPlace friends badges={badges} />);
    expect(badgeOn(home())).toBeNull();
    rerender(<TabBar locked={false} commandersPlace friends badges={{ home: 2, friends: 1 }} />);
    expect(badgeOn(home())).toHaveTextContent(/^2$/);
  });

  it("sits clear of the pending pip, at the glyph's top-right", () => {
    render(<TabBar locked={false} badges={{ home: 2 }} />);
    const pill = primary().querySelector<HTMLElement>("[data-nav-badge]")!;
    expect(pill.className).toContain("top-[3px]");
    expect(pill.className).toContain("left-[calc(50%+4px)]");
  });
});
