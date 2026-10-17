import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { ARRIVE_MS, MomentsProvider, SPENT_AFTER_MS, useMomentAnchor, useSuppressMoment } from "./moments-provider";
import { HALO_ATTR, TargetsProvider, useTargets, type Targets } from "../discovery/targets-provider";
import { useMomentHold } from "../../lib/moments/hold";
import { VISIT_KEY } from "../../lib/moments/visit";
import type { MomentId } from "../../lib/moments/registry";

const spendMomentAction = vi.fn(async (_id: unknown) => {});
vi.mock("../../app/moments-actions", () => ({ spendMomentAction: (id: unknown) => spendMomentAction(id) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/decks" }));

// One fake observer: the test says which control is on screen.
let observed: Element[] = [];
let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    notify = cb;
  }
  observe(el: Element) {
    observed.push(el);
  }
  unobserve(el: Element) {
    observed = observed.filter((e) => e !== el);
  }
  disconnect() {
    observed = [];
  }
}

/** Timers, then the promises they start (the visit claim runs on a microtask). */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

function onScreen(name: string, isIntersecting = true) {
  const el = screen.getByRole("button", { name });
  act(() => notify!([{ target: el, isIntersecting }]));
}

function Control({
  id,
  name,
  eligible = true,
  fallback = false,
}: {
  id: MomentId;
  name: string;
  eligible?: boolean;
  fallback?: boolean;
}) {
  const anchor = useMomentAnchor(id, { eligible, copy: { tool: name, line: `opens ${name}.` }, fallback });
  return (
    <button type="button" {...anchor}>
      {name}
    </button>
  );
}

/** The landing's press, standing in for `useToolLanding`. */
let suppressNow: ((id: MomentId) => void) | null = null;
function Suppress({ id }: { id: MomentId }) {
  const suppress = useSuppressMoment();
  useEffect(() => {
    suppressNow = suppress;
  }, [suppress]);
  return (
    <button type="button" onClick={() => suppress(id)}>
      land on {id}
    </button>
  );
}

let targets: Targets | null = null;
function GrabTargets() {
  const t = useTargets();
  useEffect(() => {
    targets = t;
  }, [t]);
  return null;
}

function Hold() {
  const [on, setOn] = useState(true);
  useMomentHold(on);
  return (
    <button type="button" onClick={() => setOn(false)}>
      close menu
    </button>
  );
}

const LIVE: MomentId[] = ["top-off", "lineup", "suggested-changes", "stand-ins", "wishlist"];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  spendMomentAction.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  observed = [];
  notify = null;
});

