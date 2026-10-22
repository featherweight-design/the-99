// The Friends badge after a /friends visit (menu and Home PR 7b): the shell is in the root layout, which a client
// navigation does not render again, so the bar itself clears the count it drew once the reader has been to /friends and
// left. The board draws the badge ON /friends, so it holds there; a new count from the server starts over.
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { useSeenBadges, type NavBadges } from "./nav";

const hook = (badges: NavBadges, pathname: string) =>
  renderHook((p: { badges: NavBadges; pathname: string }) => useSeenBadges(p.badges, p.pathname), { initialProps: { badges, pathname } });

describe("useSeenBadges", () => {
  it("keeps the count on /friends, where the board draws it, and clears it once the reader leaves", () => {
    const badges = { friends: 2 };
    const { result, rerender } = hook(badges, "/friends");
    expect(result.current?.friends).toBe(2);
    rerender({ badges, pathname: "/collection" });
    expect(result.current?.friends).toBe(0);
  });

  it("stays cleared on a return to /friends while the server has sent no new count", () => {
    const badges = { friends: 2 };
    const { result, rerender } = hook(badges, "/friends");
    rerender({ badges, pathname: "/decks" });
    rerender({ badges, pathname: "/friends" });
    expect(result.current?.friends).toBe(0);
  });

  it("keeps the count on every other page while /friends has not been visited", () => {
    const badges = { friends: 1 };
    const { result, rerender } = hook(badges, "/collection");
    rerender({ badges, pathname: "/decks" });
    expect(result.current?.friends).toBe(1);
  });

  it("shows a new count from the server again, even after a visit", () => {
    const { result, rerender } = hook({ friends: 1 }, "/friends");
    rerender({ badges: { friends: 1 }, pathname: "/decks" });
    expect(result.current?.friends).toBe(1);
  });

  it("leaves Home's count alone", () => {
    const badges = { home: 4, friends: 1 };
    const { result, rerender } = hook(badges, "/friends");
    rerender({ badges, pathname: "/" });
    expect(result.current).toEqual({ home: 4, friends: 0 });
  });
});
