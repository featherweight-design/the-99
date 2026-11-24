import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const captured: Array<[string, unknown]> = [];
vi.mock("../../lib/analytics/posthog", () => ({ captureToolEvent: (n: string, p: unknown) => void captured.push([n, p]) }));
vi.mock("../../app/card-search-actions", () => ({ searchAllCardsAction: async () => [], cardSignalsAction: async () => ({}) }));
vi.mock("../../app/ask-actions", () => ({ askStartAction: async () => ({ hasDecks: true, off: [] }), askToolsAction: async () => [] }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
vi.mock("../card-search/search-layer", () => ({ SearchLayer: () => null }));
let desktop = true;
vi.mock("../ui/use-min-width", () => ({ useMinWidth: () => desktop }));
vi.mock("../collection/add-cards-host", () => ({ useAddCards: () => () => true }));

const { CardSearchRoot } = await import("../card-search/card-search");
const { SearchDesktop } = await import("../card-search/search-desktop");
const { HomeSearchPanel } = await import("./home-search-panel");
const { pushRecent } = await import("../../lib/card-search/recent");

function mount(foot?: React.ReactNode) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: desktop && q.includes("768"), addEventListener: () => {}, removeEventListener: () => {} }));
  render(
    <CardSearchRoot userId="u1">
      <SearchDesktop />
      <HomeSearchPanel userId="u1" foot={foot} />
    </CardSearchRoot>,
  );
}
const field = () => screen.getAllByRole("combobox")[0]!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  captured.length = 0;
  desktop = true;
});

describe("Home's search panel", () => {
  it("draws the title, the line and the field", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Not sure where to go?" })).toBeTruthy();
    expect(screen.getByText("Ask a question, or look up any card.")).toBeTruthy();
    expect(field().getAttribute("placeholder")).toBe("Search cards, or ask a question");
  });

  it("on a desktop the field opens the search in place, counted from home_field, and the rail draws no second field", async () => {
    mount();
    await act(async () => void fireEvent.focus(field()));
    expect(captured).toContainEqual(["search_opened", { from: "home_field" }]);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(document.querySelector("[data-card-search-frame=desktop]")).toBeNull();
    expect(document.querySelector("div.fixed.inset-0")).not.toBeNull();
    await act(async () => void fireEvent.keyDown(field(), { key: "Escape" }));
    expect(document.querySelector("div.fixed.inset-0")).toBeNull();
    expect(captured.filter(([n]) => n === "search_opened")).toHaveLength(1);
  });

  it("a starter types its question into the panel's field, counted from home_starter", async () => {
    mount();
    const starter = await screen.findByRole("button", { name: "Where can my spare cards go?" });
    await act(async () => void fireEvent.click(starter));
    expect(captured).toContainEqual(["search_opened", { from: "home_starter" }]);
    expect((field() as HTMLInputElement).value).toBe("Where can my spare cards go?");
  });

  it("on a phone the field is a button to the sheet, read-only", async () => {
    desktop = false;
    mount();
    expect((field() as HTMLInputElement).readOnly).toBe(true);
    await act(async () => void fireEvent.click(field()));
    expect(captured).toContainEqual(["search_opened", { from: "home_field" }]);
  });

  it("draws the fan from the recent cards that have art, three at most, hidden from assistive tech", () => {
    for (const n of ["a", "b", "c", "d"]) pushRecent("u1", { oracleId: n, name: n, imageUri: `https://img/${n}.jpg`, flavorName: null });
    pushRecent("u1", { oracleId: "x", name: "x", imageUri: null, flavorName: null });
    mount();
    const fan = document.querySelector("[data-home-fan]")!;
    expect(fan.getAttribute("aria-hidden")).toBe("true");
    expect(fan.querySelectorAll("img")).toHaveLength(3);
  });

  it("draws no fan with no recent cards, and the foot when given one", () => {
    mount(<p>the credits</p>);
    expect(document.querySelector("[data-home-fan]")).toBeNull();
    expect(screen.getByText("the credits")).toBeTruthy();
  });
});
