// /friends drawn (Social R1 PR C): the head and its name field, the friends list and its remove, the open links
// and the hold at ten, the receipt after Accept (E10), and every write's failure toast on the shared frame (E15).
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
vi.mock("../../app/friends/actions", () => a);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { FriendsView } from "./friends-view";
import { PodsPane } from "./pods-pane";
import { SocialToast } from "./social-toast";
import { socialCopy } from "../../lib/copy/social";
import { TOAST_MS } from "../collection/edit-toast";
import type { Friend } from "../../lib/social/access";

const NOW = new Date("2026-10-15T21:41:00Z");
const SOKKA = { oracleId: "o-sokka", name: "Sokka, Tenacious Tactician", artCropUri: "https://x/sokka.jpg", colorIdentity: ["W", "U"] };
/** SOKKA as the player's own face: the own read also carries the pick behind it. */
const OWN_SOKKA = { ...SOKKA, printingId: null, printingGone: false };
const DAVE: Friend = { publicId: "p-dave", displayName: "Dave", since: new Date("2026-10-02T12:00:00Z"), commander: SOKKA };
const JO: Friend = { publicId: "p-jo", displayName: "Jo", since: new Date("2026-09-14T12:00:00Z"), commander: null };
const link = (i: number, expiresAt = new Date("2026-10-22T21:41:00Z")) => ({
  token: `tok${String(i).padStart(19, "0")}`, createdAt: new Date("2026-10-15T21:41:00Z"), expiresAt,
});

function view(over: Partial<Parameters<typeof FriendsView>[0]> = {}) {
  return (
    <FriendsView
      profile={{ publicId: "p-me", displayName: "Hugh", commander: null }}
      friends={[DAVE, JO]}
      links={[]}
      accepted={null}
      origin="https://the-99.dev"
      nowMs={NOW.getTime()}
      maxLinks={10}
      {...over}
    />
  );
}

function draw(over: Partial<Parameters<typeof FriendsView>[0]> = {}) {
  return render(view(over));
}

beforeEach(() => {
  vi.resetAllMocks();
  a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
  a.revokeInviteAction.mockResolvedValue({ ok: true, changed: true });
});
afterEach(cleanup);

const alert = () => screen.getByRole("alert");

