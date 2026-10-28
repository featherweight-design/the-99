import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { BuilderView } from "../../lib/decks/builder-view";
import { BuilderScreenContext, deckViewOf, usePublishBuilderScreen } from "./builder-screen";
import type { DeckView } from "../../lib/copy/about";

afterEach(cleanup);

describe("deckViewOf", () => {
  it("maps the builder's tab, filter and panel to a deck view", () => {
    expect(deckViewOf("deck", "all", "list")).toBe("your-deck");
    expect(deckViewOf("deck", "shopping", "list")).toBe("shopping");
    expect(deckViewOf("deck", "all", "stats")).toBe("stats");
    expect(deckViewOf("deck", "shopping", "notes")).toBe("notes");
    expect(deckViewOf("analysis", "shopping", "stats")).toBe("analysis");
    expect(deckViewOf("games", "all", "list")).toBe("games");
    expect(deckViewOf("versions", "all", "list")).toBe("versions");
    expect(deckViewOf("consider", "shopping", "stats")).toBe("your-deck");
  });
});

function Builder({ view, tab = "deck" }: { view: DeckView; tab?: BuilderView }) {
  usePublishBuilderScreen(view, tab);
  return null;
}

describe("usePublishBuilderScreen", () => {
  it("publishes the view as it moves, and null when the builder leaves", () => {
    const publish = vi.fn();
    const { rerender, unmount } = render(
      <BuilderScreenContext.Provider value={publish}>
        <Builder view="your-deck" />
      </BuilderScreenContext.Provider>,
    );
    expect(publish).toHaveBeenLastCalledWith({ view: "your-deck", tab: "deck" });
    rerender(
      <BuilderScreenContext.Provider value={publish}>
        <Builder view="shopping" />
      </BuilderScreenContext.Provider>,
    );
    expect(publish).toHaveBeenLastCalledWith({ view: "shopping", tab: "deck" });
    unmount();
    expect(publish).toHaveBeenLastCalledWith(null);
  });

  it("publishes Consider's own tab beside the Your deck screen it reads as (Copilot round 2)", () => {
    const publish = vi.fn();
    render(
      <BuilderScreenContext.Provider value={publish}>
        <Builder view="your-deck" tab="consider" />
      </BuilderScreenContext.Provider>,
    );
    expect(publish).toHaveBeenLastCalledWith({ view: "your-deck", tab: "consider" });
  });

  it("does nothing with no provider (the ? off)", () => {
    expect(() => render(<Builder view="stats" />)).not.toThrow();
  });
});
