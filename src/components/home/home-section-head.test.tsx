import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeSectionHead } from "./home-section-head";

describe("HomeSectionHead", () => {
  it("is an h2 in the display face with the accent diamond, keeping the caller's id", () => {
    render(<HomeSectionHead id="x-head">Friends</HomeSectionHead>);
    const h = screen.getByRole("heading", { level: 2, name: "Friends" });
    expect(h.id).toBe("x-head");
    expect(h.className).toContain("font-display");
    expect(h.className).toContain("text-[17px]");
    expect(h.className).not.toContain("uppercase");
    const diamond = h.querySelector("[aria-hidden=true]")!;
    expect(diamond.className).toContain("rotate-45");
    expect(diamond.className).toContain("var(--accent)");
  });

  it("draws the count in mono accent text, and the aside after it", () => {
    render(
      <HomeSectionHead count="· 3" aside={<a href="/x">All</a>}>
        Friends
      </HomeSectionHead>,
    );
    const count = screen.getByText("· 3");
    expect(count.className).toContain("font-mono");
    expect(count.className).toContain("var(--accent-text)");
    expect(count.nextElementSibling).toBe(screen.getByRole("link", { name: "All" }));
  });

  it("keeps the count and the aside inside the h2, so aria-labelledby reads all of it", () => {
    render(
      <HomeSectionHead id="home-whats-new" count="· 3 new" aside={<a href="/settings">Choose</a>}>
        What’s new
      </HomeSectionHead>,
    );
    const h = document.getElementById("home-whats-new")!;
    expect(h.tagName).toBe("H2");
    expect(h.textContent).toContain("What’s new");
    expect(h.textContent).toContain("· 3 new");
    expect(h.querySelector("a")?.textContent).toBe("Choose");
  });
});
