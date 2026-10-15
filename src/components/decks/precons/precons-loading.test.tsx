import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

const { PreconsLoading } = await import("./precons-loading");
import { PRECON_ROWS_CLASS, PRECON_TILES_COLUMNS } from "./precon-grid";

describe("PreconsLoading", () => {
  beforeEach(() => { search = ""; });

  it("draws the real header, one status line for a screen reader, and shapes the rest of the way", () => {
    const { container } = render(<PreconsLoading />);
    expect(screen.getByRole("heading", { name: "Commander precons" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "‹ Decks" }).getAttribute("href")).toBe("/decks");
    expect(screen.getByRole("status").textContent).toBe("Loading precons");
    // Nothing but the header and the status line is exposed: every shape is hidden from a screen reader.
    for (const shape of container.querySelectorAll("[data-testid=tile-skeleton]")) expect(shape.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".anim-skeleton")).not.toBeNull();
  });

  it("draws tiles on the list's own column classes, in three rows at 390 and two from md, with no row gap to add up", () => {
    const { container } = render(<PreconsLoading />);
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
    const { container } = render(<PreconsLoading storedView="rows" />);
    expect(container.querySelector("ul")!.className).toBe(PRECON_ROWS_CLASS);
    expect(container.querySelectorAll("[data-testid=row-skeleton]")).toHaveLength(6);
    expect(container.querySelector("[data-testid=tile-skeleton]")).toBeNull();
  });

  it("lets an explicit ?view= beat the stored view, as the loaded list does", () => {
    search = "view=rows";
    expect(render(<PreconsLoading storedView="tiles" />).container.querySelector("[data-testid=row-skeleton]")).not.toBeNull();
    cleanup();
    search = "view=tiles";
    expect(render(<PreconsLoading storedView="rows" />).container.querySelector("[data-testid=tile-skeleton]")).not.toBeNull();
  });

  it("follows ?from=new in its back link, as the loaded header does", () => {
    search = "from=new";
    render(<PreconsLoading />);
    const link = screen.getByRole("link", { name: "‹ New deck" });
    expect(link.getAttribute("href")).toBe("/decks/new");
  });

  it("is marked as a loading screen and mounts the stall watch, as LoadingScreen is", () => {
    const { container } = render(<PreconsLoading />);
    expect(container.firstElementChild!.hasAttribute("data-loading-screen")).toBe(true);
  });
});
