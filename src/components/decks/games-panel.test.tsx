import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";

// The class tokens the panel inks a pattern with. Asserting on `--success`
// would pass on any markup at all — the components name the theme tokens
// through Tailwind utilities, never through the variable.
const PATTERN_INK = /\b(?:text|bg|border)-(?:success|warning)\b/;

// The ids only have to be distinct — React keys the history rows by them — so a
// counter serves, and a failure names the same game every run.
let nextId = 0;
function game(over: Partial<DeckGame> = {}): DeckGame {
  return {
    id: `game_${(nextId += 1)}`,
    result: "win",
    podSize: 4,
    playedAt: new Date("2026-09-01"),
    worked: [],
    hurt: [],
    ...over,
  };
}

function mount(games: DeckGame[]) {
  return render(<GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} />);
}

// The mock deck from the handoff: 2–1 across three games, card_flow 3 of 3
// against, board and engine 2 of 3 for, mana one up one down, interaction 1 of 3.
const MOCK: DeckGame[] = [
  game({ result: "win", worked: ["board", "engine"], hurt: ["card_flow", "mana"] }),
  game({ result: "win", worked: ["board", "engine", "mana"], hurt: ["card_flow"] }),
  game({ result: "loss", hurt: ["card_flow", "interaction"] }),
];

describe("GamesPanel — the aggregate", () => {
  it("draws Fix above Keep", () => {
    const { container } = mount(MOCK);
    const text = container.textContent!;
    expect(text.indexOf(gameLogCopy.buckets.fix)).toBeLessThan(text.indexOf(gameLogCopy.buckets.keep));
  });

  it("prints every count with its denominator", () => {
    mount(MOCK);
    // The sub-line's denominator clause and the cell figure both say it.
    expect(screen.getAllByText(gameLogCopy.cell.figure("3", "3")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(gameLogCopy.cell.figure("2", "3")).length).toBeGreaterThan(0);
  });

  it("never prints a percentage", () => {
    const { container } = mount(MOCK);
    expect(container.textContent).not.toMatch(/%/);
  });

  it("never prints a signed figure", () => {
    const { container } = mount(MOCK);
    expect(container.textContent).not.toMatch(/[−-]\d/);
  });

  // The positive control for the low-N tests below: the same tokens they
  // forbid must actually appear once there is a pattern to claim.
  it("inks the buckets once the log is long enough to mean something", () => {
    mount(MOCK);
    expect(screen.getByText(gameLogCopy.buckets.fix).className).toMatch(PATTERN_INK);
    expect(screen.getByText(gameLogCopy.buckets.keep).className).toMatch(PATTERN_INK);
  });

  // Mixed is one line, not a third column of cells — mana is net zero here.
  it("states Mixed on a line rather than drawing cells for it", () => {
    mount(MOCK);
    const mixed = screen.getByText(gameLogCopy.buckets.mixed);
    expect(mixed).toBeInTheDocument();
    expect(within(mixed.parentElement!).queryByRole("meter")).toBeNull();
  });
});

describe("GamesPanel — low N", () => {
  it("shows no bucket headings at one game", () => {
    mount([game({ worked: ["board"], hurt: ["mana"] })]);
    expect(screen.queryByText(gameLogCopy.buckets.fix)).toBeNull();
    expect(screen.queryByText(gameLogCopy.buckets.keep)).toBeNull();
    expect(screen.getByText(gameLogCopy.buckets.oneGameHeading)).toBeInTheDocument();
  });

  // Colour is the claim that a pattern exists. One game is not a pattern.
  // Scoped to the summary: the history row below it inks a win green whatever
  // N is, and that is a fact about one game rather than a claim about the deck.
  it("uses no success or warning ink at one game", () => {
    mount([game({ worked: ["board"], hurt: ["mana"] })]);
    const summary = screen.getByText(gameLogCopy.buckets.oneGameHeading).closest("section")!;
    expect(summary.innerHTML).not.toMatch(PATTERN_INK);
  });

  it("names both buckets at two games but still withholds the ink", () => {
    mount([game({ hurt: ["mana"] }), game({ hurt: ["mana"], worked: ["board"] })]);
    const fix = screen.getByText(gameLogCopy.buckets.fix);
    const keep = screen.getByText(gameLogCopy.buckets.keep);
    expect(fix.className).not.toMatch(PATTERN_INK);
    expect(keep.className).not.toMatch(PATTERN_INK);
    expect(fix.closest("section")!.innerHTML).not.toMatch(PATTERN_INK);
    expect(keep.closest("section")!.innerHTML).not.toMatch(PATTERN_INK);
  });

  // "1 up" is the N=1 voice. Everywhere else a single mark still carries its
  // denominator.
  it("keeps the denominator on a single mark once there are two games", () => {
    mount([game({ hurt: ["mana"] }), game({ hurt: ["mana"], worked: ["board"] })]);
    expect(screen.getByText(gameLogCopy.cell.figure("1", "2"))).toBeInTheDocument();
    expect(screen.queryByText(gameLogCopy.cell.figureOneUp)).toBeNull();
  });

  it("orders one game's marks by the vocabulary, not by strength", () => {
    const { container } = mount([game({ worked: ["engine"], hurt: ["mana", "speed"] })]);
    const text = container.textContent!;
    // GAME_AXIS_KEYS order: speed, …, mana, …, engine.
    expect(text.indexOf("Speed")).toBeLessThan(text.indexOf("Mana"));
    expect(text.indexOf("Mana")).toBeLessThan(text.indexOf("The deck’s plan"));
  });
});

describe("GamesPanel — empty", () => {
  it("replaces the whole panel, headline and history included", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.heading)).toBeInTheDocument();
    expect(screen.queryByText(gameLogCopy.history.heading)).toBeNull();
    expect(screen.queryByText(gameLogCopy.buckets.fix)).toBeNull();
  });

  it("still offers the form", () => {
    mount([]);
    expect(screen.getByRole("button", { name: gameLogCopy.empty.cta })).toBeInTheDocument();
  });

  // §8.4: the pitch is the third game. Selling "log a game" sells the chore.
  it("pitches the pattern rather than the first game", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.cost)).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.empty.scope)).toBeInTheDocument();
  });
});
