import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { saveDeckLimits } from "../../app/decks/tuning-actions";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { creditsCopy } from "../../lib/copy/credits";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { TuningItem, TuningState } from "../../lib/tuning/state";
import { manifestRows, readSteps, runSteps, TuningPanel, type TuningDeps, type TuningFacts } from "./tuning-panel";

vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), cancelTuningRun: vi.fn(), dismissSuggestion: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(),
  saveDeckLimits: vi.fn(async () => ({ ok: true })), undoSuggestion: vi.fn(),
}));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }), useCardIntent: () => ({}) }));

const copy = deckTuningCopy.panel;
const at = new Date("2026-09-23T12:00:00Z");

const fresh: TuningState = {
  run: null,
  items: [],
  itemsValidationReport: null,
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

  it("runs, ticks the manifest on a pure client stagger, and shows the results", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let resolveRun!: (v: { ok: true }) => void;
      const run = vi.fn(() => new Promise<{ ok: true }>((resolve) => { resolveRun = resolve; }));
      const d = deps([fresh, results], { run });
      await draw(d);
      await press(copy.suggest);
      expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.stringMatching(/^[0-9a-f-]{36}$/), notes: "" });
      const total = runSteps(facts, "go wide").length;
      // Nothing ticked yet, and the model has not been asked to resolve.
      expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.done === "true")).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(total * 350);
      });
      // Every read row has ticked, by the stagger alone — the run is still pending.
      expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.kind === "read" && r.dataset.done === "true")).toHaveLength(total);
      expect(document.querySelector('[data-kind="writing"][data-active]')).not.toBeNull();
      await act(async () => {
        resolveRun({ ok: true });
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByRole("heading", { name: copy.heading })).toBeInTheDocument();
      expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.ready(1));
    } finally {
      vi.useRealTimers();
    }
  });

  it("ticks every remaining row at once when the result lands before the stagger finishes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      // The run resolves almost immediately — well before the stagger's own pacing finishes —
      // but the closing read is held, so the ticked-all-at-once frame is observable before the
      // panel moves on to the results.
      let releaseRead!: (s: TuningState) => void;
      const reads = [async () => fresh, () => new Promise<TuningState>((r) => { releaseRead = r; })];
      let n = 0;
      const d = deps([fresh], { read: vi.fn(() => reads[Math.min(n++, reads.length - 1)]()) });
      await draw(d);
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();
      });
      const total = runSteps(facts, "go wide").length;
      expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.kind === "read" && r.dataset.done === "true")).toHaveLength(total);
      await act(async () => {
        releaseRead(results);
      });
      expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // H35, PR 3: the stagger ticks rows on its own timer, but `announced` must only ever move at
  // the run's start and its end — never once per tick, with or without reduced motion (this
  // suite runs with no media-query override, i.e. motion allowed).
  it("announces only the run's start and its end, never once per tick", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let resolveRun!: (v: { ok: true }) => void;
      const run = vi.fn(() => new Promise<{ ok: true }>((resolve) => { resolveRun = resolve; }));
      const d = deps([fresh, results], { run });
      await draw(d);
      await press(copy.suggest);
      expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.started);
      const total = runSteps(facts, "go wide").length;
      for (let i = 0; i < total; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(350);
        });
        expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.started);
      }
      await act(async () => {
        resolveRun({ ok: true });
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.ready(1));
    } finally {
      vi.useRealTimers();
    }
  });

  it("grows a mono long-wait line past 20 seconds, with Stop still offered", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const run = vi.fn(() => new Promise<{ ok: true }>(() => {}));
      const d = deps([fresh, results], { run });
      await draw(d);
      await press(copy.suggest);
      expect(screen.queryByText(deckDescriptionCopy.manifest.writingLong)).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      expect(screen.getByText(deckDescriptionCopy.manifest.writingLong)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: copy.stop })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("draws the unchanged state on a press over an unchanged deck, and Suggest again anyway runs", async () => {
    const d = deps([results]);
    await draw(d);
    await press(copy.again);
    expect(screen.getByTestId("tuning-unchanged")).toBeInTheDocument();
    expect(d.run).not.toHaveBeenCalled();
    await press(copy.unchangedCta);
    expect(d.run).toHaveBeenCalledWith("d1", { anyway: true, runId: expect.any(String), notes: "" });
  });

  // "Additional notes" (H35, PR 4b, review round 2): notes are new input the model has never
  // seen, so an otherwise-unchanged deck still has something new to read — the player should
  // never see "Nothing has changed" just because they typed a note.
  it("skips the unchanged state and runs directly when the player has typed a note", async () => {
    const d = deps([results]);
    await draw(d);
    fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "more removal" } });
    await press(copy.again);
    expect(screen.queryByTestId("tuning-unchanged")).toBeNull();
    expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.any(String), notes: "more removal" });
  });

  // Pre-open review round 4 (previously missed): the re-entry guard set at the start of a press
  // stayed held until `pressRun` itself settled — up to the model's own timeout — even after
  // Stop had already cancelled that run and reset the visible state. A second Suggest press
  // during that window silently did nothing.
  it("releases the re-entry guard on Stop, letting Suggest start a new run while the first request is still unresolved", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // This panel's own press stamps its run with `crypto.randomUUID()` — fixed here so Stop's
    // own read (by that id) matches the fixture below.
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("r2" as unknown as ReturnType<typeof crypto.randomUUID>);
    try {
      const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
      const cancelled: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "cancelled" } };
      // The run itself never settles — the thing Stop cannot abort.
      const run = vi.fn(() => new Promise<never>(() => {}));
      const d = deps([fresh, pending, cancelled], { run });
      await draw(d);
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(run).toHaveBeenCalledTimes(1);
      await press(copy.stop);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
      await press(copy.suggest);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      randomUUID.mockRestore();
      vi.useRealTimers();
    }
  });

  // Copilot review, previously missed: a run already pending when the panel opens (a reload, or
  // another tab) must still animate the checklist — reconstructed from the run's own
  // `createdAt`, since the stagger otherwise only ever starts inside `pressRun`.
  it("reconstructs the stagger from a run already pending on open, old enough to be past it", async () => {
    const longAgo = { ...okRun, id: "r2", status: "pending" as const, createdAt: new Date("2020-01-01T00:00:00Z") };
    await draw(deps([{ ...fresh, run: longAgo }]));
    const total = runSteps(facts, "go wide").length;
    expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.kind === "read" && r.dataset.done === "true")).toHaveLength(total);
    expect(document.querySelector('[data-kind="writing"][data-active]')).not.toBeNull();
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

  // H35, PR 4a (pre-open review, round 0; presentation per review round 3/STATES §3 state 9): a
  // run with a MIX of a locked cut and some other dropped rule (e.g. the new price/set/owned
  // filters) is not all-`neverCut`, so `runTuning` classifies it `ungrounded`, not `locked_only`
  // — and the refusal sentence must still name the lock, in AnalysisBanner's "note" frame, never
  // the generic `Failure` body.
  it("names a locked card in AnalysisBanner's note frame, for an ungrounded run with a mixed cause", async () => {
    const failed = {
      ...okRun, id: "r2", status: "failed" as const, errorClass: "ungrounded",
      validationReport: { askedCount: 8, survivedCount: 0, keptCount: 0, refusal: { reason: "locked" as const, name: "Sol Ring" } },
    };
    await draw(deps([{ ...results, run: failed, stale: true }]));
    expect(screen.queryByTestId("tuning-failure")).toBeNull();
    const banner = screen.getByTestId("analysis-banner");
    expect(banner).toHaveAttribute("data-mode", "note");
    expect(banner).toHaveTextContent(deckDescriptionCopy.refusal.locked("Sol Ring"));
  });

  it("names several locked cards in AnalysisBanner's note frame, for an ungrounded run with a mixed cause", async () => {
    const failed = {
      ...okRun, id: "r2", status: "failed" as const, errorClass: "ungrounded",
      validationReport: { askedCount: 8, survivedCount: 0, keptCount: 0, refusal: { reason: "lockedMany" as const, count: 3 } },
    };
    await draw(deps([{ ...results, run: failed, stale: true }]));
    expect(screen.getByTestId("analysis-banner")).toHaveTextContent(deckDescriptionCopy.refusal.lockedMany(3));
  });

  // H35, PR 4a, review round 3: the "tooMany" caption must show at BOTH widths, in AnalysisBanner's
  // note frame — a `desktopOnly` Lead silently hid it from every phone-width reader.
  it("names tooMany in AnalysisBanner's note frame, with no width restriction", async () => {
    const run = { ...okRun, validationReport: { askedCount: 8, survivedCount: 7, keptCount: 5 } };
    await draw(deps([{ ...results, run }]));
    const banner = screen.getByTestId("analysis-banner");
    expect(banner).toHaveAttribute("data-mode", "note");
    expect(banner).toHaveTextContent(deckDescriptionCopy.refusal.tooMany(8));
    expect(banner.className).not.toMatch(/\bhidden\b/);
  });

  // H35, PR 4a, review round 4: "your limits" is read off the LIVE deck setting (`facts.limits`),
  // which only still describes the shown run while nothing has changed since it ran — exactly
  // what `state.stale` already tracks, since the tuning fingerprint includes limits.
  it("reads your limits only for a fresh result, never a stale one with the same live setting", async () => {
    const withCap: TuningFacts = { ...facts, limits: { capCents: 500, sets: [], ownedOnly: false } };
    await draw(deps([results]), withCap);
    expect(screen.getByText((text) => text.includes(deckDescriptionCopy.manifest.readLimits))).toBeInTheDocument();
    cleanup();
    await draw(deps([{ ...results, stale: true }]), withCap);
    expect(screen.queryByText((text) => text.includes(deckDescriptionCopy.manifest.readLimits))).toBeNull();
  });

  // "Additional notes" (H35, PR 4b): the same staleness rule as limits, since `facts.intent` is
  // the LIVE deck value and a stale result predates the player's latest edit to it.
  it("reads your description only for a fresh result, never a stale one with the same live value", async () => {
    await draw(deps([results]));
    expect(screen.getByText((text) => text.includes(deckDescriptionCopy.manifest.readDescription))).toBeInTheDocument();
    cleanup();
    await draw(deps([{ ...results, stale: true }]));
    expect(screen.queryByText((text) => text.includes(deckDescriptionCopy.manifest.readDescription))).toBeNull();
  });

  it("reads no description when the deck has none", async () => {
    await draw(deps([results]), { ...facts, intent: null });
    expect(screen.queryByText((text) => text.includes(deckDescriptionCopy.manifest.readDescription))).toBeNull();
  });

  // "Additional notes" (H35, PR 4b): the field is never saved, so only the report belonging to
  // the run that produced the shown items (`itemsValidationReport`) can say whether it carried
  // text — never `state.run`'s own, which describes the NEWEST run of any status and can be a
  // failed retry that produced none of what is shown (review round 1).
  it("reads your notes only when the report for the shown items says it carried any", async () => {
    const withNotes = { ...results, itemsValidationReport: { askedCount: 8, survivedCount: 8, keptCount: 5, hadNotes: true } };
    await draw(deps([withNotes]));
    expect(screen.getByText((text) => text.includes(deckDescriptionCopy.manifest.readNotes))).toBeInTheDocument();
    cleanup();
    await draw(deps([results]));
    expect(screen.queryByText((text) => text.includes(deckDescriptionCopy.manifest.readNotes))).toBeNull();
  });

  // The defect review flagged: a failed retry must not borrow its own (possibly notes-bearing)
  // report for items that came from an earlier, different successful run.
  it("never reads your notes off a failed retry's own report, only the shown items' run", async () => {
    const failedRetry = {
      ...results,
      run: { ...okRun, id: "r2", status: "failed" as const, errorClass: "timeout", validationReport: { askedCount: 8, survivedCount: 0, keptCount: 0, hadNotes: true } },
      itemsValidationReport: { askedCount: 8, survivedCount: 8, keptCount: 5, hadNotes: false },
    };
    await draw(deps([failedRetry]));
    expect(screen.queryByText((text) => text.includes(deckDescriptionCopy.manifest.readNotes))).toBeNull();
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

  // Copilot review: `staggerTimer`/`longWaitTimer` are shared refs. Stop lets a NEW press start
  // while the first press's own `deps.run` is still unresolved; if that first run's promise
  // settles LATE, after the second press has its own stagger running, it must not reach in and
  // clear the SECOND press's live timers.
  it("does not let a superseded run's late settle clear a newer press's own stagger", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("r2" as unknown as ReturnType<typeof crypto.randomUUID>);
    try {
      let resolveFirst!: (v: { ok: true }) => void;
      const run = vi.fn()
        .mockImplementationOnce(() => new Promise<{ ok: true }>((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise<{ ok: true }>(() => {}));
      const pending: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "pending" } };
      const cancelled: TuningState = { ...fresh, run: { ...okRun, id: "r2", status: "cancelled" } };
      const d = deps([fresh, pending, cancelled], { run });
      await draw(d);
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(run).toHaveBeenCalledTimes(1);
      await press(copy.stop);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(d.cancel).toHaveBeenCalledWith("d1", "r2");
      await press(copy.suggest);
      expect(run).toHaveBeenCalledTimes(2);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350);
      });
      const total = runSteps(facts, "go wide").length;
      expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.kind === "read" && r.dataset.done === "true")).toHaveLength(1);
      // The first press's run settles now — late, and over a run this panel already stopped.
      await act(async () => {
        resolveFirst({ ok: true });
        await Promise.resolve();
        await Promise.resolve();
      });
      // The second press's own stagger is still running: it ticks further rows afterward.
      await act(async () => {
        await vi.advanceTimersByTimeAsync((total - 1) * 350);
      });
      expect(screen.getAllByTestId("manifest-row").filter((r) => r.dataset.kind === "read" && r.dataset.done === "true")).toHaveLength(total);
    } finally {
      randomUUID.mockRestore();
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
    expect(d.run).toHaveBeenCalledWith("d1", { anyway: true, runId: expect.any(String), notes: "" });
  });

  it("leaves the reading state with a refusal when the run itself rejects", async () => {
    const d = deps([fresh, fresh], {
      run: vi.fn(() => Promise.reject(new Error("network"))),
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
    const rows = manifestRows(f, "go wide", null, readSteps(f, "go wide"));
    expect(rows.every((r) => r.kind !== "read" || !r.done)).toBe(true);
    expect(rows[0]).toMatchObject({ key: "games", count: "9 games" });
    expect(rows[1]).toMatchObject({ key: "notes", count: "on 2 of 9 games" });
  });

  it("says the games carry no marks when none does", () => {
    const f = { ...facts, gameCount: 4 };
    expect(manifestRows(f, null, null, readSteps(f, null))[0]).toMatchObject({ count: "4 games · no marks" });
  });

  it("ticks a row only once the stagger has added it to the ticked set", () => {
    const f = { ...facts, gameCount: 9 };
    const rows = manifestRows(f, null, new Set(["games"]), readSteps(f, null));
    expect(rows.find((r) => r.kind === "read" && r.key === "games")).toMatchObject({ done: true, count: null });
    expect(rows.find((r) => r.kind === "read" && r.key === "decklist")).toMatchObject({ done: false, count: null });
  });

  it("carries no secondary text on any running row, ticked or not — not even a games count", () => {
    const f = { ...facts, gameCount: 9, marked: 8, fix: { key: "speed", hurt: 5 } };
    const rows = manifestRows(f, null, new Set(["games", "decklist"]), readSteps(f, null));
    expect(rows.every((r) => r.kind !== "read" || r.count === null)).toBe(true);
  });

  it("draws the dashed games row, unread, when there are no games", () => {
    const rows = manifestRows(facts, null, null, readSteps(facts, null));
    expect(rows[0]).toEqual({ kind: "noGames", key: "games" });
    expect(rows.some((r) => r.kind === "read" && r.key === "notes")).toBe(false);
  });

  it("always includes a description row in the preview, dashed with its own link when there is none", () => {
    const rows = manifestRows(facts, null, null, readSteps(facts, null));
    const row = rows.find((r) => r.kind !== "writing" && r.key === "description");
    expect(row).toMatchObject({ kind: "absent", caption: "none yet", actionLabel: "Describe your deck →" });
  });

  it("shows the description row as an ordinary filled row once there is one", () => {
    const rows = manifestRows(facts, "go wide", null, readSteps(facts, "go wide"));
    const row = rows.find((r) => r.kind !== "writing" && r.key === "description");
    expect(row?.kind).toBe("read");
    expect(row && row.kind === "read" ? row.count : undefined).not.toBe("none yet");
  });

  it("runSteps adds limits and notes rows, only once a run is reading", () => {
    const preview = readSteps(facts, "go wide");
    const run = runSteps(facts, "go wide");
    expect(preview).not.toContain("limits");
    expect(preview).not.toContain("playerNotes");
    expect(run).toContain("limits");
    expect(run).toContain("playerNotes");
    expect(run.length).toBe(preview.length + 2);
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
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { capDollars: 15 });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 2: each control submits ONLY the field it changed — a cap edit and an
  // owned-only edit in the same pause must merge into one request carrying both, never two
  // separate writes where the second could carry the first's stale value for the OTHER field.
  it("merges edits to different fields made within one pause into a single request", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "15" } });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledTimes(1);
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { capDollars: 15, ownedOnly: true });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 2: a non-empty invalid cap must cancel its OWN pending save without
  // dropping a sibling field's edit queued in the same patch.
  it("cancels only the cap's own pending save when the draft goes invalid, keeping a sibling edit", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      const input = screen.getByLabelText("Most per card");
      fireEvent.change(input, { target: { value: "10000" } });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      fireEvent.change(input, { target: { value: "100001" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledTimes(1);
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { ownedOnly: true });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 2: a REVERT while an earlier save for the same field is still in
  // flight must not be overwritten once that earlier save's response lands and revalidates the
  // page — an equality check against the old prop would wrongly call the revert "unedited".
  it("keeps a revert that lands while the first save for that field is still in flight", async () => {
    vi.useFakeTimers();
    try {
      let resolveFirst!: (v: { ok: true }) => void;
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; }),
      );
      const d = deps([fresh]);
      let utils!: ReturnType<typeof render>;
      await act(async () => {
        utils = render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { ownedOnly: true });
      // The first save is now in flight (its promise unresolved). Revert before it lands.
      fireEvent.click(screen.getByRole("radio", { name: "Any card" }));
      // A revalidation reflecting the FIRST save's value arrives, under a new object reference,
      // while the revert's own request has not even been scheduled yet.
      const revalidated: TuningFacts = { ...facts, limits: { capCents: null, sets: [], ownedOnly: true } };
      await act(async () => {
        utils.rerender(<TuningPanel deckId="d1" permits={[3]} facts={revalidated} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      // The revert must still read as chosen — not reverted back to "Only cards I own" by the
      // revalidation.
      expect(screen.getByRole("radio", { name: "Any card" })).toHaveAttribute("aria-checked", "true");
      resolveFirst({ ok: true });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 3: the round-2 fix only checked whether the field was still sitting
  // in the UNSENT `pendingLimits` patch — it missed a revert whose OWN send had already been
  // dispatched and was itself queued behind the first, slower send in `limitsChain`.
  it("keeps a revert through the WHOLE queue, not just the first send still in flight", async () => {
    vi.useFakeTimers();
    try {
      let resolveFirst!: (v: { ok: true }) => void;
      let resolveSecond!: (v: { ok: true }) => void;
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      (saveDeckLimits as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
      const d = deps([fresh]);
      let utils!: ReturnType<typeof render>;
      await act(async () => {
        utils = render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" })); // true
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledTimes(1); // the first send, unresolved
      fireEvent.click(screen.getByRole("radio", { name: "Any card" })); // revert: false
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      // The revert's OWN send is now scheduled, but chained behind the first — not yet called.
      expect(saveDeckLimits).toHaveBeenCalledTimes(1);
      resolveFirst({ ok: true });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      // The first settling released the chain — the revert's send has now actually dispatched.
      expect(saveDeckLimits).toHaveBeenCalledTimes(2);
      expect(saveDeckLimits).toHaveBeenLastCalledWith("d1", { ownedOnly: false });
      // A revalidation reflecting the FIRST save's value (true) arrives while the revert's own
      // send is still unresolved.
      const revalidated: TuningFacts = { ...facts, limits: { capCents: null, sets: [], ownedOnly: true } };
      await act(async () => {
        utils.rerender(<TuningPanel deckId="d1" permits={[3]} facts={revalidated} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      expect(screen.getByRole("radio", { name: "Any card" })).toHaveAttribute("aria-checked", "true");
      resolveSecond({ ok: true });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 2: a limit edited moments before the press must be flushed and its
  // fresh fingerprint read BEFORE the gate decides "unchanged" — the save's own 500ms debounce
  // must not let a press slip through on the pre-edit fingerprint.
  it("flushes a pending limit edit and reads fresh before evaluating the run gate", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      // The server's own read now answers "unchanged" (a successful prior run, stale:false),
      // reflecting the save that is about to land — press() must see THIS, not the stale
      // `fresh` the panel mounted with.
      const d = deps([fresh, { ...results, stale: false }]);
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      expect(saveDeckLimits).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: copy.suggest }));
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { ownedOnly: true });
      // The gate read "unchanged" from the fresh read the flush forced, not from the stale
      // mount-time read — so the run never dispatched.
      expect(d.run).not.toHaveBeenCalled();
      expect(screen.getByText(deckTuningCopy.announce.unchanged)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Review round 3: `press` awaits a pending limit save (and a possible re-read) before it
  // reads the typed note, and the field stays editable through that whole wait — a plain
  // closure over `notes`, captured when the press STARTED, would send what was typed before
  // the wait rather than what is on screen when the wait ends.
  it("sends the note as it reads when the press finishes, not as it read when the press started", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      const d = deps([fresh, { ...results, stale: true }]);
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: copy.suggest }));
        // Typed WHILE the limit save's 500ms debounce is still pending — before press() has
        // read anything.
        fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "typed during the wait" } });
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.any(String), notes: "typed during the wait" });
    } finally {
      vi.useRealTimers();
    }
  });

  // pre-open review round 1: the sync-while-unedited check used to compare the whole `limits`
  // object by reference, so ANY revalidation (even one that hands back the same, still-unsaved
  // content under a new object) overwrote every field — including one mid-edit.
  it("keeps a field mid-edit when facts.limits re-renders with a new reference but the same content", async () => {
    const d = deps([fresh]);
    const utils = await (async () => {
      let out!: ReturnType<typeof render>;
      await act(async () => {
        out = render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      return out;
    })();
    fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
    expect(screen.getByRole("radio", { name: "Only cards I own" })).toHaveAttribute("aria-checked", "true");
    const revalidated: TuningFacts = { ...facts, limits: { capCents: null, sets: [], ownedOnly: false } };
    await act(async () => {
      utils.rerender(<TuningPanel deckId="d1" permits={[3]} facts={revalidated} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
    });
    expect(screen.getByRole("radio", { name: "Only cards I own" })).toHaveAttribute("aria-checked", "true");
  });

  // pre-open review round 1: `saveLimits` used to `void` its call, discarding both an
  // `{ ok: false }` refusal and a rejection — the controls kept showing an unsaved value as if
  // it had landed.
  it("shows the limits save failure near the box rather than discarding it", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, message: "Nope." });
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "15" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByText("Nope.")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // pre-open review round 1: the fingerprint moves server-side on a successful limits save, so
  // a prior "unchanged" reading of this exact gate no longer applies — the panel must re-read
  // rather than wait for an unrelated navigation to revalidate the page.
  it("re-reads tuning state after a successful limits save", async () => {
    vi.useFakeTimers();
    try {
      const d = deps([fresh]);
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      expect(d.read).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "15" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(d.read).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  // pre-open review round 1: switching tabs within the 500ms pause unmounted this panel and
  // cancelled its only pending save with no record of the choice.
  it("flushes a pending limits save on unmount instead of dropping it", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      let utils!: ReturnType<typeof render>;
      await act(async () => {
        utils = render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "15" } });
      expect(saveDeckLimits).not.toHaveBeenCalled();
      await act(async () => {
        utils.unmount();
        // The flush is serialized behind `limitsChain` (even an already-resolved chain costs one
        // microtask), so give it a tick to actually reach `saveDeckLimits`.
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { capDollars: 15 });
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 3: `flushLimitsNow` used to report only the LATEST chain link's own
  // result — a later, different-field send's success erased an EARLIER field's unresolved
  // failure, letting a press through on an unsaved cap.
  it("blocks the press over an earlier failed save even once a later, different field has since succeeded", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({ ok: false as const, message: "Nope." }));
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "15" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByText("Nope.")).toBeInTheDocument();
      // A different field saves fine afterward.
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: copy.suggest }));
        await vi.advanceTimersByTimeAsync(500);
      });
      // The cap's own failure is still unresolved — the run must not have started.
      expect(screen.getByText(deckDescriptionCopy.limits.refused)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 3: a second press during the flush-and-gate-check preamble (before
  // `reading` disables the button) used to start a SECOND `press`, racing `token`/`ownRun`
  // against the first.
  it("ignores a second press while the first is still preparing", async () => {
    vi.useFakeTimers();
    try {
      const d = deps([fresh, results]);
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      const button = screen.getByRole("button", { name: copy.suggest });
      // Fire two presses back to back, before the first's flush (empty, but still an await) has
      // had a chance to resolve.
      fireEvent.click(button);
      fireEvent.click(button);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(d.run).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 4 (previously missed): the sync block marked `facts.limits` as SEEN
  // even for a field it skipped applying because that field was dirty. Once the dirty marker
  // later cleared with no FURTHER prop change, nothing re-ran this block, so a newer server
  // value that had already arrived (and was correctly skipped then) was never applied.
  it("applies an already-seen-but-skipped authoritative value once the dirty marker clears, with no further prop change", async () => {
    vi.useFakeTimers();
    try {
      let resolveSave!: (v: { ok: true }) => void;
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) => { resolveSave = resolve; }),
      );
      const d = deps([fresh]);
      let utils!: ReturnType<typeof render>;
      await act(async () => {
        utils = render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "50" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByLabelText("Most per card")).toHaveValue("50");
      // Another tab's write lands while this cap edit is still dirty — correctly skipped.
      const fromAnotherTab: TuningFacts = { ...facts, limits: { capCents: 7500, sets: [], ownedOnly: false } };
      await act(async () => {
        utils.rerender(<TuningPanel deckId="d1" permits={[3]} facts={fromAnotherTab} onLogGame={vi.fn()} deps={d} printedInSets={[]} />);
      });
      expect(screen.getByLabelText("Most per card")).toHaveValue("50");
      // This tab's own save acknowledges. No FURTHER prop change follows.
      resolveSave({ ok: true });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByLabelText("Most per card")).toHaveValue("75");
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 4 (previously missed): cancelling an invalid cap draft removed it
  // from the pending patch, but left the field DIRTY — so nothing ever reconciled the display
  // back to the authoritative value, and the cancelled, never-saved draft sat there looking
  // saved indefinitely.
  it("redraws the authoritative cap once a draft that went invalid is cancelled", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      const withCap: TuningFacts = { ...facts, limits: { capCents: 2500, sets: [], ownedOnly: false } };
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={withCap} onLogGame={vi.fn()} deps={deps([fresh])} printedInSets={[]} />);
      });
      const input = screen.getByLabelText("Most per card");
      expect(input).toHaveValue("25");
      fireEvent.change(input, { target: { value: "15" } });
      fireEvent.change(input, { target: { value: "0" } });
      expect(saveDeckLimits).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      // Nothing saved — and the field reads the authoritative $25 again, not "15" sitting
      // unsaved-but-displayed.
      expect(saveDeckLimits).not.toHaveBeenCalled();
      expect(input).toHaveValue("25");
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 4 (previously missed): a save that succeeded but whose own re-read
  // failed left `stateRef` on the PRE-SAVE fingerprint — a gate check right after could read
  // "unchanged" from state the save had already retired.
  it("retries the gate's fresh read when the save's own re-read failed", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      let readCalls = 0;
      const read = vi.fn(async () => {
        readCalls += 1;
        // Call 1: the mount read. Call 2: the save's own re-read — fails. Call 3: press's retry.
        if (readCalls === 2) throw new Error("down");
        return readCalls === 1 ? fresh : { ...results, stale: false };
      });
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh], { read })} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: copy.suggest }));
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { ownedOnly: true });
      expect(readCalls).toBeGreaterThanOrEqual(3);
      // The retried read answered "unchanged" (a successful prior run) — the run never started.
      expect(screen.getByText(deckTuningCopy.announce.unchanged)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-open review round 5: the round-4 fix only retried the stale read when THIS press's own
  // flush had something pending or in flight — a press made AFTER the save and its failed
  // re-read had already settled saw `touched: false` and skipped the retry entirely, despite
  // the flag itself still being set.
  it("retries the stale read on a press made after the save and its failed re-read already settled", async () => {
    vi.useFakeTimers();
    try {
      (saveDeckLimits as ReturnType<typeof vi.fn>).mockClear();
      let readCalls = 0;
      const read = vi.fn(async () => {
        readCalls += 1;
        // Call 1: the mount read. Call 2: the save's own re-read — fails. Call 3: the LATER
        // press's retry, made once the save has already fully settled.
        if (readCalls === 2) throw new Error("down");
        return readCalls === 1 ? fresh : { ...results, stale: false };
      });
      await act(async () => {
        render(<TuningPanel deckId="d1" permits={[3]} facts={facts} onLogGame={vi.fn()} deps={deps([fresh], { read })} printedInSets={[]} />);
      });
      fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(saveDeckLimits).toHaveBeenCalledWith("d1", { ownedOnly: true });
      expect(readCalls).toBe(2); // mount + the save's own failed re-read; nothing pending now.
      // A LATER press, with nothing of its own to flush (`touched` will read false).
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: copy.suggest }));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(readCalls).toBe(3);
      expect(screen.getByText(deckTuningCopy.announce.unchanged)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TuningPanel: Additional notes (H35, PR 3)", () => {
  it("mounts the field above the action row, hidden while reading", async () => {
    await draw(deps([fresh]));
    expect(screen.getByLabelText("Additional notes")).toBeInTheDocument();
  });

  // "Additional notes" (H35, PR 4b): the typed text rides into the run it starts.
  it("sends the typed note to deps.run", async () => {
    const d = deps([fresh, results]);
    await draw(d);
    fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "more removal" } });
    await press(copy.suggest);
    expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.any(String), notes: "more removal" });
  });

  it("clears the note once a successful run lands", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const d = deps([fresh, results]);
      await draw(d);
      fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "more removal" } });
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(runSteps(facts, "go wide").length * 350);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByLabelText("Additional notes")).toHaveValue("");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a typed note over a run that fails", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const d = deps([fresh, fresh], { run: vi.fn(async () => ({ ok: false as const, message: "no" })) });
      await draw(d);
      fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "more removal" } });
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(runSteps(facts, "go wide").length * 350);
        await Promise.resolve();
      });
      expect(screen.getByLabelText("Additional notes")).toHaveValue("more removal");
    } finally {
      vi.useRealTimers();
    }
  });

  // Copilot review: `runTuning` answers `{ ok: true }` for a run it PERSISTED even when the run
  // itself failed (upstream_busy, locked_only, ungrounded, ...) — `result.ok` alone is never
  // proof a set of suggestions landed.
  it("keeps the note over a run the server accepted but that itself came back failed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const failed: TuningState = { ...fresh, run: { ...okRun, status: "failed", errorClass: "timeout" } };
      const d = deps([fresh, failed], { run: vi.fn(async () => ({ ok: true as const })) });
      await draw(d);
      fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "more removal" } });
      await press(copy.suggest);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(runSteps(facts, "go wide").length * 350);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByLabelText("Additional notes")).toHaveValue("more removal");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TuningPanel: Describing in place (H35, PR 3)", () => {
  const noDescription: TuningFacts = { ...facts, intent: null };

  it("opens the editor from the dashed description row's link, and Cancel reverts it", async () => {
    await draw(deps([fresh]), noDescription);
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    expect(screen.getByLabelText("Deck description")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Deck description")).toBeNull();
    expect(screen.getByRole("button", { name: "Describe your deck →" })).toBeInTheDocument();
  });

  it("Escape also reverts the editor to the dashed row", async () => {
    await draw(deps([fresh]), noDescription);
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    fireEvent.keyDown(screen.getByLabelText("Deck description"), { key: "Escape" });
    expect(screen.queryByLabelText("Deck description")).toBeNull();
  });

  // Copilot review: Escape cancels an IME composition candidate first — it must not also
  // discard the open editor in the same keystroke.
  it("ignores Escape while an IME composition is active", async () => {
    await draw(deps([fresh]), noDescription);
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    fireEvent.keyDown(screen.getByLabelText("Deck description"), { key: "Escape", isComposing: true });
    expect(screen.getByLabelText("Deck description")).toBeInTheDocument();
  });

  it("saves through onSaveDescription and shows the row filled, with an announcement", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: true as const }));
    await act(async () => {
      render(
        <TuningPanel deckId="d1" permits={[3]} facts={noDescription} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    fireEvent.change(screen.getByLabelText("Deck description"), { target: { value: "Go wide, win late." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(onSaveDescription).toHaveBeenCalledWith("Go wide, win late.");
    expect(screen.queryByLabelText("Deck description")).toBeNull();
    expect(screen.queryByText("none yet")).toBeNull();
    expect(screen.queryByRole("button", { name: "Describe your deck →" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(deckDescriptionCopy.announce.descriptionSaved);
  });

  // Copilot review round 2: a REJECTED promise (a network/transport failure, not a `{ok:false}`
  // answer) must not escape as an unhandled rejection — it gets the same refusal copy.
  it("shows the refusal rather than an unhandled rejection when the save itself rejects", async () => {
    const onSaveDescription = vi.fn(() => Promise.reject(new Error("network")));
    await act(async () => {
      render(
        <TuningPanel deckId="d1" permits={[3]} facts={noDescription} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(screen.getByText(deckDescriptionCopy.description.refused)).toBeInTheDocument();
    expect(screen.getByLabelText("Deck description")).toBeInTheDocument();
  });

  it("shows the refusal and keeps the editor open when the save fails", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: false as const, message: "Nope." }));
    await act(async () => {
      render(
        <TuningPanel deckId="d1" permits={[3]} facts={noDescription} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(screen.getByText("Nope.")).toBeInTheDocument();
    expect(screen.getByLabelText("Deck description")).toBeInTheDocument();
  });

  // Copilot review round 2: the optimistic state must be NORMALIZED the same way `saveIntent`
  // stores it (trimmed) — comparing the raw draft against the server's normalized `facts.intent`
  // would never match, blocking a LATER external edit (the header pencil) from ever syncing in.
  it("normalizes the saved draft so a later external edit still syncs in", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: true as const }));
    let utils!: ReturnType<typeof render>;
    await act(async () => {
      utils = render(
        <TuningPanel deckId="d1" permits={[3]} facts={noDescription} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Describe your deck →" }));
    fireEvent.change(screen.getByLabelText("Deck description"), { target: { value: "  Go wide.  " } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(onSaveDescription).toHaveBeenCalledWith("  Go wide.  ");
    expect(screen.queryByRole("button", { name: "Describe your deck →" })).toBeNull();
    // The server's own revalidation echoes back the TRIMMED value it actually stored.
    await act(async () => {
      utils.rerender(
        <TuningPanel deckId="d1" permits={[3]} facts={{ ...noDescription, intent: "Go wide." }} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    // A LATER external edit (the header pencil clearing it) now syncs in, proving the earlier
    // optimistic value was released rather than permanently blocking this sync.
    await act(async () => {
      utils.rerender(
        <TuningPanel deckId="d1" permits={[3]} facts={noDescription} onLogGame={vi.fn()} deps={deps([fresh])} onSaveDescription={onSaveDescription} />,
      );
    });
    expect(screen.getByRole("button", { name: "Describe your deck →" })).toBeInTheDocument();
  });
});

