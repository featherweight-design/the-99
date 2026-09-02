import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingScreen } from "./loading-screen";

const copy = { heading: "Loading decks", status: "fetching", caption: "One moment." };

describe("LoadingScreen", () => {
  it("ships no illustration — the crown is the whole mark", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll(".anim-dots")).toHaveLength(3);
  });
});
