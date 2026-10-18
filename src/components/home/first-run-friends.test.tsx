import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const actions = vi.hoisted(() => ({ createInviteAction: vi.fn() }));
vi.mock("../../app/friends/actions", () => actions);
vi.mock("../social/invite-sheet", () => ({
  InviteSheet: ({ screen }: { screen: string }) => <div role="dialog" aria-label="Invite chooser" data-screen={screen} />,
}));
vi.mock("../social/add-friend-dialog", () => ({
  AddFriendDialog: ({ url, onClose }: { url: string; onClose: () => void }) => (
    <div role="dialog" aria-label="Add a friend" data-url={url}>
      <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));
const watch = vi.hoisted(() => ({ useInviteWatch: vi.fn() }));
vi.mock("../social/use-invite-watch", () => watch);
// Step 1's upload flow calls into these at render; nothing here uploads.
vi.mock("../../app/collection/actions", () => ({ confirmUpload: vi.fn(), previewPaste: vi.fn(), previewUpload: vi.fn() }));
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: vi.fn() }));

import { socialCopy } from "../../lib/copy/social";
import { refreshCopy } from "../../lib/copy/refresh";
import { FirstRunFriendsRow, friendsRowState, type FirstRunFriendsProps } from "./first-run-friends";

const { FirstRunChecklist } = await import("./first-run");

const NOW = "2026-10-16T12:00:00.000Z";
const inDays = (d: number) => new Date(Date.parse(NOW) + d * 86_400_000);
const friend = (name: string) => ({ publicId: `pub-${name}`, displayName: name, commander: null });
const link = (expiresAt: Date, token = "t1") => ({ token, createdAt: new Date(NOW), expiresAt });
const props = (over: Partial<FirstRunFriendsProps> = {}): FirstRunFriendsProps => ({ friends: [], links: [], now: NOW, invites: null, ...over });
const c = socialCopy.checklist;
const row = (container: HTMLElement) => container.querySelector("[data-friends-row]")!;

describe("friendsRowState", () => {
  it("is done at one friend, a link open with none, and not done with neither", () => {
    expect(friendsRowState(0, 0)).toBe("todo");
    expect(friendsRowState(0, 1)).toBe("link");
    expect(friendsRowState(0, 3)).toBe("link");
    expect(friendsRowState(1, 0)).toBe("done");
    expect(friendsRowState(1, 2)).toBe("done");
  });
});

