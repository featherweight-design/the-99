import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { UpgradeFlow } from "./upgrade-flow";

const strat = (key: string, label: string) => ({ key, label, blurb: `${label} blurb`, source: "edhrec" as const, backingIds: ["c1"], backing: [{ oracleId: "c1", name: "Card One" }] });
const lead = (key: string, name: string, strategies: ReturnType<typeof strat>[]): OfferedCommander => ({
  key, isFace: key === "rootha", cards: [{ oracleId: key, name, manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }], line: `${name} line`, strategies,
});
const panel = (over: Partial<UpgradePanel> = {}): UpgradePanel => ({
  boxBracket: 2,
  commanders: [lead("rootha", "Rootha", [strat("spellslinger", "Spells")]), lead("muddle", "Muddle", [strat("tokens", "Tokens")])],
  runs: [],
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  ...over,
});
const run: PanelRun = {
  id: "r", status: "done", strategyKey: "rootha/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"), pairs: [],
  buyTotalCents: 0, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 0, cents: 0 }, owned: 0,
};
const open = (p = panel(), extra: Partial<Parameters<typeof UpgradeFlow>[0]> = {}) =>
  render(<UpgradeFlow precon="Prismari Artistry" panel={p} art={new Map()} onClose={() => {}} {...extra} />);
const press = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

describe("UpgradeFlow", () => {
  it("opens on what to expect with no pick and no tracker", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari Artistry" })).toBeInTheDocument();
    expect(screen.getByText(/We swap 12 to 18 cards/)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("list", { name: /Upgrade/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Next · Commander" })).toBeEnabled();
  });

  it("preselects nothing: Next stays off until a commander is chosen", () => {
    open();
    press("Next · Commander");
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.getByRole("button", { name: "Next · Bracket" })).toBeDisabled();
    expect(screen.getByText("Choose who leads.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Muddle/ }));
    expect(screen.getByRole("button", { name: "Next · Bracket" })).toBeEnabled();
  });

  it("offers the box's bracket and those above it, the box's own marked, and preselects none", () => {
    open(panel({ boxBracket: 3 }));
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    const rungs = screen.getAllByRole("radio");
    expect(rungs.map((r) => r.getAttribute("data-bracket"))).toEqual(["3", "4"]);
    expect(rungs.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(within(rungs[0]).getByText("where the box plays")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next · Strategy" })).toBeDisabled();
  });

  it("skips a one-option Commander step and a Bracket step for a box at 4", () => {
    open(panel({ boxBracket: 4, commanders: [lead("rootha", "Rootha", [strat("spellslinger", "Spells")])] }));
    expect(screen.getByRole("button", { name: "Next · Strategy" })).toBeInTheDocument();
    press("Next · Strategy");
    expect(screen.getByText("Worked out for Rootha at bracket 4, from the deck’s own cards.")).toBeInTheDocument();
  });

  it("walks to the confirm, which is off while the run is not wired, and a new commander clears the strategy", () => {
    open();
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    press("Next · Strategy");
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    expect(screen.getByText(/12 to 18 swaps · bracket 3 · uses 2 credits/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade toward Spells" })).toBeDisabled();
    // Back to Commander through the tracker, and a different one drops the strategy.
    fireEvent.click(screen.getByRole("button", { name: /Commander/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Muddle/ }));
    press("Next · Bracket");
    press("Next · Strategy");
    expect(screen.getByText("Choose a strategy.")).toBeInTheDocument();
  });

  it("presses the confirm with the three picks once the run is wired", () => {
    const onConfirm = vi.fn();
    open(panel(), { onConfirm });
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    press("Next · Strategy");
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    press("Upgrade toward Spells");
    expect(onConfirm).toHaveBeenCalledWith({ commander: "rootha", bracket: 3, strategy: "spellslinger" });
  });

  it("turns the foot into the ask when these picks match a kept run", () => {
    open(panel({ runs: [run] }), { onConfirm: vi.fn() });
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    press("Next · Strategy");
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    expect(screen.getByText(/You ran Spells with Rootha at bracket 3 on Nov 10/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run it again" })).toBeInTheDocument();
  });

  it("disables the press and says why when no credits are left", () => {
    open(panel({ allowance: { used: 5, limit: 5, reopensAt: null, nextAt: null } }), { onConfirm: vi.fn() });
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    press("Next · Strategy");
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    expect(screen.getByRole("button", { name: "Upgrade toward Spells" })).toBeDisabled();
  });
});
