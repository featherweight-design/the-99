// The face (Social R1 decision 22) and the dates /friends draws.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Face, faceInitials } from "./face";
import { expiresWhen, madeWhen, sinceDay, underADay } from "../../lib/social/when";

afterEach(cleanup);

const SOKKA = { artCropUri: "https://cards.scryfall.io/art_crop/sokka.jpg" };

describe("Face", () => {
  it("draws the commander's art at each size, and no initials", () => {
    for (const size of [64, 40, 30, 26] as const) {
      const { container } = render(<Face name="Dave" commander={SOKKA} size={size} />);
      const face = container.querySelector("[data-face]")!;
      expect(face.getAttribute("data-face")).toBe("art");
      expect(face.className).toContain(`h-[${size}px]`);
      expect(face.querySelector("img")!.getAttribute("src")).toBe(SOKKA.artCropUri);
      expect(face.textContent).toBe("");
      cleanup();
    }
  });

  it("draws the 30 as the modal's friend row: 8px corners and the bordered tile, not the disc", () => {
    const { container } = render(<Face name="Jo" commander={null} size={30} />);
    const face = container.querySelector("[data-face]")!;
    expect(face.className).toContain("w-[30px]");
    expect(face.className).toContain("rounded-[8px]");
    expect(face.className).toContain("[border:1px_solid_var(--border-strong)]");
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

describe("the dates", () => {
  const now = new Date("2026-10-15T21:41:00Z");
  it("says today, yesterday, then a month and a day", () => {
    expect(sinceDay(new Date("2026-10-15T01:00:00Z"), now, "UTC")).toBe("today");
    expect(sinceDay(new Date("2026-10-14T00:30:00Z"), now, "UTC")).toBe("yesterday");
    expect(sinceDay(new Date("2026-10-13T23:30:00Z"), now, "UTC")).toBe("Oct 13");
    expect(sinceDay(new Date("2026-10-02T12:00:00Z"), now, "UTC")).toBe("Oct 2");
  });

  it("says when a link was made, with its time today", () => {
    expect(madeWhen(new Date("2026-10-15T21:41:00Z"), now, "UTC").replace(/\s/gu, " ")).toBe("today, 9:41 PM");
    expect(madeWhen(new Date("2026-10-09T08:00:00Z"), now, "UTC")).toBe("Oct 9");
  });

  it("carries the time in the expiry under a day, and only then", () => {
    const week = new Date("2026-10-22T21:41:00Z");
    const soon = new Date("2026-10-16T21:12:00Z");
    expect(underADay(week, now)).toBe(false);
    expect(underADay(soon, now)).toBe(true);
    expect(expiresWhen(week, now, "UTC")).toBe("Thu, Oct 22");
    expect(expiresWhen(soon, now, "UTC").replace(/\s/gu, " ")).toBe("Fri, Oct 16, 9:12 PM");
  });
});
