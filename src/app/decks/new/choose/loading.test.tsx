// The route's loading screen reads its own address: a results address draws 5c (the results header,
// Finding commanders… and five still rows) with no bar and no order sub, since both name answers by
// labels only the database holds; the form's address keeps the shell's screen.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ qs: "", path: "/decks/new/choose" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(nav.qs), usePathname: () => nav.path }));

const { default: Loading } = await import("./loading");
const { ShellLoading } = await import("../../../../components/shell/shell-loading");

describe("the choose route's loading screen", () => {
  it("draws 5c on a results address, with no bar, no order sub and nothing of the deckNew screen", () => {
    nav.qs = "t=dinosaurs&b=150&v=results";
    const { container } = render(<Loading />);
    expect(screen.getByTestId("choose-loading")).toBeTruthy();
    expect(screen.getByText("Finding commanders…")).toBeTruthy();
    expect(screen.getByTestId("results-searching").querySelectorAll("ol > li")).toHaveLength(5);
    expect(screen.queryByText(/Ordered by/)).toBeNull();
    expect(screen.queryByText("We read this as")).toBeNull();
    expect(container.textContent).not.toContain("Clearing a space");
    // The header's way back is the page's own: the form, holding the answers.
    expect(screen.getByRole("link").getAttribute("href")).toBe("/decks/new/choose?t=dinosaurs&b=150");
  });

  it("is what the shell's page-load fallback draws for the route, and nowhere else", () => {
    nav.qs = "t=dinosaurs&v=results";
    nav.path = "/decks/new/choose";
    const { unmount } = render(<ShellLoading />);
    expect(screen.getByTestId("choose-loading")).toBeTruthy();
    expect(screen.queryByText("Clearing a space")).toBeNull();
    unmount();
    nav.path = "/decks/new";
    render(<ShellLoading />);
    expect(screen.queryByTestId("choose-loading")).toBeNull();
    expect(screen.getByText("Clearing a space")).toBeTruthy();
    nav.path = "/decks/new/choose";
  });

  it("keeps the shell's screen on the form's address", () => {
    nav.qs = "t=dinosaurs";
    render(<Loading />);
    expect(screen.queryByTestId("choose-loading")).toBeNull();
    expect(screen.getByText("Clearing a space")).toBeTruthy();
  });
});
