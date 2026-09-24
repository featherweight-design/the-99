import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { TuningItem, TuningState } from "../../lib/tuning/state";
import { manifestRows, readSteps, TuningPanel, type TuningDeps, type TuningFacts } from "./tuning-panel";

vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), cancelTuningRun: vi.fn(), dismissSuggestion: vi.fn(), readTuningEvidence: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(), undoSuggestion: vi.fn(),
}));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }) }));

const copy = deckTuningCopy.panel;
const at = new Date("2026-09-23T12:00:00Z");

const fresh: TuningState = {
  run: null,
  items: [],
  lastOkFingerprint: null,
  lastOkAt: null,
  stale: true,
  modelVersionMoved: false,
  retired: null,
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  gameCount: 0,
  newestPriceAsOf: null,
};

const item: TuningItem = {
  id: "i1", addOracleId: "a", addName: "Rhystic Study", addTypeLine: "Enchantment", cutOracleId: "c",
  cutName: "Divination", rationale: "Why.", rationaleShort: "Why.", evidence: [{ kind: "decklist", value: "4 of 99 draw" }],
  position: 0, verdict: "pending", addImageUri: null, cutImageUri: null, owned: true, ownedQuantity: 1,
  availability: null, price: null, bracketAfter: null, applies: true, cutInDeck: true,
};

const okRun = { id: "r1", status: "ok" as const, errorClass: null, createdAt: at, droppedCount: 0 };
const results: TuningState = {
  ...fresh, run: okRun, items: [item], lastOkFingerprint: "fp", lastOkAt: at, stale: false, gameCount: 5,
};

const facts: TuningFacts = { gameCount: 0, noteCount: 0, fix: null, marked: 0, cards: 99, intent: "go wide" };

function deps(states: TuningState[], over: Partial<TuningDeps> = {}): TuningDeps {
  const queue = [...states];
  const ok = async () => ({ ok: true as const });
  return {
    read: vi.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0])),
    run: vi.fn(ok),
    cancel: vi.fn(ok),
    evidence: vi.fn(async () => 3),
    saveIntent: vi.fn(ok),
    card: { apply: ok, undo: ok, reject: ok, restore: ok },
    ...over,
  };
}

