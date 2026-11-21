// The real surface: the same-change rule (S5), where the last two players each tapped down to 0 inside the 2 s window
// go out together, a draw, rather than whichever panel's timer fires first going out alone; the table a game keeps from
// its Start (the addendum's Snapshot rule); a seat with no deck (S2); a table closed under the game (S4); and Undo the last
// change (Undo addendum U1 to U4).
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Game } from "../../lib/tracker/engine";
import type { PlaySeat } from "../../lib/tracker/seat";
import { gameLoggedAction, saveTableResultAction, undoTableResultAction } from "../../app/friends/table/result-actions";
import { PlaySurface } from "./play-surface";

vi.mock("../../app/friends/table/result-actions", () => ({
  saveTableResultAction: vi.fn(async () => ({ ok: true })),
  undoTableResultAction: vi.fn(async () => ({ result: "undone" })),
  gameLoggedAction: vi.fn(async () => null),
}));
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
    // U4: one note in Undo's slot, and only the way back to Friends.
    expect(within(result).getByTestId("result-stopped-note").textContent).toMatch(/^This table stopped logging at .+, so this ending stays\. Log it from your deck’s Games tab\.$/);
    expect(within(result).queryByTestId("result-closed-note")).toBeNull();
    expect(within(result).queryByTestId("result-log")).toBeNull();
    expect(within(result).queryByTestId("result-undo")).toBeNull();
    expect(within(result).queryByTestId("result-rematch")).toBeNull();
    expect(within(result).getByTestId("result-back").textContent).toBe("Back to Friends");
  });

  it("goes back when this device holds no game for it", async () => {
    window.localStorage.clear();
    render(<PlaySurface tableId="t1" roster="r" expiresAt={closesAt()} seats={null} backHref="/friends" logHref={null} podName="Thursday night" closed={{ by: null, at: Date.now() }} />);
    await act(async () => {});
    expect(replace).toHaveBeenCalledWith("/friends");
  });

  it("opens setup on the finished game's life when Start comes from the Last game, and takes ?again off the address bar (S6)", async () => {
    const done: Game = { ...game, config: { ...game.config, startingLife: 30 }, log: [{ t: "life", seat: 0, delta: -30 }], endedAt: 1 };
    window.localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game: done, expiresAt: Date.now() + 3_600_000 }));
    window.history.replaceState(null, "", "/friends/table/t1/play?again=1");
    render(<PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} again backHref="/friends/table/t1" logHref={null} podName="Thursday night" />);
    await act(async () => {});
    expect(within(screen.getByTestId("tracker-setup")).getByText("30")).toBeTruthy();
    expect(window.localStorage.getItem("the99.tracker.t1")).toBeNull();
    expect(window.location.search).toBe("");
  });
});

