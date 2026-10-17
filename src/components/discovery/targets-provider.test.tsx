import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { HALO_ATTR, HALO_MS, TargetsProvider, useTarget, useTargets, type Targets } from "./targets-provider";
import type { TargetId } from "../../lib/discovery/targets";
import { reveal } from "../../lib/ui/reveal";

// The eased scroll is `reveal`'s own test; here, that the target is the one handed to it.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));

function Control({ id, name }: { id: TargetId | null; name: string }) {
  const ref = useTarget(id);
  return (
    <button type="button" ref={ref}>
      {name}
    </button>
  );
}

let api: Targets | null = null;
function Grab() {
  const t = useTargets();
  useEffect(() => {
    api = t;
  }, [t]);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  api = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TargetsProvider", () => {
  it("haloes a target for 2.4s with the shipped attribute, then takes it off", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id="top-off" name="Top off" />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Top off" });
    expect(api!.haloTarget("top-off")).toBe(true);
    expect(el.hasAttribute(HALO_ATTR)).toBe(true);
    act(() => vi.advanceTimersByTime(HALO_MS - 1));
    expect(el.hasAttribute(HALO_ATTR)).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
  });

  it("never touches a bubble's halo on the same control, and a bubble's teardown never takes the landing's off", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id="matchups" name="Matchups" />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Matchups" });
    el.setAttribute("data-moment-halo", "");
    api!.haloTarget("matchups");
    // The bubble leaves while the landing's halo is up, as MomentBubble's cleanup does.
    el.removeAttribute("data-moment-halo");
    expect(el.hasAttribute(HALO_ATTR)).toBe(true);
    el.setAttribute("data-moment-halo", "");
    act(() => vi.advanceTimersByTime(HALO_MS));
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
    expect(el.hasAttribute("data-moment-halo")).toBe(true);
  });

  it("restarts a halo asked for again, rather than ending at the first one's time", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id="top-off" name="Top off" />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Top off" });
    api!.haloTarget("top-off", 1000);
    act(() => vi.advanceTimersByTime(800));
    api!.haloTarget("top-off", 1000);
    act(() => vi.advanceTimersByTime(800));
    expect(el.hasAttribute(HALO_ATTR)).toBe(true);
    act(() => vi.advanceTimersByTime(200));
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
  });

  it("takes the halo off a control that unregisters while haloed", () => {
    function Toggle() {
      const [on, setOn] = useState(true);
      return (
        <>
          <Control id={on ? "matchups" : null} name="Matchups" />
          <button type="button" onClick={() => setOn(false)}>
            off
          </button>
        </>
      );
    }
    render(
      <TargetsProvider>
        <Grab />
        <Toggle />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Matchups" });
    api!.haloTarget("matchups");
    act(() => screen.getByRole("button", { name: "off" }).click());
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
    expect(api!.haloTarget("matchups")).toBe(false);
  });

  it("resolves an id held by several controls to the first in the document, not the first registered", () => {
    const tree = (both: boolean) => (
      <TargetsProvider>
        <Grab />
        {both ? <Control id="stand-ins" name="first" /> : null}
        <Control id="stand-ins" name="second" />
      </TargetsProvider>
    );
    const { rerender } = render(tree(false));
    // "first" mounts after "second" but sits before it.
    rerender(tree(true));
    api!.haloTarget("stand-ins");
    expect(screen.getByRole("button", { name: "first" }).hasAttribute(HALO_ATTR)).toBe(true);
    expect(screen.getByRole("button", { name: "second" }).hasAttribute(HALO_ATTR)).toBe(false);
  });

  it("passes over a control a stylesheet hides, as the desktop copy is on a phone", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id="proposed-cuts" name="desktop" />
        <Control id="proposed-cuts" name="phone" />
      </TargetsProvider>,
    );
    const desktop = screen.getByRole("button", { name: "desktop" });
    Object.defineProperty(desktop, "checkVisibility", { value: () => false });
    api!.haloTarget("proposed-cuts");
    expect(desktop.hasAttribute(HALO_ATTR)).toBe(false);
    expect(screen.getByRole("button", { name: "phone" }).hasAttribute(HALO_ATTR)).toBe(true);
  });

  it("answers nothing for a target that is not drawn, and a null id registers nothing", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id={null} name="Nothing" />
      </TargetsProvider>,
    );
    expect(api!.targetRect("top-off")).toBeNull();
    expect(api!.scrollToTarget("top-off")).toBe(false);
    expect(api!.haloTarget("top-off")).toBe(false);
  });

  it("scrolls a drawn target into view, and reports its rect", () => {
    render(
      <TargetsProvider>
        <Grab />
        <Control id="mana-balance" name="Mana" />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Mana" });
    expect(api!.scrollToTarget("mana-balance")).toBe(true);
    expect(vi.mocked(reveal)).toHaveBeenCalledWith(el, "center");
    expect(api!.targetRect("mana-balance")).not.toBeNull();
  });

  it("waits for a target that registers later, and gives up after the wait or an abort", async () => {
    function Late() {
      const [on, setOn] = useState(false);
      return (
        <>
          {on ? <Control id="proposed-cuts" name="Cuts" /> : null}
          <button type="button" onClick={() => setOn(true)}>
            draw
          </button>
        </>
      );
    }
    render(
      <TargetsProvider>
        <Grab />
        <Late />
      </TargetsProvider>,
    );
    const found = api!.whenTarget("proposed-cuts", 5000);
    act(() => screen.getByRole("button", { name: "draw" }).click());
    await expect(found).resolves.toBe(screen.getByRole("button", { name: "Cuts" }));

    const never = api!.whenTarget("matchups", 5000);
    act(() => vi.advanceTimersByTime(5000));
    await expect(never).resolves.toBeNull();

    const abort = new AbortController();
    const aborted = api!.whenTarget("matchups", 5000, abort.signal);
    abort.abort();
    await expect(aborted).resolves.toBeNull();
  });

  it("passes over a control under `hidden` until it shows, and a wait finds it then", async () => {
    function Gated() {
      const [shown, setShown] = useState(false);
      return (
        <>
          <div hidden={!shown}>
            <Control id="suggested-changes" name="Tile" />
          </div>
          <button type="button" onClick={() => setShown(true)}>
            show
          </button>
        </>
      );
    }
    render(
      <TargetsProvider>
        <Grab />
        <Gated />
      </TargetsProvider>,
    );
    expect(api!.haloTarget("suggested-changes")).toBe(false);
    const found = api!.whenTarget("suggested-changes", 5000);
    act(() => screen.getByRole("button", { name: "show" }).click());
    act(() => vi.advanceTimersByTime(200));
    await expect(found).resolves.toBe(screen.getByRole("button", { name: "Tile" }));
  });

  it("takes every halo off when the provider leaves", () => {
    const { unmount } = render(
      <TargetsProvider>
        <Grab />
        <Control id="top-off" name="Top off" />
      </TargetsProvider>,
    );
    const el = screen.getByRole("button", { name: "Top off" });
    api!.haloTarget("top-off");
    unmount();
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
  });

  it("does nothing outside the provider", () => {
    render(<Control id="top-off" name="Top off" />);
    expect(screen.getByRole("button", { name: "Top off" })).toBeTruthy();
  });
});
