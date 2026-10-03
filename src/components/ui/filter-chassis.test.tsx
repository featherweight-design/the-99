import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FilterChassis, type FilterChip } from "./filter-chassis";

const base = {
  sort: <button type="button">Sort · Recent</button>,
  onClearAll: () => {},
  resultLine: "41 decks",
  form: "wide" as const,
};

const chip = (key: string, label: string): FilterChip => ({ key, label, onRemove: () => {} });

describe("FilterChassis", () => {
  it("prints No filters on at rest rather than collapsing the row", () => {
    // Decision 2. The line IS the invariant that keeps the frame a fixed height;
    // a conditionally rendered chip row is the bug this forbids.
    const { container } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    expect(screen.getByText("No filters on")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='chips']")).toBeTruthy();
  });

  it("keeps all three rows present whether filtered or not", () => {
    const { container, rerender } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const rowsAtRest = container.querySelectorAll("[data-chassis-row]").length;
    rerender(<FilterChassis {...base} controls={null} chips={[chip("status:playing", "Status · Playing")]} />);
    expect(container.querySelectorAll("[data-chassis-row]").length).toBe(rowsAtRest);
    expect(rowsAtRest).toBe(3);
  });

  it("renders the same row structure at four dimensions and at five", () => {
    // Structure only. jsdom does not lay out, so the geometry this implies —
    // that four dimensions and five produce the same frame HEIGHT — is the
    // browser probe's job, not this file's. Asserting row count here and
    // calling it the height invariant would be the test claiming more than it
    // checks.
    const four = <><i>a</i><i>b</i><i>c</i><i>d</i></>;
    const five = <><i>a</i><i>b</i><i>c</i><i>d</i><i>e</i></>;
    const { container, rerender } = render(<FilterChassis {...base} controls={four} chips={[]} />);
    const before = container.querySelectorAll("[data-chassis-row]").length;
    rerender(<FilterChassis {...base} controls={five} chips={[]} />);
    expect(container.querySelectorAll("[data-chassis-row]").length).toBe(before);
  });

  it("separates sort from the filters with a hairline, on both forms", () => {
    // Decision 11. Sort is not a filter and the separation is what says so.
    for (const form of ["wide", "compact"] as const) {
      const { container, unmount } = render(
        <FilterChassis {...base} form={form} controls={null} chips={[]} />,
      );
      expect(container.querySelector("[data-chassis-hairline]")).toBeTruthy();
      unmount();
    }
  });

  it("never lets the control row wrap", () => {
    // Decision 18: two forms, nothing in between. A sort landing on its own
    // line reads as a bug, which is exactly how R1's wrapping row was reported.
    const { container } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const row = container.querySelector("[data-chassis-row='controls']")!;
    expect(row.className).not.toMatch(/flex-wrap/);
  });

  it("names the value a chip removes, never a bare Remove", () => {
    const onRemove = vi.fn();
    render(
      <FilterChassis {...base} controls={null} chips={[{ key: "c", label: "3 colours", onRemove }]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: 3 colours" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("says the sort is unchanged when clearing every filter", () => {
    // "filters" is load-bearing in the copy: this control deliberately does not
    // touch the sort, and the accessible name is where that promise is made.
    const onClearAll = vi.fn();
    render(
      <FilterChassis {...base} onClearAll={onClearAll} controls={null} chips={[chip("a", "Status · Playing")]} />,
    );
    const clear = screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." });
    fireEvent.click(clear);
    expect(onClearAll).toHaveBeenCalled();
  });

  it("keeps clear-all mounted and inert at rest, never absent", () => {
    // `rack/chip-line.tsx:74-79` states the reason: the affordance is part of
    // what the row teaches, and a button that comes and goes has to be
    // re-found. The commander routes migrate onto this frame, so dropping it
    // would remove an established way out and change the focusable structure.
    render(<FilterChassis {...base} controls={null} chips={[]} />);
    const clear = screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." });
    expect(clear).toBeDisabled();
  });

  it("enables clear-all once there is something to clear", () => {
    render(<FilterChassis {...base} controls={null} chips={[chip("a", "Status · Playing")]} />);
    expect(screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." }))
      .toBeEnabled();
  });

  it("sizes the chip row from a stated line-height, not an inherited one", () => {
    // The first floor was 22px against a chip that measured 24.5 — 11px text at
    // Tailwind's inherited 1.5 plus padding and borders. Both branches now state
    // leading-[14px], so 14 + 6 + 2 is arithmetic anybody can check.
    const { container, rerender } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const row = () => container.querySelector("[data-chassis-row='chips']") as HTMLElement;
    expect(row().style.minHeight).toBe("22px");
    expect(container.querySelector("[data-chassis-row='chips'] span")!.className)
      .toContain("leading-[14px]");
    rerender(<FilterChassis {...base} controls={null} chips={[chip("a", "x")]} />);
    expect(row().style.minHeight).toBe("22px");
    expect(container.querySelector("[data-chassis-row='chips'] span")!.className)
      .toContain("leading-[14px]");
  });

  it("gives a chip's remove a real 44px target without growing the chip", () => {
    // The chip line's height is the invariant the whole frame rests on, so the
    // target is an overlay rather than padding — the same treatment
    // `/collection`'s retired chip row used.
    render(<FilterChassis {...base} controls={null} chips={[chip("a", "3 colours")]} />);
    const remove = screen.getByRole("button", { name: "Remove filter: 3 colours" });
    expect(remove.className).toContain("after:h-[44px]");
    expect(remove.className).toContain("after:w-[44px]");
    // Anchored to the ✕, not to the chip: chips sit 6px apart, so a chip-wide
    // target would overlap its neighbour's and remove the wrong filter.
    expect(remove.tagName).toBe("BUTTON");
    expect(remove.textContent).toBe("×");
  });

  it("reserves the chip row's height so toggling the first filter moves nothing", () => {
    // The invariant the whole frame rests on. `No filters on` is a bare line box
    // and a chip is 11px over py-[3px] inside a border, so without a floor the
    // row grows on the first filter and takes row 3 and the list down with it.
    const { container, rerender } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const row = () => container.querySelector("[data-chassis-row='chips']") as HTMLElement;
    const atRest = row().style.minHeight;
    expect(atRest).toBe("22px");
    rerender(<FilterChassis {...base} controls={null} chips={[chip("a", "Status · Playing")]} />);
    expect(row().style.minHeight).toBe(atRest);
  });

  it("gives clear-all the same 44px target as the chip beside it", () => {
    render(<FilterChassis {...base} controls={null} chips={[chip("a", "x")]} />);
    const clear = screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." });
    expect(clear.className).toContain("after:h-[44px]");
    expect(clear.className).toContain("after:min-w-[44px]");
  });

  it("keeps a long chip label on one line, so the reserved height holds", () => {
    render(
      <FilterChassis
        {...base}
        controls={null}
        chips={[chip("s", "Set · Adventures in the Forgotten Realms Commander")]}
      />,
    );
    const c = screen.getByRole("button", { name: /^Remove filter: Set/ });
    // The chip is the span; the button inside it is what gets removed.
    expect(c.closest("span")!.className).toContain("whitespace-nowrap");
    expect(c.closest("span")!.className).toContain("shrink-0");
  });

  it("takes its padding from the form, not from Tailwind's lg", () => {
    // lg: is 1024px and the chassis switches at 1000, so a lg: padding would
    // give 1000-1023px the wide form inside the compact frame.
    const { container, rerender } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const frame = () => container.querySelector("[data-chassis-form]")!;
    expect(frame().className).toContain("px-[22px]");
    expect(frame().className).not.toMatch(/lg:px-/);
    rerender(<FilterChassis {...base} form="compact" controls={null} chips={[]} />);
    expect(frame().className).toContain("px-[16px]");
  });

  it("draws a swatch per value a chip's label collapsed", () => {
    // A colour chip reads "3 colours" rather than splitting into three chips,
    // so the swatches are the only thing saying which three. Dropping them —
    // which the first adapter did — leaves the reader a count and no values.
    const { container } = render(
      <FilterChassis
        {...base}
        controls={null}
        chips={[{ key: "colors", label: "2 colors", dots: ["#111", "#222"], onRemove: () => {} }]}
      />,
    );
    const swatches = container.querySelectorAll("[data-chassis-row='chips'] span[aria-hidden] span");
    expect(swatches).toHaveLength(2);
  });

  it("draws resultTrailing at row 3's trailing edge", () => {
    // `/collection`'s view toggle lives here: it changes how the list is drawn
    // rather than what is in it. Without an assertion
    // a refactor could drop the slot and every structural test would still pass.
    const { container } = render(
      <FilterChassis
        {...base}
        controls={null}
        chips={[]}
        resultTrailing={<button type="button">Grid view</button>}
      />,
    );
    const row = container.querySelector("[data-chassis-row='result']")!;
    const trailing = within(row as HTMLElement).getByRole("button", { name: "Grid view" });
    expect(trailing).toBeTruthy();
    // Pushed to the edge rather than sitting beside the sentence.
    expect(trailing.parentElement?.className).toContain("ml-auto");
  });

  it("omits the trailing group when the route has nothing for it", () => {
    const { container } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const row = container.querySelector("[data-chassis-row='result']")!;
    expect(row.querySelector(".ml-auto")).toBeNull();
  });

  it("forwards a custom announcement through to the live region", () => {
    // ResultLine is tested in isolation, so a regression dropping either prop
    // HERE would lose /collection's richer announcements with every other test
    // still green.
    const { container, rerender } = render(
      <FilterChassis {...base} controls={null} chips={[]} announce="Red added." announceId={1} />,
    );
    expect(container.querySelector("[role='status']")?.textContent).toBe("Red added.");
    // Same sentence, new event: the id is what makes it speak again.
    rerender(
      <FilterChassis {...base} controls={null} chips={[]} announce="" announceId={1} />,
    );
    rerender(
      <FilterChassis {...base} controls={null} chips={[]} announce="Red added." announceId={2} />,
    );
    expect(container.querySelector("[role='status']")?.textContent).toBe("Red added.");
  });

  it("speaks a chip's collapsed values rather than its count", () => {
    render(
      <FilterChassis
        {...base}
        controls={null}
        chips={[
          { key: "colors", label: "2 colors", spoken: "White, Black", onRemove: () => {} },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove filter: White, Black" })).toBeTruthy();
    // The count stays on screen; only what is spoken changes.
    const count = screen.getByText("2 colors");
    expect(count).toBeTruthy();
    // And the names are heard reading the ROW, not only on entering the button.
    expect(count.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("White, Black").className).toContain("sr-only");
  });

  it("draws a chip's leading node before its label", () => {
    render(
      <FilterChassis
        {...base}
        controls={null}
        chips={[
          {
            key: "avail",
            label: "2 states",
            leading: <i data-testid="marker" />,
            onRemove: () => {},
          },
        ]}
      />,
    );
    expect(screen.getByTestId("marker")).toBeTruthy();
  });

  it("never scrolls the control row, in either form", () => {
    // `/collection` set a `scrollCompactControls` flag for a while so its five
    // inline controls could scroll at 390px. A scroll affordance is not a
    // filter surface — the three dimensions past the fold had nothing on screen
    // saying they were there — and every route now puts its compact dimensions
    // behind one trigger, so the row fits and the flag is gone.
    const { container, rerender } = render(
      <FilterChassis {...base} form="compact" controls={null} chips={[]} />,
    );
    const row = () => container.querySelector("[data-chassis-row='controls']")!.firstElementChild!;
    expect(row().className).not.toContain("overflow-x-auto");
    rerender(<FilterChassis {...base} form="wide" controls={null} chips={[]} />);
    expect(row().className).not.toContain("overflow-x-auto");
  });

  it("carries exactly one live region", () => {
    const { container } = render(
      <FilterChassis {...base} controls={null} chips={[chip("a", "x")]} />,
    );
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });







});
