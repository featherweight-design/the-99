// Rule 0's setup (plan PR 5; boards U1 to U4, V1 to V3): who's playing, 2 to 8, a deck for each seat, a friend's
// decks, and what `Set the table` and `Seats` send. The server re-checks every ask (`setTable`, `reseatTable`); these
// pin what the sheet asks for and what it never offers.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { SetupMember } from "../../lib/social/rule-zero";
import { SetupSheet, type SetupData } from "./setup-sheet";

const c = ruleZeroCopy.setup;
afterEach(cleanup);

const deck = (deckId: string, name: string) => ({ deckId, name, commanderName: `${name} commander`, artCropUri: null });
const member = (publicId: string, displayName: string, kind: SetupMember["kind"], decks = [] as ReturnType<typeof deck>[], over: Partial<SetupMember> = {}): SetupMember => ({
  publicId, displayName, commander: null, kind, isOwner: false, decks, start: decks[0]?.deckId ?? null, ...over,
});

const YOU = member("p-you", "Hugh", "you", [deck("d-y1", "Ghalta Stompy"), deck("d-y2", "Other")]);
const COLIN = member("p-colin", "Colin", "hasDecks", [deck("d-c1", "Zimone Combo")], { isOwner: true });
const PETER = member("p-peter", "Peter", "hasDecks", [deck("d-p1", "Giada Angels"), deck("d-p2", "Miku Tokens")], { start: null });
const MAX = member("p-max", "Max", "picksOwn");
const CHRIS = member("p-chris", "Chris", "noDecks");
const SETUP: SetupData = { podId: "pod", podName: "Thursday night", owner: "Colin", members: [YOU, COLIN, PETER, MAX, CHRIS] };

function open(over: Partial<Parameters<typeof SetupSheet>[0]> = {}) {
  const onSave = vi.fn(async () => ({ ok: true as const, tableId: "t" }));
  const onDone = vi.fn();
  render(<SetupSheet setup={SETUP} onClose={() => {}} onSave={onSave} onDone={onDone} {...over} />);
  return { onSave, onDone };
}
const tile = (name: string | RegExp) => screen.getByRole("checkbox", { name });

