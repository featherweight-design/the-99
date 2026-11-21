import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useSearchParams: () => new URLSearchParams() }));

const { ShellLoading } = await import("./shell-loading");

describe("ShellLoading", () => {
  it("draws the precon list's tile skeleton on a direct load of the list, not the crown", () => {
    pathname = "/decks/precons";
    const { container } = render(<ShellLoading />);
    expect(container.querySelectorAll("[data-testid=tile-skeleton]").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toBe("Loading precons");
  });

  it("keeps the crown screen for an open precon, which sits outside the list's route group", () => {
    pathname = "/decks/precons/EldraziUnbound_CMM";
    const { container } = render(<ShellLoading />);
    expect(container.querySelector("[data-testid=tile-skeleton]")).toBeNull();
    expect(container.querySelector("[data-loading-screen]")).not.toBeNull();
  });

  it("draws the deck page's own shape on a direct load of a deck, not the crown", () => {
    pathname = "/decks/0b9f6c3e-1d2a-4c5b-8e7f-123456789abc";
    render(<ShellLoading />);
    expect(screen.getByRole("status").textContent).toBe("Opening your deck");
    expect(screen.getByRole("link", { name: /all decks/i }).getAttribute("href")).toBe("/decks");
  });

  it("keeps the crown screen for a deck's own sub-route", () => {
    pathname = "/decks/0b9f6c3e-1d2a-4c5b-8e7f-123456789abc/changes";
    render(<ShellLoading />);
    expect(screen.queryByText("Opening your deck")).toBeNull();
  });
});
