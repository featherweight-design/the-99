// The overview's card names: marks become live names, and a name pressed inside the sheet
// closes its raised preview, which would otherwise sit above the card modal the press opens.

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { HoverPreviewProvider } from "./hover-preview";
import { SynopsisText } from "./synopsis-text";

const CARDS = { "sol ring": { oracleId: "sol", name: "Sol Ring" } };
const ART = new Map([["sol", { imageUri: "https://img/sol.jpg" }]]) as never;

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === "(hover: hover)", media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});
afterEach(() => vi.useRealTimers());

const draw = (text: string) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <HoverPreviewProvider>
        <div role="dialog">
          <p><SynopsisText text={text} cards={CARDS} art={ART} /></p>
        </div>
      </HoverPreviewProvider>
    </CardDetailProvider>,
  );

describe("SynopsisText", () => {
  it("draws a mark as its name, live, and leaves the rest as text", () => {
    draw("Open with [[Sol Ring]] early.");
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.queryByText(/\[\[/)).toBeNull();
  });

  it("draws an unresolved mark as its plain name, never a broken control", () => {
    draw("Then [[Nowhere Card]] wins.");
    expect(screen.getByText(/Nowhere Card/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Nowhere Card/ })).toBeNull();
  });

  it("closes the raised preview when the name is pressed", () => {
    draw("Open with [[Sol Ring]] early.");
    const name = screen.getByTestId("synopsis-card");
    fireEvent.mouseEnter(name);
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.getByTestId("hover-preview").className).toContain("z-[60]");
    fireEvent.click(screen.getByRole("button", { name: /Sol Ring/ }));
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });
});
