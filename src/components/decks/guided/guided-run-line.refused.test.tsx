import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("../../../app/decks/guided-actions", () => ({ readGuidedStateAction: vi.fn(async () => null), startGuidedAction: vi.fn() }));
vi.mock("../../../app/decks/synopsis-actions", () => ({ fetchSynopsis: vi.fn() }));
import { GuidedRunLine } from "./guided-run-line";

afterEach(cleanup);

describe("the deck page after a refused guided start", () => {
  it("draws the refused line, as an alert, when the deck has no run", async () => {
    render(<GuidedRunLine deckId="d1" deckName="Deck" refused />);
    const line = await screen.findByTestId("guided-refused-line");
    expect(line.textContent).toContain("didn’t start");
    expect(line.querySelector("[role=alert]")).not.toBeNull();
  });

  it("draws nothing without the refusal and without a run", async () => {
    render(<GuidedRunLine deckId="d1" deckName="Deck" />);
    await Promise.resolve();
    expect(screen.queryByTestId("guided-refused-line")).toBeNull();
  });
});
