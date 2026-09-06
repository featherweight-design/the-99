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

  it("renders heading and status only — a screen up for under a second gets no paragraph", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    expect(screen.getByText(copy.heading)).toBeInTheDocument();
    expect(screen.getByText(copy.status)).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
