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

  // Collection surfaces addendum Q2: row 2's narrowest width has no room for the count's
  // noun beside a full Sort trigger. The visible line is already `aria-hidden`, so splitting
  // it changes nothing a screen reader hears — only the sr-only region (the next test) does.
  it("marks a trailing suffix hidden below 480px, visually only", () => {
    const { container } = render(<ResultLine line="2,926 results" hiddenSuffix=" results" />);
    const p = container.querySelector("p");
    expect(p?.textContent).toBe("2,926 results");
    const hidden = p?.querySelector("span.max-\\[479px\\]\\:hidden");
    expect(hidden?.textContent).toBe(" results");
  });

  it("announces the suffix-split line whole, exactly as an un-split one", () => {
    const { rerender, container } = render(<ResultLine line="41 decks" hiddenSuffix=" decks" />);
    rerender(<ResultLine line="12 of 41 decks" hiddenSuffix=" decks" />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("ignores a suffix the line does not end with", () => {
    render(<ResultLine line="41 decks" hiddenSuffix=" results" />);
    expect(screen.getByText("41 decks")).toBeTruthy();
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

  it("drops a queued message once the list has moved past it", () => {
    // "EOE added, 12 shown" held through two more filters would announce a
    // count that is no longer true. The current count speaks instead.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="12 of 41" announce="EOE added. 12 shown." announceId={1} silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="4 of 41" announce="EOE added. 12 shown." announceId={1} silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="4 of 41" announce="EOE added. 12 shown." announceId={1} />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).toBe("4 of 41");
  });

  it("speaks a newer message that arrived during the same silence", () => {
    // Two actions inside one open sheet: the second sentence replaces the
    // first rather than being mistaken for it and dropped as stale.
    const { rerender, container } = render(<ResultLine line="41 decks" silent />);
    rerender(<ResultLine line="12 of 41" announce="EOE added." announceId={1} silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="4 of 41" announce="Red added." announceId={2} silent />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="4 of 41" announce="Red added." announceId={2} />);
    expect(container.querySelector("[role='status']")?.textContent).toBe("Red added.");
  });

  it("drops a held message when the list changed but the count did not", () => {
    // Two filters can leave the same number of rows, so the count cannot tell
    // whether the sentence still describes what is on screen.
    const { rerender, container } = render(<ResultLine line="9 of 41" revision="a" silent />);
    rerender(
      <ResultLine line="9 of 41" revision="a" announce="EOE added." announceId={1} silent />,
    );
    act(() => vi.advanceTimersByTime(50));
    rerender(
      <ResultLine line="9 of 41" revision="b" announce="EOE added." announceId={1} silent />,
    );
    act(() => vi.advanceTimersByTime(50));
    rerender(<ResultLine line="9 of 41" revision="b" announce="EOE added." announceId={1} />);
    act(() => vi.advanceTimersByTime(300));
    // Nothing is announced: the sentence describes a list the reader has left,
    // and the count itself has not moved so there is no new number to give.
    // The wrong outcome here is "EOE added." against the newer list.
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("drops a held message when silence ends in the same render as the change", () => {
    // The stale check ran after the queue was cleared, so this timing slipped
    // past it and the held sentence was delivered against the newer list.
    const { rerender, container } = render(<ResultLine line="9 of 41" revision="a" silent />);
    rerender(
      <ResultLine line="9 of 41" revision="a" announce="EOE added." announceId={1} silent />,
    );
    act(() => vi.advanceTimersByTime(50));
    // Silence ends and the list moves in one go.
    rerender(<ResultLine line="9 of 41" revision="b" announce="EOE added." announceId={1} />);
    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector("[role='status']")?.textContent).not.toBe("EOE added.");
  });

  it("draws the line as a warning when asked", () => {
    // /collection's retired chip row turned amber at zero — the one state where
    // the number reports something wrong rather than a total.
    const { rerender } = render(<ResultLine line="0 results" warn />);
    expect(screen.getByText("0 results").className).toContain("var(--warning)");
    rerender(<ResultLine line="41 decks" />);
    expect(screen.getByText("41 decks").className).toContain("var(--fg-muted)");
  });

  it("is the one live region, and it is atomic", () => {
    const { container } = render(<ResultLine line="41 decks" />);
    const regions = container.querySelectorAll("[aria-live]");
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute("aria-atomic")).toBe("true");
    // The visible line must not be read a second time by the same reader.
    expect(screen.getByText("41 decks").getAttribute("aria-hidden")).toBe("true");
  });

  it("says nothing when only the line's wording changes under one revision", () => {
    // A breakpoint-driven caller picks its short or long sentence from a media
    // query, and `useMinWidth` hydrates from its server snapshot — so on a wide
    // first load the line flips form once, just after mount, with nothing
    // having happened. The revision is what says the result did not move.
    const { rerender, container } = render(<ResultLine line="1,240 results" revision="r1" />);
    rerender(<ResultLine line="Showing 1,240 unique · 2,933 total" revision="r1" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("still announces once the revision moves", () => {
    // The guard above must not swallow the next real change.
    const { rerender, container } = render(<ResultLine line="1,240 results" revision="r1" />);
    rerender(<ResultLine line="Showing 1,240 unique · 2,933 total" revision="r1" />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ResultLine line="Showing 412 of 1,240" revision="r2" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("[role='status']")?.textContent).toBe("Showing 412 of 1,240");
  });

});