describe("MomentsProvider", () => {
  it("a fallback control stands in only while the moment's own control is not drawn (audit resolution 2)", async () => {
    const { rerender } = render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="top-off" name="Analysis" fallback />
        <Control id="top-off" name="Shortcut" />
      </MomentsProvider>,
    );
    // The shortcut is drawn but off screen: the tab on screen waits for it rather than taking its moment.
    onScreen("Analysis");
    await advance(ARRIVE_MS);
    expect(screen.queryByRole("note")).toBeNull();

    // Not drawn (the shortcut gone, as when its gate is off): the tab carries the moment.
    rerender(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="top-off" name="Analysis" fallback />
      </MomentsProvider>,
    );
    onScreen("Analysis");
    // The covered control is looked at again each second.
    await advance(1000);
    const note = screen.getByRole("note", { name: "Analysis, a tip" });
    expect(screen.getByRole("button", { name: "Analysis" }).getAttribute("aria-describedby")).toBe(note.id);
  });

  it("arrives the tie window after its control comes on screen, as a named note the control points at", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    expect(screen.queryByRole("note")).toBeNull();
    await advance(ARRIVE_MS);
    const note = screen.getByRole("note", { name: "Stats, a tip" });
    expect(screen.getByRole("button", { name: "Stats" }).getAttribute("aria-describedby")).toBe(note.id);
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("data-moment-halo")).toBe(true);
    expect(document.querySelector("[aria-live=polite]")!.textContent).toBe("Stats opens Stats.");
  });

  it("is spent after a second on screen, which takes the visit in every tab", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    await advance(SPENT_AFTER_MS);
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY)!).taken).toBe(true);
  });

  it("gives a tie inside the window to the fixed order", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="stand-ins" name="Swap" />
        <Control id="suggested-changes" name="Analysis" />
      </MomentsProvider>,
    );
    onScreen("Swap");
    await advance(ARRIVE_MS / 2);
    onScreen("Analysis");
    await advance(ARRIVE_MS / 2);
    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Analysis, a tip");
  });

  it("closes on the ✕ and is spent at once, never to return", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("data-moment-halo")).toBe(false);
  });

  it("closes on Esc", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
  });

  it("closes on a press of the control, and the press still goes on to its tool", async () => {
    const opened = vi.fn();
    function Pressable() {
      const anchor = useMomentAnchor("lineup", { eligible: true, copy: { tool: "Stats", line: "opens Stats." } });
      return (
        <button type="button" {...anchor} onClick={opened}>
          Stats
        </button>
      );
    }
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Pressable />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    const control = screen.getByRole("button", { name: "Stats" });
    fireEvent.pointerDown(control);
    fireEvent.click(control);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
  });

  it("waits while a dialog that locks nothing is drawn over the page, and arrives once it is gone", async () => {
    function Popover() {
      const [open, setOpen] = useState(true);
      return open ? (
        <div role="dialog" aria-label="menu">
          <button type="button" onClick={() => setOpen(false)}>
            done
          </button>
        </div>
      ) : null;
    }
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Popover />
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    // jsdom lays nothing out, so a drawn element is one with client rects.
    const proto = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function () {
      return [{}] as unknown as DOMRectList;
    };
    try {
      onScreen("Stats");
      await advance(ARRIVE_MS * 3);
      expect(screen.queryByRole("note")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "done" }));
      await advance(1000);
      expect(screen.getByRole("note", { name: "Stats, a tip" })).toBeTruthy();
    } finally {
      Element.prototype.getClientRects = proto;
    }
  });

  it("is not spent when the page tears it down inside a second, and the visit stays free", async () => {
    const { rerender } = render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS + SPENT_AFTER_MS / 2);
    rerender(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" eligible={false} />
      </MomentsProvider>,
    );
    await advance(SPENT_AFTER_MS);
    expect(spendMomentAction).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY)!).taken).toBe(false);
  });

  it("closes when its control scrolls out of view", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    onScreen("Stats", false);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
  });

  it("waits while something is open over the page, and arrives once it closes", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Hold />
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS * 3);
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "close menu" }));
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note", { name: "Stats, a tip" })).toBeTruthy();
  });

  it("shows nothing once the visit's moment is taken, nor for a spent moment, nor one not live", async () => {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify({ last: Date.now(), taken: true }));
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    expect(screen.queryByRole("note")).toBeNull();
    cleanup();
    window.localStorage.clear();

    render(
      <MomentsProvider live={LIVE} spent={["lineup"]}>
        <Control id="lineup" name="Stats" />
        <Control id="matchups" name="Split by" />
      </MomentsProvider>,
    );
    expect(observed).toHaveLength(0);
  });

  it("gives Esc's focus back to the control when it closes a bubble holding focus", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    screen.getByRole("button", { name: "Dismiss" }).focus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Stats" }));
  });

  it("closes on a keyboard press of the control, which fires a click with no pointerdown", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    fireEvent.click(screen.getByRole("button", { name: "Stats" }));
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
  });

  it("keeps the ✕ out of the native tab order: Tab from the control is how it is reached", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    expect(screen.getByRole("button", { name: "Dismiss" }).tabIndex).toBe(-1);
    screen.getByRole("button", { name: "Stats" }).focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dismiss" }));
  });

  it("shows beside whichever of a moment's controls is on screen, and points only that one at the note", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Rail" />
        <Control id="lineup" name="Tab bar" />
      </MomentsProvider>,
    );
    onScreen("Tab bar");
    await advance(ARRIVE_MS);
    expect(screen.getByRole("button", { name: "Tab bar" }).hasAttribute("aria-describedby")).toBe(true);
    expect(screen.getByRole("button", { name: "Rail" }).hasAttribute("aria-describedby")).toBe(false);
    expect(screen.getByRole("button", { name: "Tab bar" }).hasAttribute("data-moment-halo")).toBe(true);
  });

  it("lets one control carry two moments, and the fixed order picks between them", async () => {
    function Shared() {
      const a = useMomentAnchor("friend-spares", { eligible: true, copy: { tool: "Spares", line: "spares." } });
      const b = useMomentAnchor("stand-ins", { eligible: true, copy: { tool: "Swap", line: "swap." } });
      return (
        <button
          type="button"
          ref={(el) => {
            a.ref(el);
            b.ref(el);
          }}
        >
          Other ways
        </button>
      );
    }
    render(
      <MomentsProvider live={[...LIVE, "friend-spares"]} spent={[]}>
        <Shared />
      </MomentsProvider>,
    );
    onScreen("Other ways");
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Swap, a tip");
  });

  it("shows nothing while another tab holds the visit's claim", async () => {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify({ last: Date.now(), taken: false, claim: { tab: "other", at: Date.now() } }));
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("shows nothing on a hidden page, and tears a bubble down unspent when the page hides inside its second", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    expect(screen.queryByRole("note")).toBeNull();
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note", { name: "Stats, a tip" })).toBeTruthy();
    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await advance(SPENT_AFTER_MS);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
    hidden.mockRestore();
  });

  it("shows in the foreground card details while a covered one stays drawn behind it", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <div role="dialog" aria-modal="true" aria-label="covered">
          <button type="button">behind</button>
        </div>
        <div role="dialog" aria-modal="true" aria-label="front">
          <Control id="wishlist" name="Add to wishlist" />
        </div>
      </MomentsProvider>,
    );
    const proto = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function () {
      return [{}] as unknown as DOMRectList;
    };
    try {
      onScreen("Add to wishlist");
      await advance(ARRIVE_MS);
      expect(screen.getByRole("note", { name: "Add to wishlist, a tip" })).toBeTruthy();
    } finally {
      Element.prototype.getClientRects = proto;
    }
  });

  it("never shows beside an inert control, which something inside its own surface covers", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <div inert>
          <Control id="lineup" name="Stats" />
        </div>
      </MomentsProvider>,
    );
    act(() => notify!([{ target: document.querySelector("button")!, isIntersecting: true }]));
    await advance(ARRIVE_MS * 3);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("writes a failed spend again, until the server takes it", async () => {
    spendMomentAction.mockRejectedValueOnce(new Error("offline"));
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await advance(0);
    expect(spendMomentAction).toHaveBeenCalledTimes(1);
    await advance(15_000);
    expect(spendMomentAction).toHaveBeenCalledTimes(2);
    await advance(15_000);
    expect(spendMomentAction).toHaveBeenCalledTimes(2);
  });

  it("leaves storage alone with nothing live", async () => {
    render(
      <MomentsProvider live={[]} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    fireEvent.pointerDown(window);
    await advance(ARRIVE_MS);
    expect(window.localStorage.getItem(VISIT_KEY)).toBeNull();
  });

  it("does nothing outside the provider", async () => {
    render(<Control id="lineup" name="Stats" />);
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("suppressMoment (the landing, discovery R2 E11)", () => {
  it("spends a moment whose window is open, so its bubble never arrives, and writes it once", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
        <Suppress id="lineup" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS / 2);
    fireEvent.click(screen.getByRole("button", { name: "land on lineup" }));
    await advance(ARRIVE_MS * 4);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("data-moment-halo")).toBe(false);
    expect(spendMomentAction).toHaveBeenCalledTimes(1);
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    // The landing takes no visit: another moment may still arrive.
    expect(window.localStorage.getItem(VISIT_KEY)).not.toContain('"taken":true');
  });

  it("lets the next moment on screen take the window it cancelled", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="top-off" name="Top off" />
        <Control id="wishlist" name="Wish" />
        <Suppress id="top-off" />
      </MomentsProvider>,
    );
    onScreen("Top off");
    onScreen("Wish");
    fireEvent.click(screen.getByRole("button", { name: "land on top-off" }));
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Wish, a tip");
  });

  // Called as the landing calls it, never through a press: a press outside a showing bubble is the bubble's own
  // dismiss, which would close and spend it whatever `suppress` did.
  const visitTaken = () => JSON.parse(window.localStorage.getItem(VISIT_KEY) ?? "{}").taken === true;

  it("closes a bubble showing for that moment before it counts as seen, spends it once, and takes no visit", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
        <Suppress id="lineup" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note", { name: "Stats, a tip" })).toBeTruthy();
    act(() => suppressNow!("lineup"));
    await advance(0);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledTimes(1);
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    expect(visitTaken()).toBe(false);
  });

  it("gives the visit back when it closes a bubble before it counts as seen, so the next moment can arrive", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="top-off" name="Top off" />
        <Control id="wishlist" name="Wish" />
        <Suppress id="top-off" />
      </MomentsProvider>,
    );
    // Both on screen before the first bubble, so nothing after the suppression announces Wish again.
    onScreen("Top off");
    onScreen("Wish");
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note", { name: "Top off, a tip" })).toBeTruthy();
    act(() => suppressNow!("top-off"));
    await advance(0);
    await advance(0);
    expect(screen.getByRole("note", { name: "Wish, a tip" })).toBeTruthy();
  });

  it("closes a bubble showing for that moment after it counted as seen, writes nothing more, and the visit stays taken", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
        <Suppress id="lineup" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    await advance(ARRIVE_MS);
    await advance(SPENT_AFTER_MS);
    expect(spendMomentAction).toHaveBeenCalledTimes(1);
    expect(visitTaken()).toBe(true);
    act(() => suppressNow!("lineup"));
    await advance(0);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledTimes(1);
    expect(visitTaken()).toBe(true);
  });

  it("decides again when it spends the moment a claim was in flight for, so a control already on screen still gets its bubble", async () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="top-off" name="Top off" />
        <Control id="wishlist" name="Wish" />
        <Suppress id="top-off" />
      </MomentsProvider>,
    );
    onScreen("Top off");
    onScreen("Wish");
    // The window closes and the claim for Top off is taken asynchronously; the landing spends Top off before it lands.
    act(() => {
      vi.advanceTimersByTime(ARRIVE_MS);
      suppressNow!("top-off");
    });
    await advance(0);
    await advance(0);
    expect(screen.queryByRole("note", { name: "Top off, a tip" })).toBeNull();
    expect(screen.getByRole("note", { name: "Wish, a tip" })).toBeTruthy();
  });

  it("closes a bubble another tab's landing spent, and lets the next control already on screen take the window", async () => {
    vi.useRealTimers();
    const other = new BroadcastChannel("the99.moments.spent");
    const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
    try {
      render(
        <MomentsProvider live={LIVE} spent={[]}>
          <Control id="top-off" name="Top off" />
          <Control id="wishlist" name="Wish" />
        </MomentsProvider>,
      );
      onScreen("Top off");
      onScreen("Wish");
      await wait(ARRIVE_MS + 100);
      expect(screen.getByRole("note", { name: "Top off, a tip" })).toBeTruthy();
      other.postMessage("top-off");
      await wait(ARRIVE_MS + 300);
      expect(screen.queryByRole("note", { name: "Top off, a tip" })).toBeNull();
      expect(screen.getByRole("note", { name: "Wish, a tip" })).toBeTruthy();
    } finally {
      other.close();
      vi.useFakeTimers();
    }
  });

  // Mana Balance waits on Suggested changes (`after`): on screen alone, its window passes and shows nothing.
  const MANA_LIVE: MomentId[] = ["suggested-changes", "mana-balance"];

  it("frees a moment that waits on the one it spends, with no bubble closed", async () => {
    render(
      <MomentsProvider live={MANA_LIVE} spent={[]}>
        <Control id="mana-balance" name="Mana" />
        <Suppress id="suggested-changes" />
      </MomentsProvider>,
    );
    onScreen("Mana");
    await advance(ARRIVE_MS * 2);
    expect(screen.queryByRole("note")).toBeNull();
    act(() => suppressNow!("suggested-changes"));
    await advance(0);
    await advance(0);
    expect(screen.getByRole("note", { name: "Mana, a tip" })).toBeTruthy();
  });

  it("frees a moment here that waits on one another tab's landing spent", async () => {
    vi.useRealTimers();
    const other = new BroadcastChannel("the99.moments.spent");
    const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
    try {
      render(
        <MomentsProvider live={MANA_LIVE} spent={[]}>
          <Control id="mana-balance" name="Mana" />
        </MomentsProvider>,
      );
      onScreen("Mana");
      await wait(ARRIVE_MS * 2);
      expect(screen.queryByRole("note")).toBeNull();
      other.postMessage("suggested-changes");
      await wait(ARRIVE_MS + 300);
      expect(screen.getByRole("note", { name: "Mana, a tip" })).toBeTruthy();
    } finally {
      other.close();
      vi.useFakeTimers();
    }
  });

  it("tells the other tabs when it is called from a descendant's mount effect, before the provider's channel opens", async () => {
    vi.useRealTimers();
    const heard: unknown[] = [];
    const other = new BroadcastChannel("the99.moments.spent");
    other.onmessage = (e) => heard.push(e.data);
    function OnMount() {
      const suppress = useSuppressMoment();
      useEffect(() => suppress("lineup"), [suppress]);
      return null;
    }
    try {
      render(
        <MomentsProvider live={LIVE} spent={[]}>
          <OnMount />
        </MomentsProvider>,
      );
      await new Promise((r) => setTimeout(r, 50));
      expect(heard).toEqual(["lineup"]);
    } finally {
      other.close();
      vi.useFakeTimers();
    }
  });

  it("writes nothing for a moment that is not live (MOMENTS_ENABLED off) or already spent", async () => {
    const { unmount } = render(
      <MomentsProvider live={[]} spent={[]}>
        <Suppress id="lineup" />
      </MomentsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "land on lineup" }));
    unmount();
    render(
      <MomentsProvider live={LIVE} spent={["lineup"]}>
        <Suppress id="lineup" />
      </MomentsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "land on lineup" }));
    await advance(ARRIVE_MS);
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  it("does nothing outside the provider", () => {
    render(<Suppress id="lineup" />);
    fireEvent.click(screen.getByRole("button", { name: "land on lineup" }));
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
});

