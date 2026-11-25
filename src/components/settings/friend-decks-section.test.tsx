// Settings' Your decks (friend decks README 4b): the two rules at their stored values, each saved as it changes with
// both rules, the second dimmed, unticked and disabled while the first is off, and a failed save putting both back with
// the shared toast.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), save: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }), usePathname: () => "/settings" }));
vi.mock("../../app/settings/actions", () => ({ setFriendDeckPrefsAction: m.save }));

import { FriendDecksSection } from "./friend-decks-section";
import { settingsCopy } from "../../lib/copy/settings";

const C = settingsCopy.decks;
const see = () => screen.getByRole("checkbox", { name: new RegExp(C.see.name) }) as HTMLInputElement;
const drafts = () => screen.getByRole("checkbox", { name: new RegExp(C.unfinished.name) }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("the friend-decks rules", () => {
  it("draws the head, the intro, both rules at the defaults and the foot", () => {
    render(<FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />);
    expect(screen.getByRole("heading", { name: C.head })).toBeTruthy();
    expect(screen.getByText(C.explain)).toBeTruthy();
    expect(see().checked).toBe(true);
    expect(drafts().checked).toBe(false);
    expect(drafts().disabled).toBe(false);
    expect(screen.getByText(C.foot)).toBeTruthy();
    // The second rule sits under the first, indented.
    expect(drafts().closest("label")!.className).toContain("pl-[30px]");
  });

  it("dims the second rule, unticked and disabled, while the first is off", () => {
    render(<FriendDecksSection prefs={{ seeDecks: false, seeUnfinished: true }} />);
    expect(see().checked).toBe(false);
    expect(drafts().checked).toBe(false);
    expect(drafts().disabled).toBe(true);
    expect(drafts().closest("label")!.className).toContain("opacity-[.45]");
  });

  it("saves both rules as each changes", async () => {
    render(<FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />);
    await act(async () => fireEvent.click(drafts()));
    expect(m.save).toHaveBeenLastCalledWith(true, true);
    expect(drafts().checked).toBe(true);
    await act(async () => fireEvent.click(see()));
    expect(m.save).toHaveBeenLastCalledWith(false, true);
    expect(drafts().disabled).toBe(true);
  });

  it("puts both back and says so when a save fails", async () => {
    m.save.mockResolvedValue({ ok: false, reason: "invalid" });
    render(<FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />);
    await act(async () => fireEvent.click(see()));
    expect(see().checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("puts both back when a save throws", async () => {
    m.save.mockRejectedValue(new Error("network"));
    render(<FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />);
    await act(async () => fireEvent.click(drafts()));
    expect(drafts().checked).toBe(false);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });
});

// Where a deck's ⋯ menu lands (draft hidden row, #2988): the exact box scrolls into view and is washed for two seconds.
describe("the landing from a deck's menu", () => {
  const prefs = { seeDecks: true, seeUnfinished: false };
  const rowOf = (name: "see" | "unfinished") => document.querySelector<HTMLElement>(`[data-friend-decks-row=${name}]`)!;
  const realScroll = Element.prototype.scrollIntoView;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    Element.prototype.scrollIntoView = realScroll;
    window.history.replaceState(null, "", "/");
  });

  it("gives each row the id the menu links to", () => {
    render(<FriendDecksSection prefs={prefs} />);
    expect(rowOf("see").id).toBe("settings-decks-see");
    expect(rowOf("unfinished").id).toBe("settings-decks-unfinished");
  });

  it("scrolls the named row into view and washes it for two seconds, then lets it go", () => {
    window.history.replaceState(null, "", "#settings-decks-unfinished");
    render(<FriendDecksSection prefs={prefs} />);
    expect(rowOf("unfinished").hasAttribute("data-washed")).toBe(true);
    expect(rowOf("see").hasAttribute("data-washed")).toBe(false);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(rowOf("unfinished").hasAttribute("data-washed")).toBe(false);
  });

  it("re-centres the row twice more while the wash runs (the page streams in after mount), then stops", () => {
    window.history.replaceState(null, "", "#settings-decks-unfinished");
    render(<FriendDecksSection prefs={prefs} />);
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    expect(scroll).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(scroll).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(scroll).toHaveBeenCalledTimes(3);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(scroll).toHaveBeenCalledTimes(3);
  });

  it("lets the reader's own scroll (wheel, touch, key, pointer) cancel the re-centring", () => {
    for (const type of ["wheel", "touchmove", "keydown", "pointerdown"]) {
      window.history.replaceState(null, "", "#settings-decks-unfinished");
      const { unmount } = render(<FriendDecksSection prefs={prefs} />);
      const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
      scroll.mockClear();
      act(() => {
        window.dispatchEvent(new Event(type));
        vi.advanceTimersByTime(1000);
      });
      expect(scroll, type).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("washes the master switch's row for #settings-decks-see, and nothing for the bare heading anchor", () => {
    window.history.replaceState(null, "", "#settings-decks-see");
    const { unmount } = render(<FriendDecksSection prefs={prefs} />);
    expect(rowOf("see").hasAttribute("data-washed")).toBe(true);
    unmount();
    window.history.replaceState(null, "", "#settings-decks");
    render(<FriendDecksSection prefs={prefs} />);
    expect(document.querySelector("[data-washed]")).toBeNull();
  });
});
