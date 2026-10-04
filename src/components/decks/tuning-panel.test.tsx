import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { saveDeckLimits } from "../../app/decks/tuning-actions";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { TuningItem, TuningState } from "../../lib/tuning/state";
import { manifestRows, readSteps, TuningPanel, type TuningDeps, type TuningFacts } from "./tuning-panel";

vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), cancelTuningRun: vi.fn(), dismissSuggestion: vi.fn(), readTuningEvidence: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(),
  saveDeckLimits: vi.fn(async () => ({ ok: true })), undoSuggestion: vi.fn(),
}));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }), useCardIntent: () => ({}) }));

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
  availability: null, price: null, bracketAfter: null, applies: true, cutInDeck: true, addInDeck: false, cutLocked: false,
};

const okRun = { id: "r1", status: "ok" as const, errorClass: null, createdAt: at, droppedCount: 0 };
const results: TuningState = {
  ...fresh, run: okRun, items: [item], lastOkFingerprint: "fp", lastOkAt: at, stale: false, gameCount: 5,
};

const facts: TuningFacts = {
  gameCount: 0, noteCount: 0, fix: null, marked: 0, cards: 99, intent: "go wide",
  limits: { capCents: null, sets: [], ownedOnly: false },
};

function deps(states: TuningState[], over: Partial<TuningDeps> = {}): TuningDeps {
  const queue = [...states];
  const ok = async () => ({ ok: true as const });
  return {
    read: vi.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0])),
    run: vi.fn(ok),
    cancel: vi.fn(ok),
    evidence: vi.fn(async () => 3),
    card: { apply: ok, undo: ok, reject: ok, restore: ok },
    ...over,
  };
}