describe("PlaySurface Undo the last change", () => {
  // Colin goes out on one change: the game is over the moment it loads, and Hugh (this device) wins.
  const won: Game = { ...game, log: [{ t: "life", seat: 1, delta: -40 }] };
  const open = (props: { undoNow?: boolean } = {}) => {
    window.localStorage.setItem("the99.tracker.t1", JSON.stringify({ v: 1, game: won, expiresAt: Date.now() + 3_600_000 }));
    render(<PlaySurface tableId="t1" roster="r" expiresAt={Date.now() + 3_600_000} seats={seats} backHref="/friends/table/t1" logHref="/decks/d?tab=games&table=t1" podName="Thursday night" {...props} />);
  };
  const settle = () => act(async () => {});

  it("offers Undo under the winner, naming the change that ended the game (U1)", async () => {
    open();
    await settle();
    const row = within(screen.getByTestId("tracker-result")).getByTestId("result-undo");
    expect(row.textContent).toBe("Undo the last changeColin −40 life, to 0 · round 1");
    expect(row.getAttribute("aria-label")).toBe("Undo the last change: Colin −40 life, to 0 · round 1");
    expect(row.getAttribute("aria-disabled")).toBeNull();
  });

  it("takes the result back, reopens the game, says so, and focuses the panel that came back (U2)", async () => {
    open();
    await settle();
    fireEvent.click(screen.getByTestId("result-undo"));
    await settle();
    expect(undoTableResultAction).toHaveBeenCalledWith("t1", "r");
    expect(screen.queryByTestId("tracker-result")).toBeNull();
    // The board's own "Your turn" line is a status region too, so the toast is the status that says Game back on.
    const toast = screen.getAllByRole("status").find((el) => el.textContent?.includes("Game back on"));
    expect(toast).toBeTruthy();
    expect(toast!.textContent).toContain("Game back on");
    expect(toast!.textContent).toContain("Undid Colin −40 life, to 0 · round 1");
    expect(document.activeElement).toBe(screen.getAllByTestId("panel-name")[1]);
  });

  it("waits while the result saves, and runs the Undo only after the save (clarification 3)", async () => {
    let done!: (v: { ok: boolean }) => void;
    vi.mocked(saveTableResultAction).mockImplementationOnce(() => new Promise((r) => (done = r)));
    open();
    await settle();
    const row = screen.getByTestId("result-undo");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(row);
    await settle();
    expect(undoTableResultAction).not.toHaveBeenCalled();
    await act(async () => done({ ok: true }));
    expect(screen.getByTestId("result-undo").getAttribute("aria-disabled")).toBeNull();
  });

  it("keeps the ending once someone seated has logged it, and says who (U3)", async () => {
    vi.mocked(gameLoggedAction).mockResolvedValue({ seat: 1, at: new Date(), you: false, publicId: "p1", name: null });
    open();
    await settle();
    const result = screen.getByTestId("tracker-result");
    expect(within(result).queryByTestId("result-undo")).toBeNull();
    expect(within(result).getByTestId("result-logged-note").textContent).toMatch(/^This game was logged at .+, so this ending stays\.$/);
    expect(within(result).getByTestId("result-log")).toBeTruthy();
    vi.mocked(gameLoggedAction).mockResolvedValue(null);
  });

  it("shows the logged note, with no toast, when a log beat the Undo to the server", async () => {
    vi.mocked(undoTableResultAction).mockResolvedValueOnce({ result: "logged" });
    open();
    await settle();
    vi.mocked(gameLoggedAction).mockResolvedValueOnce({ seat: 0, at: new Date(), you: true });
    fireEvent.click(screen.getByTestId("result-undo"));
    await settle();
    const result = screen.getByTestId("tracker-result");
    expect(within(result).getByTestId("result-logged-note").textContent).toMatch(/^You logged this game at .+, so this ending stays\.$/);
    expect(screen.queryAllByRole("status").some((el) => el.textContent?.includes("Game back on"))).toBe(false);
  });

  it("leaves the game over and offers Try again when the Undo fails (clarification 4)", async () => {
    vi.mocked(undoTableResultAction).mockRejectedValueOnce(new Error("offline"));
    open();
    await settle();
    fireEvent.click(screen.getByTestId("result-undo"));
    await settle();
    expect(screen.getByTestId("tracker-result")).toBeTruthy();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Undo didn’t go through. The game is still over.");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await settle();
    expect(undoTableResultAction).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("tracker-result")).toBeNull();
  });

  it("offers no Try again when the server refuses the Undo, since a retry cannot change its answer", async () => {
    vi.mocked(undoTableResultAction).mockResolvedValueOnce({ result: "refused" } as Awaited<ReturnType<typeof undoTableResultAction>>);
    open();
    await settle();
    fireEvent.click(screen.getByTestId("result-undo"));
    await settle();
    expect(screen.getByTestId("tracker-result")).toBeTruthy();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Undo didn’t go through. The game is still over.");
    expect(within(alert).queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("undoes on arrival from the Last game card's Undo (U5), once", async () => {
    open({ undoNow: true });
    await settle();
    await settle();
    expect(undoTableResultAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("tracker-result")).toBeNull();
  });
});
