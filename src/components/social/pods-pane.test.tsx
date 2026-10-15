// Pods on /friends (Social R1 PR E1): when the section is drawn, create, the table's seats and tags, the owner's ✕
// and + Add friends with its batch dialog and two empties, the spares box, and every write's failure put back with
// the shared toast (E12, E15).
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  share: vi.fn(),
  add: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));
vi.mock("../../app/friends/actions", () => ({
  createPodAction: m.create,
  removeMemberAction: m.remove,
  shareSparesWithAction: m.share,
  addMembersAction: m.add,
}));

import { PodsPane } from "./pods-pane";
import { socialCopy } from "../../lib/copy/social";
import type { Friend, Pod, PodMember } from "../../lib/social/access";

const P = socialCopy.pods;
const ART = "https://cards.scryfall.io/art_crop/x.jpg";
const cmd = (name: string) => ({ oracleId: `o-${name}`, name, artCropUri: ART });
const member = (over: Partial<PodMember> & { displayName: string }): PodMember => ({
  publicId: `p-${over.displayName}`, joinedAt: new Date("2026-10-01"), isOwner: false, isYou: false, isFriend: true, commander: null, ...over,
});
const ME = member({ displayName: "Hugh", isYou: true, isFriend: false, commander: cmd("Atraxa") });
const DAVE = member({ displayName: "Dave", commander: cmd("Korvold") });
const PRIYA = member({ displayName: "Priya" });
const SAM = member({ displayName: "Sam", isFriend: false });
const friend = (displayName: string, commander: Friend["commander"] = null): Friend => ({
  publicId: `p-${displayName}`, displayName, since: new Date("2026-10-02"), commander,
});
const mine = (over: Partial<Pod> = {}): Pod => ({
  id: "pod-1", name: "Thursday", isOwner: true, members: [{ ...ME, isOwner: true }, DAVE, PRIYA], nextOwner: null, ...over,
});
const theirs = (over: Partial<Pod> = {}): Pod => ({
  id: "pod-2", name: "Adventurers", isOwner: false, members: [{ ...SAM, isOwner: true }, ME, DAVE], nextOwner: null, ...over,
});
const FRIENDS = [friend("Dave", cmd("Korvold")), friend("Priya"), friend("Zed"), friend("Alex", cmd("Ghalta"))];

const press = async (el: HTMLElement) => {
  await act(async () => { fireEvent.click(el); });
};
const card = (name: string) => screen.getAllByTestId("pod-card").find((c) => c.textContent?.includes(name))!;
const seatNames = (c: HTMLElement) => within(c).getAllByTestId("pod-seat-name").map((s) => s.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  m.create.mockResolvedValue({ ok: true, podId: "new" });
  m.remove.mockResolvedValue({ ok: true, changed: true });
  m.share.mockResolvedValue({ ok: true, on: true });
  m.add.mockResolvedValue({ ok: true, added: 1 });
});
afterEach(cleanup);

describe("the section", () => {
  it("is not drawn for a reader with no friend and no pod (README 2)", () => {
    render(<PodsPane pods={[]} sharedIds={[]} friends={[]} />);
    expect(screen.queryByTestId("pods-pane")).toBeNull();
  });

  it("draws its empty state for a reader with a friend and no pod", () => {
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    expect(screen.getByRole("heading", { name: P.head(0) })).toBeTruthy();
    expect(screen.getByRole("region", { name: P.head(0) })).toBeTruthy();
    expect(screen.getByTestId("pods-empty").textContent).toContain(P.emptyTitle);
  });

  it("orders pods by name", () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    expect(screen.getAllByTestId("pod-card").map((c) => c.querySelector("b")?.textContent)).toEqual(["Adventurers", "Thursday"]);
  });
});

