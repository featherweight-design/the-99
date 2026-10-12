import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { LineupData, LineupDeck } from "../../../lib/lineup/types";
import { IdentityMark } from "./identity-mark";
import { LineupView } from "./lineup-view";

const NOW = "2026-10-11T12:00:00.000Z";
const game = (day: string, result: "win" | "loss" = "loss", podSize = 4) => ({ result, playedAt: `${day}T20:00:00.000Z`, podSize });
const deck = (name: string, over: Partial<LineupDeck> = {}): LineupDeck => ({ id: name.toLowerCase(), name, identity: [], brew: false, bracket: null, games: [], ...over });
const DATA: LineupData = {
  decks: [
    deck("Tovolar", { identity: ["R", "G"], bracket: { permits: [1, 2], answered: 2 }, games: [game("2026-09-12"), game("2026-07-17", "loss", 3)] }),
    deck("Scrappy", { identity: ["W", "R", "G"], games: [game("2026-10-05", "win")] }),
    deck("Gishath", { identity: ["W", "R", "G"], brew: true, bracket: { permits: [4], answered: null } }),
    deck("Eldrazi", { bracket: { permits: [3], answered: null } }),
  ],
};

const draw = (data = DATA, foldServer: string | null = null) =>
  render(<LineupView data={data} now={NOW} foldServer={foldServer} viewSwitch={<span>switch</span>} />);
const card = (id: string) => document.querySelector(`[data-stats-card="${id}"]`) as HTMLElement;
const head = (id: string) => within(card(id)).getAllByRole("button")[0];

beforeEach(() => {
  localStorage.clear();
  document.cookie = "decks_stats_open=; Max-Age=0; Path=/";
});

describe("LineupView: folding", () => {
  it("opens only the first card on a first visit, and a folded card shows its summary line", () => {
    draw();
    expect(head("recency").getAttribute("aria-expanded")).toBe("true");
    expect(head("spread").getAttribute("aria-expanded")).toBe("false");
    expect(within(card("spread")).getByText("bracket 1–2 holds 1 · 1 not analyzed")).toBeTruthy();
    expect(card("recency").querySelector("[data-stats-summary]")).toBeNull();
    // The head is named by its title, and by the summary while folded; never by the denominator.
    expect(screen.getByRole("button", { name: "When each deck last played" })).toBe(head("recency"));
    expect(head("recency").getAttribute("aria-describedby")).toBe("stats-recency-denom");
    expect(document.getElementById("stats-recency-denom")?.textContent).toBe("2 of 4 played");
    expect(screen.getByRole("button", { name: "Brackets and colors bracket 1–2 holds 1 · 1 not analyzed" })).toBe(head("spread"));
  });

  it("toggles a card from its head, and remembers what is open on this device", () => {
    draw();
    fireEvent.click(head("spread"));
    expect(head("spread").getAttribute("aria-expanded")).toBe("true");
    expect(localStorage.getItem("the99:decks:stats:open")).toBe("recency,spread");
    expect(document.cookie).toContain("decks_stats_open=recency%2Cspread");
  });

  it("draws the cards the server's cookie says are open, and Expand all / Collapse all moves every card", () => {
    draw(DATA, "spread");
    expect(head("recency").getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(["recency", "spread"].map((id) => head(id).getAttribute("aria-expanded"))).toEqual(["true", "true"]);
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(["recency", "spread"].map((id) => head(id).getAttribute("aria-expanded"))).toEqual(["false", "false"]);
    expect(localStorage.getItem("the99:decks:stats:open")).toBe("-");
  });
});

describe("LineupView: keyboard", () => {
  it("makes the filter one tab stop, and the arrows move the selection", () => {
    draw(DATA, "recency,spread");
    const [all, fin] = screen.getAllByRole("radio").slice(0, 2);
    expect([all.tabIndex, fin.tabIndex]).toEqual([0, -1]);
    fireEvent.keyDown(all, { key: "ArrowRight" });
    expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getAllByRole("radio")[1]);
  });
});

describe("LineupView: the filter", () => {
  it("leaves brews out of every chart under Finished only, and says so", () => {
    draw(DATA, "recency,spread");
    expect(screen.getAllByText("4 decks · 1 brew included").length).toBeGreaterThan(0);
    expect(within(card("spread")).getByText("Gishath")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("radio", { name: "Finished only" })[0]);
    expect(screen.getAllByText("3 finished decks · 1 brew left out").length).toBeGreaterThan(0);
    expect(within(card("spread")).queryByText("Gishath")).toBeNull();
  });
});

