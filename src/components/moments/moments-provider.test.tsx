import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ARRIVE_MS, MomentsProvider, SPENT_AFTER_MS, useMomentAnchor } from "./moments-provider";
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

function onScreen(name: string, isIntersecting = true) {
  const el = screen.getByRole("button", { name });
  act(() => notify!([{ target: el, isIntersecting }]));
}

function Control({ id, name, eligible = true }: { id: MomentId; name: string; eligible?: boolean }) {
  const anchor = useMomentAnchor(id, { eligible, copy: { tool: name, line: `opens ${name}.` } });
  return (
    <button type="button" {...anchor}>
      {name}
    </button>
  );
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

const LIVE: MomentId[] = ["top-off", "lineup", "suggested-changes", "stand-ins"];

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
  it("arrives the tie window after its control comes on screen, as a named note the control points at", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    expect(screen.queryByRole("note")).toBeNull();
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
    const note = screen.getByRole("note", { name: "Stats, a tip" });
    expect(screen.getByRole("button", { name: "Stats" }).getAttribute("aria-describedby")).toBe(note.id);
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("data-moment-halo")).toBe(true);
    expect(document.querySelector("[aria-live=polite]")!.textContent).toBe("Stats opens Stats.");
  });

  it("is spent after a second on screen, which takes the visit in every tab", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS + SPENT_AFTER_MS));
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY)!).taken).toBe(true);
  });

  it("gives a tie inside the window to the fixed order", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="stand-ins" name="Swap" />
        <Control id="suggested-changes" name="Analysis" />
      </MomentsProvider>,
    );
    onScreen("Swap");
    act(() => vi.advanceTimersByTime(ARRIVE_MS / 2));
    onScreen("Analysis");
    act(() => vi.advanceTimersByTime(ARRIVE_MS / 2));
    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Analysis, a tip");
  });

  it("closes on the ✕ and is spent at once, never to return", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("data-moment-halo")).toBe(false);
  });

  it("closes on Esc, and on a press of the control, which still goes on to its tool", () => {
    const pressed = vi.fn();
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
        <button type="button" onClick={pressed}>
          elsewhere
        </button>
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith("lineup");
  });

  it("is not spent when the page tears it down inside a second, and the visit stays free", () => {
    const { rerender } = render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS + SPENT_AFTER_MS / 2));
    rerender(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" eligible={false} />
      </MomentsProvider>,
    );
    act(() => vi.advanceTimersByTime(SPENT_AFTER_MS));
    expect(spendMomentAction).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY)!).taken).toBe(false);
  });

  it("closes when its control scrolls out of view", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
    onScreen("Stats", false);
    expect(screen.queryByRole("note", { name: "Stats, a tip" })).toBeNull();
  });

  it("waits while something is open over the page, and arrives once it closes", () => {
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Hold />
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS * 3));
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "close menu" }));
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
    expect(screen.getByRole("note", { name: "Stats, a tip" })).toBeTruthy();
  });

  it("shows nothing once the visit's moment is taken, nor for a spent moment, nor one not live", () => {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify({ last: Date.now(), taken: true }));
    render(
      <MomentsProvider live={LIVE} spent={[]}>
        <Control id="lineup" name="Stats" />
      </MomentsProvider>,
    );
    onScreen("Stats");
    act(() => vi.advanceTimersByTime(ARRIVE_MS));
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

  it("does nothing outside the provider", () => {
    render(<Control id="lineup" name="Stats" />);
    expect(screen.getByRole("button", { name: "Stats" }).hasAttribute("aria-describedby")).toBe(false);
  });
});
