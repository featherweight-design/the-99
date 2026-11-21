// The same-change rule on the real surface (S5): the last two players each tapped down to 0 inside the 2 s window go
// out together, a draw, rather than whichever panel's timer fires first going out alone.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Game } from "../../lib/tracker/engine";
import type { PlaySeat } from "./panel";
import { PlaySurface } from "./play-surface";

vi.mock("../../app/friends/table/result-actions", () => ({ saveTableResultAction: vi.fn(async () => ({ ok: true })) }));

const seats: PlaySeat[] = [
  { seat: 0, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Sai", partner: null, deck: "Sai Artifacts" },
  { seat: 1, you: false, name: "Colin", art: null, partnerArt: null, commander: "Ghalta", partner: null, deck: "Ghalta Stompy" },
];
const game: Game = {
  config: { tableId: "t1", startingLife: 40, seats: [{ seat: 0, commanders: 1 }, { seat: 1, commanders: 1 }], first: 0, layout: "phone-2", startedAt: 0 },
  log: [
    { t: "life", seat: 0, delta: -39 },
    { t: "life", seat: 1, delta: -39 },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  window.localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("PlaySurface result", () => {
  it("is a draw when the last two players tap down to 0 within the same window", async () => {
    render(<PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} backHref="/friends/table/t1" logHref="/decks/d?tab=games&table=t1" podName="Thursday night" />);
    await act(async () => {});
    const lose = screen.getAllByRole("button", { name: "Lose 1 life" });
    expect(lose).toHaveLength(2);
    for (const b of lose) {
      fireEvent.pointerDown(b);
      fireEvent.pointerUp(b);
    }
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    const result = screen.getByTestId("tracker-result");
    expect(result.textContent).toContain("A draw");
    expect(result.textContent).toContain("Logs as a draw for Colin and you.");
  });
});
