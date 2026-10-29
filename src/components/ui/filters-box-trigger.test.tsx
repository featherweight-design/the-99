import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FiltersBoxTrigger } from "./filters-box-trigger";
import { FiltersTrigger } from "../collection/filter-bar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

// One 44px box on the rack, Collection and the cart (Small items 4 item 1).
describe("the shared Filters box", () => {
  it("is 44px with a 10px radius and no `after:` hit overlay, with and without a filter on", () => {
    for (const badge of [0, 2]) {
      const { unmount } = render(<FiltersBoxTrigger label="Filters" badge={badge} expanded={false} onClick={() => {}} />);
      const cls = screen.getByRole("button", { name: "Filters" }).className;
      expect(cls).toContain("h-[44px]");
      expect(cls).toContain("rounded-[10px]");
      expect(cls).not.toContain("after:");
      unmount();
    }
  });

  it("turns its edge to accent and draws the badge only with a filter on", () => {
    const { rerender } = render(<FiltersBoxTrigger label="Filters" badge={0} expanded={false} onClick={() => {}} />);
    expect(screen.getByRole("button").className).toContain("border-[color:var(--border-strong)]");
    expect(screen.getByRole("button").textContent).toBe("Filters");
    rerender(<FiltersBoxTrigger label="Filters" badge={3} expanded={false} onClick={() => {}} />);
    expect(screen.getByRole("button").className).toContain("border-[color:var(--accent)]");
    expect(screen.getByRole("button").textContent).toBe("Filters3");
  });

  it("is what Collection draws", () => {
    render(<FiltersTrigger active={1} expanded={false} onClick={() => {}} />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("h-[44px]");
    expect(cls).not.toContain("after:");
    expect(cls).not.toContain("h-[36px]");
  });
});
