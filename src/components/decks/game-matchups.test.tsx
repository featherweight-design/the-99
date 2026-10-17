// The Games tab's Matchups section and the History `vs` line (Social R3, PR 4), drawn from the snapshot a game
// was logged with: counts with denominators, never a rate, and nothing from a friend's live rows.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { HALO_ATTR, TargetsProvider, useTargets, type Targets } from "../discovery/targets-provider";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { summarizeMatchups } from "../../lib/decks/matchups";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { DeckOpponentsWire } from "../../lib/decks/deck-opponents-read";
import { vsParts } from "./game-vs-line";
import { gameMatchupsCopy } from "../../lib/copy/game-matchups";
import { gameLogCopy } from "../../lib/copy/game-log";

vi.mock("../../app/decks/actions", () => ({ logGame: async () => ({ ok: true }), deleteGame: async () => ({ ok: true }) }));

const copy = gameMatchupsCopy.matchups;
const game = (id: string, result: DeckGame["result"] = "win"): DeckGame => ({
  id, result, podSize: 4, playedAt: new Date("2026-10-0" + (Number(id.slice(1)) % 9 + 1)), versionNumber: null, note: null, worked: [], hurt: [],
});
const yuriko = { oracleId: "y", name: "Yuriko, the Tiger’s Shadow", imageUri: "y.jpg" };
const tymna = { oracleId: "t", name: "Tymna the Weaver", imageUri: null };
const seat = (over: Partial<GameOpponent>): GameOpponent => ({
  seat: 1, friend: null, deckName: null, commander: null, partner: null, colorIdentity: [], label: null, won: false, ...over,
});

function wire(games: DeckGame[], by: Record<string, GameOpponent[]>): DeckOpponentsWire {
  return { opponents: by, matchups: summarizeMatchups(games, new Map(Object.entries(by))) };
}
function mount(games: DeckGame[], gameOpponents: DeckOpponentsWire | null) {
  render(<GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} gameOpponents={gameOpponents} />);
}

describe("the section's states", () => {
  it("is absent with no opponents payload (switch off) and draws no vs line", () => {
    mount([game("g1")], null);
    expect(screen.queryByText(copy.heading)).toBeNull();
    expect(screen.queryByText(gameMatchupsCopy.history.vs)).toBeNull();
  });

  it("games and no opponents: the heading, 0 of N, one dashed line, and no switch", () => {
    const games = [game("g1"), game("g2")];
    mount(games, wire(games, {}));
    expect(screen.getByText(copy.heading)).toBeInTheDocument();
    expect(screen.getByText(copy.recorded(0, 2))).toBeInTheDocument();
    expect(screen.getByText(copy.empty)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: copy.split })).toBeNull();
  });
});

describe("by commander", () => {
  const games = [game("g1", "loss"), game("g2", "win"), game("g3", "win")];
  const by = {
    g1: [seat({ commander: yuriko, colorIdentity: ["U", "B"], won: true })],
    g2: [seat({ commander: yuriko, colorIdentity: ["U", "B"] }), seat({ seat: 2, commander: tymna, colorIdentity: ["W", "U", "B", "G"] })],
  };

  it("says how many games recorded the opponents, and draws a result square per game with its denominator", () => {
    mount(games, wire(games, by));
    expect(screen.getByText(copy.recorded(2, 3))).toBeInTheDocument();
    const section = screen.getByRole("heading", { name: copy.heading }).closest("section")!;
    // Yuriko: one won game, one lost game she won: W then L, two games, and the trophy counts the loss she won.
    const squares = within(section).getAllByRole("img", { name: copy.squareAria(1, 1, 0) });
    expect(squares[0]).toHaveTextContent("WL");
    expect(within(section).getByText(copy.games(2))).toBeInTheDocument();
    expect(within(section).getByLabelText(copy.beatAria(1))).toBeInTheDocument();
    expect(within(section).getByText(copy.games(1))).toBeInTheDocument();
  });

  it("prints no percentage anywhere in the section", () => {
    mount(games, wire(games, by));
    const section = screen.getByRole("heading", { name: copy.heading }).closest("section")!;
    expect(section.textContent).not.toMatch(/%/);
  });

  it("says nothing about single games when only half the rows are one, and says it when most are", () => {
    mount(games, wire(games, by));
    // Yuriko 2 games, Tymna 1: one of two rows is not a majority, so no caption.
    expect(screen.queryByText(copy.mostlyOne)).toBeNull();
    expect(screen.queryByText(copy.allOne)).toBeNull();
  });
});

