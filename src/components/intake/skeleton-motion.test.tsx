import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultsSkeleton } from "./choose-results";

// The skeleton rows breathe (Hugh, 2026-10-12). One wrapper carries the class, so the rows pulse
// together rather than each on its own clock.
describe("Help me choose's searching skeleton", () => {
  it("breathes on the list that holds its rows", () => {
    const { container } = render(<ResultsSkeleton />);
    const list = container.querySelector("ol[aria-hidden]");
    expect(list?.classList.contains("anim-skeleton")).toBe(true);
    expect(container.querySelectorAll(".anim-skeleton")).toHaveLength(1);
  });
});
