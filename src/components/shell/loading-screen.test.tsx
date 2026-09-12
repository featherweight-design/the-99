import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingScreen } from "./loading-screen";

const copy = { heading: "Loading decks", status: "fetching" };

describe("LoadingScreen", () => {
  it("ships no illustration — the crown is the whole mark", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll(".anim-dots")).toHaveLength(3);
  });

  // READINESS 19 forbids motion on the version rail, and the crown's pulse is
  // motion the reader meets on the way there. Same screen, same words, no
  // animation class anywhere in it.
  it("holds the crown still when the segment forbids motion", () => {
    const { container } = render(<LoadingScreen copy={copy} still />);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/anim-/);
  });

  it("renders heading and status only — a screen up for under a second gets no paragraph", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    expect(screen.getByText(copy.heading)).toBeInTheDocument();
    expect(screen.getByText(copy.status)).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