describe("the head", () => {
  it("names you as friends see you, and offers the commander while none is set", () => {
    draw();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    expect(screen.getByText("Hugh").tagName).toBe("B");
    // The dashed tile, the line's press at desktop and the line under the head at phone (one shown per width).
    expect(screen.getAllByRole("button", { name: socialCopy.commander.choose })).toHaveLength(3);
  });

  it("draws your face with its Change label once one is set, and no Choose", () => {
    draw({ profile: { publicId: "p-me", displayName: "Hugh", commander: OWN_SOKKA } });
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeTruthy();
    expect(screen.queryByRole("button", { name: socialCopy.commander.choose })).toBeNull();
  });

  it("saves a changed name, capped by code points, and draws it", async () => {
    a.setDisplayNameAction.mockResolvedValue({ ok: true, displayName: "Hugh H." });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "🐉".repeat(31) } });
    expect([...field.value]).toHaveLength(30);
    fireEvent.change(field, { target: { value: "Hugh H." } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(a.setDisplayNameAction).toHaveBeenCalledTimes(1);
    expect(a.setDisplayNameAction).toHaveBeenCalledWith("Hugh H.");
    expect(screen.getByText("Hugh H.").tagName).toBe("B");
  });

  it("puts the name back on Escape, and on an empty or unchanged one, without a write", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Someone" } });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save }));
    expect(a.setDisplayNameAction).not.toHaveBeenCalled();
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("keeps the field and its draft on an Escape that cancels an IME composition", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "ヒュー" } });
    fireEvent.keyDown(field, { key: "Escape", isComposing: true });
    expect(screen.getByLabelText(socialCopy.page.nameField.label)).toHaveValue("ヒュー");
  });

  it("toasts a name that could not be saved, and puts the old one back", async () => {
    a.setDisplayNameAction.mockResolvedValue({ ok: false, reason: "invalid" });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(alert().textContent).toContain(socialCopy.page.nameField.failed);
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("toasts a commander that could not be saved, and keeps the face it had", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockRejectedValue(new Error("down"));
    draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    expect(a.setCommanderAction).toHaveBeenCalledWith(SOKKA.oracleId);
    expect(alert().textContent).toContain(socialCopy.commander.failed);
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
  });

  it("cancels the name on a browser that focuses no clicked button (Safari), without a write", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Someone" } });
    const cancel = screen.getByRole("button", { name: socialCopy.page.nameField.cancel });
    // Safari: the press focuses nothing, so the field blurs with no relatedTarget unless the mousedown is held.
    if (fireEvent.mouseDown(cancel)) fireEvent.blur(field, { relatedTarget: null });
    fireEvent.click(cancel);
    expect(a.setDisplayNameAction).not.toHaveBeenCalled();
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("rings the face while the picker is open, and puts focus on it once a pick removes the opener", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockResolvedValue({ ok: true });
    draw();
    const chooses = screen.getAllByRole("button", { name: socialCopy.commander.choose });
    const face = chooses[0];
    // The line's press under the head: it is gone once a commander is set.
    fireEvent.click(chooses[2]);
    expect(face.hasAttribute("data-picking")).toBe(true);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(face.hasAttribute("data-picking")).toBe(false);
    expect(face.getAttribute("aria-label")).toBe(socialCopy.commander.changeAria(SOKKA.name));
    expect(document.activeElement).toBe(face);
  });

  it("refuses a second rename while one is in flight, and a failure puts back the saved name", async () => {
    const answers: ((v: unknown) => void)[] = [];
    a.setDisplayNameAction.mockImplementation(() => new Promise((r) => answers.push(r)));
    draw();
    for (const next of ["First", "Second"]) {
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: next } });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    }
    // The second save is refused while the first is in flight: one write, and the first value stands.
    expect(a.setDisplayNameAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("First").tagName).toBe("B");
    await act(async () => answers[0]({ ok: false, reason: "invalid" }));
    expect(screen.getByText("Hugh").tagName).toBe("B");
    expect(screen.queryByText("Second")).toBeNull();
  });

  it("refuses a second pick while one is in flight, and a failure puts back the saved face", async () => {
    const AANG = { oracleId: "o-aang", name: "Avatar Aang", artCropUri: "https://x/aang.jpg", colorIdentity: ["W", "U", "B", "R", "G"] };
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA, AANG] });
    const answers: ((v: unknown) => void)[] = [];
    a.setCommanderAction.mockImplementation(() => new Promise((r) => answers.push(r)));
    draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const sokka = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(sokka));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) }));
    const aang = await screen.findByRole("button", { name: AANG.name });
    await act(async () => fireEvent.click(aang));
    // The second pick is refused while the first is in flight: one write, and Sokka's face stands.
    expect(a.setCommanderAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeTruthy();
    await act(async () => answers[0]({ ok: false }));
    // No commander was ever saved: the face is the dashed tile again.
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
    expect(screen.getAllByRole("button", { name: socialCopy.commander.choose })).toHaveLength(3);
  });

  it("leaves focus where the reader moved it when the name field blurs, and on Change only when it fell to the page", async () => {
    a.setDisplayNameAction.mockReturnValue(new Promise(() => {}));
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    draw();
    const frame = async () => act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    // Escape removes the field and focus falls to the page: it goes back to Change.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.keyDown(screen.getByLabelText(socialCopy.page.nameField.label), { key: "Escape" });
    await frame();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Change" }));
    // While editing, the reader presses the face: the field blurs to it, the picker opens and takes focus.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "New" } });
    const face = screen.getAllByRole("button", { name: socialCopy.commander.choose })[0];
    face.focus();
    fireEvent.click(face);
    await frame();
    const search = screen.getByRole("combobox", { name: socialCopy.commander.search });
    expect(document.activeElement).toBe(search);
  });

  it("a toast that replaces a hovered one, with no leave fired, still counts down", async () => {
    vi.useFakeTimers();
    try {
      a.setDisplayNameAction.mockResolvedValue({ ok: false, reason: "invalid" });
      draw();
      for (const next of ["One", "Two"]) {
        fireEvent.click(screen.getByRole("button", { name: "Change" }));
        fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: next } });
        await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
        // The first toast is hovered and then replaced: no pointer leave reaches it.
        if (next === "One") fireEvent.pointerEnter(alert());
      }
      act(() => {
        vi.advanceTimersByTime(TOAST_MS + 500);
      });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds the toast's window while it is hovered or holds focus, and runs it once both let go", async () => {
    vi.useFakeTimers();
    try {
      a.setDisplayNameAction.mockResolvedValue({ ok: false, reason: "invalid" });
      draw();
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
      const toast = alert();
      fireEvent.pointerEnter(toast);
      fireEvent.focus(toast);
      act(() => {
        vi.advanceTimersByTime(TOAST_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeNull();
      // The pointer leaves; focus still holds it.
      fireEvent.pointerLeave(toast);
      act(() => {
        vi.advanceTimersByTime(TOAST_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeNull();
      fireEvent.blur(toast, { relatedTarget: null });
      act(() => {
        vi.advanceTimersByTime(TOAST_MS + 500);
      });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("an equivalent redraw while a pick is pending still lets a failed pick put back the saved face", async () => {
    let answer: (v: unknown) => void = () => {};
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockReturnValue(new Promise((r) => { answer = r; }));
    const { rerender } = draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    rerender(view({ profile: { publicId: "p-me", displayName: "Hugh", commander: null } }));
    await act(async () => answer({ ok: false }));
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
    expect(alert().textContent).toContain(socialCopy.commander.failed);
  });

  it("a name save that answers after a newer redraw does not overwrite it", async () => {
    let answer: (v: unknown) => void = () => {};
    a.setDisplayNameAction.mockReturnValue(new Promise((r) => { answer = r; }));
    const { rerender } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "First" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    rerender(view({ profile: { publicId: "p-me", displayName: "Second", commander: null } }));
    await act(async () => answer({ ok: true, displayName: "First" }));
    expect(screen.getByText("Second").tagName).toBe("B");
    expect(screen.queryByText("First")).toBeNull();
  });

  it("a commander save that answers after a newer redraw does not overwrite it", async () => {
    const AANG = { oracleId: "o-aang", name: "Avatar Aang", artCropUri: "https://x/aang.jpg", colorIdentity: ["W", "U", "B", "R", "G"] };
    let answer: (v: unknown) => void = () => {};
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockReturnValue(new Promise((r) => { answer = r; }));
    const { rerender } = draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    rerender(view({ profile: { publicId: "p-me", displayName: "Hugh", commander: { ...AANG, printingId: null, printingGone: false } } }));
    await act(async () => answer({ ok: true }));
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(AANG.name) })).toBeTruthy();
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
  });

  it("follows the server's redraw of the name and the face, keeping a pending name only until it lands", async () => {
    a.setDisplayNameAction.mockReturnValue(new Promise(() => {}));
    const { rerender } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(screen.getByText("New").tagName).toBe("B");
    // The same profile drawn again changes nothing: the pending name stands.
    rerender(view({ profile: { publicId: "p-me", displayName: "Hugh", commander: null } }));
    expect(screen.getByText("New").tagName).toBe("B");
    // The redraw lands, from this write or another tab's: the head takes it.
    rerender(view({ profile: { publicId: "p-me", displayName: "Hugh H.", commander: OWN_SOKKA } }));
    expect(screen.getByText("Hugh H.").tagName).toBe("B");
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeTruthy();
  });
});

describe("the friends list", () => {
  it("draws each friend by name, with the commander's name and the since", () => {
    draw();
    const rows = document.querySelectorAll("[data-friend-row]");
    expect([...rows].map((r) => r.textContent)).toEqual([
      expect.stringContaining("DaveSokka, Tenacious Tacticiansince Oct 2"),
      expect.stringContaining("JOJosince Sep 14"),
    ]);
    expect(screen.getByRole("heading", { name: socialCopy.friends.head(2) })).toBeTruthy();
  });

  it("draws the empty box, with no search, and no open links section", () => {
    draw({ friends: [] });
    expect(screen.getByText(socialCopy.friends.emptyTitle)).toBeTruthy();
    expect(screen.getByText(socialCopy.friends.emptyBody)).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Open friend links/ })).toBeNull();
  });

  it("removes a friend through the menu and the shared pane, Keep it first", async () => {
    a.unfriendAction.mockResolvedValue({ ok: true });
    draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria("Dave") }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    expect(screen.getByText(socialCopy.friends.removeHeading("Dave"))).toBeTruthy();
    expect(screen.getByText(socialCopy.friends.removeBody("Dave"))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.removeConfirm })));
    expect(a.unfriendAction).toHaveBeenCalledWith("p-dave");
    expect(document.querySelectorAll("[data-friend-row]")).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("toasts a removal that failed, and keeps the row", async () => {
    a.unfriendAction.mockRejectedValue(new Error("down"));
    draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria("Jo") }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.removeConfirm })));
    expect(alert().textContent).toContain(socialCopy.friends.removeFailed);
    expect(document.querySelectorAll("[data-friend-row]")).toHaveLength(2);
  });

  it("puts focus on the Friends heading after a removal, the last friend's included", async () => {
    a.unfriendAction.mockResolvedValue({ ok: true });
    draw();
    for (const [name, left] of [["Dave", 1], ["Jo", 0]] as const) {
      fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria(name) }));
      fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
      await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.removeConfirm })));
      expect(screen.getByRole("heading", { name: socialCopy.friends.head(left) })).toHaveFocus();
    }
  });

  it("draws a removed friend again when a later redraw lists them (they accepted a new link)", async () => {
    a.unfriendAction.mockResolvedValue({ ok: true });
    const { rerender } = draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria("Dave") }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.removeConfirm })));
    expect(document.querySelectorAll("[data-friend-row]")).toHaveLength(1);
    rerender(view({ friends: [DAVE, JO] }));
    expect(document.querySelectorAll("[data-friend-row]")).toHaveLength(2);
  });
});

