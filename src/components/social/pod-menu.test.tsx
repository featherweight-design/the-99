// The pod header's `…` menu (Social R1 PR E2; design table `social-r1-pods.md` §3b, §6 to §8): who sees which
// rows, roving focus, Rename in place of the header (blur commits, empty or unchanged reverts), and Leave and Delete
// through the shared confirm, with every write's failure put back and said in the shared toast.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  leave: vi.fn(),
  del: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));
vi.mock("../../app/friends/actions", () => ({
  createPodAction: vi.fn(),
  removeMemberAction: m.remove,
  shareSparesWithAction: vi.fn(),
  addMembersAction: vi.fn(),
  renamePodAction: m.rename,
  leavePodAction: m.leave,
  deletePodAction: m.del,
}));

import { PodsPane } from "./pods-pane";
import { socialCopy } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { folderCopy } from "../../lib/copy/folders";
import type { Friend, Pod, PodMember } from "../../lib/social/access";

const P = socialCopy.pods;
const ART = "https://cards.scryfall.io/art_crop/x.jpg";
const cmd = (name: string) => ({ oracleId: `o-${name}`, name, artCropUri: ART });
const member = (over: Partial<Omit<PodMember, "displayName">> & { displayName: string }): PodMember => ({
  publicId: `p-${over.displayName}`, joinedAt: new Date("2026-10-01"), isOwner: false, isYou: false, isFriend: true, commander: null, ...over, displayName: named(over.displayName),
});
const ME = member({ displayName: "Hugh", isYou: true, isFriend: false, commander: cmd("Atraxa") });
const DAVE = member({ displayName: "Dave", commander: cmd("Korvold") });
const PRIYA = member({ displayName: "Priya" });
const SAM = member({ displayName: "Sam", isFriend: false });
const friend = (displayName: string, commander: Friend["commander"] = null): Friend => ({
  publicId: `p-${displayName}`, displayName: named(displayName), since: new Date("2026-10-02"), commander,
});
const mine = (over: Partial<Pod> = {}): Pod => ({
  id: "pod-1", name: named("Thursday"), isOwner: true, members: [{ ...ME, isOwner: true }, DAVE, PRIYA], nextOwner: null, ...over,
});
const theirs = (over: Partial<Pod> = {}): Pod => ({
  id: "pod-2", name: named("Adventurers"), isOwner: false, members: [{ ...SAM, isOwner: true }, ME, DAVE], nextOwner: null, ...over,
});
const FRIENDS = [friend("Dave", cmd("Korvold")), friend("Priya"), friend("Zed"), friend("Alex", cmd("Ghalta"))];

const press = async (el: HTMLElement) => {
  await act(async () => { fireEvent.click(el); });
};

const trigger = (name: string) => screen.getByRole("button", { name: plain(P.menuAria(named(name))) });
const openMenu = async (name: string) => {
  // A real press starts with a pointerdown, which is what closes a menu open elsewhere.
  fireEvent.pointerDown(trigger(name));
  await press(trigger(name));
};
const rows = () => within(screen.getByRole("menu")).getAllByRole("menuitem").map((r) => r.textContent);
const names = () => screen.getAllByTestId("pod-card").map((c) => c.querySelector("b")?.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  m.rename.mockImplementation(async (_id: string, name: string) => ({ ok: true, name }));
  m.leave.mockResolvedValue({ ok: true, outcome: "left" });
  m.del.mockResolvedValue({ ok: true, changed: true });
});
afterEach(cleanup);

