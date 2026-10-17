import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/friends/actions", () => ({ createInviteAction: vi.fn() }));
vi.mock("../social/add-friend-dialog", () => ({
  AddFriendDialog: ({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: { current: HTMLElement | null } }) => (
    <div role="dialog"><button type="button" onClick={() => { onClose(); returnFocusRef.current?.focus(); }}>close</button></div>
  ),
}));
vi.mock("../social/use-invite-watch", () => ({ useInviteWatch: vi.fn() }));

import { socialCopy } from "../../lib/copy/social";
import { FriendsSection, seatPlan, type FriendsSectionProps } from "./friends-section";

const NOW = "2026-10-16T12:00:00.000Z";
const friend = (name: string) => ({ publicId: `pub-${name}`, displayName: name, commander: null });
const props = (over: Partial<FriendsSectionProps> = {}): FriendsSectionProps => ({
  you: { displayName: "Hugh", commander: null },
  friends: [],
  links: [],
  now: NOW,
  games: true,
  friendPages: true,
  ...over,
});
const inDays = (d: number) => new Date(Date.parse(NOW) + d * 86_400_000);
const seats = (c: HTMLElement) => [...c.querySelectorAll("[data-seat]")].map((s) => s.getAttribute("data-seat"));

describe("seatPlan", () => {
  it("fills five seats at every count, and counts past five", () => {
    expect(seatPlan(0)).toEqual({ faces: 0, more: 0, empty: 4 });
    expect(seatPlan(1)).toEqual({ faces: 1, more: 0, empty: 4 });
    expect(seatPlan(5)).toEqual({ faces: 5, more: 0, empty: 0 });
    expect(seatPlan(7)).toEqual({ faces: 4, more: 3, empty: 0 });
  });
});

describe("FriendsSection", () => {
  it("with no friends: your seat, four dashed seats, the line and Add a friend, and no /friends link", () => {
    const { container } = render(<FriendsSection {...props()} />);
    expect(screen.getByRole("heading", { name: socialCopy.home.head })).toBeTruthy();
    expect(screen.getByText(socialCopy.home.you)).toBeTruthy();
    // Your seat is hidden from screen readers, like the empty seats beside it.
    expect(screen.getByText(socialCopy.home.you).closest("li")?.getAttribute("aria-hidden")).toBe("true");
    expect(seats(container)).toEqual(["empty", "empty", "empty", "empty"]);
    expect(screen.getByText(`${socialCopy.home.invite} ${socialCopy.home.inviteMore(true)}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: socialCopy.page.invite })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /All friends/ })).toBeNull();
  });

  it("drops the game clause with Opponents off (G5)", () => {
    render(<FriendsSection {...props({ games: false })} />);
    expect(screen.getByText(`${socialCopy.home.invite} See their spares when you shop.`)).toBeTruthy();
  });

  it("with one friend: the count, All friends, their face opening their page, and four empty seats", () => {
    const { container } = render(<FriendsSection {...props({ friends: [friend("Colin")] })} />);
    expect(screen.getByRole("heading", { name: "Friends · 1" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /All friends/ }).getAttribute("href")).toBe("/friends");
    expect(screen.getByRole("link", { name: socialCopy.friends.openAria("Colin") }).getAttribute("href")).toBe("/friends/pub-Colin");
    expect(seats(container)).toHaveLength(4);
    expect(screen.queryByText(socialCopy.home.you)).toBeNull();
  });

  it("opens /friends from a face when a friend's own page is off", () => {
    render(<FriendsSection {...props({ friends: [friend("Colin")], friendPages: false })} />);
    expect(screen.getByRole("link", { name: socialCopy.friends.openAria("Colin") }).getAttribute("href")).toBe("/friends");
  });

  it("with seven friends: four faces and +3, a count the screen reader skips", () => {
    const seven = ["A", "B", "C", "D", "E", "F", "G"].map(friend);
    render(<FriendsSection {...props({ friends: seven })} />);
    expect(screen.getByRole("heading", { name: "Friends · 7" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /’s page$/ })).toHaveLength(4);
    const more = screen.getByText("+3");
    expect(more.closest("li")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("a link open: the line with time left and Show, and the first empty seat holds the diamond", () => {
    const { container } = render(<FriendsSection {...props({ links: [{ token: "t1", createdAt: new Date(NOW), expiresAt: inDays(6) }] })} />);
    const line = screen.getByText(socialCopy.home.links(1)).closest("p")!;
    expect(within(line).getByText("6 days left")).toBeTruthy();
    expect(within(line).getByText(socialCopy.invites.show)).toBeTruthy();
    expect(line.className).toContain("--fg-muted");
    expect(within(line).getByRole("button", { name: /^Show the link made / })).toBeTruthy();
    expect(seats(container)).toEqual(["held", "empty", "empty", "empty"]);
  });

  it("under a day left reads in the warning ink", () => {
    render(<FriendsSection {...props({ links: [{ token: "t1", createdAt: new Date(NOW), expiresAt: new Date(Date.parse(NOW) + 3_600_000) }] })} />);
    const line = screen.getByText(socialCopy.home.links(1)).closest("p")!;
    expect(within(line).getByText("Under a day left")).toBeTruthy();
    expect(line.className).toContain("--warning");
  });

  it("two links open: the count and See them, to /friends", () => {
    render(<FriendsSection {...props({ links: [{ token: "a", createdAt: new Date(NOW), expiresAt: inDays(2) }, { token: "b", createdAt: new Date(NOW), expiresAt: inDays(5) }] })} />);
    expect(screen.getByText(socialCopy.home.links(2))).toBeTruthy();
    expect(screen.getByRole("link", { name: /See them/ }).getAttribute("href")).toBe("/friends");
  });

  it("moves its clock on while mounted, so a link crossing into its last day turns to the warning ink", () => {
    vi.useFakeTimers({ now: Date.parse(NOW) });
    try {
      // One day and thirty seconds left at the server's draw: not yet under a day.
      const at = new Date(Date.parse(NOW) + 86_400_000 + 30_000);
      render(<FriendsSection {...props({ links: [{ token: "t1", createdAt: new Date(NOW), expiresAt: at }] })} />);
      const line = () => screen.getByText(socialCopy.home.links(1)).closest("p")!;
      expect(line().className).toContain("--fg-muted");
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(line().className).toContain("--warning");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns focus to Show when the dialog Show opened closes", () => {
    render(<FriendsSection {...props({ links: [{ token: "t1", createdAt: new Date(NOW), expiresAt: inDays(6) }] })} />);
    const show = screen.getByRole("button", { name: /^Show the link made / });
    show.focus();
    fireEvent.click(show);
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(document.activeElement).toBe(show);
  });

  it("ignores a link that has already expired", () => {
    const { container } = render(<FriendsSection {...props({ links: [{ token: "old", createdAt: new Date(NOW), expiresAt: inDays(-1) }] })} />);
    expect(screen.queryByText(socialCopy.home.links(1))).toBeNull();
    expect(seats(container)).not.toContain("held");
  });
});
