import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
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

function Builder({ view }: { view: DeckView }) {
  usePublishBuilderScreen(view);
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
    expect(publish).toHaveBeenLastCalledWith("your-deck");
    rerender(
      <BuilderScreenContext.Provider value={publish}>
        <Builder view="shopping" />
      </BuilderScreenContext.Provider>,
    );
    expect(publish).toHaveBeenLastCalledWith("shopping");
    unmount();
    expect(publish).toHaveBeenLastCalledWith(null);
  });

  it("does nothing with no provider (the ? off)", () => {
    expect(() => render(<Builder view="stats" />)).not.toThrow();
  });
});