async function draw(d: TuningDeps, f: TuningFacts = facts) {
  await act(async () => {
    render(<TuningPanel deckId="d1" permits={[3]} facts={f} onLogGame={vi.fn()} deps={d} />);
  });
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("TuningPanel", () => {
  it("opens at zero games rather than gating, and says the list alone will be read", async () => {
    await draw(deps([fresh]));
    expect(screen.getByText(copy.noGamesLead)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.suggest })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText(deckTuningCopy.manifest.noneLogged)).toBeInTheDocument();
  });

  it("names the strongest marked axis when games have marked one", async () => {
    await draw(deps([{ ...fresh, gameCount: 9 }]), { ...facts, gameCount: 9, marked: 8, fix: { key: "card_flow", hurt: 7 } });
    expect(screen.getByText(copy.readyLead("Nine", "cards in hand", 7, 9))).toBeInTheDocument();
  });

  it("says the games are unmarked when none carries a mark", async () => {
    await draw(deps([{ ...fresh, gameCount: 4 }]), { ...facts, gameCount: 4 });
    expect(screen.getByText(copy.unmarkedLead("Four"))).toBeInTheDocument();
  });

  it("runs, ticks the manifest on the reads that land, and shows the results", async () => {
    const d = deps([fresh, results]);
    await draw(d);
    await press(copy.suggest);
    expect(d.run).toHaveBeenCalledWith("d1", {});
    expect(d.evidence).toHaveBeenCalledTimes(readSteps(facts, "go wide").length);
    expect(screen.getByRole("heading", { name: copy.heading })).toBeInTheDocument();
    expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.ready(1));
  });

  it("draws the unchanged state on a press over an unchanged deck, and Suggest again anyway runs", async () => {
    const d = deps([results]);
    await draw(d);
    await press(copy.again);
    expect(screen.getByTestId("tuning-unchanged")).toBeInTheDocument();
    expect(d.run).not.toHaveBeenCalled();
    await press(copy.unchangedCta);
    expect(d.run).toHaveBeenCalledWith("d1", { anyway: true });
  });

  it("offers Stop only while a run is pending, and Stop cancels the pending run", async () => {
    const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
    const d = deps([pending, pending, fresh]);
    await draw(d);
    expect(screen.getByRole("button", { name: copy.stop })).toBeInTheDocument();
    await press(copy.stop);
    expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
    expect(screen.queryByRole("button", { name: copy.stop })).not.toBeInTheDocument();
  });

  it("renders an interrupted run with its own copy, and no suggestions", async () => {
    await draw(deps([{ ...fresh, run: { ...okRun, status: "failed", errorClass: "interrupted" } }]));
    expect(screen.getByText(deckTuningCopy.failure.interrupted.tag)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: deckTuningCopy.failure.retry })).toBeInTheDocument();
  });

  it("clears a set retired by a commit and reopens the press", async () => {
    await draw(deps([{ ...results, retired: { from: 3, to: 4 } }]));
    expect(screen.getByText(copy.retiredLead(3, 4))).toBeInTheDocument();
    expect(screen.queryByText("Rhystic Study")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.suggest })).toBeInTheDocument();
  });

  it("disables the primary when every credit is out and says when the next comes back", async () => {
    const next = new Date("2026-09-24T14:20:00Z");
    await draw(deps([{ ...results, stale: true, allowance: { used: 5, limit: 5, reopensAt: next, nextAt: next } }]));
    expect(screen.getByRole("button", { name: copy.again })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(creditsCopy.spent(5, next))).toBeInTheDocument();
    expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
  });

  it("names the next credit while credits remain", async () => {
    const next = new Date("2026-09-24T09:05:00Z");
    await draw(deps([{ ...fresh, allowance: { used: 2, limit: 5, reopensAt: null, nextAt: next } }]));
    expect(screen.getByText(creditsCopy.first(3, 5, next))).toBeInTheDocument();
  });

  it("shows the refusal and keeps the panel when the server refuses the run", async () => {
    const d = deps([fresh, fresh], { run: vi.fn(async () => ({ ok: false as const, message: "no" })) });
    await draw(d);
    await press(copy.suggest);
    expect(screen.getByRole("alert")).toHaveTextContent("no");
    expect(screen.getByText(copy.noGamesLead)).toBeInTheDocument();
  });
});

describe("manifestRows", () => {
  it("shows the page's own figures unticked before a run", () => {
    const f = { ...facts, gameCount: 9, noteCount: 2, marked: 8, fix: { key: "speed", hurt: 5 } };
    const rows = manifestRows(f, null, null, readSteps(f, null));
    expect(rows.every((r) => r.kind === "read" && !r.done)).toBe(true);
    expect(rows[0]).toMatchObject({ key: "games", count: "9 games" });
    expect(rows[1]).toMatchObject({ key: "notes", count: "on 2 of 9 games" });
  });

  it("says the games carry no marks when none does", () => {
    const f = { ...facts, gameCount: 4 };
    expect(manifestRows(f, null, null, readSteps(f, null))[0]).toMatchObject({ count: "4 games · no marks" });
  });

  it("ticks a row only when its read has landed", () => {
    const f = { ...facts, gameCount: 9 };
    const rows = manifestRows(f, null, { games: 9 }, readSteps(f, null));
    expect(rows.find((r) => r.key === "games")).toMatchObject({ done: true });
    expect(rows.find((r) => r.key === "decklist")).toMatchObject({ done: false, count: null });
  });

  it("draws the dashed games row, unread, when there are no games", () => {
    const rows = manifestRows(facts, null, null, readSteps(facts, null));
    expect(rows[0]).toEqual({ kind: "noGames", key: "games" });
    expect(rows.some((r) => r.key === "notes")).toBe(false);
  });
});
