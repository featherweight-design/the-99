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
});
