import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckStatsView } from "./deck-stats-view";
import { jobTally, type JobRowsByCard } from "../../lib/decks/job-tally";
import { manaCurve, typeCurve } from "../../lib/decks/stats";

const list = [{ cmc: 2, quantity: 1, typeLine: "Creature — Elf" }];
const byCard: JobRowsByCard = {
  rock: ["ramp"],
  both: ["ramp", "draw"],
  wrath: ["wipes"],
  lord: [],
};
const cards = [
  { oracleId: "rock", name: "Sol Ring", copies: 1 },
  { oracleId: "both", name: "Wayfarer's Bauble", copies: 1 },
  { oracleId: "wrath", name: "Toxic Deluge", copies: 1 },
  { oracleId: "lord", name: "Elvish Archdruid", copies: 1 },
  { oracleId: "new", name: "Fresh Card", copies: 2, role: "other" },
];
const slice = { curve: manaCurve(list), types: typeCurve(list), jobs: jobTally(cards, byCard) };
const jobs = () => screen.getByRole("figure", { name: /^Jobs/ });

describe("DeckStatsView jobs card", () => {
  it("states its denominator in the figure label", () => {
    render(<DeckStatsView data={slice} />);
    expect(screen.getByRole("figure", { name: "Jobs, 6 nonland cards" })).toBeInTheDocument();
  });

  it("draws one square per copy in a row, hidden from assistive tech", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    const squares = container.querySelector('[data-job-squares="ramp"]')!;
    expect(squares).toHaveAttribute("aria-hidden", "true");
    expect(squares.children).toHaveLength(2);
  });

  it("draws each job in its own hue token, Win conditions included", () => {
    const { container } = render(<DeckStatsView data={{ ...slice, jobs: jobTally([{ oracleId: "x", name: "X", copies: 1 }], { x: ["ramp", "finisher"] }) }} />);
    const bg = (k: string) => (container.querySelector(`[data-job-squares="${k}"]`)!.firstElementChild as HTMLElement).style.background;
    expect(bg("ramp")).toBe("var(--job-ramp)");
    expect(bg("finisher")).toBe("var(--job-finisher)");
  });

  it("opens one row at a time and names its cards", () => {
    render(<DeckStatsView data={slice} />);
    fireEvent.click(within(jobs()).getByRole("button", { name: /^Ramp/ }));
    expect(within(jobs()).getByRole("button", { name: /^Ramp/ })).toHaveAttribute("aria-expanded", "true");
    expect(within(jobs()).getByText("Sol Ring, Wayfarer's Bauble")).toBeInTheDocument();
    fireEvent.click(within(jobs()).getByRole("button", { name: /^Board wipes/ }));
    expect(within(jobs()).queryByText("Sol Ring, Wayfarer's Bauble")).toBeNull();
    expect(within(jobs()).getByText("Toxic Deluge")).toBeInTheDocument();
  });

  it("gives an empty row no button", () => {
    render(<DeckStatsView data={slice} />);
    expect(within(jobs()).queryByRole("button", { name: /^Removal/ })).toBeNull();
    expect(within(jobs()).getByText("Removal")).toBeInTheDocument();
  });

  it("states overlap and none, and says nothing of labels", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    expect(screen.getByText(/^1 card does two or more of these jobs/)).toBeInTheDocument();
    expect(screen.getByText("1 nonland card does none of these jobs.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/label/i);
    expect(container.querySelector("[data-job-unlabeled]")).toBeNull();
  });

  it("reads a card with no label from its text, in the row its role names", () => {
    const t = jobTally([{ oracleId: "new", name: "Fresh Card", copies: 2, role: "removal" }], byCard);
    render(<DeckStatsView data={{ ...slice, jobs: t }} />);
    expect(within(jobs()).getByRole("button", { name: /^Removal/ })).toBeInTheDocument();
  });

  it("keeps the shell when the label read gave nothing", () => {
    const { container } = render(<DeckStatsView data={{ ...slice, jobs: null }} />);
    expect(container.querySelector("[data-job-row]")).toBeNull();
    expect(screen.getByRole("figure", { name: "Jobs" })).toBeInTheDocument();
  });

  it("draws no footnote for a state that does not exist", () => {
    const clean = jobTally([{ oracleId: "rock", name: "Sol Ring", copies: 1 }], byCard);
    const { container } = render(<DeckStatsView data={{ ...slice, jobs: clean }} />);
    expect(container.querySelector("[data-job-unlabeled]")).toBeNull();
    expect(screen.queryByText(/two or more/)).toBeNull();
    expect(screen.queryByText(/none of these jobs/)).toBeNull();
  });
});
