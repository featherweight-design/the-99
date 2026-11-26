import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";

vi.mock("../../app/decks/actions", () => ({
  logGame: async () => ({ ok: true }),
  deleteGame: async () => ({ ok: true }),
}));

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
    versionNumber: null,
    note: null,
    worked: [],
    hurt: [],
    ...over,
  };
}

function mount(games: DeckGame[]) {
  return render(<GamesPanel deckId="deck_1" deck={{ name: "Fixture deck", artUri: null }} games={games} summary={summarizeGames(games)} />);
}

// The mock deck from the handoff: 2–1 across three games, card_flow 3 of 3
// against, board and engine 2 of 3 for, mana one up one down, interaction 1 of 3.
const MOCK: DeckGame[] = [
  game({ result: "win", worked: ["board", "engine"], hurt: ["card_flow", "mana"] }),
  game({ result: "win", worked: ["board", "engine", "mana"], hurt: ["card_flow"] }),
  game({ result: "loss", hurt: ["card_flow", "interaction"] }),
];

describe("GamesPanel — how it's playing", () => {
  const tileKeys = (container: HTMLElement) => [...container.querySelectorAll("[data-tile]")].map((t) => t.getAttribute("data-tile"));

  it("draws one tile per mark, Hurting then Both ways then Helping", () => {
    const { container } = mount(MOCK);
    // card_flow 3 of 3 against; mana one up one down; board and engine for.
    expect(tileKeys(container)).toEqual(["card_flow", "interaction", "mana", "board", "engine"]);
    expect([...container.querySelectorAll("[data-tile]")].map((t) => t.getAttribute("data-status"))).toEqual(["hurting", "hurting", "both", "helping", "helping"]);
  });

  it("prints every count with its denominator", () => {
    mount(MOCK);
    expect(screen.getByText(gameLogCopy.tiles.down("3", "3"))).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.tiles.up("2", "3"))).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.cell.sub("1", "1"))).toBeInTheDocument();
  });

  it("draws the last ten games as dots, oldest first, hollow when not marked", () => {
    const { container } = mount([game({ hurt: ["mana"] }), game(), game({ worked: ["mana"] })]);
    const marks = [...container.querySelectorAll('[data-tile="mana"] [data-mark]')].map((d) => d.getAttribute("data-mark"));
    // Newest first in, oldest first out.
    expect(marks).toEqual(["worked", "none", "hurt"]);
  });

  it("never prints a percentage or a signed figure", () => {
    const { container } = mount(MOCK);
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/[−-]\d/);
  });

  it("inks the status once the log is long enough to mean something", () => {
    const { container } = mount(MOCK);
    expect(container.querySelector('[data-tile="card_flow"]')!.innerHTML).toMatch(PATTERN_INK);
    expect(container.querySelector('[data-tile="board"]')!.innerHTML).toMatch(PATTERN_INK);
  });

  it("shows the key", () => {
    mount(MOCK);
    expect(screen.getByText(gameLogCopy.tiles.keyNote)).toBeInTheDocument();
  });

  it("holds tiles past the fourth behind Show more on the phone, and opens them in place", () => {
    const all = game({ hurt: ["speed", "card_flow", "mana", "interaction", "board", "resilience"] });
    const { container } = mount([all, all, all]);
    const hidden = () => container.querySelectorAll("[data-tile].hidden").length;
    expect(hidden()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.tiles.showMore("2") }));
    expect(hidden()).toBe(0);
    expect(screen.getByRole("button", { name: gameLogCopy.tiles.showFewer })).toHaveAttribute("aria-expanded", "true");
  });

  it("states the strongest reading in the lead, with its last five once there are more than five games", () => {
    mount(Array.from({ length: 6 }, () => game({ hurt: ["card_flow"] })));
    expect(screen.getByText(gameLogCopy.tiles.leadHurtRecent("6", "6", "5", "5"))).toBeInTheDocument();
  });
});

describe("GamesPanel — the live region", () => {
  // The summary is the pre-mutation one until the route revalidates, so a
  // second game logged before that would otherwise be announced with the first
  // game's record — the same sentence twice, for two different games.
  async function logAWin() {
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.save }));
  }

  it("counts each game logged before the route catches up", async () => {
    mount(MOCK); // 2–1 on the server.
    await logAWin();
    await waitFor(() =>
      expect(screen.getByText(gameLogCopy.announce.saved("3–1"))).toBeInTheDocument(),
    );
    await logAWin();
    await waitFor(() =>
      expect(screen.getByText(gameLogCopy.announce.saved("4–1"))).toBeInTheDocument(),
    );
  });
});

