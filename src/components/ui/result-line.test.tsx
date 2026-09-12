import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ResultLine } from "./result-line";

describe("ResultLine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("draws the sentence immediately", () => {
    render(<ResultLine line="41 decks" />);
    expect(screen.getByText("41 decks")).toBeTruthy();
  });

  it("stays silent on arrival, so the chassis does not read its own count out", () => {
    const { container } = render(<ResultLine line="41 decks" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("announces a change late, so four keystrokes are one count", () => {
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="12 of 41 decks" />);
    // Still silent before the debounce elapses.
    act(() => vi.advanceTimersByTime(299));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("goes quiet when another surface owns the region", () => {
    // The compact sheet is aria-modal and carries its own region. With both
    // live a filter change is announced twice, from inside the modal and from
    // the page behind it.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="12 of 41 decks" silent />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
    // The visible line still draws — only the announcement stops.
    expect(screen.getByText("12 of 41 decks")).toBeTruthy();
  });

  it("speaks a change the sheet had no time to announce", () => {
    // Dismissed inside the debounce: the sheet's own timer died with its
    // unmount, so this is the only thing that can say the count.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="12 of 41 decks" silent />);
    act(() => vi.advanceTimersByTime(100));
    rerender(<ResultLine line="12 of 41 decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("speaks a custom message even when the count has not moved", () => {
    // A filter that narrows to the same number still changed something, and
    // the surface has a sentence for it. Watching the line alone never says it.
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="41 decks" announce="EOE added. 41 decks shown." />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe(
      "EOE added. 41 decks shown.",
    );
  });

  it("does not let an empty announce silence the line", () => {
    // The caller's initial value is the empty string, which is not null — so
    // `announce ?? line` would suppress every ordinary announcement.
    const { rerender, container } = render(<ResultLine line="41 decks" announce="" />);
    rerender(<ResultLine line="12 of 41 decks" announce="" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("stays quiet for a change the sheet has already announced", () => {
    // Dismissed past the debounce: the sheet spoke it, and repeating it here is
    // the same count twice.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="12 of 41 decks" silent />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ResultLine line="12 of 41 decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("never repeats a custom message on a later line change", () => {
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="41 decks" announce="EOE added. 41 decks shown." />);
    act(() => vi.advanceTimersByTime(300));
    rerender(<ResultLine line="9 of 41 decks" announce="EOE added. 41 decks shown." />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("9 of 41 decks");
  });

  it("keeps a custom message queued through a silence", () => {
    // Stamping it as seen while returning without scheduling it is how the
    // sibling ref lost an announcement: silence ends, `fresh` reads false, and
    // the bare count replaces the sentence the surface composed.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="41 decks" announce="EOE added. 41 decks shown." silent />);
    act(() => vi.advanceTimersByTime(100));
    rerender(<ResultLine line="41 decks" announce="EOE added. 41 decks shown." />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe(
      "EOE added. 41 decks shown.",
    );
  });

  it("does not debounce a message its author already debounced", () => {
    // FilterPanel waits 300ms on onAnnounce before this prop ever sees it, so a
    // second wait would put the sentence 600ms behind the keystroke.
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="41 decks" announce="EOE added. 41 decks shown." />);
    expect(container.querySelector("[role='status']")?.textContent).toBe(
      "EOE added. 41 decks shown.",
    );
  });

  it("still speaks a custom message after a long silence", () => {
    // The sheet announces the COUNT, never the surface's own sentence. So a
    // long silence means the number was heard and the sentence was not, and
    // suppressing both lost the sentence permanently.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="9 of 41 decks" announce="EOE added. 9 shown." silent />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ResultLine line="9 of 41 decks" announce="EOE added. 9 shown." />);
    expect(container.querySelector("[role='status']")?.textContent).toBe("EOE added. 9 shown.");
  });

  it("does not treat a delivered message as fresh on the next change", () => {
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="9 of 41 decks" announce="EOE added. 9 shown." silent />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ResultLine line="9 of 41 decks" announce="EOE added. 9 shown." />);
    rerender(<ResultLine line="3 of 41 decks" announce="EOE added. 9 shown." />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("3 of 41 decks");
  });

  it("measures the pending change, not how long the sheet was open", () => {
    // A sheet open a long while, then a filter toggled and the sheet dismissed
    // a moment later: the sheet's debounce never fired for that change, so the
    // chassis has to say it. Keying on the silence would have suppressed it.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    act(() => vi.advanceTimersByTime(5000));
    rerender(<ResultLine line="7 of 41 decks" silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="7 of 41 decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("7 of 41 decks");
  });

  it("speaks the same sentence twice when the caller says it is a new event", () => {
    // FilterPanel emits the same option string for a repeated keystroke, and a
    // caller holding it in state re-publishes a value that has not changed. Text
    // alone as identity would swallow the second one.
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="41 decks" announce="Red added." announceId={1} />);
    expect(container.querySelector("[role='status']")?.textContent).toBe("Red added.");
    rerender(<ResultLine line="41 decks" announce="" announceId={1} />);
    const firstNode = container.querySelector("[role='status']");
    rerender(<ResultLine line="41 decks" announce="Red added." announceId={2} />);
    const secondNode = container.querySelector("[role='status']");
    expect(secondNode?.textContent).toBe("Red added.");
    // Text alone proves nothing: an unchanged live region is one most screen
    // readers do not read. The node itself has to be replaced.
    expect(secondNode).not.toBe(firstNode);
  });

  it("does not let a line change consume a stable announce id", () => {
    // A caller holding one id across renders would otherwise have its first
    // real message stamped by an ordinary count announcement and never spoken.
    const { rerender, container } = render(<ResultLine line="41 decks" announceId={7} />);
    rerender(<ResultLine line="12 of 41 decks" announceId={7} />);
    act(() => vi.advanceTimersByTime(300));
    rerender(<ResultLine line="12 of 41 decks" announce="Red added." announceId={7} />);
    expect(container.querySelector("[role='status']")?.textContent).toBe("Red added.");
  });

  it("announces a count whose timer the sheet opening cancelled", () => {
    // The change schedules its 300ms timer, the sheet opens mid-debounce and
    // the cleanup cancels it. Stamping at schedule time left the line looking
    // spoken, so closing the sheet took the early return and nobody ever heard
    // the number.
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="12 of 41 decks" />);
    act(() => vi.advanceTimersByTime(100));
    rerender(<ResultLine line="12 of 41 decks" silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="12 of 41 decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("does not let a spent silence suppress a later count", () => {
    // Silence entered and left while the line sat unchanged leaves a stale
    // timestamp; the next genuinely new count then reads as long-silenced.
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="41 decks" silent />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="5 of 41 decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("5 of 41 decks");
  });

  it("is the one live region, and it is atomic", () => {
    const { container } = render(<ResultLine line="41 decks" />);
    const regions = container.querySelectorAll("[aria-live]");
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute("aria-atomic")).toBe("true");
    // The visible line must not be read a second time by the same reader.
    expect(screen.getByText("41 decks").getAttribute("aria-hidden")).toBe("true");
  });
});