describe("the menu", () => {
  it("gives the owner Rename, Leave and Delete, and a member Leave alone", async () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    expect(rows()).toEqual([P.rename, P.leave, P.del]);
    expect(trigger("Thursday").getAttribute("aria-expanded")).toBe("true");
    await openMenu("Adventurers");
    expect(rows()).toEqual([P.leave]);
  });

  it("lands on the first row, moves with the arrows, and Escape hands focus back to the trigger", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: "ArrowUp" });
    fireEvent.keyDown(items[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[2]);
    expect(items.map((i) => i.tabIndex)).toEqual([-1, -1, 0]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger("Thursday"));
  });

  it("closes when the keyboard takes focus out of it, so a second pod's menu opens alone", async () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    const row = within(screen.getByRole("menu")).getAllByRole("menuitem")[0];
    await act(async () => { fireEvent.blur(row, { relatedTarget: trigger("Adventurers") }); });
    expect(screen.queryByRole("menu")).toBeNull();
    await press(trigger("Adventurers"));
    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(rows()).toEqual([P.leave]);
  });

  it("stays open when focus leaves for nowhere, as a Safari press on a row does", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    const row = within(screen.getByRole("menu")).getAllByRole("menuitem")[2];
    fireEvent.blur(row, { relatedTarget: null });
    await press(row);
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe(plain(P.delHeading(named("Thursday"))));
    expect(screen.getByRole("dialog").classList.contains("ph-no-capture")).toBe(true);
  });

  it("closes on a press outside", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("rename", () => {
  const startRename = async () => {
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.rename }));
    return screen.getByRole("textbox", { name: P.nameLabel }) as HTMLInputElement;
  };

  it("replaces the header with a focused field holding the name, and saves the trimmed new one", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const field = await startRename();
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe("Thursday");
    expect(screen.queryByRole("button", { name: plain(P.menuAria(named("Thursday"))) })).toBeNull();
    fireEvent.change(field, { target: { value: "  Friday  " } });
    await press(screen.getByRole("button", { name: P.save }));
    expect(m.rename).toHaveBeenCalledTimes(1);
    expect(m.rename).toHaveBeenCalledWith("pod-1", "Friday");
    expect(names()).toEqual(["Friday"]);
    expect(document.activeElement).toBe(trigger("Friday"));
  });

  it("caps the field at 40 characters", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const field = await startRename();
    fireEvent.change(field, { target: { value: "x".repeat(45) } });
    expect(field.value).toHaveLength(40);
  });

  it("commits on a blur away, and reverts an empty or unchanged name without a write", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    let field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    await act(async () => { fireEvent.blur(field, { relatedTarget: document.body }); });
    expect(m.rename).toHaveBeenCalledWith("pod-1", "Friday");
    expect(document.activeElement).not.toBe(trigger("Friday"));
    m.rename.mockClear();
    await openMenu("Friday");
    await press(screen.getByRole("menuitem", { name: P.rename }));
    field = screen.getByRole("textbox", { name: P.nameLabel }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "   " } });
    await act(async () => { fireEvent.blur(field, { relatedTarget: null }); });
    await openMenu("Friday");
    await press(screen.getByRole("menuitem", { name: P.rename }));
    await press(screen.getByRole("button", { name: P.save }));
    expect(m.rename).not.toHaveBeenCalled();
    expect(names()).toEqual(["Friday"]);
  });

  it("keeps focus in the field when Cancel or Save is pressed, as Safari never focuses a clicked button", () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    return startRename().then(() => {
      for (const name of [P.cancel, P.save]) {
        // fireEvent returns false when the handler prevented the default, which is what holds focus.
        expect(fireEvent.mouseDown(screen.getByRole("button", { name }))).toBe(false);
      }
    });
  });

  it("does not commit an edit when focus moves onto Cancel", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    await act(async () => { fireEvent.blur(field, { relatedTarget: screen.getByRole("button", { name: P.cancel }) }); });
    expect(screen.getByTestId("pod-rename")).toBeTruthy();
    expect(m.rename).not.toHaveBeenCalled();
  });

  it("commits when focus leaves the form from Cancel or Save, as when the reader tabs through them", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    const save = screen.getByRole("button", { name: P.save });
    fireEvent.blur(field, { relatedTarget: save });
    expect(m.rename).not.toHaveBeenCalled();
    await act(async () => { fireEvent.blur(save, { relatedTarget: document.body }); });
    expect(m.rename).toHaveBeenCalledWith("pod-1", "Friday");
  });

  it("drops the edit on Cancel and on Escape", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    let field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    const cancel = screen.getByRole("button", { name: P.cancel });
    fireEvent.blur(field, { relatedTarget: cancel });
    await press(cancel);
    expect(names()).toEqual(["Thursday"]);
    field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(names()).toEqual(["Thursday"]);
    expect(m.rename).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger("Thursday"));
  });

  it("puts the name back and says so when the write fails, and refreshes when the pod is no longer theirs", async () => {
    m.rename.mockRejectedValueOnce(new Error("down"));
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    let field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    await press(screen.getByRole("button", { name: P.save }));
    expect(names()).toEqual(["Thursday"]);
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
    m.rename.mockResolvedValueOnce({ ok: false, reason: "notOwner" });
    field = await startRename();
    fireEvent.change(field, { target: { value: "Friday" } });
    await press(screen.getByRole("button", { name: P.save }));
    expect(names()).toEqual(["Thursday"]);
    expect(m.refresh).toHaveBeenCalled();
  });
});