describe("create", () => {
  it("opens a focused field over the empty state, held while empty, capped at 40, and creates the trimmed name", async () => {
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.newPod }));
    expect(screen.queryByTestId("pods-empty")).toBeNull();
    const field = screen.getByLabelText(P.nameLabel) as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    const createBtn = screen.getByRole("button", { name: P.create });
    expect(createBtn.getAttribute("aria-disabled")).toBe("true");
    await press(createBtn);
    expect(m.create).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "x".repeat(50) } });
    expect([...field.value]).toHaveLength(40);
    fireEvent.change(field, { target: { value: "  Thursday  " } });
    await press(createBtn);
    expect(m.create).toHaveBeenCalledWith("Thursday");
    expect(screen.queryByLabelText(P.nameLabel)).toBeNull();
  });

  it("puts the empty state back on Escape", async () => {
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.newPod }));
    fireEvent.keyDown(screen.getByLabelText(P.nameLabel), { key: "Escape" });
    expect(screen.getByTestId("pods-empty")).toBeTruthy();
  });

  it("keeps the field and says so when the write fails", async () => {
    m.create.mockRejectedValue(new Error("down"));
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.newPod }));
    fireEvent.change(screen.getByLabelText(P.nameLabel), { target: { value: "Thursday" } });
    await press(screen.getByRole("button", { name: P.create }));
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
    expect(screen.getByLabelText(P.nameLabel)).toBeTruthy();
  });
});

describe("the table", () => {
  it("seats owner, you and the rest, outlines you, and names who owns it", () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    const own = card("Thursday");
    expect(own.textContent).toContain(P.metaOwn(3));
    expect(seatNames(own)).toEqual([P.you, "Dave", "Priya"]);
    expect(within(own).getAllByTestId("pod-seat")[0].hasAttribute("data-you")).toBe(true);
    const other = card("Adventurers");
    expect(other.textContent).toContain(P.metaOther(3, "Sam"));
  });

  it("draws art for you and friends with a commander, initials otherwise, and a wash only from art", () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const c = card("Thursday");
    const [you, dave, priya] = within(c).getAllByTestId("pod-seat");
    expect(you.querySelector("img")).not.toBeNull();
    expect(dave.querySelector("img")).not.toBeNull();
    expect(within(priya).getByTestId("pod-seat-initials").textContent).toBe("PR");
    expect(c.querySelectorAll(".pod-wash img")).toHaveLength(2);
    cleanup();
    render(<PodsPane pods={[mine({ members: [{ ...ME, isOwner: true, commander: null }, PRIYA] })]} sharedIds={[]} friends={FRIENDS} />);
    expect(card("Thursday").querySelector(".pod-wash")).toBeNull();
  });

  it("tags the owner, and a member who is not your friend; the owner tag wins on an owner who is neither", () => {
    render(<PodsPane pods={[theirs({ members: [{ ...SAM, isOwner: true }, ME, { ...PRIYA, isFriend: false }] })]} sharedIds={[]} friends={FRIENDS} />);
    const [sam, , priya] = within(card("Adventurers")).getAllByTestId("pod-seat");
    expect(sam.querySelector("small")?.textContent).toBe(P.ownerTag);
    expect(priya.querySelector("small")?.textContent).toBe(P.notFriendTag);
  });

  it("says it is just you on a pod of one", () => {
    render(<PodsPane pods={[mine({ members: [{ ...ME, isOwner: true }] })]} sharedIds={[]} friends={FRIENDS} />);
    expect(card("Thursday").textContent).toContain(P.solo);
    expect(card("Thursday").textContent).toContain(P.metaOwn(1));
  });
});

describe("the owner's ✕", () => {
  it("is drawn only for the owner, and never on your own seat", () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    expect(within(card("Thursday")).getAllByRole("button", { name: /^Remove / }).map((b) => b.getAttribute("aria-label")))
      .toEqual([P.removeMemberAria("Dave", "Thursday"), P.removeMemberAria("Priya", "Thursday")]);
    expect(within(card("Adventurers")).queryAllByRole("button", { name: /^Remove / })).toHaveLength(0);
  });

  it("removes at once, with no confirm, and keeps a member already out as done", async () => {
    m.remove.mockResolvedValue({ ok: true, changed: false });
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.removeMemberAria("Dave", "Thursday") }));
    expect(m.remove).toHaveBeenCalledWith("pod-1", "p-Dave");
    expect(seatNames(card("Thursday"))).toEqual([P.you, "Priya"]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("puts the seat back and says so when the write fails", async () => {
    m.remove.mockRejectedValue(new Error("down"));
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.removeMemberAria("Dave", "Thursday") }));
    expect(seatNames(card("Thursday"))).toEqual([P.you, "Dave", "Priya"]);
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
  });

  it("lets the server's redraw retire a held removal", async () => {
    const { rerender } = render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.removeMemberAria("Dave", "Thursday") }));
    // The redraw brings Dave back (someone re-added him): the server's truth wins.
    rerender(<PodsPane pods={[mine({ members: [{ ...ME, isOwner: true }, DAVE, PRIYA, SAM] })]} sharedIds={[]} friends={FRIENDS} />);
    expect(seatNames(card("Thursday"))).toContain("Dave");
  });
});

