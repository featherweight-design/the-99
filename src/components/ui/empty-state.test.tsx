import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "./empty-state";

describe("EmptyState", () => {
  it("centers its content in a column", () => {
    const { container } = render(<EmptyState>mark</EmptyState>);
    const section = container.firstElementChild as HTMLElement;
    expect(section.className).toContain("flex-col");
    expect(section.className).toContain("items-center");
    expect(section.className).toContain("text-center");
  });

  it("lets a caller override the container padding", () => {
    const { container } = render(<EmptyState className="p-[48px]">x</EmptyState>);
    const section = container.firstElementChild as HTMLElement;
    expect(section.className).toContain("p-[48px]");
    expect(section.className).not.toContain("p-8");
  });

  it("renders no inline style", () => {
    const { container } = render(<EmptyState>x</EmptyState>);
    expect(container.firstElementChild?.getAttribute("style")).toBeNull();
  });
});

describe("EmptyStateTitle", () => {
  it("renders an h1 carrying the display tokens", () => {
    render(<EmptyStateTitle>No decks yet.</EmptyStateTitle>);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("font-display");
    expect(heading.className).toContain("var(--fg)");
    expect(heading.getAttribute("style")).toBeNull();
  });

  it("takes a caller font size", () => {
    render(<EmptyStateTitle className="text-[30px]">t</EmptyStateTitle>);
    expect(screen.getByRole("heading", { level: 1 }).className).toContain(
      "text-[30px]",
    );
  });
});

describe("EmptyStateBody", () => {
  it("renders a paragraph carrying the body tokens", () => {
    const { container } = render(<EmptyStateBody>copy</EmptyStateBody>);
    const p = container.querySelector("p") as HTMLElement;
    expect(p.className).toContain("var(--fg-body)");
    expect(p.className).toContain("leading-[1.6]");
    expect(p.getAttribute("style")).toBeNull();
  });

  // /collection's empty branch sits under the place head, whose "Collection" is already the
  // page's h1 (E11); a second h1 there was the pre-open pass's finding.
  it("draws its title one level down when the page already has an h1", () => {
    render(<EmptyStateTitle level={2}>Your collection is empty</EmptyStateTitle>);
    expect(screen.getByRole("heading", { level: 2, name: "Your collection is empty" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