async function draw(d: TuningDeps, f: TuningFacts = facts, deeperLooks?: boolean) {
  await act(async () => {
    render(<TuningPanel deckId="d1" permits={[3]} facts={f} onLogGame={vi.fn()} deps={d} deeperLooks={deeperLooks} />);
  });
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("TuningPanel", () => {
  // The tab's opening holds its loader until this read settles, so Suggested changes and its
  // credit line never arrive after the rest of the tab: told once the read answers, and once it
  // fails, since a failure must not hold the loader either.
  it("says when its first read has settled, answered or failed", async () => {
    const answered = vi.fn();
    await act(async () => {
      render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} onSettled={answered} />);
    });
    expect(answered).toHaveBeenCalledTimes(1);
    const failed = vi.fn();
    await act(async () => {
      render(
        <TuningPanel deckId="d2" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh], { read: vi.fn(async () => { throw new Error("down"); }) })} onSettled={failed} />,
      );
    });
    expect(failed).toHaveBeenCalledTimes(1);
  });

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
    expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
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
    expect(d.run).toHaveBeenCalledWith("d1", { anyway: true, runId: expect.any(String) });
  });

  it("offers Stop only while a run is pending, and Stop cancels the pending run", async () => {
    const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
    const cancelled: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "cancelled" } };
    const d = deps([pending, cancelled]);
    await draw(d);
    expect(screen.getByRole("button", { name: copy.stop })).toBeInTheDocument();
    await press(copy.stop);
    expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
    expect(screen.queryByRole("button", { name: copy.stop })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.stopped);
  });

  it("tries the cancel again while the same run is still pending", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
      const cancelled: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "cancelled" } };
      const cancel = vi.fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue({ ok: true });
      const d = deps([pending, pending, cancelled], { cancel });
      await draw(d);
      await press(copy.stop);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(cancel).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.stopped);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never cancels a different run that became current after the watched one", async () => {
    const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
    const other: TuningState = { ...fresh, run: { ...okRun, id: "r3", status: "pending" } };
    const d = deps([pending, other]);
    await draw(d);
    await press(copy.stop);
    expect(d.cancel).toHaveBeenCalledTimes(1);
    expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
    expect(screen.getByRole("status")).not.toHaveTextContent(deckTuningCopy.announce.stopped);
  });

  it("claims no stop when the run settled before the cancel reached it", async () => {
    const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
    const d = deps([pending, { ...results, run: { ...okRun, id: "r2" } }]);
    await draw(d);
    await press(copy.stop);
    expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
    expect(screen.getByRole("status")).not.toHaveTextContent(deckTuningCopy.announce.stopped);
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

  it("disables the primary while the app is paused, and says until when, credits in hand or not", async () => {
    const until = new Date("2026-10-01T00:00:00Z");
    const d = deps([{ ...results, stale: true, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null, paused: { until } } }]);
    await draw(d);
    expect(screen.getByRole("button", { name: copy.again })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(creditsCopy.paused(until))).toBeInTheDocument();
    await press(copy.again);
    expect(d.run).not.toHaveBeenCalled();
  });

  it("disables the owner's press once their testing share is used, with its own note", async () => {
    const d = deps([{ ...results, stale: true, allowance: { used: 1, limit: 10, reopensAt: null, nextAt: null, ownerShare: true } }]);
    await draw(d);
    expect(screen.getByRole("button", { name: copy.again })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(creditsCopy.ownerShare(new Date()))).toBeInTheDocument();
    await press(copy.again);
    expect(d.run).not.toHaveBeenCalled();
  });

  it("says what shares the credits exactly as before the deeper looks, unless Help me choose is on", async () => {
    const out = { used: 5, limit: 5, reopensAt: null, nextAt: null };
    await draw(deps([{ ...results, stale: true, allowance: out }]));
    expect(screen.getByText("0 of 5 left. Your overview and suggestions share these credits.")).toBeInTheDocument();
    cleanup();
    await draw(deps([{ ...results, stale: true, allowance: out }]), facts, true);
    expect(screen.getByText("0 of 5 left. Suggestions, overviews and deeper looks share these credits.")).toBeInTheDocument();
    cleanup();
    const until = new Date("2026-10-01T00:00:00Z");
    await draw(deps([{ ...results, stale: true, allowance: { ...out, paused: { until } } }]));
    expect(screen.getByText("Paused until October 1. The app has reached its monthly limit for suggestions and overviews. Nothing you did caused this.")).toBeInTheDocument();
  });

  it("names the pause over the owner's share, and the share over spent credits", async () => {
    const until = new Date("2026-10-01T00:00:00Z");
    const next = new Date("2026-09-24T14:20:00Z");
    const spentOut = { used: 5, limit: 5, reopensAt: next, nextAt: next };
    await draw(deps([{ ...results, stale: true, allowance: { ...spentOut, paused: { until }, ownerShare: true } }]));
    expect(screen.getByText(creditsCopy.paused(until))).toBeInTheDocument();
    expect(screen.queryByText(creditsCopy.ownerShare(new Date()))).toBeNull();
    cleanup();
    await draw(deps([{ ...results, stale: true, allowance: { ...spentOut, ownerShare: true } }]));
    expect(screen.getByText(creditsCopy.ownerShare(new Date()))).toBeInTheDocument();
    expect(screen.queryByText(creditsCopy.spent(5, next))).toBeNull();
  });

  it("names the next credit while credits remain", async () => {
    const next = new Date("2026-09-24T09:05:00Z");
    await draw(deps([{ ...fresh, allowance: { used: 2, limit: 5, reopensAt: null, nextAt: next } }]));
    expect(screen.getByText(creditsCopy.first(3, 5, next))).toBeInTheDocument();
  });

  it("keeps the last set on screen under a failed re-run, with Try again replacing it", async () => {
    const failed = { ...okRun, id: "r2", status: "failed" as const, errorClass: "timeout" };
    await draw(deps([{ ...results, run: failed, stale: true }]));
    expect(screen.getByTestId("tuning-failure")).toHaveTextContent(deckTuningCopy.failure.timeout.heading);
    expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(deckTuningCopy.failure.timeout.note))).toBeInTheDocument();
  });

  it("disables the press when every credit is out even on an unchanged deck", async () => {
    const next = new Date("2026-09-24T14:20:00Z");
    const d = deps([{ ...results, allowance: { used: 5, limit: 5, reopensAt: next, nextAt: next } }]);
    await draw(d);
    expect(screen.getByRole("button", { name: copy.again })).toHaveAttribute("aria-disabled", "true");
    await press(copy.again);
    expect(d.run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("tuning-unchanged")).toBeNull();
  });

  // The in-panel ask is gone (H35): the description's one door before a first reading is now
  // the empty-state field (`deck-description-field.test.tsx`), with the pencil as its second.
  // The four tests that lived here covered that door and are retired with it.

  it("says a run failed even over a set retired by a commit", async () => {
    const failed = { ...okRun, id: "r2", status: "failed" as const, errorClass: "timeout" };
    await draw(deps([{ ...results, run: failed, retired: { from: 1, to: 2 } }]));
    expect(screen.getByTestId("tuning-failure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: deckTuningCopy.failure.retry })).toBeInTheDocument();
  });

  it("names when a credit comes back, not when the first counted one leaves", async () => {
    const first = new Date("2026-09-24T09:05:00Z");
    const back = new Date("2026-09-24T15:40:00Z");
    await draw(deps([{ ...fresh, allowance: { used: 6, limit: 5, reopensAt: back, nextAt: first } }]));
    expect(screen.getByText(creditsCopy.spent(5, back))).toBeInTheDocument();
  });

  it("cancels the run its own press started, by the id it gave it, and never another tab's", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      // Another tab won the deck's one pending slot: every read shows its run, never this press's.
      const theirs: TuningState = { ...fresh, run: { ...okRun, id: "r3", status: "pending" } };
      const d = deps([fresh, theirs], { run: vi.fn(() => new Promise<never>(() => {})) });
      await draw(d);
      await press(copy.suggest);
      const mine = (d.run as ReturnType<typeof vi.fn>).mock.calls[0][1].runId as string;
      await press(copy.stop);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(d.cancel).toHaveBeenCalledWith("d1", mine);
      expect(d.cancel).not.toHaveBeenCalledWith("d1", "r3");
      expect(screen.getByRole("status")).not.toHaveTextContent(deckTuningCopy.announce.stopped);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets a Stop pressed during the closing read own the panel", async () => {
    let release: (s: TuningState) => void = () => {};
    const reads = [
      async () => fresh,
      () => new Promise<TuningState>((r) => { release = r; }),
      async () => fresh,
    ];
    let n = 0;
    const d = deps([fresh], { read: vi.fn(() => reads[Math.min(n++, reads.length - 1)]()) });
    await draw(d);
    await press(copy.suggest);
    // The run answered; its closing read is still in flight when Stop lands.
    await press(copy.stop);
    await act(async () => {
      release(results);
    });
    expect(screen.queryByText("Rhystic Study")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(deckTuningCopy.announce.ready(1));
  });

  it("retries a failed run over a kept set as an explicit anyway", async () => {
    const d = deps([{ ...results, run: { ...okRun, id: "r2", status: "failed", errorClass: "timeout" } }, results]);
    await draw(d);
    await press(deckTuningCopy.failure.retry);
    expect(screen.queryByTestId("tuning-unchanged")).not.toBeInTheDocument();
    expect(d.run).toHaveBeenCalledWith("d1", { anyway: true, runId: expect.any(String) });
  });

  it("leaves the reading state with a refusal when the run or a read rejects", async () => {
    const d = deps([fresh, fresh], {
      run: vi.fn(() => Promise.reject(new Error("network"))),
      evidence: vi.fn(() => Promise.reject(new Error("network"))),
    });
    await draw(d);
    await press(copy.suggest);
    expect(screen.queryByRole("button", { name: copy.stop })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(deckTuningCopy.run.refused);
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

describe("TuningPanel: Locked (never cut)", () => {
  // Every card but the commander locked: the lead says so, the press is disabled, and the note says
  // no credit is used, in place of the credit line (the design's STATES row).
  it("draws the all-locked lead with the primary disabled and no credit spent", async () => {
    const d = deps([{ ...fresh, allLocked: "Kykar, Wind's Fury" }]);
    await draw(d);
    expect(screen.getByText(lockedCardsCopy.tuning.allLocked("Kykar, Wind's Fury"))).toBeInTheDocument();
    expect(screen.getByText(lockedCardsCopy.tuning.allLockedNote)).toBeInTheDocument();
    const primary = screen.getByRole("button", { name: copy.suggest });
    expect(primary).toHaveAttribute("aria-disabled", "true");
    await press(copy.suggest);
    expect(d.run).not.toHaveBeenCalled();
  });

  // Over an existing set, the sentence joins the note (the lead is the set's), and only the
  // credit line gives way: the press stays disabled.
  it("says why the press is disabled over an existing set too", async () => {
    await draw(deps([{ ...results, allLocked: "Kykar" }]));
    const sentence = lockedCardsCopy.tuning.allLocked("Kykar");
    expect(screen.getByText((t) => t.includes(sentence) && t.includes(lockedCardsCopy.tuning.allLockedNote))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.again })).toHaveAttribute("aria-disabled", "true");
  });

  // F10: a run whose every suggestion cut a locked card says that, not ungrounded's three causes.
  it("names the lock when every suggestion cut a locked card", async () => {
    await draw(deps([{ ...fresh, run: { ...okRun, status: "failed", errorClass: "locked_only" } }]));
    expect(screen.getByText(lockedCardsCopy.tuning.lockedOnlyBody)).toBeInTheDocument();
    expect(screen.queryByText(deckTuningCopy.failure.ungrounded.body)).not.toBeInTheDocument();
    // And its note names the fix, not "log another game" (Hugh, 2026-09-25).
    expect(screen.getByText((t) => t.includes(lockedCardsCopy.tuning.lockedOnlyNote))).toBeInTheDocument();
    expect(screen.queryByText((t) => t.includes(deckTuningCopy.failure.ungrounded.note))).not.toBeInTheDocument();
  });

  // "Kept for this deck" (H35, PR 2): two keystrokes in one pause must reach the server as ONE
  // write carrying the latest value, never two unsequenced writes racing each other.
  it("debounces saveDeckLimits to one write per pause, carrying only the latest value", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      const input = screen.getByLabelText("Most per card");
      fireEvent.change(input, { target: { value: "1" } });
      fireEvent.change(input, { target: { value: "15" } });
      expect(saveDeckLimits).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledTimes(1);
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { capDollars: 15, sets: [], ownedOnly: false });
    } finally {
      vi.useRealTimers();
    }
  });
});

