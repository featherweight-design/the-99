import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { manaCurve, typeCurve } from "../../lib/decks/stats";
import { resultsStats } from "../../lib/decks/stats-results";
import { DeckStatsView } from "./deck-stats-view";

const g = (result: "win" | "loss" | "draw", day: number, versionNumber: number | null = null) => ({
  result,
  playedAt: new Date(new Date().getFullYear(), 7, day, 12),
  versionNumber,
});
const v = (number: number, day: number) => ({ number, committedAt: new Date(Date.UTC(new Date().getFullYear(), 7, day)) });
const six = [g("win", 28), g("draw", 14, 2), g("win", 6, 2), g("loss", 3, 1), g("win", 2, 1), g("win", 1, 2)];

const draw = (games: ReturnType<typeof g>[], versions: ReturnType<typeof v>[], onLogGame?: () => void) =>
  render(
    <DeckStatsView
      data={{ curve: manaCurve([]), types: typeCurve([]), results: resultsStats(games, versions) }}
      onLogGame={onLogGame}
    />,
  );
const card = () => screen.getByRole("figure", { name: /^Results/ });

describe("DeckStatsView results card", () => {
  it("names its denominator and states the record", () => {
    draw(six, [v(3, 30), v(2, 1), v(1, 10)]);
    expect(screen.getByRole("figure", { name: "Results, 6 games" })).toBeInTheDocument();
    expect(card().querySelector("[data-results-record]")).toHaveTextContent("4–1–1");
    expect(card()).toHaveTextContent("6 games, 1 Aug to 28 Aug");
  });

  it("draws every game oldest first, underlines the last five and states them", () => {
    draw(six, [v(1, 10)]);
    const beads = [...card().querySelectorAll("[data-results-beads] li")];
    expect(beads.map((b) => b.querySelector("[data-result-bead]")!.textContent)).toEqual(["W", "W", "L", "W", "D", "W"]);
    expect(beads.map((b) => b.hasAttribute("data-result-last-five"))).toEqual([false, true, true, true, true, true]);
    expect(card().querySelector("[data-results-trend]")).toHaveTextContent("Underlined, the last five: 3–1–1.");
  });

  it("gives each bead a spoken result and date, and keeps the letter out of the reading order", () => {
    draw(six, []);
    const first = card().querySelector("[data-results-beads] li")!;
    expect(first.querySelector(".sr-only")).toHaveTextContent("win, 1 Aug");
    expect(first.querySelector("[data-result-bead]")).toHaveAttribute("aria-hidden", "true");
  });

  it("says the last-five line starts at the sixth game under six games", () => {
    draw(six.slice(1), [v(1, 10)]);
    expect(card().querySelector("[data-results-trend]")).toHaveTextContent("The last-five line starts at the sixth game.");
    expect(card().querySelector("[data-result-last-five]")).toBeNull();
  });

  it("states one game's span as a single date", () => {
    draw([g("win", 28, 1)], [v(1, 10)]);
    expect(screen.getByRole("figure", { name: "Results, 1 game" })).toHaveTextContent("1 game, 28 Aug");
  });

  it("lists versions current first, no games yet without a record, Version not recorded last", () => {
    draw(six, [v(3, 30), v(2, 1), v(1, 10)]);
    const rows = [...card().querySelectorAll("[data-result-version]")];
    expect(rows.map((r) => r.getAttribute("data-result-version"))).toEqual(["3", "2", "1", "unrecorded"]);
    expect(rows[0]).toHaveTextContent("v3");
    expect(rows[0]).toHaveTextContent("current · 30 Aug");
    expect(rows[0]).toHaveTextContent("no games yet");
    expect(rows[0]).not.toHaveTextContent("0–0–0");
    expect(rows[1]).toHaveTextContent("2–0–1");
    expect(rows[3]).toHaveTextContent("Version not recorded");
    expect(rows[3]).toHaveTextContent("1–0–0");
  });

  it("names the version in each row's spoken results", () => {
    draw(six, [v(3, 30), v(2, 1), v(1, 10)]);
    const row = card().querySelector("[data-result-version='2']")!;
    expect(row.querySelector(".sr-only")).toHaveTextContent("v2: win, win, draw");
  });

  it("draws no by-version section for a brew, and keeps the record and beads", () => {
    draw(six, []);
    expect(card().querySelector("[data-results-versions]")).toBeNull();
    expect(card().querySelectorAll("[data-results-beads] li")).toHaveLength(6);
  });

  it("collapses to one stated absence with a link to Games when nothing is logged", () => {
    const onLogGame = vi.fn();
    draw([], [v(1, 10)], onLogGame);
    expect(screen.getByRole("figure", { name: "Results, no games" })).toBeInTheDocument();
    expect(card()).toHaveTextContent("No games logged yet.");
    expect(card()).not.toHaveTextContent("0–0–0");
    expect(card().querySelector("[data-results-record]")).toBeNull();
    expect(card().querySelector("[data-results-versions]")).toBeNull();
    fireEvent.click(within(card()).getByRole("button", { name: /Log a game in Games/ }));
    expect(onLogGame).toHaveBeenCalledTimes(1);
  });
});