describe("FirstRunFriendsRow", () => {
  it("C1: Add your friends, with the line, and the whole row makes a link and opens the dialog on it", async () => {
    actions.createInviteAction.mockResolvedValue({ ok: true, token: "t9", url: "https://x/friend/t9", expiresAt: inDays(7) });
    const { container } = render(<FirstRunFriendsRow {...props()} />);
    expect(row(container).getAttribute("data-friends-row")).toBe("todo");
    const press = screen.getByRole("button", { name: new RegExp(`^${c.title}`) });
    expect(press.textContent).toContain(c.body);
    fireEvent.click(press);
    // Through `Making a link…`, as the /friends head's press.
    expect(press.textContent).toContain(socialCopy.page.invitePending);
    const dialog = await screen.findByRole("dialog", { name: "Add a friend" });
    expect(dialog.getAttribute("data-url")).toBe("https://x/friend/t9");
    expect(actions.createInviteAction).toHaveBeenCalledTimes(1);
  });

  it("C1 with invites on: the row opens /friends' chooser and makes nothing yet (addendum G4)", () => {
    actions.createInviteAction.mockClear();
    const invites = { left: 3, waiting: 0, liveQr: false, qrUntil: null, out: false };
    render(<FirstRunFriendsRow {...props({ invites })} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${c.title}`) }));
    expect(screen.getByRole("dialog", { name: "Invite chooser" }).getAttribute("data-screen")).toBe("choose");
    expect(actions.createInviteAction).not.toHaveBeenCalled();
  });

  it("C1 at the ten-link hold: says so in the toast and opens nothing", async () => {
    actions.createInviteAction.mockResolvedValue({ ok: false, reason: "tooMany" });
    render(<FirstRunFriendsRow {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${c.title}`) }));
    expect(await screen.findByText(socialCopy.invites.tooMany)).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Add a friend" })).toBeNull();
  });

  it("C2: a link open reads its time left, and the row's press is Show on that link", () => {
    actions.createInviteAction.mockClear();
    const { container } = render(<FirstRunFriendsRow {...props({ links: [link(inDays(6))] })} />);
    expect(row(container).getAttribute("data-friends-row")).toBe("link");
    expect(screen.getByText(`${socialCopy.home.links(1)} · 6 days left`).className).toContain("--fg-muted");
    const press = screen.getByRole("button", { name: c.rowAria("6 days left") });
    expect(press.getAttribute("aria-label")).toBe("Add your friends. Friend link open, 6 days left. Show the link");
    expect(press.textContent).toContain(socialCopy.invites.show);
    expect(row(container).querySelector(".rotate-45")).toBeTruthy(); // the diamond
    fireEvent.click(press);
    expect(screen.getByRole("dialog", { name: "Add a friend" }).getAttribute("data-url")).toMatch(/\/t1$/);
    expect(actions.createInviteAction).not.toHaveBeenCalled();
  });

  it("C2 under a day: the warning ink, and the aria reads it mid-sentence", () => {
    render(<FirstRunFriendsRow {...props({ links: [link(new Date(Date.parse(NOW) + 3_600_000))] })} />);
    expect(screen.getByText(`${socialCopy.home.links(1)} · Under a day left`).className).toContain("--warning");
    expect(screen.getByRole("button", { name: "Add your friends. Friend link open, under a day left. Show the link" })).toBeTruthy();
  });

  it("a spent link does not count: an expired one reads C1", () => {
    const { container } = render(<FirstRunFriendsRow {...props({ links: [link(inDays(-1))] })} />);
    expect(row(container).getAttribute("data-friends-row")).toBe("todo");
    expect(screen.queryByText(new RegExp(socialCopy.home.links(1)))).toBeNull();
  });

  it("C3: done at one friend, the accepted line and their face, and the row opens /friends", () => {
    const { container } = render(<FirstRunFriendsRow {...props({ friends: [friend("Colin")], links: [link(inDays(6))] })} />);
    expect(row(container).getAttribute("data-friends-row")).toBe("done");
    const press = screen.getByRole("link", { name: c.doneAria(socialCopy.page.accepted("Colin")) });
    expect(press.getAttribute("aria-label")).toBe("Friends. You and Colin are friends. Open Friends");
    expect(press.getAttribute("href")).toBe("/friends");
    expect(press.textContent).toContain(c.doneTitle);
    expect(press.querySelector("[data-face]")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("C3 with more than one friend counts them", () => {
    render(<FirstRunFriendsRow {...props({ friends: [friend("Colin"), friend("Dana"), friend("Eli")] })} />);
    expect(screen.getByRole("link", { name: c.doneAria("You have 3 friends.") })).toBeTruthy();
  });

  it("watches the reader's links, and a link accepted with its dialog open closes it and says so", () => {
    const { rerender } = render(<FirstRunFriendsRow {...props({ links: [link(inDays(6))] })} />);
    expect(watch.useInviteWatch.mock.calls.at(-1)![0]).toEqual(["t1"]);
    fireEvent.click(screen.getByRole("button", { name: c.rowAria("6 days left") }));
    const onEnded = watch.useInviteWatch.mock.calls.at(-1)![1] as (e: unknown[]) => void;
    act(() => { onEnded([{ token: "t1", friend: { publicId: "pub-Colin", displayName: "Colin" } }]); });
    expect(screen.queryByRole("dialog", { name: "Add a friend" })).toBeNull();
    // The redraw lands the friend: the row is done, and the toast survives the change of state.
    rerender(<FirstRunFriendsRow {...props({ friends: [friend("Colin")] })} />);
    expect(screen.getByRole("link", { name: c.doneAria(socialCopy.page.accepted("Colin")) })).toBeTruthy();
    expect(screen.getAllByText(socialCopy.page.accepted("Colin")).length).toBeGreaterThanOrEqual(2);
  });
});

describe("FirstRunChecklist · the Friends row", () => {
  it("draws no row with the switch off, and the kicker says Step 1 of 3", () => {
    const { container } = render(<FirstRunChecklist />);
    expect(container.querySelector("[data-friends-row]")).toBeNull();
    expect(screen.getByText(refreshCopy.firstRun.step(1, 3))).toBeTruthy();
  });

  it("draws the row last, after step 3, unnumbered, and the kicker still says Step 1 of 3", () => {
    const { container } = render(<FirstRunChecklist friends={props()} />);
    const friendsRow = row(container);
    expect(friendsRow).toBeTruthy();
    expect(screen.getByText(refreshCopy.firstRun.step(1, 3))).toBeTruthy();
    const step3 = screen.getByText(refreshCopy.firstRun.step3Title).closest("[role=group]")!;
    expect(step3.nextElementSibling).toBe(friendsRow);
    expect(friendsRow.nextElementSibling).toBeNull();
    expect(friendsRow.textContent).not.toMatch(/\d/);
  });
});
