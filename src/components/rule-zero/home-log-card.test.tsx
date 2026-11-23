// Home's Game to log card (log reminder 2b, boards H1 to H3): one game and several, the dismissal and its Undo.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ hide: vi.fn(async () => true), unhide: vi.fn(async () => true) }));
vi.mock("../../app/friends/table/actions", () => ({ hideLogReminderAction: m.hide, unhideLogReminderAction: m.unhide }));

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import type { HomeLogGame } from "../../lib/social/rule-zero-log-home";
import { HomeLogCard } from "./home-log-card";

const copy = ruleZeroCopy.homeLog;
const NOW = new Date("2026-11-20T12:00:00Z");
const POD = named("Thursday night");

function game(n: number, over: Partial<HomeLogGame> = {}): HomeLogGame {
  const ms = Date.parse("2026-11-19T02:00:00Z") + n * 1000;
  return {
    gameMs: ms,
    startedAt: new Date(ms),
    deckId: 7,
    deckName: "Sai Thopters",
    result: { kind: "won", name: named("Colin") },
    seats: [
      { name: named("Colin"), you: false, place: 1, artCropUri: null },
      { name: named("You"), you: true, place: 2, artCropUri: null },
    ],
    loggedAt: null,
    until: new Date("2026-11-26T11:00:00Z"),
    tableId: `7a0e0000-0000-4000-8000-00000000000${n}`,
    podName: POD,
    ...over,
  } as unknown as HomeLogGame;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("one game", () => {
  it("draws the kicker, the result, the fill-in sentence and Log this game", () => {
    render(<HomeLogCard games={[game(1)]} now={NOW} />);
    expect(screen.getByText(copy.kicker)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log this game" }).getAttribute("href")).toContain("game=");
    expect(screen.getByText("Sai Thopters").tagName).toBe("B");
    expect(plain(document.body.textContent ?? "")).toContain("Colin won");
  });

  it("pins the ✕ to the card's top right corner at every width, not at the row's end (G19)", () => {
    render(<HomeLogCard games={[game(1)]} now={NOW} />);
    const cls = screen.getByTestId("home-log-hide").className;
    expect(cls).toMatch(/(^| )absolute( |$)/);
    expect(cls).toContain("right-[4px]");
    expect(cls).toContain("top-[4px]");
    expect(cls).toContain("xl:right-[6px]");
    expect(cls).toContain("xl:top-[6px]");
    expect(cls).toContain("xl:h-[32px]");
    expect(cls).toContain("xl:w-[32px]");
    expect(cls).not.toContain("xl:static");
    expect(cls).not.toContain("xl:order-last");
  });

  it("hides on the ✕ without a navigation, and Undo brings it back", async () => {
    render(<HomeLogCard games={[game(1)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByTestId("home-log-hide")));
    expect(m.hide).toHaveBeenCalledWith(game(1).tableId, game(1).gameMs);
    expect(screen.queryByTestId("home-log-card")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Reminder hidden. Log this game stays on the table until Thu, Nov 26.");
    await act(async () => fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: copy.undo })));
    expect(m.unhide).toHaveBeenCalledWith(game(1).tableId, game(1).gameMs);
    expect(screen.getByTestId("home-log-card")).toBeTruthy();
  });

  it("hides again and offers Undo again when the Undo is refused", async () => {
    m.unhide.mockResolvedValueOnce(false);
    render(<HomeLogCard games={[game(1)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByTestId("home-log-hide")));
    await act(async () => fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: copy.undo })));
    expect(screen.queryByTestId("home-log-card")).toBeNull();
    expect(within(screen.getByRole("status")).getByRole("button", { name: copy.undo })).toBeTruthy();
  });

  it("puts the card back, with a retry, when the server refuses the hide", async () => {
    m.hide.mockResolvedValueOnce(false);
    render(<HomeLogCard games={[game(1)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByTestId("home-log-hide")));
    expect(screen.getByTestId("home-log-card")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(copy.hideFailed);
    await act(async () => fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: ruleZeroCopy.close.retry })));
    expect(m.hide).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("home-log-card")).toBeNull();
  });
});

describe("several games", () => {
  it("heads a count and draws one row each, Last day only on the one ending within a day", () => {
    const soon = game(2, { until: new Date("2026-11-20T20:00:00Z") });
    render(<HomeLogCard games={[game(1), soon]} now={NOW} />);
    expect(screen.getByText(copy.kickerMany(2))).toBeTruthy();
    expect(screen.getAllByTestId("home-log-row")).toHaveLength(2);
    expect(screen.getAllByText(copy.lastDay)).toHaveLength(1);
  });

  it("caps at four rows and opens the rest on Show N more", () => {
    render(<HomeLogCard games={[1, 2, 3, 4, 5, 6].map((n) => game(n))} now={NOW} />);
    expect(screen.getAllByTestId("home-log-row")).toHaveLength(4);
    fireEvent.click(screen.getByTestId("home-log-more"));
    expect(screen.getAllByTestId("home-log-row")).toHaveLength(6);
  });

  it("falls to the one-game card when all but one are hidden", async () => {
    render(<HomeLogCard games={[game(1), game(2)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getAllByTestId("home-log-hide")[0]));
    expect(screen.queryAllByTestId("home-log-row")).toHaveLength(0);
    expect(screen.getByText(copy.kicker)).toBeTruthy();
  });
});
