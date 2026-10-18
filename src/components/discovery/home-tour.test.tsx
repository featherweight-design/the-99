// The tour taken again (discovery R3·2, plan decision 6): `?tour=1` starts the tour whatever `tour_seen_at` says,
// strips the parameter through `mirrorUrl`, and a second ask starts a fresh run.
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(nav.query) }));
const mirror = vi.hoisted(() => vi.fn());
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: mirror }));
const mounts = vi.hoisted(() => ({ n: 0 }));
vi.mock("./first-run-tour", () => ({
  FirstRunTour: function Tour({ mode, precons, again }: { mode: string; precons: boolean; again?: boolean }) {
    useEffect(() => {
      mounts.n += 1;
    }, []);
    return <div data-testid="tour" data-mode={mode} data-precons={String(precons)} data-again={String(Boolean(again))} />;
  },
}));

const { HomeTour } = await import("./home-tour");

beforeEach(() => {
  nav.query = "";
  mirror.mockClear();
  mounts.n = 0;
  window.history.replaceState(null, "", "/");
});

describe("HomeTour", () => {
  it("draws nothing when the tour is not due and not asked for", () => {
    render(<HomeTour due={false} mode="dashboard" precons={false} />);
    expect(screen.queryByTestId("tour")).toBeNull();
    expect(mirror).not.toHaveBeenCalled();
  });

  it("starts the tour on ?tour=1 whatever the stamp says (not due), and strips the parameter through mirrorUrl", () => {
    nav.query = "tour=1";
    window.history.replaceState(null, "", "/?tour=1&x=2");
    render(<HomeTour due={false} mode="dashboard" precons={false} />);
    expect(screen.getByTestId("tour")).toHaveAttribute("data-mode", "dashboard");
    // Asked for, so this tab's spent mark (R3·1b) does not hold it off.
    expect(screen.getByTestId("tour")).toHaveAttribute("data-again", "true");
    expect(mirror).toHaveBeenCalledTimes(1);
    const url = mirror.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/");
    expect(url.searchParams.has("tour")).toBe(false);
    expect(url.searchParams.get("x")).toBe("2");
  });

  it("runs the first-run tour itself on a first-run Home, precon line and all", () => {
    nav.query = "tour=1";
    render(<HomeTour due={false} mode="first-run" precons />);
    expect(screen.getByTestId("tour")).toHaveAttribute("data-mode", "first-run");
    expect(screen.getByTestId("tour")).toHaveAttribute("data-precons", "true");
  });

  it("keeps the due tour as R3·1b built it, with no parameter to strip", () => {
    render(<HomeTour due mode="first-run" precons={false} />);
    expect(screen.getByTestId("tour")).toBeInTheDocument();
    expect(screen.getByTestId("tour")).toHaveAttribute("data-again", "false");
    expect(mirror).not.toHaveBeenCalled();
  });

  it("starts a fresh run on a second ask, after the first was stripped", () => {
    nav.query = "tour=1";
    const { rerender } = render(<HomeTour due={false} mode="dashboard" precons={false} />);
    expect(mounts.n).toBe(1);
    nav.query = "";
    rerender(<HomeTour due={false} mode="dashboard" precons={false} />);
    expect(mounts.n).toBe(1);
    nav.query = "tour=1";
    rerender(<HomeTour due={false} mode="dashboard" precons={false} />);
    expect(mounts.n).toBe(2);
    expect(mirror).toHaveBeenCalledTimes(2);
  });
});
