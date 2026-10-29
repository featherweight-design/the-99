import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NoResults } from "./no-results";

// Forced-state coverage for the richness pass's no-results re-skin. The state
// is only reachable in the running app behind auth, so the four heading
// branches and the retired "?" fan are pinned here instead.

function renderNoResults(query: string, colors: string[]) {
  return render(
    <NoResults
      query={query}
      colors={colors}
      totalCount={1418}
      onClearAll={vi.fn()}
      onKeepSearch={vi.fn()}
    />,
  );
}

describe("NoResults", () => {
  it("reproduces the Surfaces v2 heading for query + color", () => {
    renderNoResults("counterspell", ["R"]);
    expect(screen.getByRole("heading").textContent).toBe(
      'Nothing matches "counterspell" in Red.',
    );
  });

  it("names the guild for a multi-color filter", () => {
    renderNoResults("counterspell", ["R", "W"]);
    expect(screen.getByRole("heading").textContent).toBe(
      'Nothing matches "counterspell" in Boros.',
    );
  });

  it("drops the color clause when no color is active", () => {
    renderNoResults("counterspell", []);
    expect(screen.getByRole("heading").textContent).toBe('Nothing matches "counterspell".');
  });

  it("drops the query clause when only a color is active", () => {
    renderNoResults("  ", ["R"]);
    expect(screen.getByRole("heading").textContent).toBe("Nothing matches in Red.");
  });

  // Collection has four filter dimensions; the mock's heading names two, so a
  // type- or set-only zero state lands here by design.
  it("falls back to the generic heading for type/set-only filtering", () => {
    renderNoResults("", []);
    expect(screen.getByRole("heading").textContent).toBe("Nothing matches those filters.");
  });

  it("renders the caption verbatim once, at both breakpoints", () => {
    renderNoResults("counterspell", ["R"]);
    expect(
      screen.getAllByText(
        "Nothing in your collection clears every filter. Drop one of them.",
      ),
    ).toHaveLength(1);
  });

  it("draws the shared ZeroState: three hollow diamonds, no crown, no vignette", () => {
    const { container } = renderNoResults("counterspell", ["R"]);
    // The crown was an svg of three filled rects; the shared rule is spans.
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    const rule = container.querySelector('[aria-hidden="true"]');
    expect(rule?.children).toHaveLength(3);
    for (const d of Array.from(rule?.children ?? [])) {
      expect(d.className).toContain("rotate-45");
      expect(d.className).toContain("border-[color:var(--border-strong)]");
    }
    expect(container.innerHTML).not.toContain("radial-gradient");
    const heading = screen.getByRole("heading");
    expect(heading.className).toContain("text-[19px]");
    expect(heading.className).toContain("font-semibold");
    expect(container.textContent).not.toContain("?");
  });

  it("with a query, leads with Keep only search then Clear all filters, at both widths", () => {
    const onKeepSearch = vi.fn();
    const onClearAll = vi.fn();
    render(
      <NoResults
        query="counterspell"
        colors={["R"]}
        totalCount={1418}
        onClearAll={onClearAll}
        onKeepSearch={onKeepSearch}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Keep only search", "Clear all filters"]);
    // Neither press hides at a breakpoint any more.
    for (const b of buttons) expect(b.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    // 48 on the phone, 32 hugging from sm (640), never md.
    for (const b of buttons) {
      expect(b.className).toContain("h-[48px]");
      expect(b.className).toContain("sm:h-[32px]");
      expect(b.className).not.toMatch(/(^|\s)md:/);
    }
    fireEvent.click(buttons[0]);
    expect(onKeepSearch).toHaveBeenCalledTimes(1);
    fireEvent.click(buttons[1]);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("filters only: Clear all filters alone", () => {
    renderNoResults("  ", ["R"]);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Clear all filters"]);
    expect(screen.queryByRole("button", { name: "Keep only search" })).toBeNull();
  });
});