describe("the receipt after Accept (E10)", () => {
  it("names the friend, marks their since, and closes", () => {
    draw({ accepted: { ...DAVE, since: NOW } , friends: [{ ...DAVE, since: NOW }, JO] });
    const strip = screen.getByRole("status");
    expect(strip.textContent).toContain(socialCopy.page.accepted("Dave"));
    expect(screen.getByText(socialCopy.friends.since("today")).className).toContain("--success");
    fireEvent.click(within(strip).getByRole("button", { name: socialCopy.page.close }));
    expect(screen.queryByText(socialCopy.page.accepted("Dave"))).toBeNull();
  });

  it("drops the receipt when a redraw no longer resolves that friend, and keeps a closed one closed", () => {
    const dave = { ...DAVE, since: NOW };
    const { rerender } = draw({ accepted: dave, friends: [dave, JO] });
    rerender(view({ accepted: null, friends: [JO] }));
    expect(screen.queryByText(socialCopy.page.accepted("Dave"))).toBeNull();
    rerender(view({ accepted: JO, friends: [JO] }));
    expect(screen.getByRole("status").textContent).toContain(socialCopy.page.accepted("Jo"));
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: socialCopy.page.close }));
    rerender(view({ accepted: JO, friends: [JO, DAVE] }));
    expect(screen.queryByText(socialCopy.page.accepted("Jo"))).toBeNull();
  });
});

