import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { HALO_ATTR, HALO_MS, TargetsProvider, useTarget } from "./targets-provider";
import { LANDING_WAIT_MS, useToolLanding } from "./use-tool-landing";
import { ARRIVE_MS, MomentsProvider, SPENT_AFTER_MS, useMomentAnchor } from "../moments/moments-provider";
import { toolLanding } from "../../lib/discovery/tools";
import type { MomentId } from "../../lib/moments/registry";
import type { TargetId } from "../../lib/discovery/targets";
import { VISIT_KEY } from "../../lib/moments/visit";

const spendMomentAction = vi.fn(async (id: unknown) => void id);
vi.mock("../../app/moments-actions", () => ({ spendMomentAction: (id: unknown) => spendMomentAction(id) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/decks/d1" }));
const scrolled = vi.fn();
vi.mock("../../lib/ui/reveal", () => ({ reveal: (...args: unknown[]) => scrolled(...args) }));

let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    notify = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const onScreen = (name: string) => act(() => notify!([{ target: screen.getByRole("button", { name }), isIntersecting: true }]));

/** A moment's control, as a deck page draws one. */
function Anchor({ id, name }: { id: MomentId; name: string }) {
  const anchor = useMomentAnchor(id, { eligible: true, copy: { tool: name, line: "opens it." } });
  return (
    <button type="button" {...anchor}>
      {name}
    </button>
  );
}

function Control({ id, name }: { id: TargetId; name: string }) {
  const ref = useTarget(id);
  return (
    <button type="button" ref={ref} onClick={() => pressed(name)}>
      {name}
    </button>
  );
}
const pressed = vi.fn();

function Page({ asked, children }: { asked: string; children?: React.ReactNode }) {
  useToolLanding(toolLanding(asked, () => true), "d1");
  return <>{children}</>;
}

function mount(asked: string, children: React.ReactNode, live: MomentId[] = ["top-off", "matchups"]) {
  return render(
    <TargetsProvider>
      <MomentsProvider live={live} spent={[]}>
        <Page asked={asked}>{children}</Page>
      </MomentsProvider>
    </TargetsProvider>,
  );
}

const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  spendMomentAction.mockClear();
  pressed.mockClear();
  window.localStorage.clear();
  scrolled.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const at = (search: string) => window.history.replaceState(null, "", `/decks/d1${search}`);

describe("useToolLanding", () => {
  it("scrolls to the tool's target, haloes it 2.4s with no bubble, spends its moment and strips the parameter", async () => {
    at("?tool=top-off&tab=deck");
    mount("top-off", <Control id="top-off" name="Choose the last" />);
    await flush();
    const el = screen.getByRole("button", { name: "Choose the last" });
    expect(el.hasAttribute(HALO_ATTR)).toBe(true);
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledWith(el, "center");
    expect(screen.queryByRole("note")).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith("top-off");
    expect(window.location.search).toBe("?tab=deck");
    expect(pressed).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(HALO_MS));
    expect(el.hasAttribute(HALO_ATTR)).toBe(false);
  });

  it("takes the visit when it haloes something, so no other moment's bubble arrives on it", async () => {
    at("?tool=top-off");
    mount(
      "top-off",
      <>
        <Control id="top-off" name="Choose the last" />
        <Anchor id="matchups" name="Split" />
      </>,
    );
    await flush();
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY) ?? "{}").taken).toBe(true);
    onScreen("Split");
    await act(async () => {
      vi.advanceTimersByTime(ARRIVE_MS * 4);
    });
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("closes a bubble already showing when it haloes, without spending it, so that moment comes back later", async () => {
    at("?tool=top-off");
    let draw: (() => void) | null = null;
    function Later() {
      const [on, setOn] = useState(false);
      useEffect(() => {
        draw = () => setOn(true);
      }, []);
      return on ? <Control id="top-off" name="Choose the last" /> : null;
    }
    mount(
      "top-off",
      <>
        <Anchor id="matchups" name="Split" />
        <Later />
      </>,
    );
    onScreen("Split");
    await act(async () => {
      vi.advanceTimersByTime(ARRIVE_MS);
    });
    expect(screen.getByRole("note", { name: "Split, a tip" })).toBeTruthy();
    // The target draws inside the bubble's first second, as a slow panel's would; nothing is pressed.
    act(() => draw!());
    await flush();
    expect(screen.getByRole("button", { name: "Choose the last" }).hasAttribute(HALO_ATTR)).toBe(true);
    expect(screen.queryByRole("note", { name: "Split, a tip" })).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(SPENT_AFTER_MS * 2);
    });
    expect(spendMomentAction).not.toHaveBeenCalledWith("matchups");
    expect(spendMomentAction).toHaveBeenCalledWith("top-off");
  });

  it("spends nothing when its target is gone between the wait and the halo", async () => {
    at("?tool=top-off");
    const view = mount("top-off", <Control id="top-off" name="Choose the last" />);
    // The wait has resolved (the target was drawn); the control goes before the landing's continuation runs.
    view.rerender(
      <TargetsProvider>
        <MomentsProvider live={["top-off", "matchups"]} spent={[]}>
          <Page asked="top-off" />
        </MomentsProvider>
      </TargetsProvider>,
    );
    await flush();
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  it("lands again on a new request for the same page, and strips a stale id that arrives the same way", async () => {
    function Asked({ request, asked, children }: { request: string; asked: string; children?: React.ReactNode }) {
      useToolLanding(toolLanding(asked, () => true), request);
      return <>{children}</>;
    }
    const tree = (request: string, asked: string) => (
      <TargetsProvider>
        <MomentsProvider live={["top-off", "matchups"]} spent={[]}>
          <Asked request={request} asked={asked}>
            <Control id="matchups" name="Split" />
          </Asked>
        </MomentsProvider>
      </TargetsProvider>
    );
    at("?tool=matchups");
    const view = render(tree("r1", "matchups"));
    await flush();
    expect(window.location.search).toBe("");
    act(() => vi.advanceTimersByTime(HALO_MS));
    at("?tool=nope");
    view.rerender(tree("r2", "nope"));
    await flush();
    expect(window.location.search).toBe("");
    at("?tool=matchups");
    view.rerender(tree("r3", "matchups"));
    await flush();
    expect(screen.getByRole("button", { name: "Split" }).hasAttribute(HALO_ATTR)).toBe(true);
  });

  it("leaves the visit free when it haloes nothing", async () => {
    at("?tool=top-off");
    mount("top-off", <Control id="matchups" name="Split" />);
    await flush();
    act(() => vi.advanceTimersByTime(LANDING_WAIT_MS));
    await flush();
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY) ?? "{}").taken ?? false).toBe(false);
  });

  it("waits for a target that draws after the page", async () => {
    at("?tool=matchups");
    function Later() {
      const [on, setOn] = useState(false);
      return on ? <Control id="matchups" name="Split" /> : <button type="button" onClick={() => setOn(true)}>load</button>;
    }
    mount("matchups", <Later />);
    await flush();
    expect(window.location.search).toBe("?tool=matchups");
    act(() => screen.getByRole("button", { name: "load" }).click());
    await flush();
    expect(screen.getByRole("button", { name: "Split" }).hasAttribute(HALO_ATTR)).toBe(true);
    expect(window.location.search).toBe("");
  });

  it("strips a target that never draws with no halo, and spends nothing", async () => {
    at("?tool=top-off");
    mount("top-off", <Control id="matchups" name="Split" />);
    await flush();
    act(() => vi.advanceTimersByTime(LANDING_WAIT_MS));
    await flush();
    expect(window.location.search).toBe("");
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  it("strips an unknown id at once, with no halo, writing nothing", async () => {
    at("?tool=nope");
    mount("nope", <Control id="top-off" name="Choose the last" />);
    await flush();
    expect(window.location.search).toBe("");
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  it("strips an address naming another tool than the page decided on", async () => {
    at("?tool=matchups");
    mount("top-off", <Control id="top-off" name="Choose the last" />);
    await flush();
    expect(window.location.search).toBe("");
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
  });

  it("haloes but writes nothing with the moments off", async () => {
    at("?tool=top-off");
    mount("top-off", <Control id="top-off" name="Choose the last" />, []);
    await flush();
    expect(screen.getByRole("button", { name: "Choose the last" }).hasAttribute(HALO_ATTR)).toBe(true);
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  it("does nothing on a page with no parameter", async () => {
    at("");
    mount("top-off", <Control id="top-off" name="Choose the last" />);
    await flush();
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
});
