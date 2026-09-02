import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("carries a quiet crown and no illustration", () => {
    const { container } = renderNoResults("counterspell", ["R"]);
    expect(container.querySelector("svg")).toBeNull();
    const diamonds = container.querySelectorAll("[aria-hidden] > span");
    expect(diamonds).toHaveLength(3);
    expect((diamonds[0] as HTMLElement).style.background).toBe(
      "var(--border-strong)",
    );
    expect(container.textContent).not.toContain("?");
  });

  it("keeps 'Keep only search' reachable only while a query is active", () => {
    const { unmount } = renderNoResults("counterspell", ["R"]);
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep only search" })).toBeTruthy();
    unmount();
    renderNoResults("", ["R"]);
    expect(screen.queryByRole("button", { name: "Keep only search" })).toBeNull();
  });
});
