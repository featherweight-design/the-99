import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultLine } from "./result-line";

describe("ResultLine", () => {
  it("states the lane at rest rather than printing a ratio", () => {
    render(<ResultLine shown={148} total={148} lane="owned" excludedByExactly={null} />);
    expect(screen.getByText("148 commanders you own and haven't built")).toBeInTheDocument();
  });

  it("never prints a denominator equal to its numerator", () => {
    render(<ResultLine shown={3301} total={3301} lane="discover" excludedByExactly={null} />);
    expect(screen.queryByText(/3,301 of 3,301/)).not.toBeInTheDocument();
  });

  it("prints the ratio once something is filtered", () => {
    render(<ResultLine shown={4} total={148} lane="owned" excludedByExactly={null} />);
    expect(screen.getByText("4 of 148 commanders match")).toBeInTheDocument();
  });

  // The plan's version of this assertion had no `selector`. A function matcher
  // reading `el.textContent` matches every ancestor too — `<body>` and the
  // render container hold the same text — so `getByText` threw on three
  // matches however the component was written. Scoping the query to the live
  // region is the assertion the plan meant: one element carries the whole
  // sentence, aside included.
  it("appends the Exactly aside to the same line, not a second one", () => {
    render(<ResultLine shown={2} total={148} lane="owned" excludedByExactly={6} />);
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "2 of 148 commanders match — Exactly excludes 6 that Any would show",
        { selector: "[aria-live]" },
      ),
    ).toBeInTheDocument();
  });

  it("is the only live region on the lane", () => {
    const { container } = render(
      <ResultLine shown={4} total={148} lane="owned" excludedByExactly={null} />,
    );
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });
});