describe("friend links", () => {
  it("lists the open ones with their time left, under a day in the warning colour", () => {
    // A link made a moment ago has a minute under seven days: it reads 7, as the boards draw it.
    draw({ links: [link(1, new Date(NOW.getTime() + 7 * 86_400_000 - 60_000)), link(2, new Date("2026-10-16T09:00:00Z"))] });
    expect(screen.getByRole("heading", { name: socialCopy.invites.head(2) })).toBeTruthy();
    expect(screen.getByText("7 days left")).toBeTruthy();
    expect(screen.getByText("Under a day left").className).toContain("--warning");
  });

  it("dates a link made after a redraw against that redraw's clock, not the first load's", () => {
    const { rerender } = draw();
    const later = new Date(NOW.getTime() + 13 * 3_600_000);
    rerender(view({ nowMs: later.getTime(), links: [link(1, new Date(later.getTime() + 7 * 86_400_000))] }));
    expect(screen.getByText("7 days left")).toBeTruthy();
  });

  it("revokes at once, with no confirm, and the row leaves", async () => {
    draw({ links: [link(1)] });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Revoke the link made/ })));
    expect(a.revokeInviteAction).toHaveBeenCalledWith(link(1).token);
    expect(document.querySelectorAll("[data-link-row]")).toHaveLength(0);
  });

  it("puts a link back, with a toast, when the revoke fails or is refused", async () => {
    a.revokeInviteAction.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ ok: false, reason: "off" });
    draw({ links: [link(1)] });
    for (let i = 0; i < 2; i++) {
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Revoke the link made/ })));
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(1);
      expect(alert().textContent).toContain(socialCopy.invites.revokeFailed);
    }
  });

  it("lets go of a held Add a friend when one of the ten expires while the page is open", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      draw({ links: [...Array.from({ length: 9 }, (_, i) => link(i)), link(9, new Date(NOW.getTime() + 60_000))] });
      expect(screen.getByRole("button", { name: socialCopy.page.invite }).getAttribute("aria-disabled")).toBe("true");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000);
      });
      expect(screen.getByRole("button", { name: socialCopy.page.invite }).getAttribute("aria-disabled")).toBeNull();
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(9);
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits only what is left for a link put back by a failed revoke", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      a.revokeInviteAction.mockRejectedValueOnce(new Error("down"));
      const soon = link(9, new Date(NOW.getTime() + 60_000));
      draw({ links: [...Array.from({ length: 9 }, (_, i) => link(i)), soon] });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50_000);
      });
      const rows = Array.from(document.querySelectorAll("[data-link-row]"));
      await act(async () => fireEvent.click(within(rows[9] as HTMLElement).getByRole("button", { name: /^Revoke the link made/ })));
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(10);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11_000);
      });
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(9);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops every link that expired while the tab slept, on one late wake", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      draw({ links: [link(1), link(2, new Date(NOW.getTime() + 60_000)), link(3, new Date(NOW.getTime() + 120_000))] });
      vi.setSystemTime(NOW.getTime() + 200_000);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns a row to its last day on the minute tick, with no redraw", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      draw({ links: [link(1, new Date(NOW.getTime() + 86_400_000 + 30_000))] });
      expect(screen.getByText("1 day left")).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(screen.getByText("Under a day left").className).toContain("--warning");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns focus to Add a friend when a link made from Try again is closed", async () => {
    a.createInviteAction
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ ok: true, token: "t", url: "https://the-99.dev/friend/t", expiresAt: new Date("2026-10-22T21:41:00Z") });
    draw();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.invites.retry })));
    const dialog = screen.getByRole("dialog", { name: socialCopy.dialog.title });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: socialCopy.dialog.close })));
    expect(screen.getByRole("button", { name: socialCopy.page.invite })).toHaveFocus();
  });

  it("moves focus to Add a friend when the last link is revoked", async () => {
    draw({ links: [link(1)] });
    const revoke = screen.getByRole("button", { name: /^Revoke the link made/ });
    revoke.focus();
    await act(async () => fireEvent.click(revoke));
    expect(document.querySelectorAll("[data-link-row]")).toHaveLength(0);
    expect(screen.getByRole("button", { name: socialCopy.page.invite })).toHaveFocus();
  });

  it("returns focus to Show while its row stands, and to Add a friend once the link expired under the dialog", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      draw({ links: [link(1), link(2, new Date(NOW.getTime() + 30_000))] });
      const shows = screen.getAllByRole("button", { name: /^Show the link made/ });
      shows[0].focus();
      fireEvent.click(shows[0]);
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: socialCopy.dialog.close }));
      expect(shows[0]).toHaveFocus();
      shows[1].focus();
      fireEvent.click(shows[1]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(document.querySelectorAll("[data-link-row]")).toHaveLength(1);
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: socialCopy.dialog.close }));
      expect(screen.getByRole("button", { name: socialCopy.page.invite })).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  it("makes a link from the pod sheet's no-friends Add a friend, and opens the dialog on it", async () => {
    a.createInviteAction.mockResolvedValue({ ok: true, token: "t", url: "https://the-99.dev/friend/t", expiresAt: new Date("2026-10-22T21:41:00Z") });
    const me = { publicId: "p-me", displayName: "Hugh", joinedAt: NOW, isOwner: true, isYou: true, isFriend: false, commander: null };
    const pod = { id: "pod-1", name: "Thursday", isOwner: true, members: [me], nextOwner: null };
    draw({ friends: [], pods: <PodsPane pods={[pod]} sharedIds={[]} friends={[]} /> });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.pods.addFriends })));
    const sheet = screen.getByRole("dialog");
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: socialCopy.page.invite })));
    expect(a.createInviteAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
  });

  it("clears an earlier Try again when a new make starts, so it cannot make a second link", async () => {
    a.createInviteAction.mockRejectedValueOnce(new Error("down")).mockReturnValueOnce(new Promise(() => {}));
    draw();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
    expect(screen.getByRole("button", { name: socialCopy.invites.retry })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
    expect(screen.queryByRole("button", { name: socialCopy.invites.retry })).toBeNull();
    expect(a.createInviteAction).toHaveBeenCalledTimes(2);
  });

  it("holds Add a friend at ten, with the reason joined to it", () => {
    draw({ links: Array.from({ length: 10 }, (_, i) => link(i)) });
    const button = screen.getByRole("button", { name: socialCopy.page.invite });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const reason = document.getElementById(button.getAttribute("aria-describedby")!)!;
    expect(reason.textContent).toBe(socialCopy.page.held);
    fireEvent.click(button);
    expect(a.createInviteAction).not.toHaveBeenCalled();
  });

  it("reads Making a link… while the call is out, ignores a second press, and opens the dialog on the token", async () => {
    let answer!: (v: unknown) => void;
    a.createInviteAction.mockReturnValue(new Promise((r) => (answer = r)));
    draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite }));
    const pending = screen.getByRole("button", { name: socialCopy.page.invitePending });
    fireEvent.click(pending);
    expect(a.createInviteAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => answer({ ok: true, token: "t", url: "https://the-99.dev/friend/t", expiresAt: new Date("2026-10-22T21:41:00Z") }));
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: socialCopy.dialog.linkAria }) as HTMLInputElement).value).toBe("https://the-99.dev/friend/t");
  });

  it("toasts tooMany with no retry, and a failed make with Try again", async () => {
    a.createInviteAction.mockResolvedValueOnce({ ok: false, reason: "tooMany" });
    draw();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
    expect(alert().textContent).toBe(socialCopy.invites.tooMany);
    a.createInviteAction.mockRejectedValueOnce(new Error("down"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.invite })));
    expect(alert().textContent).toContain(socialCopy.invites.createFailed);
    a.createInviteAction.mockResolvedValueOnce({ ok: true, token: "t", url: "https://x/friend/t", expiresAt: new Date("2026-10-22T21:41:00Z") });
    await act(async () => fireEvent.click(within(alert()).getByRole("button", { name: socialCopy.invites.retry })));
    expect(a.createInviteAction).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
  });

  it("shows an open link's own address from the request's origin", () => {
    draw({ links: [link(1)] });
    fireEvent.click(screen.getByRole("button", { name: /^Show the link made/ }));
    expect((screen.getByRole("textbox", { name: socialCopy.dialog.linkAria }) as HTMLInputElement).value).toBe(`https://the-99.dev/friend/${link(1).token}`);
  });
});

describe("the shared failure toast", () => {
  it("draws the decline failure on the same frame, as an alert", () => {
    render(<SocialToast toast={{ id: 1, text: socialCopy.landing.declineFailed }} onDone={() => {}} />);
    expect(alert().textContent).toBe(socialCopy.landing.declineFailed);
  });
});
