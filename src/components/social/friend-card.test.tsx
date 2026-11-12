// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FriendCard } from "./friend-card";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";

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

// The card's frame and its art window both draw the commander's art_crop, so both take ArtWash's top trim (#2890).
describe("FriendCard art", () => {
  const norm = (v: string | number | undefined) => String(v ?? "").replace(/\s/g, "");
  const face = { name: "Dave", commander: { name: "Sokka, Swordmaster", artCropUri: "https://x/sokka-crop.jpg" }, type: "Friend", rules: "Rules" };
  it("trims the top of the frame's art_crop and the window's", () => {
    render(<FriendCard face={face} up />);
    const front = screen.getByTestId("friend-card-front");
    // The container is an unpadded wrapper filling the front, not the padded front: its units must read the layer's box.
    expect(front).not.toHaveClass(ART_CROP_TRIM.box);
    const wrap = front.querySelector<HTMLElement>("[data-frame-art]")!;
    expect(wrap.parentElement).toBe(front);
    expect(wrap).toHaveClass(ART_CROP_TRIM.box, "absolute", "inset-0", "overflow-hidden");
    expect(wrap.className).not.toMatch(/\bp-\[/);
    const layer = wrap.firstElementChild as HTMLElement;
    expect(layer.style.backgroundImage).toContain("sokka-crop.jpg");
    expect(norm(layer.style.marginTop)).toBe(norm(ART_CROP_TRIM.layer.marginTop));
    const img = front.querySelector("img")!;
    expect(img.parentElement).toHaveClass(ART_CROP_TRIM.box);
    expect(norm(img.style.marginTop)).toBe(norm(ART_CROP_TRIM.img.marginTop));
  });
  it("draws no trim on a frame with no art", () => {
    render(<FriendCard face={{ ...face, commander: null }} up />);
    expect(screen.getByTestId("friend-card-front").querySelector("[data-frame-art]")).toBeNull();
  });
});
