import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const path = vi.hoisted(() => ({ value: "/commanders" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
const refresh = vi.hoisted(() => vi.fn(async () => ({ owned: 1, discover: 2 })));
vi.mock("../../app/commanders/actions", () => ({ refreshCommanderCounts: refresh }));

const { CommandersPlaceHead, commandersPlaceFromPathname } = await import("./commanders-place-head");

afterEach(cleanup);

describe("commandersPlaceFromPathname", () => {
  it("knows the three tabs and nothing past them", () => {
    expect(commandersPlaceFromPathname("/commanders")).toBe("foryou");
    expect(commandersPlaceFromPathname("/commanders/discover")).toBe("discover");
    expect(commandersPlaceFromPathname("/commanders/choose")).toBe("choose");
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
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/commanders", "/commanders/discover", "/commanders/choose"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null]);
    // The page below draws the route's one h1; the place's title is not a heading.
    expect(screen.queryByRole("heading")).toBeNull();
  });
  it("states the two figures on the title line, and leaves out a half with nothing to say", () => {
    path.value = "/commanders";
    render(<CommandersPlaceHead counts={{ owned: 228, discover: 3068 }} />);
    expect(screen.getByText("228 yours, not yet built · 3,068 to discover")).toBeTruthy();
    cleanup();
    render(<CommandersPlaceHead counts={{ owned: 0, discover: 3068 }} />);
    expect(screen.getByText("3,068 to discover")).toBeTruthy();
  });
  it("refuses a path outside the place", () => {
    path.value = "/collection";
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CommandersPlaceHead counts={null} />)).toThrow(/unrecognised path/);
    quiet.mockRestore();
  });
});
