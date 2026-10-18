import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TargetId } from "../../lib/discovery/targets";

const spend = vi.fn(() => Promise.resolve());
vi.mock("../../app/tour-actions", () => ({ spendTourAction: () => spend() }));
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn(), noteAppScroll: vi.fn() }));
// A browser drops focus from a control the moment it goes inert; jsdom does not, so the mock does it, as Chrome would.
vi.mock("../../lib/a11y/inert-page", async (orig) => {
  const real = await orig<typeof import("../../lib/a11y/inert-page")>();
  const { useLayoutEffect } = await import("react");
  return {
    useInertPage: (host: HTMLElement | null, active: boolean) => {
      real.useInertPage(host, active);
      useLayoutEffect(() => {
        const el = document.activeElement;
        if (active && el instanceof HTMLElement && el.closest("[inert]")) el.blur();
      }, [host, active]);
    },
  };
});
const takeVisit = vi.fn();
vi.mock("../../lib/moments/visit", async (orig) => ({ ...(await orig<object>()), takeVisit: () => takeVisit() }));

const { FirstRunTour } = await import("./first-run-tour");
const { TargetsProvider, useTarget } = await import("./targets-provider");
const { useScrollLock } = await import("../../lib/a11y/dialog");
const { ARRIVE_MS } = await import("../moments/moments-provider");

function Lit({ id, label }: { id: TargetId; label: string }) {
  return (
    <button type="button" ref={useTarget(id)}>
      {label}
    </button>
  );
}

function Sheet({ open }: { open: boolean }) {
  useScrollLock(open);
  return null;
}

/** A first-run Home: the app (every target but, optionally, the banner) and the tour beside it. */
function Home({ banner = true, sheet = false, precons = true }: { banner?: boolean; sheet?: boolean; precons?: boolean }) {
  return (
    <TargetsProvider>
      <div data-testid="app">
        <Lit id="tour:step-one" label="Upload" />
        <Lit id="tour:commanders" label="Commanders" />
        <Lit id="tour:decks" label="Decks" />
        <Lit id="tour:account" label="Account" />
        {banner && <Lit id="tour:banner" label="About" />}
        <Sheet open={sheet} />
      </div>
      <FirstRunTour precons={precons} />
    </TargetsProvider>
  );
}

