// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FriendCard } from "./friend-card";

// The compact card is the 300×419 box scaled .5, so the board's 34px hero is a 68px one inside it.
describe("FriendCard back hero", () => {
  it("draws the compact hero at twice the board's 34px, and the landing's at 58px", () => {
    const { container, rerender } = render(<FriendCard face={null} up={false} compact word="X" />);
    expect(screen.getByText("99").className).toContain("text-[68px]");
    expect(container.querySelector("[data-variant=compact]")).toBeTruthy();
    rerender(<FriendCard face={null} up={false} />);
    expect(screen.getByText("99").className).toContain("text-[58px]");
  });
});
