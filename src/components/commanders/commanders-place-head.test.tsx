import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const path = vi.hoisted(() => ({ value: "/commanders" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const { CommandersPlaceHead, commandersPlaceFromPathname, visibleCommandersTabs } = await import("./commanders-place-head");

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

describe("visibleCommandersTabs", () => {
  it("leaves Help me choose out while its switch is off", () => {
    expect(visibleCommandersTabs("foryou", false).map((t) => t.place)).toEqual(["foryou", "discover"]);
    expect(visibleCommandersTabs("foryou", true).map((t) => t.place)).toEqual(["foryou", "discover", "choose"]);
  });
  it("keeps the route the reader is on in its own strip", () => {
    expect(visibleCommandersTabs("choose", false).map((t) => t.place)).toContain("choose");
  });
});

describe("CommandersPlaceHead", () => {
  it("draws the strip as links with the current tab marked", () => {
    path.value = "/commanders/discover";
    render(<CommandersPlaceHead helpMeChoose />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/commanders", "/commanders/discover", "/commanders/choose"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null]);
    // The page below draws the route's one h1; the place's title is not a heading.
    expect(screen.queryByRole("heading")).toBeNull();
  });
  it("refuses a path outside the place", () => {
    path.value = "/collection";
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CommandersPlaceHead helpMeChoose />)).toThrow(/unrecognised path/);
    quiet.mockRestore();
  });
});
