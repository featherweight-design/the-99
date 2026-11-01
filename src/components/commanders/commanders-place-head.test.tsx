import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const path = vi.hoisted(() => ({ value: "/commanders" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
const refresh = vi.hoisted(() => vi.fn(async () => ({ owned: 1, discover: 2, hidden: 0 })));
vi.mock("../../app/commanders/actions", () => ({ refreshCommanderCounts: refresh }));

const { CommandersPlaceHead, commandersPlaceFromPathname } = await import("./commanders-place-head");

afterEach(cleanup);

describe("commandersPlaceFromPathname", () => {
  it("knows the four tabs and nothing past them", () => {
    expect(commandersPlaceFromPathname("/commanders")).toBe("foryou");
    expect(commandersPlaceFromPathname("/commanders/discover")).toBe("discover");
    expect(commandersPlaceFromPathname("/commanders/choose")).toBe("choose");
    // Without its case the head throws inside the (list) layout, and the route is a 500 (READINESS Y8).
    expect(commandersPlaceFromPathname("/commanders/hidden")).toBe("hidden");
    expect(commandersPlaceFromPathname("/commanders/sokka-tenacious-tactician-abc123def456")).toBeNull();
    expect(commandersPlaceFromPathname("/discover")).toBeNull();
  });
});

describe("CommandersPlaceHead", () => {
  // Help me choose's switch is retired: its tab is always in the strip, wherever the reader is.
  it("draws the strip as links with the current tab marked", () => {
    path.value = "/commanders/discover";
    render(<CommandersPlaceHead counts={null} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/commanders",
      "/commanders/discover",
      "/commanders/choose",
      "/commanders/hidden",
    ]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null, null]);
    // The page below draws the route's one h1; the place's title is not a heading.
    expect(screen.queryByRole("heading")).toBeNull();
  });
  it("states the two figures on the title line, and leaves out a half with nothing to say", () => {
    path.value = "/commanders";
    render(<CommandersPlaceHead counts={{ owned: 228, discover: 3068, hidden: 0 }} />);
    expect(screen.getByText("228 yours, not yet built · 3,068 to discover")).toBeTruthy();
    cleanup();
    render(<CommandersPlaceHead counts={{ owned: 0, discover: 3068, hidden: 0 }} />);
    expect(screen.getByText("3,068 to discover")).toBeTruthy();
  });
  it("marks the Hidden tab current on its own route", () => {
    path.value = "/commanders/hidden";
    render(<CommandersPlaceHead counts={{ owned: 1, discover: 2, hidden: 3 }} />);
    expect(screen.getByTestId("commanders-tab-hidden")).toHaveAttribute("aria-current", "page");
  });
  // The strip's shipped `tab.count`, once something is hidden; none at 0 (the Hidden board's empty state).
  it("counts the Hidden tab, and draws no count with nothing hidden", () => {
    path.value = "/commanders";
    render(<CommandersPlaceHead counts={{ owned: 1, discover: 2, hidden: 3 }} />);
    expect(screen.getByTestId("commanders-tab-hidden-count")).toHaveTextContent("3");
    cleanup();
    render(<CommandersPlaceHead counts={{ owned: 1, discover: 2, hidden: 0 }} />);
    expect(screen.queryByTestId("commanders-tab-hidden-count")).toBeNull();
  });
  // No cards: the title line says nothing, but the Hidden tab still counts what it holds (READINESS Y8).
  it("keeps the Hidden count for a reader with no collection", () => {
    path.value = "/commanders/hidden";
    render(<CommandersPlaceHead counts={{ owned: 0, discover: 0, hidden: 2 }} />);
    expect(screen.queryByText(/yours|to discover/)).toBeNull();
    expect(screen.getByTestId("commanders-tab-hidden-count")).toHaveTextContent("2");
  });
  // Four tabs fit a 390 phone at the strip's own spacing: it closes up only from five.
  it("keeps the strip's full spacing with four tabs", () => {
    path.value = "/commanders";
    render(<CommandersPlaceHead counts={null} />);
    expect(screen.getByTestId("commanders-tab-hidden").className).toContain("px-[11px]");
    expect(screen.getByTestId("commanders-tab-hidden").className).not.toContain("px-[7px]");
  });
  // A hide or unhide settling anywhere below re-reads the figures, the Hidden count among them.
  it("re-reads the counts when a list announces them stale", async () => {
    path.value = "/commanders";
    refresh.mockResolvedValueOnce({ owned: 1, discover: 2, hidden: 4 });
    render(<CommandersPlaceHead counts={{ owned: 1, discover: 2, hidden: 3 }} />);
    act(() => {
      window.dispatchEvent(new Event("the99:commander-counts-stale"));
    });
    await waitFor(() => expect(screen.getByTestId("commanders-tab-hidden-count")).toHaveTextContent("4"));
  });
  it("refuses a path outside the place", () => {
    path.value = "/collection";
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CommandersPlaceHead counts={null} />)).toThrow(/unrecognised path/);
    quiet.mockRestore();
  });
});