describe("GamesPanel — low N", () => {
  // Colour is the claim that a pattern exists. One game is not a pattern. Scoped to the tiles: the history row
  // below inks a win green whatever N is, and that is a fact about one game rather than a claim about the deck.
  it("uses no success or warning ink at one game", () => {
    const { container } = mount([game({ worked: ["board"], hurt: ["mana"] })]);
    expect(container.querySelector("[data-games-tiles]")!.innerHTML).not.toMatch(PATTERN_INK);
  });

  it("uses no success or warning ink at two games, and states no lead count", () => {
    const { container } = mount([game({ hurt: ["mana"] }), game({ hurt: ["mana"], worked: ["board"] })]);
    expect(container.querySelector("[data-games-tiles]")!.innerHTML).not.toMatch(PATTERN_INK);
    expect(screen.queryByText(/Marked against you in/)).toBeNull();
  });

  // "1 up" is the N=1 voice. Everywhere else a single mark still carries its denominator.
  it("keeps the denominator on a single mark once there are two games", () => {
    mount([game({ hurt: ["mana"] }), game({ hurt: ["mana"], worked: ["board"] })]);
    expect(screen.getByText(gameLogCopy.tiles.up("1", "2"))).toBeInTheDocument();
    expect(screen.queryByText(gameLogCopy.cell.figureOneUp)).toBeNull();
  });

  it("reads one game's marks as 1 up and 1 down", () => {
    mount([game({ worked: ["engine"], hurt: ["mana"] })]);
    expect(screen.getByText(gameLogCopy.cell.figureOneUp)).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.cell.figureOneDown)).toBeInTheDocument();
  });
});

describe("GamesPanel — empty", () => {
  it("replaces the whole panel, headline and history included", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.heading)).toBeInTheDocument();
    expect(screen.queryByText(gameLogCopy.history.heading)).toBeNull();
    expect(screen.queryByText(gameLogCopy.tiles.title)).toBeNull();
  });

  it("still offers the form", () => {
    mount([]);
    expect(screen.getByRole("button", { name: gameLogCopy.empty.cta })).toBeInTheDocument();
  });

  // §8.4: the pitch is the third game. Selling "log a game" sells the chore.
  it("pitches the pattern rather than the first game", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.cost)).toBeInTheDocument();
  });

  // The scope note was removed: it restated the tab's own promise under a
  // headline that had already made it. A NEGATIVE assertion, because every
  // other test on this surface asks what is present — reintroducing the note
  // would leave all of them green. The sentence is written out rather than
  // read from a copy key, since the point is that no key holds it any more.
  //
  // It matches on the note's SECOND sentence. The first shared "letting the
  // deck down" with the pitch quote that replaced it, which now reads "letting
  // THIS deck down" — one word apart, and a guard that passes on one word is a
  // guard that fails the next time the pitch is reworded. This half belonged to
  // the scope note alone.
  it("draws no scope note", () => {
    mount([]);
    expect(screen.queryByText(/What to do about it stays your call/i)).toBeNull();
    expect(Object.keys(gameLogCopy.empty)).not.toContain("scope");
  });
});

// The pointer to Suggested changes (addendum r1, C1/C2), over a reading and a game to read.
describe("the Suggested changes pointer", () => {
  const draw = (games: DeckGame[], tuned: boolean, onOpenTuning = vi.fn()) => {
    render(
      <GamesPanel deckId="deck_1" deck={{ name: "Fixture deck", artUri: null }} games={games} summary={summarizeGames(games)} tuned={tuned} onOpenTuning={onOpenTuning} />,
    );
    return onOpenTuning;
  };

  it("points at the Tuning tab, and pressing it opens the tab", () => {
    const open = draw([game()], true);
    expect(screen.getByText(deckTuningCopy.gamesLine.lead, { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: deckTuningCopy.gamesLine.link }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("draws nothing without a reading", () => {
    draw([game()], false);
    expect(screen.queryByText(deckTuningCopy.gamesLine.lead, { exact: false })).toBeNull();
  });

  // Held by the empty state's early return rather than by the pointer's own condition. Kept so a
  // change that lets the empty state fall through to the history cannot also draw the pointer.
  it("draws nothing with no game to read", () => {
    draw([], true);
    expect(screen.queryByText(deckTuningCopy.gamesLine.lead, { exact: false })).toBeNull();
  });
});