describe("+ Add friends", () => {
  it("is the owner's empty seat at the end of the row", () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={[]} friends={FRIENDS} />);
    const own = card("Thursday");
    const items = within(own).getByRole("list").children;
    expect(items[items.length - 1].textContent).toBe(P.addFriends);
    expect(within(card("Adventurers")).queryByRole("button", { name: P.addFriends })).toBeNull();
  });

  it("offers the friends not in the pod, by name, nothing ticked, and adds every ticked friend in one write", async () => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.addFriends }));
    const dialog = screen.getByRole("dialog", { name: P.addTitle("Thursday") });
    const boxes = within(dialog).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((b) => b.closest("label")?.querySelector(".truncate")?.textContent)).toEqual(["Alex", "Zed"]);
    expect(boxes.every((b) => !b.checked)).toBe(true);
    const confirm = within(dialog).getByRole("button", { name: P.addConfirm(0) });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    await press(within(dialog).getByRole("button", { name: P.addConfirm(2) }));
    expect(m.add).toHaveBeenCalledWith("pod-1", ["p-Alex", "p-Zed"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the dialog and says so when the add is refused", async () => {
    m.add.mockResolvedValue({ ok: false, reason: "notFriend" });
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.addFriends }));
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("checkbox")[0]);
    await press(screen.getByRole("button", { name: P.addConfirm(1) }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
  });

  it.each([
    ["every friend is already in", [friend("Dave"), friend("Priya")], P.addAllIn],
    ["the reader has no friend", [], P.addNoFriends],
  ])("says so when %s", async (_n, friends, line) => {
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={friends} />);
    await press(screen.getByRole("button", { name: P.addFriends }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("pod-add-empty").textContent).toBe(line);
    expect(within(dialog).queryByRole("checkbox")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: P.addConfirm(0) })).toBeNull();
  });
});

describe("the spares box", () => {
  it("reads the reader's own grant and writes a change", async () => {
    render(<PodsPane pods={[mine(), theirs()]} sharedIds={["pod-2"]} friends={FRIENDS} />);
    const own = within(card("Thursday")).getByRole("checkbox", { name: P.share }) as HTMLInputElement;
    expect(own.checked).toBe(false);
    expect((within(card("Adventurers")).getByRole("checkbox", { name: P.share }) as HTMLInputElement).checked).toBe(true);
    await press(own);
    expect(m.share).toHaveBeenCalledWith("pod-1", true);
    expect(own.checked).toBe(true);
  });

  it.each([
    ["refuses", () => m.share.mockResolvedValue({ ok: false, reason: "notMember" })],
    ["throws", () => m.share.mockRejectedValue(new Error("down"))],
  ])("flips back and says so when the write %s", async (_n, arrange) => {
    arrange();
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    const box = screen.getByRole("checkbox", { name: P.share }) as HTMLInputElement;
    await press(box);
    expect(box.checked).toBe(false);
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
  });
});

