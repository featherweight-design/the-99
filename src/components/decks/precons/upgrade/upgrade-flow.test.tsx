import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey } from "../../../../lib/precons/upgrade/targets";
import { UpgradeFlow } from "./upgrade-flow";

const strat = (key: string, label: string) => ({ key, label, blurb: `${label} blurb`, source: "edhrec" as const, backingIds: ["c1"], backing: [{ oracleId: "c1", name: "Card One" }] });
const lead = (key: string, name: string, strategies: ReturnType<typeof strat>[]): OfferedCommander => ({
  key, isFace: key === "rootha", cards: [{ oracleId: key, name, manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }], line: `${name} line`, strategies,
});
const panel = (over: Partial<UpgradePanel> = {}): UpgradePanel => ({
  boxBracket: 2,
  commanders: [lead("rootha", "Rootha", [strat("spellslinger", "Spells")]), lead("muddle", "Muddle", [strat("tokens", "Tokens")])],
  runs: [], listFp: "x", cards: {},
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  ...over,
});
const run: PanelRun = {
  id: "r", status: "done", strategyKey: runKey("rootha", 3, "spellslinger"), strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"), pairs: [],
  buyTotalCents: 0, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 0, cents: 0 }, owned: 0, themes: {}, started: false,
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
    expect(screen.queryByRole("list", { name: "Upgrade steps" })).toBeNull();
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

  it("says a run needs 2 when one free credit is left, instead of the spent line", () => {
    open(panel({ allowance: { used: 4, limit: 5, reopensAt: null, nextAt: null } }), { onConfirm: vi.fn() });
    press("Next · Commander");
    fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
    press("Next · Bracket");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    press("Next · Strategy");
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    expect(screen.getByText("An upgrade uses 2 credits, and a free credit covers 1.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade toward Spells" })).toBeDisabled();
  });

  describe("after the press", () => {
    const strategyPicks = { commander: "rootha", bracket: 3 as const, strategy: "spellslinger" };
    const twelve = [0, 1].map((n) => ({ cutId: `c${n}`, cut: `Cut ${n}`, addId: `a${n}`, add: `Add ${n}`, addCents: 100, reason: "r", position: n }));
    const done = { ...run, pairs: twelve, themes: {} };

    it("draws the wait, with the press off and the credits held", () => {
      open(panel(), { view: { kind: "wait", picks: strategyPicks, startedAt: Date.now() }, onConfirm: vi.fn() });
      expect(screen.getByText("Finding swaps toward Spells")).toBeInTheDocument();
      expect(screen.getByText("Running · 2 credits held")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Upgrade toward Spells" })).toBeDisabled();
    });

    it("a failed run keeps the picks and offers Try again", () => {
      const onRetry = vi.fn();
      open(panel(), { view: { kind: "failed", picks: strategyPicks }, onRetry });
      expect(screen.getByText("That upgrade didn’t come through. Both credits are back.")).toBeInTheDocument();
      press("Try again");
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("a result carries the Start press off until it is wired, and Try another strategy returns to the strategy with the commander and bracket kept", () => {
      open(panel({ runs: [done] }), { view: { kind: "results", runId: "r" }, onConfirm: vi.fn() });
      expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start the deck with these 2 swaps" })).toBeDisabled();
      press(/Try another strategy/);
      expect(screen.getByText("Worked out for Rootha at bracket 3, from the deck’s own cards.")).toBeInTheDocument();
      expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    });

    it("starts a deck from a result once Start is wired", () => {
      const onStart = vi.fn();
      open(panel({ runs: [done] }), { view: { kind: "results", runId: "r" }, onStart });
      press("Start the deck with these 2 swaps");
      expect(onStart).toHaveBeenCalledWith("r");
    });

    it("opens the kept run of the same picks from the ask, free", () => {
      open(panel({ runs: [done] }), { onConfirm: vi.fn() });
      press("Next · Commander");
      fireEvent.click(screen.getByRole("radio", { name: /Rootha/ }));
      press("Next · Bracket");
      fireEvent.click(screen.getAllByRole("radio")[1]);
      press("Next · Strategy");
      fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
      press(/Open Nov 10/);
      expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
    });
  });

  describe("History", () => {
    const old = { ...run, id: "old", strategyKey: runKey("muddle", 2, "tokens"), strategyLabel: "Tokens", bracketTarget: 2, createdAt: new Date("2026-11-09T12:00:00Z"), pairs: [], themes: {} };

    it("draws the link only once a kept run exists", () => {
      const first = open();
      expect(screen.queryByRole("button", { name: "History" })).toBeNull();
      first.unmount();
      open(panel({ runs: [run] }));
      expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    });

    it("lists every kept run newest first by month, opens one read-only with a way back, and starts a new upgrade", () => {
      open(panel({ runs: [old, run] }));
      press("History");
      expect(screen.getByText("your past upgrades of this precon · newest first")).toBeInTheDocument();
      const rows = screen.getAllByRole("button", { name: /led by/ });
      expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Spells · led by Rootha · bracket 3"), expect.stringContaining("Tokens · led by")]);
      fireEvent.click(rows[0]);
      expect(screen.getByText("A past upgrade, read-only. Opening it again uses no credit.")).toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Upgrade steps" })).toBeNull();
      press("‹ History");
      expect(screen.getByText("your past upgrades of this precon · newest first")).toBeInTheDocument();
      press("New upgrade");
      expect(screen.getByText(/We swap 12 to 18 cards/)).toBeInTheDocument();
    });

    it("New upgrade starts with nothing picked, whatever was picked before", () => {
      open(panel({ runs: [run] }), { view: { kind: "results", runId: "r" } });
      press("History");
      press("New upgrade");
      press("Next · Commander");
      expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    });

    it("names the lead by its short name and leaves out a bracket it does not know", () => {
      open(panel({ runs: [{ ...run, bracketTarget: null, bracketAfter: null, strategyKey: runKey("rootha", 3, "spellslinger") }] }));
      press("History");
      expect(screen.getByText("Spells · led by Rootha")).toBeInTheDocument();
    });

    it("lists a short run with its credits back", () => {
      open(panel({ runs: [{ ...run, refunded: true, pairs: twelveCards(9) }] }));
      press("History");
      expect(screen.getByText("9 swaps · credits back")).toBeInTheDocument();
    });
  });
});

const twelveCards = (n: number) => Array.from({ length: n }, (_, i) => ({ cutId: `c${i}`, cut: `Cut ${i}`, addId: `a${i}`, add: `Add ${i}`, addCents: 100, reason: "r", position: i }));