const arrive = () => act(() => vi.advanceTimersByTime(ARRIVE_MS + 10));
const card = () => screen.getByRole("dialog");
const next = () => fireEvent.click(within(card()).getByRole("button", { name: /^(Next|Finish)$/ }));

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  spend.mockClear();
  takeVisit.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("FirstRunTour", () => {
  it("opens once the page settles plus ARRIVE_MS, spends the tour and takes the visit", async () => {
    render(<Home />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(ARRIVE_MS - 50));
    expect(screen.queryByRole("dialog")).toBeNull();
    arrive();
    expect(card()).toHaveAccessibleName("Start with what you own");
    expect(spend).toHaveBeenCalledTimes(1);
    // The visit is taken under the shared visit lock, a microtask later.
    await act(async () => {});
    expect(takeVisit).toHaveBeenCalledTimes(1);
  });

  it("waits while a sheet is open over Home, and opens once it closes", () => {
    const { rerender } = render(<Home sheet />);
    arrive();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spend).not.toHaveBeenCalled();
    rerender(<Home sheet={false} />);
    arrive();
    expect(card()).toBeInTheDocument();
  });

  it("never opens before the page has loaded, even when a sheet closes first", () => {
    const ready = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const { rerender } = render(<Home sheet />);
    rerender(<Home sheet={false} />);
    arrive();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spend).not.toHaveBeenCalled();
    ready.mockReturnValue("complete");
    act(() => window.dispatchEvent(new Event("load")));
    arrive();
    expect(card()).toBeInTheDocument();
    ready.mockRestore();
  });

  it("never opens in a hidden tab, and starts the wait again when the tab comes back", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<Home />);
    arrive();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spend).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    arrive();
    expect(card()).toBeInTheDocument();
    hidden.mockRestore();
  });

  it("gives focus back to the control that held it before the tour, once it ends", () => {
    render(<Home />);
    screen.getByRole("button", { name: "Upload" }).focus();
    arrive();
    fireEvent.click(within(card()).getByRole("button", { name: "Skip the tour" }));
    expect(screen.getByRole("button", { name: "Upload" })).toHaveFocus();
  });

  it("keeps focus on the card when Back takes step 2 to step 1, which has no Back", () => {
    render(<Home />);
    arrive();
    next();
    const back = within(card()).getByRole("button", { name: "Back" });
    back.focus();
    fireEvent.click(back);
    expect(within(card()).getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("announces each new stop, and not the opening", () => {
    render(<Home />);
    arrive();
    const live = () => document.querySelector("[data-tour-announce]")!;
    expect(live().textContent).toBe("");
    next();
    expect(live().textContent).toBe("2 of 6 · Commanders. See what you could build");
  });

  it("opens each step at the card's top, however far the last one was scrolled", () => {
    render(<Home />);
    arrive();
    card().scrollTop = 200;
    next();
    expect(card().scrollTop).toBe(0);
  });

  it("holds moments off while it runs", async () => {
    const { overPageCount } = await import("../../lib/moments/hold");
    render(<Home />);
    arrive();
    expect(overPageCount().holds).toBe(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overPageCount().holds).toBe(0);
  });

  it("holds the app inert while it runs, and lets it go when it ends", () => {
    render(<Home />);
    arrive();
    expect(screen.getByTestId("app").closest("[inert]")).not.toBeNull();
    fireEvent.click(within(card()).getByRole("button", { name: "Skip the tour" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("app").closest("[inert]")).toBeNull();
  });

  it("walks six steps, Back and Next, and Finish ends it", () => {
    render(<Home />);
    arrive();
    const kickers = [];
    for (let i = 0; i < 6; i++) {
      kickers.push(within(card()).getByText(/^\d of 6 · [^.]+$/).textContent);
      if (i < 5) next();
    }
    expect(kickers).toEqual(["1 of 6 · Collection", "2 of 6 · Commanders", "3 of 6 · Decks", "4 of 6 · Buying", "5 of 6 · Your look", "6 of 6 · What’s new"]);
    fireEvent.click(within(card()).getByRole("button", { name: "Back" }));
    expect(within(card()).getAllByText("5 of 6 · Your look")).toHaveLength(1);
    next();
    expect(within(card()).getByRole("button", { name: "Finish" })).toBeInTheDocument();
    next();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spend).toHaveBeenCalledTimes(1);
  });

  it("starts focus on Next and has no Back on step 1", () => {
    render(<Home />);
    arrive();
    expect(within(card()).getByRole("button", { name: "Next" })).toHaveFocus();
    expect(within(card()).queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("ends on Escape", () => {
    render(<Home />);
    arrive();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("names Precons I own on step 1 only with the precons line on", () => {
    const { unmount } = render(<Home />);
    arrive();
    expect(card()).toHaveTextContent("No file? Precons I own adds every card");
    unmount();
    sessionStorage.clear();
    render(<Home precons={false} />);
    arrive();
    expect(card()).not.toHaveTextContent("Precons I own");
  });

  it("draws the shipped theme picker on step 5", () => {
    render(<Home />);
    arrive();
    for (let i = 0; i < 4; i++) next();
    expect(within(card()).getByRole("radiogroup")).toBeInTheDocument();
    expect(within(card()).getAllByRole("radio")).toHaveLength(6);
    expect(within(card()).getByRole("status")).toHaveTextContent(/applied\.$/);
  });

  it("lights the banner on step 6, and without one stands the card centred and drops the line's sentence (R3 gap 6)", () => {
    const { unmount } = render(<Home />);
    arrive();
    for (let i = 0; i < 5; i++) next();
    expect(card()).toHaveTextContent("one line on Home says so");
    expect(document.querySelector("[data-tour-ring]")).not.toBeNull();
    unmount();
    sessionStorage.clear();
    render(<Home banner={false} />);
    arrive();
    for (let i = 0; i < 5; i++) next();
    expect(card()).not.toHaveTextContent("one line on Home says so");
    expect(card()).toHaveTextContent("Read the note ›");
    expect(document.querySelector("[data-tour-ring]")).toBeNull();
  });

  it("ends and opens the creator's note from step 6", () => {
    render(<Home />);
    arrive();
    for (let i = 0; i < 5; i++) next();
    fireEvent.click(within(card()).getByRole("button", { name: "Read the note ›" }));
    const note = screen.getByRole("dialog");
    expect(note).toHaveAccessibleName("A note from the creator");
    expect(document.querySelector("[data-tour-card]")).toBeNull();
  });

  it("never runs again in this tab once spent, when Back restores a Home whose payload still says it is due", () => {
    const first = render(<Home />);
    arrive();
    fireEvent.click(within(card()).getByRole("button", { name: "Skip the tour" }));
    first.unmount();
    render(<Home />);
    arrive();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spend).not.toHaveBeenCalledTimes(2);
  });
});