describe("round 1: races and edges", () => {
  it("keeps a member removed and re-added before the redraw, by their new join", async () => {
    const { rerender } = render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.removeMemberAria("Dave", "Thursday") }));
    // Same ids, same order: only Dave's join moved.
    rerender(<PodsPane pods={[mine({ members: [{ ...ME, isOwner: true }, { ...DAVE, joinedAt: new Date("2026-10-15") }, PRIYA] })]} sharedIds={[]} friends={FRIENDS} />);
    expect(seatNames(card("Thursday"))).toContain("Dave");
  });

  it("holds the spares box while its write is in flight, and puts back the saved value on a failure", async () => {
    let fail: (e: Error) => void = () => {};
    m.share.mockReturnValueOnce(new Promise((_, rej) => { fail = rej; }));
    render(<PodsPane pods={[mine()]} sharedIds={["pod-1"]} friends={FRIENDS} />);
    const box = screen.getByRole("checkbox", { name: P.share }) as HTMLInputElement;
    await press(box);
    expect(box.checked).toBe(false);
    expect(box.getAttribute("aria-busy")).toBe("true");
    await press(box);
    expect(m.share).toHaveBeenCalledTimes(1);
    await act(async () => fail(new Error("down")));
    expect(box.checked).toBe(true);
    expect(box.hasAttribute("aria-busy")).toBe(false);
  });

  it("reads a redraw that landed while a failed spares write was in flight", async () => {
    let fail: (e: Error) => void = () => {};
    m.share.mockReturnValueOnce(new Promise((_, rej) => { fail = rej; }));
    const { rerender } = render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("checkbox", { name: P.share }));
    // Another tab shared it: the redraw says shared before this write fails.
    rerender(<PodsPane pods={[mine()]} sharedIds={["pod-1"]} friends={FRIENDS} />);
    await act(async () => fail(new Error("down")));
    expect((screen.getByRole("checkbox", { name: P.share }) as HTMLInputElement).checked).toBe(true);
  });

  it("closes only the Add dialog that started a write, not one reopened since", async () => {
    let done: (v: unknown) => void = () => {};
    m.add.mockReturnValueOnce(new Promise((res) => { done = res; }));
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.addFriends }));
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("checkbox")[0]);
    await press(screen.getByRole("button", { name: P.addConfirm(1) }));
    await press(screen.getByRole("button", { name: socialCopy.page.close }));
    await press(screen.getByRole("button", { name: P.addFriends }));
    const reopened = screen.getByRole("dialog");
    await act(async () => done({ ok: true, added: 1 }));
    expect(screen.getByRole("dialog")).toBe(reopened);
  });

  it("holds Add past the batch cap and says why", async () => {
    const many = Array.from({ length: 33 }, (_, i) => friend(`F${String(i).padStart(2, "0")}`));
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={many} />);
    await press(screen.getByRole("button", { name: P.addFriends }));
    for (const box of within(screen.getByRole("dialog")).getAllByRole("checkbox")) fireEvent.click(box);
    const confirm = screen.getByRole("button", { name: P.addConfirm(33) });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe(P.addMax(32));
    await press(confirm);
    expect(m.add).not.toHaveBeenCalled();
  });

  it("leaves a reopened create field and its new draft alone when an earlier create answers", async () => {
    let done: (v: unknown) => void = () => {};
    m.create.mockReturnValueOnce(new Promise((res) => { done = res; }));
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.newPod }));
    fireEvent.change(screen.getByLabelText(P.nameLabel), { target: { value: "Thursday" } });
    await press(screen.getByRole("button", { name: P.create }));
    fireEvent.keyDown(screen.getByLabelText(P.nameLabel), { key: "Escape" });
    await press(screen.getByRole("button", { name: P.newPod }));
    fireEvent.change(screen.getByLabelText(P.nameLabel), { target: { value: "Friday" } });
    await act(async () => done({ ok: true, podId: "new" }));
    expect((screen.getByLabelText(P.nameLabel) as HTMLInputElement).value).toBe("Friday");
  });

  it("lets Escape cancel a composition without closing the name field", async () => {
    render(<PodsPane pods={[]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.newPod }));
    fireEvent.keyDown(screen.getByLabelText(P.nameLabel), { key: "Escape", isComposing: true });
    expect(screen.getByLabelText(P.nameLabel)).toBeTruthy();
  });
});

describe("the switch going off mid-visit", () => {
  it("refreshes into not found rather than calling it a failure", async () => {
    m.remove.mockResolvedValue({ ok: false, reason: "off" });
    render(<PodsPane pods={[mine()]} sharedIds={[]} friends={FRIENDS} />);
    await press(screen.getByRole("button", { name: P.removeMemberAria("Dave", "Thursday") }));
    expect(m.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