describe("leave and delete", () => {
  const confirmPane = () => screen.getByRole("dialog");

  it("asks with the hand-on sentence when the owner leaves a pod with others in it, Keep focused first", async () => {
    render(<PodsPane pods={[mine({ nextOwner: { publicId: "p-Dave", displayName: named("Dave") } })]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    expect(confirmPane().getAttribute("aria-label")).toBe(plain(P.leaveHeading(named("Thursday"))));
    expect(confirmPane().textContent).toContain(plain(P.leaveOwnerBody(named("Dave"))));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: folderCopy.del.cancel }));
    expect(screen.getByRole("button", { name: P.leaveConfirm })).toBeTruthy();
  });

  it("tells a member who can add them back, and the last member that leaving deletes it", async () => {
    const alone = mine({ id: "pod-3", name: named("Solo"), members: [{ ...ME, isOwner: true }] });
    render(<PodsPane pods={[theirs(), alone]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Adventurers");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    // Sam is not the reader's friend, so the way back runs through a friendship first (C1).
    expect(confirmPane().textContent).toContain(plain(P.leaveMemberStrangerBody(named("Sam"))));
    await press(screen.getByRole("button", { name: folderCopy.del.cancel }));
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: P.leave }));
    await openMenu("Solo");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    expect(confirmPane().textContent).toContain(P.leaveLastBody);
    expect(screen.getByRole("button", { name: P.leaveLastConfirm })).toBeTruthy();
  });

  it("tells a member whose owner is their friend that the owner can add them back", async () => {
    render(<PodsPane pods={[theirs({ members: [{ ...DAVE, isOwner: true }, ME] })]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Adventurers");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    expect(confirmPane().textContent).toContain(plain(P.leaveMemberBody(named("Dave"))));
  });

  it("holds Leave while the heir's removal waits for the redraw, and lets it go when the redraw lands", async () => {
    const pod = mine({ nextOwner: { publicId: "p-Dave", displayName: named("Dave") } });
    m.remove.mockReturnValue(new Promise(() => {}));
    const { rerender } = render(<PodsPane pods={[pod]} sharedIds={[]} friends={FRIENDS} />);
    // Seats carry their ✕ only in the edit state (small items item 7), and Done hands the menu back.
    await press(screen.getByRole("button", { name: P.edit }));
    await press(screen.getByRole("button", { name: plain(P.removeMemberAria(named("Dave"), named("Thursday"))) }));
    await press(screen.getByRole("button", { name: P.done }));
    await openMenu("Thursday");
    const leave = screen.getByRole("menuitem", { name: P.leave });
    expect(leave.getAttribute("aria-disabled")).toBe("true");
    await press(leave);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<PodsPane pods={[mine({ members: pod.members.filter((x) => plain(x.displayName) !== "Dave"), nextOwner: { publicId: "p-Priya", displayName: named("Priya") } })]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("menuitem", { name: P.leave }));
    expect(confirmPane().textContent).toContain(plain(P.leaveOwnerBody(named("Priya"))));
  });

  it("does not hold Leave for the removal of a member who is not the heir", async () => {
    m.remove.mockReturnValue(new Promise(() => {}));
    render(<PodsPane pods={[mine({ nextOwner: { publicId: "p-Dave", displayName: named("Dave") } })]} sharedIds={[]} friends={FRIENDS} />);
    // Seats carry their ✕ only in the edit state (small items item 7), and Done hands the menu back.
    await press(screen.getByRole("button", { name: P.edit }));
    await press(screen.getByRole("button", { name: plain(P.removeMemberAria(named("Priya"), named("Thursday"))) }));
    await press(screen.getByRole("button", { name: P.done }));
    await openMenu("Thursday");
    expect(screen.getByRole("menuitem", { name: P.leave }).getAttribute("aria-disabled")).toBeNull();
  });

  it("returns Keep to the row that opened the confirm, though a click never focused it", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.del }));
    await press(screen.getByRole("button", { name: folderCopy.del.cancel }));
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: P.del }));
  });

  it("hands focus to the page title when the reader's last pod leaves and they have no friend", async () => {
    const h1 = document.createElement("h1");
    h1.id = "friends-title";
    h1.tabIndex = -1;
    document.body.appendChild(h1);
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={[]} />);
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.del }));
    await press(screen.getByRole("button", { name: P.delConfirm }));
    expect(document.activeElement).toBe(h1);
    h1.remove();
  });

  it("removes the card once a leave lands, with no toast, and focus goes to New pod", async () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Adventurers");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    await press(screen.getByRole("button", { name: P.leaveConfirm }));
    expect(m.leave).toHaveBeenCalledWith("pod-2");
    expect(names()).toEqual(["Thursday"]);
    expect(screen.getByRole("heading", { name: P.head(1) })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: P.newPod }));
  });

  it("takes a leave from a pod already left as done, and refreshes", async () => {
    m.leave.mockResolvedValueOnce({ ok: false, reason: "notMember" });
    render(<PodsPane pods={[theirs()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Adventurers");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    await press(screen.getByRole("button", { name: P.leaveConfirm }));
    expect(screen.queryAllByTestId("pod-card")).toHaveLength(0);
    expect(m.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("deletes through its own sentence, and keeps a pod already gone as done", async () => {
    m.del.mockResolvedValueOnce({ ok: true, changed: false });
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.del }));
    expect(confirmPane().getAttribute("aria-label")).toBe(plain(P.delHeading(named("Thursday"))));
    expect(confirmPane().textContent).toContain(P.delBody);
    await press(screen.getByRole("button", { name: P.delConfirm }));
    expect(m.del).toHaveBeenCalledWith("pod-1");
    expect(screen.queryAllByTestId("pod-card")).toHaveLength(0);
  });

  it("keeps the card and its pane, and says so, when the write fails; the pane holds while it waits", async () => {
    let fail!: (e: Error) => void;
    m.del.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Thursday");
    await press(screen.getByRole("menuitem", { name: P.del }));
    await press(screen.getByRole("button", { name: P.delConfirm }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((screen.getByRole("button", { name: folderCopy.del.cancel }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { fail(new Error("down")); });
    expect(names()).toEqual(["Thursday"]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
  });

  it("lets the server's redraw retire a held leave", async () => {
    const { rerender } = render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    await openMenu("Adventurers");
    await press(screen.getByRole("menuitem", { name: P.leave }));
    await press(screen.getByRole("button", { name: P.leaveConfirm }));
    rerender(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    expect(names()).toEqual(["Adventurers", "Thursday"]);
  });
});
