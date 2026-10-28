import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { helpPanelCopy } from "../../lib/copy/discovery";
import type { DeckView } from "../../lib/copy/about";
import type { BuilderView } from "../../lib/decks/builder-view";
import { stubViewport } from "../../test-utils/stub-viewport";
import { usePublishBuilderScreen } from "../decks/builder-screen";
import { Report } from "../shell/pending-report";
import { backFrom, HelpButton, HelpRoot } from "./help-root";

// The ? (About visual PR 6a, call 5, Addendum A1): no panel; a press goes to its screen's About page, read off the LIVE
// address at the press.

const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push, prefetch: vi.fn() }) }));

beforeEach(() => push.mockClear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const DECK = "/decks/0b6c2f4e-1111-4222-8333-444455556666";
const enc = encodeURIComponent;

function Deck({ view, tab = "deck" }: { view: DeckView; tab?: BuilderView }) {
  usePublishBuilderScreen(view, tab);
  return null;
}

const draw = (children: React.ReactNode = null, on = true) =>
  render(
    <HelpRoot on={on}>
      <HelpButton place="header" />
      {children}
    </HelpRoot>,
  );
const press = () => fireEvent.click(screen.getByRole("button", { name: helpPanelCopy.button }));

describe("the ?", () => {
  it("is a button with its shipped name, and opens no panel", () => {
    window.history.replaceState(null, "", "/collection/replace");
    draw();
    press();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "About this screen" }).hasAttribute("aria-expanded")).toBe(false);
  });

  it("goes to a sectioned screen's section, carrying where it was pressed", () => {
    window.history.replaceState(null, "", "/collection/replace");
    draw();
    press();
    expect(push).toHaveBeenCalledWith(`/about/collection?from=${enc("/collection/replace")}#upload`);
  });

  it("reads the address at the press, not at the render", () => {
    window.history.replaceState(null, "", "/collection");
    draw();
    window.history.replaceState(null, "", "/collection/history");
    press();
    expect(push).toHaveBeenCalledWith(`/about/collection?from=${enc("/collection/history")}&lit=${enc("rule/replace")}#upload`);
  });

  it("answers a deck for the view the builder publishes", () => {
    window.history.replaceState(null, "", DECK);
    draw(<Deck view="analysis" tab="analysis" />);
    press();
    expect(push).toHaveBeenCalledWith(`/about/decks?from=${enc(`${DECK}?tab=analysis`)}#analysis`);
  });

  it("lands card details on the key at desktop width, and on the list under it on a phone", () => {
    window.history.replaceState(null, "", "/collection?card=x");
    stubViewport(1300);
    draw();
    press();
    expect(push).toHaveBeenLastCalledWith(`/about/collection?from=${enc("/collection?card=x")}&lit=${enc("collection/cards/key")}#cards`);
    cleanup();
    stubViewport(390);
    draw();
    press();
    expect(push).toHaveBeenLastCalledWith(`/about/collection?from=${enc("/collection?card=x")}#cards`);
  });

  it("goes to the /about index from a screen with no landing", () => {
    window.history.replaceState(null, "", "/admin");
    draw();
    press();
    expect(push).toHaveBeenCalledWith("/about");
  });

  it("goes through the shell's pending push, so a slow press reaches the 400ms screen (Copilot round 1)", () => {
    window.history.replaceState(null, "", "/collection/replace");
    const reported = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/collection/replace", push: reported, registerContentScope: () => {} }}>
        <HelpRoot on>
          <HelpButton place="header" />
        </HelpRoot>
      </Report.Provider>,
    );
    press();
    expect(reported).toHaveBeenCalledWith(`/about/collection?from=${enc("/collection/replace")}#upload`);
    expect(push).not.toHaveBeenCalled();
  });

  it("carries a deck's live view in from, so Back returns to it (Copilot round 1)", () => {
    window.history.replaceState(null, "", `${DECK}?tab=games`);
    draw(<Deck view="stats" />);
    press();
    expect(push).toHaveBeenCalledWith(`/about/decks?from=${enc(`${DECK}?panel=stats`)}#stats`);
  });

  it("keeps Consider in from while landing on Your deck (Copilot round 2)", () => {
    window.history.replaceState(null, "", DECK);
    draw(<Deck view="your-deck" tab="consider" />);
    press();
    expect(push).toHaveBeenCalledWith(`/about/decks?from=${enc(`${DECK}?tab=consider`)}#your-deck`);
  });

  it("draws nothing for a reader with the switch off", () => {
    draw(null, false);
    expect(screen.queryByRole("button", { name: helpPanelCopy.button })).toBeNull();
  });
});

describe("backFrom", () => {
  it("writes a deck's live view into the address, keeping everything else", () => {
    expect(backFrom(DECK, "", { view: "analysis", tab: "analysis" })).toBe(`${DECK}?tab=analysis`);
    expect(backFrom(DECK, "?tab=analysis", { view: "games", tab: "games" })).toBe(`${DECK}?tab=games`);
    expect(backFrom(DECK, "?tab=games&x=1", { view: "shopping", tab: "deck" })).toBe(`${DECK}?x=1&panel=shopping`);
    expect(backFrom(DECK, "?panel=notes", { view: "stats", tab: "deck" })).toBe(`${DECK}?panel=stats`);
    expect(backFrom(DECK, "?tab=versions&panel=notes", { view: "your-deck", tab: "deck" })).toBe(DECK);
    expect(backFrom(DECK, "?panel=stats", { view: "your-deck", tab: "consider" })).toBe(`${DECK}?tab=consider`);
  });

  it("leaves any other screen, and a deck with no published view, as it is", () => {
    expect(backFrom("/collection", "?card=x", { view: "stats", tab: "deck" })).toBe("/collection?card=x");
    expect(backFrom(DECK, "?tab=games", null)).toBe(`${DECK}?tab=games`);
  });
});
