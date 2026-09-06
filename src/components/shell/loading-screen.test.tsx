import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingScreen } from "./loading-screen";

const copy = { heading: "Loading decks", status: "fetching", caption: "One moment." };

describe("LoadingScreen", () => {
  it("ships no illustration — the crown is the whole mark", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll(".anim-dots")).toHaveLength(3);
  });
});