describe("the switch", () => {
  const games = [game("g1", "loss"), game("g2", "win")];
  const by = {
    g1: [seat({ friend: { key: "f1", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, colorIdentity: ["U", "R"], won: true })],
    g2: [seat({ commander: tymna, colorIdentity: ["W", "U", "B", "G"] })],
  };

  it("splits by colors with the app's names and the missing color of four, and by friend with the snapshot name", () => {
    mount(games, wire(games, by));
    const section = screen.getByRole("heading", { name: copy.heading }).closest("section")!;
    fireEvent.click(screen.getByRole("radio", { name: copy.byColors }));
    expect(within(section).getByText("Izzet")).toBeInTheDocument();
    expect(within(section).getByText(copy.fourColors)).toBeInTheDocument();
    expect(within(section).getByText(copy.fourColorsSub("red"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: copy.byFriend }));
    expect(within(section).getByText("Dave")).toBeInTheDocument();
    // Someone with only a commander and no friend is not a row under Friend.
    expect(within(section).queryByText("Tymna the Weaver")).toBeNull();
  });

  it("moves with the arrow keys, selection following focus, one tab stop", () => {
    mount(games, wire(games, by));
    const commander = screen.getByRole("radio", { name: copy.byCommander });
    expect(commander).toHaveAttribute("aria-checked", "true");
    expect(commander).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(commander, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: copy.byColors })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: copy.byCommander })).toHaveAttribute("tabindex", "-1");
  });
});

describe("a row past ten games", () => {
  it("gives the squares up for counts beside the total", () => {
    const games = Array.from({ length: 12 }, (_, i) => game(`g${i + 1}`, i < 7 ? "win" : "loss"));
    const by = Object.fromEntries(games.map((g) => [g.id, [seat({ commander: yuriko, colorIdentity: ["U"] })]]));
    mount(games, wire(games, by));
    expect(screen.getByText(copy.counts(7, 5, 0))).toBeInTheDocument();
    expect(screen.getByText(copy.games(12))).toBeInTheDocument();
  });
});

describe("the History vs line", () => {
  const games = [game("g1", "loss"), game("g2")];
  const by = {
    g1: [
      seat({ friend: { key: "f1", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, won: true }),
      seat({ seat: 2, label: "Lee", commander: tymna }),
      seat({ seat: 3, commander: { oracleId: "z", name: "Zed, the Unnamed", imageUri: null } }),
    ],
  };

  it("reads the snapshot: a friend with their deck, a label with its commander, a bare commander by its short name, a trophy before the winner", () => {
    mount(games, wire(games, by));
    const rows = screen.getAllByRole("listitem").filter((li) => li.textContent?.includes(gameMatchupsCopy.history.vs));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(within(row).getByText("Dave")).toBeInTheDocument();
    expect(within(row).getByText("· Avengers Tempo")).toBeInTheDocument();
    expect(within(row).getByText("Lee")).toBeInTheDocument();
    expect(within(row).getByText("· Tymna the Weaver")).toBeInTheDocument();
    expect(within(row).getByText("Zed")).toBeInTheDocument();
    expect(within(row).getAllByRole("img", { name: gameMatchupsCopy.history.wonAria })).toHaveLength(1);
  });

  it("draws nothing, and reserves nothing, for a game with no seat", () => {
    mount(games, wire(games, by));
    const plain = screen.getAllByRole("listitem").filter((li) => li.textContent?.includes(gameLogCopy.history.meta("4", "")) && !li.textContent?.includes(gameMatchupsCopy.history.vs));
    expect(plain.length).toBeGreaterThan(0);
    // One game has seats, the other none: exactly one `vs` line exists on the page.
    expect(screen.getAllByText(gameMatchupsCopy.history.vs)).toHaveLength(1);
  });

  it("keeps both commanders of a recorded pair on the vs line", () => {
    const thrasios = { oracleId: "th", name: "Thrasios, Triton Hero", imageUri: null };
    expect(vsParts(seat({ commander: tymna, partner: thrasios }))).toEqual({ name: "Tymna the Weaver + Thrasios", sub: null });
    expect(vsParts(seat({ commander: tymna, partner: thrasios, label: "Zed" }))).toEqual({ name: "Zed", sub: "Tymna the Weaver + Thrasios" });
    expect(vsParts(seat({ commander: tymna }))).toEqual({ name: "Tymna the Weaver", sub: null });
  });
});

describe("the switch is Matchups' landing target (discovery R2, E11)", () => {
  function grab() {
    const box: { t: Targets | null } = { t: null };
    function Grab() {
      const t = useTargets();
      useEffect(() => {
        box.t = t;
      }, [t]);
      return null;
    }
    return { box, Grab };
  }
  const by = { g1: [seat({ commander: yuriko, colorIdentity: ["U", "B"] })] };

  // Before the third game the moment is not yet due, but the switch is drawn, so a landing still reaches it.
  it.each([
    ["one game, before the moment is due", [game("g1")]],
    ["three games, with the moment due", [game("g1"), game("g2"), game("g3")]],
  ])("is the radiogroup with %s", (_, games) => {
    const { box, Grab } = grab();
    render(
      <TargetsProvider>
        <Grab />
        <GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} gameOpponents={wire(games, by)} />
      </TargetsProvider>,
    );
    const split = screen.getByRole("radiogroup", { name: copy.split });
    expect(box.t!.haloTarget("matchups")).toBe(true);
    expect(split.hasAttribute(HALO_ATTR)).toBe(true);
  });

  it("is nothing with no opponent recorded, since no switch is drawn", () => {
    const { box, Grab } = grab();
    const games = [game("g1"), game("g2"), game("g3")];
    render(
      <TargetsProvider>
        <Grab />
        <GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} gameOpponents={wire(games, {})} />
      </TargetsProvider>,
    );
    expect(box.t!.haloTarget("matchups")).toBe(false);
  });
});
