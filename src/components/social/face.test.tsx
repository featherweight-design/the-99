// The face (Social R1 decision 22).
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Face, faceInitials } from "./face";

afterEach(cleanup);

const SOKKA = { artCropUri: "https://cards.scryfall.io/art_crop/sokka.jpg" };

describe("Face", () => {
  it("draws the commander's art at each size, and no initials", () => {
    for (const size of [64, 40, 26] as const) {
      const { container } = render(<Face name="Dave" commander={SOKKA} size={size} />);
      const face = container.querySelector("[data-face]")!;
      expect(face.getAttribute("data-face")).toBe("art");
      expect(face.className).toContain(`h-[${size}px]`);
      expect(face.querySelector("img")!.getAttribute("src")).toBe(SOKKA.artCropUri);
      expect(face.textContent).toBe("");
      cleanup();
    }
  });

  it("draws initials while no commander is chosen, or one has no art", () => {
    const { container, rerender } = render(<Face name="Jo" commander={null} size={40} />);
    expect(container.querySelector("[data-face]")!.textContent).toBe("JO");
    expect(container.querySelector("img")).toBeNull();
    rerender(<Face name="Hugh Hartigan" commander={{ artCropUri: null }} size={26} />);
    expect(container.querySelector("[data-face]")!.textContent).toBe("HH");
  });

  it("is hidden from assistive tech: the name beside it says who", () => {
    const { container } = render(<Face name="Jo" commander={null} size={64} />);
    expect(container.querySelector("[data-face]")!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("faceInitials", () => {
  it("takes two letters, skipping marks, and keeps a whole emoji out", () => {
    expect(faceInitials("hugh")).toBe("HU");
    expect(faceInitials("  ana de la cruz ")).toBe("AD");
    expect(faceInitials("R2")).toBe("R2");
    expect(faceInitials("🐉 Dragon")).toBe("D");
    expect(faceInitials("")).toBe("");
  });
});