describe("LineupView: one deck", () => {
  it("says 1 deck under All decks, and counts what Finished only kept when the only deck is a brew", () => {
    draw({ decks: [deck("Gishath", { brew: true })] });
    expect(screen.getAllByText("1 deck").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("radio", { name: "Finished only" })[0]);
    expect(screen.getAllByText("0 finished decks · 1 brew left out").length).toBeGreaterThan(0);
  });
});

describe("LineupView: recency", () => {
  it("draws a lane per played deck, newest first, with raw results and pod sizes, and every never-played deck", () => {
    draw();
    const lanes = [...card("recency").querySelectorAll("[data-stats-lane]")].map((l) => l.getAttribute("data-stats-lane"));
    expect(lanes).toEqual(["scrappy", "tovolar"]);
    expect(within(card("recency")).getByText("won 1 of 3")).toBeTruthy();
    expect(within(card("recency")).getByText("won 0 of 2 · pods of 3–4")).toBeTruthy();
    // The hidden beads, said: every game, oldest first.
    expect(within(card("recency")).getByText("lost Jul 17, lost Sep 12")).toBeTruthy();
    const never = card("recency").querySelector("[data-stats-never]") as HTMLElement;
    expect(within(never).getAllByRole("link").map((a) => a.textContent)).toEqual(["Eldrazi", "Gishath"]);
    expect(within(never).getByRole("link", { name: "Eldrazi" }).getAttribute("href")).toBe("/decks/eldrazi");
  });

  it("steps a second game on the same date right, so both beads show", () => {
    draw({ ...DATA, decks: [deck("Two", { games: [game("2026-10-01", "win"), game("2026-10-01", "loss")] }), deck("x", { games: [game("2026-09-01")] })] });
    const beads = card("recency").querySelectorAll('[data-stats-lane="two"] [data-result-bead]');
    expect(beads.length).toBe(2);
    expect(card("recency").querySelectorAll('[data-stats-lane="two"] [data-bead-step]').length).toBe(1);
  });

  it("says no games are logged when none are, with every deck under Never played", () => {
    draw({ decks: DATA.decks.map((d) => ({ ...d, games: [] })) });
    expect(within(card("recency")).getByText("No games logged yet.")).toBeTruthy();
    expect(within(card("recency")).getByText("4 of 4")).toBeTruthy();
  });
});

describe("LineupView: brackets and colors", () => {
  it("files each deck on its own bracket row, a range on the boundary row, and the rest under not analyzed", () => {
    draw(DATA, "spread");
    const row = (label: string) => card("spread").querySelector(`[data-stats-slot="${label}"]`) as HTMLElement;
    expect(within(row("1–2")).getByText("Tovolar")).toBeTruthy();
    expect(within(row("1–2")).getByText("declared 2")).toBeTruthy();
    expect(within(row("1–2")).getByRole("img", { name: "bracket 1 to 2" })).toBeTruthy();
    expect(within(row("3")).getByText("colorless")).toBeTruthy();
    expect(within(row("not-analyzed")).getByText("Scrappy")).toBeTruthy();
    expect(within(row("5")).getByText("none")).toBeTruthy();
  });

  it("keeps one segment per deck in lineup order on every color row, lit for each deck that plays it", () => {
    draw(DATA, "spread");
    const lit = (c: string) => [...card("spread").querySelectorAll(`[data-stats-color="${c}"] [aria-hidden] > span`)].map((s) => (s.hasAttribute("data-lit") ? 1 : 0));
    expect(lit("R")).toEqual([1, 1, 1, 0]);
    expect(lit("W")).toEqual([0, 1, 1, 0]);
    expect(lit("C")).toEqual([0, 0, 0, 1]);
    expect(within(card("spread")).getByText("3 of 4", { selector: "[data-stats-color='R'] span" })).toBeTruthy();
    expect(within(card("spread")).getByRole("img", { name: "Red" }).getAttribute("src")).toBe("/mana/R.svg");
  });
});

describe("IdentityMark", () => {
  it("draws one pip per color in W U B R G order, and colorless as one hollow pip", () => {
    const { container, rerender } = render(<IdentityMark identity={["G", "W", "R"]} />);
    expect([...container.querySelectorAll("[data-pip]")].map((p) => p.getAttribute("data-pip"))).toEqual(["W", "R", "G"]);
    rerender(<IdentityMark identity={[]} />);
    expect([...container.querySelectorAll("[data-pip]")].map((p) => p.getAttribute("data-pip"))).toEqual(["C"]);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });
});
