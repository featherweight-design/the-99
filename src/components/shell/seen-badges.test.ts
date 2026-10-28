// The Friends badge after a /friends visit (menu and Home PR 7b): the shell is in the root layout, which a client
// navigation does not render again, so the bar itself clears the count it drew once the reader has been to /friends and
// left. The board draws the badge ON /friends, so it holds there; a new count from the server starts over.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { useSeenBadges, type NavBadges } from "./nav";
import { announceAnswerSeen } from "./answer-seen";

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

  it("clears only the seen half: spare requests waiting on the reader stay until answered", () => {
    const badges = { friends: 2, friendsWaiting: 1 };
    const { result, rerender } = hook(badges, "/friends");
    rerender({ badges, pathname: "/decks" });
    expect(result.current?.friends).toBe(0);
    expect(result.current?.friendsWaiting).toBe(1);
  });

  it("shows a new count from the server again, even after a visit", () => {
    const { result, rerender } = hook({ friends: 1 }, "/friends");
    rerender({ badges: { friends: 1 }, pathname: "/decks" });
    expect(result.current?.friends).toBe(1);
  });

  it("leaves Home's count alone off Home, and drops it once the reader has been on Home", () => {
    const badges = { home: 4, friends: 1 };
    const { result, rerender } = hook(badges, "/friends");
    rerender({ badges, pathname: "/decks" });
    expect(result.current).toEqual({ home: 4, friends: 0 });
    rerender({ badges, pathname: "/" });
    expect(result.current).toEqual({ home: 0, friends: 0 });
    rerender({ badges, pathname: "/decks" });
    expect(result.current).toEqual({ home: 0, friends: 0 });
    // A new count from the server starts Home over.
    const next = { home: 2 };
    rerender({ badges: next, pathname: "/decks" });
    expect(result.current).toEqual({ home: 2 });
  });

  it("drops Friends' seen half by each answer opened over Home that the count held, until the server sends a new count", () => {
    const AT = "2026-10-28T05:00:00.000Z";
    const badges = { friends: 2, friendsWaiting: 1, friendsAt: AT };
    const { result, rerender } = hook(badges, "/");
    act(() => announceAnswerSeen("2026-10-28T04:00:00.000Z"));
    expect(result.current?.friends).toBe(1);
    expect(result.current?.friendsWaiting).toBe(1);
    // Answered after the count was read: it was never in it, so the trade match it would hide stays counted.
    act(() => announceAnswerSeen("2026-10-28T05:30:00.000Z"));
    expect(result.current?.friends).toBe(1);
    act(() => { announceAnswerSeen(AT); announceAnswerSeen("2026-10-28T03:00:00.000Z"); });
    expect(result.current?.friends).toBe(0);
    const next = { friends: 1, friendsAt: "2026-10-28T06:00:00.000Z" };
    rerender({ badges: next, pathname: "/" });
    expect(result.current?.friends).toBe(1);
  });
});
