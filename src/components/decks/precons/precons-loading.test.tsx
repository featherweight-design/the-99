import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreconsLoading } from "./precons-loading";
import { PRECON_ROWS_CLASS, PRECON_TILES_COLUMNS } from "./precon-grid";

describe("PreconsLoading", () => {
  it("draws the real header, one status line for a screen reader, and shapes the rest of the way", () => {
    const { container } = render(<PreconsLoading view="tiles" />);
    expect(screen.getByRole("heading", { name: "Commander precons" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "‹ Decks" }).getAttribute("href")).toBe("/decks");
    expect(screen.getByRole("status").textContent).toBe("Loading precons");
    // Nothing but the header and the status line is exposed: every shape is hidden from a screen reader.
    for (const shape of container.querySelectorAll("[data-testid=tile-skeleton]")) expect(shape.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".anim-skeleton")).not.toBeNull();
  });

  it("draws tiles on the list's own column classes, in three rows at 390 and two from md, with no row gap to add up", () => {
    const { container } = render(<PreconsLoading view="tiles" />);
    const list = container.querySelector("ul")!;
    // jsdom computes no layout, so this pins the classes; the heights were measured in a browser (PR body).
    for (const token of PRECON_TILES_COLUMNS.split(" ")) expect(list.className, token).toContain(token);
    expect(list.className).toContain("grid-rows-[repeat(3,auto)]");
    expect(list.className).toContain("md:grid-rows-[repeat(2,auto)]");
    expect(list.className).toContain("[grid-auto-rows:0]");
    expect(list.className).toContain("overflow-hidden");
    // A row gap would be paid once per hidden implicit row: the vertical space is a per-tile margin instead.
    expect(list.className).not.toMatch(/(^| )(md:)?gap-\[/);
    expect(container.querySelectorAll("[data-testid=tile-skeleton]").length).toBeGreaterThanOrEqual(24);
    expect(container.querySelector("[data-testid=row-skeleton]")).toBeNull();
  });

  it("follows the stored view: rows when it says rows", () => {
    const { container } = render(<PreconsLoading view="rows" />);
    expect(container.querySelector("ul")!.className).toBe(PRECON_ROWS_CLASS);
    expect(container.querySelectorAll("[data-testid=row-skeleton]")).toHaveLength(6);
    expect(container.querySelector("[data-testid=tile-skeleton]")).toBeNull();
  });
});
