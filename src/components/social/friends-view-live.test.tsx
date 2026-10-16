// /friends without a refresh: while the Add a friend dialog is open (or a link stands), the page watches the
// reader's own links; a friend who scans and accepts redraws the page and turns the dialog into Accept's receipt.
// Coming back to the window redraws it too.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({
  setDisplayNameAction: vi.fn(),
  setCommanderAction: vi.fn(),
  createInviteAction: vi.fn(),
  revokeInviteAction: vi.fn(),
  unfriendAction: vi.fn(),
  listDeckCommandersAction: vi.fn(),
  searchFaceCommandersAction: vi.fn(),
}));
const nav = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("../../app/friends/actions", () => a);
vi.mock("next/navigation", () => ({ useRouter: () => nav }));

import { FriendsView } from "./friends-view";
import { WATCH_MS } from "./use-invite-watch";
import { socialCopy } from "../../lib/copy/social";
import type { Friend } from "../../lib/social/access";

const NOW = new Date("2026-10-15T21:41:00Z");
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const DAVE: Friend = { publicId: "p-dave", displayName: "Dave", since: new Date("2026-10-02T12:00:00Z"), commander: null };
const fetchMock = vi.fn();

const MO: Friend = { publicId: "p-mo", displayName: "Mo", since: NOW, commander: null };
type Link = { token: string; createdAt: Date; expiresAt: Date };
const view = (friends: Friend[] = [DAVE], links: Link[] = []) => (
  <FriendsView
    profile={{ publicId: "p-me", displayName: "Hugh", commander: null }}
    friends={friends}
    links={links}
    accepted={null}
    origin="https://the-99.dev"
    nowMs={NOW.getTime()}
    maxLinks={10}
  />
);
function draw() {
  return render(view());
}
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const answer = (open: boolean, friend: { publicId: string; displayName: string } | null) =>
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ links: [{ token: TOKEN, open, friend }] }) });

async function openDialog() {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
  return screen.getByRole("dialog", { name: socialCopy.dialog.title });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(NOW);
  a.createInviteAction.mockResolvedValue({ ok: true, token: TOKEN, url: `https://the-99.dev/friend/${TOKEN}`, expiresAt: new Date("2026-10-22T21:41:00Z") });
  answer(true, null);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("/friends watches a shown link", () => {
  it("polls while the dialog is open, and stops once it closes with no link left open", async () => {
    draw();
    await tick(WATCH_MS * 2);
    expect(fetchMock).not.toHaveBeenCalled();
    const dialog = await openDialog();
    await tick(WATCH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/friend-invites?t=${TOKEN}`);
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: socialCopy.dialog.close })));
    await tick(WATCH_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("redraws the page when the link is redeemed, and turns the dialog into the receipt", async () => {
    draw();
    await openDialog();
    answer(false, { publicId: "p-mo", displayName: "Mo" });
    await tick(WATCH_MS);
    expect(nav.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(socialCopy.page.accepted("Mo"));
  });

  it("only redraws for a link that ended with no new friend, and leaves the dialog alone", async () => {
    draw();
    await openDialog();
    answer(false, { publicId: "p-dave", displayName: "Dave" });
    await tick(WATCH_MS);
    expect(nav.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
    expect(screen.queryByText(socialCopy.page.accepted("Dave"))).toBeNull();
  });

  it("polls nothing while the tab is hidden", async () => {
    const spy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    try {
      draw();
      await openDialog();
      await tick(WATCH_MS * 5);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("redraws the page when the window comes back into focus, at most once in a while", async () => {
    draw();
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(nav.refresh).toHaveBeenCalledTimes(1);
    await tick(10_000);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(nav.refresh).toHaveBeenCalledTimes(2);
  });
  it("still draws the receipt when the redraw with the new friend lands before the poll's answer", async () => {
    const { rerender } = draw();
    await openDialog();
    rerender(view([DAVE, MO]));
    answer(false, { publicId: "p-mo", displayName: "Mo" });
    await tick(WATCH_MS);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(socialCopy.page.accepted("Mo"));
  });

  it("keeps the receipt until a redraw lists the friend, and puts it away once a later one no longer does", async () => {
    const { rerender } = draw();
    await openDialog();
    answer(false, { publicId: "p-mo", displayName: "Mo" });
    await tick(WATCH_MS);
    rerender(view([DAVE]));
    expect(screen.getByRole("status")).toHaveTextContent(socialCopy.page.accepted("Mo"));
    rerender(view([DAVE, MO]));
    expect(screen.getByRole("status")).toHaveTextContent(socialCopy.page.accepted("Mo"));
    rerender(view([DAVE]));
    expect(screen.queryByText(socialCopy.page.accepted("Mo"))).toBeNull();
  });
  it("redraws for a link redeemed with no dialog open, even once the minute tick has dropped it, and draws no receipt", async () => {
    render(view([DAVE], [{ token: TOKEN, createdAt: NOW, expiresAt: new Date(NOW.getTime() + 30_000) }]));
    await tick(60_000);
    answer(false, { publicId: "p-mo", displayName: "Mo" });
    await tick(WATCH_MS);
    expect(nav.refresh).toHaveBeenCalled();
    expect(screen.queryByText(socialCopy.page.accepted("Mo"))).toBeNull();
  });

  it("still turns the dialog into the receipt when a redraw that dropped the link lands before the answer", async () => {
    const later = new Date("2026-10-22T21:41:00Z");
    const { rerender } = render(view([DAVE], [{ token: TOKEN, createdAt: NOW, expiresAt: later }]));
    fireEvent.click(screen.getByRole("button", { name: /^Show the link made/ }));
    rerender(view([DAVE, MO], []));
    answer(false, { publicId: "p-mo", displayName: "Mo" });
    await tick(WATCH_MS);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(socialCopy.page.accepted("Mo"));
  });
});