describe("who's playing (U1, U2, V1)", () => {
  it("draws every member as a checkbox tile, You already in and held, Chris dimmed with no decks", () => {
    open();
    expect(screen.getByRole("dialog", { name: c.whoTitle })).toBeTruthy();
    expect(screen.getByText(c.whoSub("Thursday night"))).toBeTruthy();
    const you = tile(/^You/);
    expect(you.getAttribute("aria-checked")).toBe("true");
    expect(you.getAttribute("aria-disabled")).toBe("true");
    expect(tile(/^Colin/).textContent).toContain("owner");
    expect(tile(/^Max/).textContent).toContain("not a friend");
    expect(tile(/^Max/).textContent).toContain(c.picksOwn);
    const chris = tile(/^Chris/);
    expect(chris.getAttribute("aria-disabled")).toBe("true");
    expect(chris.textContent).toContain(c.noDecks);
    fireEvent.click(chris);
    expect(chris.getAttribute("aria-checked")).toBe("false");
    expect(tile(/^You/).textContent).toContain(c.decks(2));
  });

  it("holds Next under two seats, and says why", () => {
    open();
    expect(screen.getByText(c.count(1))).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(c.tooFew);
    const next = screen.getByRole("button", { name: c.next });
    expect(next.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(next);
    expect(screen.queryByText(c.decksTitle)).toBeNull();
    fireEvent.click(tile(/^Colin/));
    expect(screen.getByText(c.count(2))).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(next.getAttribute("aria-disabled")).toBeNull();
  });

  it("holds the unseated tiles at eight", () => {
    const many = Array.from({ length: 8 }, (_, i) => member(`p-${i}`, `Friend ${i}`, "hasDecks", [deck(`d-${i}`, `Deck ${i}`)]));
    render(<SetupSheet setup={{ ...SETUP, members: [YOU, ...many] }} onClose={() => {}} onSave={vi.fn()} onDone={vi.fn()} />);
    for (let i = 0; i < 7; i++) fireEvent.click(tile(new RegExp(`^Friend ${i}`)));
    expect(screen.getByText(c.count(8))).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(c.tooMany);
    const last = tile(/^Friend 7/);
    expect(last.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(last);
    expect(last.getAttribute("aria-checked")).toBe("false");
  });

  it("draws the invite row only when it can open Invite someone new, naming the owner", () => {
    open();
    expect(screen.queryByText(c.inviteTitle)).toBeNull();
    cleanup();
    const onInvite = vi.fn();
    open({ onInvite });
    fireEvent.click(screen.getByText(c.inviteTitle));
    expect(onInvite).toHaveBeenCalled();
    expect(screen.getByText(c.inviteBody("Colin"))).toBeTruthy();
  });
});

describe("a deck for each seat (U3, U4, V2, V3)", () => {
  function toDecks() {
    const out = open();
    for (const n of [/^Colin/, /^Peter/, /^Max/]) fireEvent.click(tile(n));
    fireEvent.click(screen.getByRole("button", { name: c.next }));
    return out;
  }

  it("rows each seat in order, a non-friend with no control and no decks listed", () => {
    toDecks();
    expect(screen.getByRole("dialog", { name: c.decksTitle })).toBeTruthy();
    const max = screen.getByText(c.notFriendRow("Max")).closest("button")!;
    expect(max.getAttribute("aria-disabled")).toBe("true");
    expect(within(max).getByText(c.notFriendSub)).toBeTruthy();
    const peter = screen.getByText(c.pick).closest("button")!;
    expect(within(peter).getByText(c.leaveIt("Peter"))).toBeTruthy();
    expect(screen.getByText("Ghalta Stompy")).toBeTruthy();
    expect(screen.getByText("Zimone Combo")).toBeTruthy();
  });

  it("opens a friend's decks by name and commander, and a pick returns to the seats", () => {
    toDecks();
    fireEvent.click(screen.getByText(c.pick).closest("button")!);
    const list = screen.getByRole("list", { name: c.friendDecksList("Peter") });
    expect(within(list).getAllByRole("button").map((o) => o.textContent)).toEqual([
      "Giada AngelsGiada Angels commander",
      "Miku TokensMiku Tokens commander",
      `?${c.leaveItRow("Peter")}${c.leaveItSub}`,
    ]);
    expect(screen.getByText(c.friendDecksFoot)).toBeTruthy();
    fireEvent.click(within(list).getByText("Miku Tokens"));
    expect(screen.getByRole("dialog", { name: c.decksTitle })).toBeTruthy();
    expect(screen.getByText("Miku Tokens")).toBeTruthy();
  });

  it("sends the seats in order, a non-friend's and a left seat with no deck", async () => {
    const { onSave, onDone } = toDecks();
    fireEvent.click(screen.getByRole("button", { name: c.set }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("t"));
    expect(onSave).toHaveBeenCalledWith([
      { member: "p-you", deck: "d-y1" },
      { member: "p-colin", deck: "d-c1" },
      { member: "p-peter", deck: null },
      { member: "p-max", deck: null },
    ]);
  });

  it("keeps the sheet and the seats when the server refuses", async () => {
    const onSave = vi.fn(async () => ({ ok: false as const, reason: "refused" as const }));
    const onDone = vi.fn();
    render(<SetupSheet setup={SETUP} onClose={() => {}} onSave={onSave} onDone={onDone} />);
    fireEvent.click(tile(/^Colin/));
    fireEvent.click(screen.getByRole("button", { name: c.next }));
    fireEvent.click(screen.getByRole("button", { name: c.set }));
    expect((await screen.findByRole("alert")).textContent).toBe(c.failed);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(c.back) }));
    expect(tile(/^Colin/).getAttribute("aria-checked")).toBe("true");
  });
});

describe("your own seat with no deck", () => {
  it("says where you pick it, never 'You picks their own', and has no control", () => {
    const noDecks = { ...YOU, decks: [], start: null };
    render(<SetupSheet setup={{ ...SETUP, members: [noDecks, COLIN] }} onClose={() => {}} onSave={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(tile(/^Colin/));
    fireEvent.click(screen.getByRole("button", { name: c.next }));
    const row = screen.getByText(c.yourSeatWaits).closest("button")!;
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByText(/You picks|leave it to You/)).toBeNull();
  });
});

describe("Seats: the setter reopens setup with the seats kept", () => {
  const KEPT: SetupData = {
    ...SETUP,
    tableId: "t",
    seated: [
      { publicId: "p-max", deck: { name: "Gisa Zombies", commanderName: "Gisa", artCropUri: null } },
      { publicId: "p-you", deck: { name: "Ghalta Stompy", commanderName: "Ghalta", artCropUri: null } },
    ],
  };

  it("starts with the table's seats, keeps their order and their decks, and adds a new seat's pick", async () => {
    const onSave = vi.fn(async () => ({ ok: true as const, tableId: "t" }));
    render(<SetupSheet setup={KEPT} onClose={() => {}} onSave={onSave} onDone={vi.fn()} />);
    expect(screen.getByText(c.count(2))).toBeTruthy();
    fireEvent.click(tile(/^Colin/));
    fireEvent.click(screen.getByRole("button", { name: c.next }));
    // A kept seat shows the deck it sits with, with no control; only the new seat opens a picker.
    const gisa = screen.getByText("Gisa Zombies").closest("button")!;
    expect(gisa.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Ghalta Stompy").closest("button")!.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Zimone Combo").closest("button")!.getAttribute("aria-disabled")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: c.set }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith([
      { member: "p-max", deck: null },
      { member: "p-you", deck: null },
      { member: "p-colin", deck: "d-c1" },
    ]);
  });
});
