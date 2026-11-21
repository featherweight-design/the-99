// The real surface: the same-change rule (S5), where the last two players each tapped down to 0 inside the 2 s window
// go out together, a draw, rather than whichever panel's timer fires first going out alone; the table a game keeps from
// its Start (the addendum's Snapshot rule); a seat with no deck (S2); and a table closed under the game (S4).
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Game } from "../../lib/tracker/engine";
import type { PlaySeat } from "../../lib/tracker/seat";
import { saveTableResultAction } from "../../app/friends/table/result-actions";
import { PlaySurface } from "./play-surface";

vi.mock("../../app/friends/table/result-actions", () => ({ saveTableResultAction: vi.fn(async () => ({ ok: true })) }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const seats: PlaySeat[] = [
  { seat: 0, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Sai", partner: null, deck: "Sai Artifacts" },
  { seat: 1, you: false, name: "Colin", art: null, partnerArt: null, commander: "Ghalta", partner: null, deck: "Ghalta Stompy" },
];
const game: Game = {
  config: { tableId: "t1", startingLife: 40, seats: [{ seat: 0, commanders: 1 }, { seat: 1, commanders: 1 }], first: 0, layout: "phone-2", startedAt: 0, snapshot: { players: seats, roster: "r" } },
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
  vi.clearAllMocks();
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

/** Both players tap down to 0 together, so the game ends and the result opens. */
async function endTheGame() {
  await act(async () => {});
  for (const b of screen.getAllByRole("button", { name: "Lose 1 life" })) {
    fireEvent.pointerDown(b);
    fireEvent.pointerUp(b);
  }
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

describe("PlaySurface snapshot", () => {
  // A reseat after Start: seat 1 is Max now, playing another deck, and the server's roster at this load is another.
  const reseated: PlaySeat[] = [seats[0], { seat: 1, you: false, name: "Max", art: null, partnerArt: null, commander: "Atraxa", partner: null, deck: "Atraxa Counters" }];

  it("keeps the seats and roster from Start after a reseat", async () => {
    render(<PlaySurface tableId="t1" roster="r2" expiresAt={Date.now() + 3_600_000} seats={reseated} backHref="/friends/table/t1" logHref="/decks/d?tab=games&table=t1" podName="Thursday night" />);
    await act(async () => {});
    const names = screen.getAllByTestId("panel-name").map((n) => n.textContent);
    expect(names).toEqual(["Hugh", "Colin"]);
    await endTheGame();
    expect(saveTableResultAction).toHaveBeenCalledWith("t1", "r", expect.any(Array));
  });

  it("does not resume a game saved without its table", async () => {
    const { snapshot: _, ...bare } = game.config;
    window.localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game: { ...game, config: bare }, expiresAt: Date.now() + 3_600_000 }));
    render(<PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} backHref="/friends/table/t1" logHref={null} podName="Thursday night" />);
    await act(async () => {});
    expect(screen.queryByTestId("tracker-panel")).toBeNull();
    expect(window.localStorage.getItem("the99.tracker.t1")).toBeNull();
  });

  it("starts a seat with no deck on a plain panel that says so (S2)", async () => {
    window.localStorage.clear();
    const waiting: PlaySeat[] = [seats[0], { ...seats[1], art: null, commander: "", deck: null }];
    render(<PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={waiting} backHref="/friends/table/t1" logHref={null} podName="Thursday night" />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    const colin = screen.getAllByTestId("tracker-panel").find((p) => p.dataset.seat === "1")!;
    expect(within(colin).getByTestId("panel-no-deck").textContent).toBe("no deck");
  });
});

describe("PlaySurface on a closed table (S4)", () => {
  const closesAt = () => Date.now() + 3_600_000;

  it("finishes the game it holds, notes the close above Log, and goes back to Friends", async () => {
    render(<PlaySurface tableId="t1" roster="r" expiresAt={closesAt()} seats={null} backHref="/friends" logHref="/decks/d?tab=games&table=t1" podName="Thursday night" closed={{ by: "you", at: Date.now() - 60_000 }} />);
    await endTheGame();
    const result = screen.getByTestId("tracker-result");
    expect(within(result).getByTestId("result-closed-note").textContent).toMatch(/^You closed the table at .+\. This game still logs from it until .+\.$/);
    expect(within(result).getByTestId("result-log")).toBeTruthy();
    expect(within(result).getByRole("link", { name: "Back to Friends" }).getAttribute("href")).toBe("/friends");
  });

  it("replaces Log this game with where to log once the table's night is over", async () => {
    render(<PlaySurface tableId="t1" roster="r" expiresAt={closesAt()} seats={null} backHref="/friends" logHref="/decks/d?tab=games&table=t1" podName="Thursday night" closed={{ by: "you", at: Date.now() - 60_000 }} />);
    await endTheGame();
    await act(async () => {
      vi.advanceTimersByTime(3_600_000);
    });
    const result = screen.getByTestId("tracker-result");
    expect(within(result).getByTestId("result-closed-note").textContent).toMatch(/^This table stopped logging at .+\. Log it from your deck’s Games tab\.$/);
    expect(within(result).queryByTestId("result-log")).toBeNull();
  });

  it("goes back when this device holds no game for it", async () => {
    window.localStorage.clear();
    render(<PlaySurface tableId="t1" roster="r" expiresAt={closesAt()} seats={null} backHref="/friends" logHref={null} podName="Thursday night" closed={{ by: null, at: Date.now() }} />);
    await act(async () => {});
    expect(replace).toHaveBeenCalledWith("/friends");
  });
});