describe("a moment's control is its target (discovery R2)", () => {
  function Anchor({ eligible = true, fallback = false, target }: { eligible?: boolean; fallback?: boolean; target?: boolean }) {
    const a = useMomentAnchor("top-off", { eligible, fallback, target, copy: { tool: "Top off", line: "fills." } });
    return (
      <button type="button" {...a}>
        Top off
      </button>
    );
  }
  const drawn = (el: React.ReactNode) => {
    targets = null;
    render(
      <TargetsProvider>
        <GrabTargets />
        <MomentsProvider live={[]} spent={[]}>{el}</MomentsProvider>
      </TargetsProvider>,
    );
    return targets!.haloTarget("top-off");
  };

  it("registers while eligible, whatever MOMENTS_ENABLED says", () => {
    expect(drawn(<Anchor />)).toBe(true);
    expect(screen.getByRole("button", { name: "Top off" }).hasAttribute(HALO_ATTR)).toBe(true);
  });

  it("registers nothing while not eligible, as a fallback, or with target: false", () => {
    expect(drawn(<Anchor eligible={false} />)).toBe(false);
    cleanup();
    expect(drawn(<Anchor fallback />)).toBe(false);
    cleanup();
    expect(drawn(<Anchor target={false} />)).toBe(false);
  });
});
