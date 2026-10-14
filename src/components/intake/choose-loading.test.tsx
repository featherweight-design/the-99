import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

const { ChooseLoading } = await import("./choose-loading");
const { StallContext } = await import("../shell/nav-stall");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the results skeleton and the stuck-loader report", () => {
  it("marks the results skeleton as the page's loading screen and watches it (route loader and page fallback alike)", () => {
    vi.useFakeTimers();
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    window.history.replaceState(null, "", "/decks/new/choose?v=results");
    window.dispatchEvent(new PopStateEvent("popstate"));
    search.value = "v=results";
    const { container } = render(
      <StallContext.Provider value={{ deployment: null }}>
        <main>
          <ChooseLoading />
        </main>
      </StallContext.Provider>,
    );
    expect(container.querySelector('[data-testid="results-searching"]')?.hasAttribute("data-loading-screen")).toBe(true);
    vi.advanceTimersByTime(8_000);
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});

describe("HeldResults", () => {
  it("draws the skeleton unwatched: a model read may run past 8s by design", async () => {
    vi.useFakeTimers();
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    const { ResultsSkeleton } = await import("./choose-results");
    const { container } = render(
      <StallContext.Provider value={{ deployment: null }}>
        <main>
          <ResultsSkeleton watch={false} />
        </main>
      </StallContext.Provider>,
    );
    expect(container.querySelector('[data-testid="results-searching"]')?.hasAttribute("data-loading-screen")).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(beacon).not.toHaveBeenCalled();
  });
});
