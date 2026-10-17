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

  it("does nothing when the address moves to another ?tool= while its target is awaited", async () => {
    at("?tool=matchups");
    let draw: (() => void) | null = null;
    function Later() {
      const [on, setOn] = useState(false);
      useEffect(() => {
        draw = () => setOn(true);
      }, []);
      return on ? <Control id="matchups" name="Split" /> : null;
    }
    mount("matchups", <Later />);
    await flush();
    // Back or Forward lands the address on another tool before that page commits.
    at("?tool=top-off");
    act(() => draw!());
    await flush();
    expect(screen.getByRole("button", { name: "Split" }).hasAttribute(HALO_ATTR)).toBe(false);
    expect(spendMomentAction).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?tool=top-off");
  });

  it("holds a claim queued for the visit lock ahead of it, so no other bubble shows beside its halo", async () => {
    // A FIFO lock whose holders each wait at their own gate: Split's claim queues first, the landing's visit write
    // behind it, so the claim's continuation runs while the visit is still free.
    const opens: (() => void)[] = [];
    const gates: Promise<void>[] = [0, 1, 2, 3].map(() => new Promise<void>((r) => opens.push(r)));
    let chain: Promise<unknown> = Promise.resolve();
    let n = 0;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_name: string, fn: () => unknown) => {
          const gate = gates[Math.min(n++, gates.length - 1)];
          const run = chain.then(async () => {
            await gate;
            return fn();
          });
          chain = run.catch(() => {});
          return run;
        },
      },
    });
    const openGate = () => opens[0]();
    try {
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
      // The window closes: Split's claim is queued at the lock, not yet run.
      await act(async () => {
        vi.advanceTimersByTime(ARRIVE_MS);
      });
      expect(screen.queryByRole("note")).toBeNull();
      act(() => draw!());
      await flush();
      expect(screen.getByRole("button", { name: "Choose the last" }).hasAttribute(HALO_ATTR)).toBe(true);
      await act(async () => openGate());
      await flush();
      // The claim has landed and its continuation run, before the landing's write: the hold alone keeps Split away.
      expect(screen.queryByRole("note", { name: "Split, a tip" })).toBeNull();
      await act(async () => opens.slice(1).forEach((o) => o()));
      await flush();
      await act(async () => {
        vi.advanceTimersByTime(SPENT_AFTER_MS * 2);
      });
      expect(screen.queryByRole("note", { name: "Split, a tip" })).toBeNull();
      expect(spendMomentAction).not.toHaveBeenCalledWith("matchups");
    } finally {
      delete (navigator as { locks?: unknown }).locks;
    }
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

describe("useToolLanding, deferred (Find a deck, R2 gap 11)", () => {
  function Deferred({ children }: { children?: React.ReactNode }) {
    useToolLanding(toolLanding("find-a-deck", () => true), "r1", { deferred: true });
    return <>{children}</>;
  }
  function Later() {
    const [on, setOn] = useState(false);
    return on ? <Anchor id="find-a-deck" name="Find a deck for it" /> : <button type="button" onClick={() => setOn(true)}>open a card</button>;
  }
  const mountDeferred = (children: React.ReactNode) =>
    render(
      <TargetsProvider>
        <MomentsProvider live={["find-a-deck"]} spent={[]}>
          <Deferred>{children}</Deferred>
        </MomentsProvider>
      </TargetsProvider>,
    );

  it("strips the parameter at once, then haloes the next card's door once, however long the reader takes", async () => {
    at("?avail=free&tool=find-a-deck");
    mountDeferred(<Later />);
    await flush();
    expect(window.location.search).toBe("?avail=free");
    act(() => vi.advanceTimersByTime(LANDING_WAIT_MS * 10));
    await flush();
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
    act(() => screen.getByRole("button", { name: "open a card" }).click());
    await flush();
    const door = screen.getByRole("button", { name: "Find a deck for it" });
    expect(door.hasAttribute(HALO_ATTR)).toBe(true);
    expect(screen.queryByRole("note")).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith("find-a-deck");
    expect(window.location.search).toBe("?avail=free");
  });

  it("haloes nothing and spends nothing when the reader leaves the page before opening a card", async () => {
    at("?tool=find-a-deck");
    const { unmount } = mountDeferred(<Later />);
    await flush();
    unmount();
    act(() => vi.advanceTimersByTime(LANDING_WAIT_MS * 2));
    await flush();
    expect(spendMomentAction).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("strips a stale id at once and waits for nothing", async () => {
    at("?tool=nope");
    render(
      <TargetsProvider>
        <MomentsProvider live={["find-a-deck"]} spent={[]}>
          <StaleDeferred />
          <Anchor id="find-a-deck" name="Find a deck for it" />
        </MomentsProvider>
      </TargetsProvider>,
    );
    await flush();
    expect(window.location.search).toBe("");
    expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
  function StaleDeferred() {
    useToolLanding(null, "r1", { deferred: true });
    return null;
  }
});
