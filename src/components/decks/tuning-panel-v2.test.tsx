import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clockTime, localDay } from "../../lib/copy/credits";
import { strategyName } from "../../lib/copy/strategy-focus";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { noteDeckRoute, resetDeckVisitForTests, visitBaseline } from "../../lib/decks/visit";
import type { TuningState } from "../../lib/tuning/state";
import { usualFor } from "../../lib/tuning/v2/intake";
import { v2Line } from "../../lib/tuning/v2/results-fixture";
import type { Bracket } from "../../lib/profile/types";
import { OpenHistoryProvider, OpenRunProvider, ReviewRunProvider, type OpenRun } from "./review-run";
import { TuningPanel, type TuningDeps, type TuningFacts, type TuningV2 } from "./tuning-panel";
import type { RunFigures } from "./suggested-changes-run";

vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), dismissSuggestion: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(),
  saveDeckLimits: vi.fn(async () => ({ ok: true })), undoSuggestion: vi.fn(),
}));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false }), useCardIntent: () => ({}),
}));

const sc = suggestedChangesV2Copy;
const at = new Date("2026-10-26T18:22:00Z");

const fresh: TuningState = {
  run: null, items: [], itemsValidationReport: null, lastOkFingerprint: null, lastOkAt: null, stale: true,
  modelVersionMoved: false, retired: null, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null }, gameCount: 0,
  newestPriceAsOf: null,
};
const okRun = (id: string): TuningState => ({
  ...fresh, run: { id, status: "ok", errorClass: null, createdAt: at, droppedCount: 0 }, lastOkFingerprint: "fp", lastOkAt: at, stale: false,
});

const facts: TuningFacts = {
  gameCount: 0, noteCount: 0, fix: null, marked: 0, cards: 99, intent: null,
  limits: { capCents: null, sets: [], ownedOnly: false },
};

const v2At = (over = 0, extra: Partial<TuningV2> = {}): TuningV2 => ({
  at: 99 + over,
  over,
  noticed: {
    roles: [{ role: "removal", label: "Removal", have: 6, target: 10, advisory: false }],
    focus: "+1/+1 counters",
    game: null,
  },
  ...extra,
});

/** `run` answers what the test hands it, and records the press; `read` answers the run it was asked for as settled. */
function deps(answer: (opts: unknown) => unknown = () => ({ ok: true })): TuningDeps & { run: ReturnType<typeof vi.fn> } {
  let lastRun: string | null = null;
  const run = vi.fn(async (_deck: string, opts?: { runId?: string }) => {
    const a = answer(opts);
    if ((a as { ok: boolean }).ok) lastRun = opts?.runId ?? null;
    return a;
  });
  const ok = async () => ({ ok: true as const });
  return {
    read: vi.fn(async () => (lastRun ? okRun(lastRun) : fresh)),
    run: run as unknown as TuningDeps["run"] & ReturnType<typeof vi.fn>,
    card: { apply: ok, undo: ok, reject: ok, restore: ok },
  };
}

async function draw(
  d: TuningDeps, v2: TuningV2 | null, permits: Bracket[] = [2], wrap?: (node: React.ReactNode) => React.ReactNode, runFigures?: RunFigures,
) {
  const panel = <TuningPanel deckId="d1" permits={permits} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2} runFigures={runFigures} />;
  return act(async () => render(<>{wrap ? wrap(panel) : panel}</>));
}

const send = () => screen.getByRole("button", { name: sc.intake.send });
const box = () => document.getElementById("sc-request-field") as HTMLTextAreaElement;

beforeEach(() => {
  resetDeckVisitForTests();
  visitBaseline("d1", "suggested", { okKey: null, runId: null });
});

describe("TuningPanel with Suggested changes v2 off", () => {
  it("draws Additional notes and the shipped press, and no intake", async () => {
    await draw(deps(), null);
    expect(screen.getByLabelText(deckDescriptionCopy.notes.label)).toBeTruthy();
    expect(document.querySelector("[data-sc-intake]")).toBeNull();
    expect(screen.getByRole("button", { name: deckTuningCopy.panel.suggest })).toBeTruthy();
    expect(document.querySelector("[data-sc-usual]")).toBeNull();
  });
});

describe("Suggested changes v2's 2-credit cue (Small items 7, SC-Cost)", () => {
  const withAllowance = (allowance: TuningState["allowance"]) => {
    const d = deps();
    d.read = vi.fn(async () => ({ ...fresh, allowance }));
    return d;
  };
  const typeCount = (n: number) => {
    const field = screen.getByRole("textbox", { name: sc.intake.count.countLabel });
    fireEvent.change(field, { target: { value: String(n) } });
    fireEvent.blur(field);
  };
  const line = () => document.querySelector("[data-sc-credit-line]") as HTMLElement | null;
  const stop = () => document.querySelector("[data-sc-two-stop]") as HTMLElement | null;
  const standing = () => document.querySelector("[data-sc-two-standing]") as HTMLElement | null;

  it("C: only the free run left, above 10: the press is off, the row says why, and Change to 10 turns it back on", async () => {
    await draw(withAllowance({ used: 0, limit: 1, reopensAt: null, nextAt: null, payments: true }), v2At());
    typeCount(12);
    expect(send().getAttribute("aria-disabled")).toBe("true");
    expect(stop()!.textContent).toContain(deckTuningCopy.allowance.costsTwoFree(12));
    // The drawn state: nothing counts yet, so there is no reset to name.
    expect(standing()!.textContent).toBe("1 of 1 free");
    expect(screen.getByRole("link", { name: "Get more credits" }).getAttribute("href")).toBe("/credits");
    // The off press is described by C's sentence, and the reason was announced on the way in.
    const describedBy = send().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)!.textContent).toBe(deckTuningCopy.allowance.costsTwoFree(12));
    expect([...document.querySelectorAll('[role="status"]')].some((n) => n.textContent === deckTuningCopy.allowance.costsTwoFree(12))).toBe(true);
    // Keyed on the sentence's words: a new count re-announces while C stays drawn.
    typeCount(13);
    expect([...document.querySelectorAll('[role="status"]')].some((n) => n.textContent === deckTuningCopy.allowance.costsTwoFree(13))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: deckTuningCopy.allowance.changeTo(10) }));
    expect((screen.getByRole("textbox", { name: sc.intake.count.countLabel }) as HTMLInputElement).value).toBe("10");
    expect(stop()).toBeNull();
    expect(send().getAttribute("aria-disabled")).toBeNull();
    // C's block left with the focus in it: focus lands on the press it turned back on.
    expect(document.activeElement).toBe(send());
    expect(send().getAttribute("aria-describedby")).toBeNull();
  });

  it("C: with credits used, the last line names the real reset from the allowance window", async () => {
    const nextAt = new Date("2026-10-31T02:01:00Z");
    await draw(withAllowance({ used: 4, limit: 5, reopensAt: null, nextAt }), v2At());
    typeCount(12);
    expect(stop()!.textContent).toContain(deckTuningCopy.allowance.costsTwoFree(12));
    expect(standing()!.textContent).toBe(`1 of 5 free · reset at ${clockTime(nextAt)}`);
  });

  it("C: Get more credits only while payments are on, and costsTwo once the free run is gone", async () => {
    await draw(withAllowance({ used: 1, limit: 1, reopensAt: null, nextAt: null, pack: 1 }), v2At());
    typeCount(12);
    expect(stop()!.textContent).toContain(deckTuningCopy.allowance.costsTwo);
    expect(standing()!.textContent).toBe("0 of 1 free · 1\u00a0paid");
    expect(screen.queryByRole("link", { name: "Get more credits" })).toBeNull();
  });

  it("B: welcome credits fund a run of 12, and the line says so", async () => {
    await draw(withAllowance({ used: 0, limit: 1, reopensAt: null, nextAt: null, welcome: 15 }), v2At());
    typeCount(12);
    expect(send().getAttribute("aria-disabled")).toBeNull();
    expect(line()!.textContent).toContain("Uses 2 welcome credits. A free credit covers up to 10. 1 of 1 free · 15 welcome.");
  });

  it("E: the free allowance holds 2, and the line counts credits left after the run", async () => {
    await draw(deps(), v2At());
    typeCount(12);
    expect(line()!.textContent).toContain("Uses 2 free credits. A run above 10 counts 2. 5 of 5 left, 3 after this run.");
    typeCount(10);
    expect(line()!.textContent).not.toContain("after this run");
  });
});

describe("TuningPanel with Suggested changes v2 on", () => {
  it("draws the intake in place of Additional notes, Suggest changes, and the usual time by N", async () => {
    await draw(deps(), v2At());
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
    expect(screen.queryByLabelText(deckDescriptionCopy.notes.label)).toBeNull();
    expect(send().getAttribute("aria-disabled")).toBeNull();
    expect(document.querySelector("[data-sc-usual]")!.textContent).toBe(` · ${usualFor(3)}`);
    // The Kept for this deck box is step 3.
    expect(document.querySelector('[data-sc-step="3"]')!.textContent).toContain(deckDescriptionCopy.limits.heading);
  });

  it("sends the count, the request, the bracket choice and a fresh run id", async () => {
    const d = deps();
    await draw(d, v2At());
    fireEvent.click(screen.getByRole("button", { name: suggestedChangesV2Copy.intake.count.more }));
    fireEvent.change(box(), { target: { value: "Cut the clunky stuff.", selectionStart: 21 } });
    fireEvent.click(screen.getByRole("button", { name: /Up to 3 · Upgraded/ }));
    await act(async () => { fireEvent.click(send()); });
    expect(d.run).toHaveBeenCalledTimes(1);
    const [deckId, opts] = d.run.mock.calls[0];
    expect(deckId).toBe("d1");
    expect(opts).toEqual({ requestedCount: 4, request: "Cut the clunky stuff.", bracket: { choice: "up", target: 3 }, runId: expect.any(String) });
    expect(opts.runId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends Keep at the deck's bracket and no request when the box is empty", async () => {
    const d = deps();
    await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    expect(d.run.mock.calls[0][1]).toEqual({ requestedCount: 3, bracket: { choice: "keep", target: 2 }, runId: expect.any(String) });
  });

  it("sends Keep over a range with the range's bottom as `low`", async () => {
    const d = deps();
    await draw(d, v2At(), [1, 2]);
    await act(async () => { fireEvent.click(send()); });
    expect(d.run.mock.calls[0][1]).toEqual({ requestedCount: 3, bracket: { choice: "keep", target: 2, low: 1 }, runId: expect.any(String) });
  });

  it("reopens a refunded same-request run under History's refunded tier", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString(), refunded: true };
    const d = deps(() => same);
    const open = vi.fn<OpenRun>();
    await draw(d, v2At(), [2], (node) => <OpenRunProvider value={open}>{node}</OpenRunProvider>);
    await act(async () => { fireEvent.click(send()); });
    fireEvent.click(screen.getByRole("button", { name: sc.intake.same.open(localDay(at)) }));
    expect(open).toHaveBeenCalledWith("suggested", same.runId, same.at, "refunded");
  });

  it("asks once on a same request, and Run it again sends it confirmed", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    const d = deps((opts) => ((opts as { confirmed?: boolean }).confirmed ? { ok: true } : same));
    const open = vi.fn<OpenRun>();
    await draw(d, v2At(), [2], (node) => <OpenRunProvider value={open}>{node}</OpenRunProvider>);
    await act(async () => { fireEvent.click(send()); });
    const date = localDay(at);
    const confirm = document.querySelector("[data-sc-same]") as HTMLElement;
    expect(confirm).not.toBeNull();
    // The default count (3) is 10 or fewer changes: a new run uses a credit, never 2.
    expect(confirm.textContent).toContain(sc.intake.same.body(date, 1));
    expect(confirm.textContent).not.toContain("2 credits");
    // The confirm stands in for the action row: nothing reserved, nothing reading.
    expect(screen.queryByRole("button", { name: sc.intake.send })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: sc.intake.same.open(date) }));
    expect(open).toHaveBeenCalledWith("suggested", same.runId, same.at, "credit");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: sc.intake.same.again })); });
    expect(d.run).toHaveBeenCalledTimes(2);
    expect(d.run.mock.calls[1][1]).toMatchObject({ requestedCount: 3, confirmed: true });
    expect(d.run.mock.calls[1][1].runId).not.toBe(d.run.mock.calls[0][1].runId);
  });

  it("holds Run it again off while the deck is off 99, keeping the confirm", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    const d = deps(() => same);
    const { rerender } = await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    await act(async () => {
      rerender(<TuningPanel deckId="d1" permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At(-1)} />);
    });
    const again = screen.getByRole("button", { name: sc.intake.same.again });
    expect(again.getAttribute("aria-disabled")).toBe("true");
    await act(async () => { fireEvent.click(again); });
    expect(d.run).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-sc-same]")).not.toBeNull();
    expect(document.querySelector("[data-sc-drift]")).not.toBeNull();
    // Back at 99 it presses, confirmed.
    await act(async () => {
      rerender(<TuningPanel deckId="d1" permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At(0)} />);
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: sc.intake.same.again })); });
    expect(d.run).toHaveBeenCalledTimes(2);
    expect(d.run.mock.calls[1][1]).toMatchObject({ confirmed: true });
  });

  it("drops the confirm when an input changes, and draws no Open without History", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    await draw(deps(() => same), v2At());
    await act(async () => { fireEvent.click(send()); });
    expect(document.querySelector("[data-sc-same]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: sc.intake.same.open(localDay(at)) })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: sc.intake.count.more }));
    expect(document.querySelector("[data-sc-same]")).toBeNull();
    expect(send()).toBeTruthy();
  });

  it("holds Send off a deck that drifted off 99, says why with the fixing link, and keeps every input", async () => {
    const d = deps();
    const onTopOff = vi.fn();
    const { rerender } = await draw(d, v2At());
    fireEvent.click(screen.getByRole("button", { name: sc.intake.count.more }));
    fireEvent.change(box(), { target: { value: "More removal.", selectionStart: 13 } });
    fireEvent.click(screen.getByRole("button", { name: /Down to 1 · Exhibition/ }));
    await act(async () => {
      rerender(<TuningPanel deckId="d1" permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At(-1, { onTopOff })} />);
    });
    const drift = document.querySelector("[data-sc-drift]") as HTMLElement;
    expect(drift.textContent).toContain("The deck is at 98 now.");
    expect(drift.textContent).toContain(sc.intake.drift(98).slice("The deck is at 98 now. ".length));
    expect(send().getAttribute("aria-disabled")).toBe("true");
    await act(async () => { fireEvent.click(send()); });
    expect(d.run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: sc.tile.topOff }));
    expect(onTopOff).toHaveBeenCalledTimes(1);
    // Kept: the count, the request and the bracket choice.
    expect((screen.getByRole("textbox", { name: sc.intake.count.countLabel }) as HTMLInputElement).value).toBe("4");
    expect(box().value).toBe("More removal.");
    expect(screen.getByRole("button", { name: /Down to 1 · Exhibition/ }).getAttribute("aria-pressed")).toBe("true");
    // Over 99 the link is Proposed cuts.
    const onProposedCuts = vi.fn();
    await act(async () => {
      rerender(<TuningPanel deckId="d1" permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At(3, { onProposedCuts })} />);
    });
    fireEvent.click(screen.getByRole("button", { name: sc.tile.proposedCuts }));
    expect(onProposedCuts).toHaveBeenCalledTimes(1);
    // Back at 99: Send is on, with the same inputs.
    await act(async () => {
      rerender(<TuningPanel deckId="d1" permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At(0)} />);
    });
    expect(document.querySelector("[data-sc-drift]")).toBeNull();
    await act(async () => { fireEvent.click(send()); });
    expect(d.run.mock.calls[0][1]).toMatchObject({ requestedCount: 4, request: "More removal.", bracket: { choice: "down", target: 1 } });
  });

  it("ends on what the run reads, in the spec's order and bold, and the last run's way to History", async () => {
    const d = deps();
    d.read = vi.fn(async () => ({ ...fresh, gameCount: 4, lastOkAt: at }));
    const toHistory = vi.fn();
    const withFocus: TuningFacts = { ...facts, intent: "go wide", focus: "artifacts" };
    await act(async () => render(
      <OpenHistoryProvider value={toHistory}>
        <TuningPanel deckId="d1" permits={[2]} facts={withFocus} onLogGame={vi.fn()} deps={d} v2={{ ...v2At(), hasOverview: true }} />
      </OpenHistoryProvider>,
    ));
    const reads = document.querySelector("[data-sc-reads]") as HTMLElement;
    const parts = [...reads.querySelectorAll("strong")].map((s) => s.textContent);
    expect(parts).toEqual([
      sc.intake.readsOverview,
      deckTuningCopy.manifest.readFocus(strategyName("artifacts")),
      deckDescriptionCopy.manifest.readDescription,
      deckTuningCopy.manifest.readGames(4),
    ]);
    expect(reads.textContent).toContain(`${sc.intake.reads} ${parts.join(" · ")}${sc.intake.reads2}`);
    fireEvent.click(screen.getByRole("button", { name: sc.intake.lastRun(localDay(at)) }));
    expect(toHistory).toHaveBeenCalledTimes(1);
    // The results' own read-from line is not drawn over a fresh intake as well.
    expect(document.body.textContent).not.toContain(deckTuningCopy.manifest.readFrom([]).trim());
  });

  it("leaves out what the deck lacks, and the link without a last run or a History", async () => {
    await draw(deps(), v2At());
    expect(document.querySelector("[data-sc-reads]")).toBeNull();
    const d = deps();
    d.read = vi.fn(async () => ({ ...fresh, gameCount: 2, lastOkAt: at }));
    await draw(d, v2At());
    const reads = document.querySelector("[data-sc-reads]") as HTMLElement;
    expect([...reads.querySelectorAll("strong")].map((s) => s.textContent)).toEqual([deckTuningCopy.manifest.readGames(2)]);
    expect(document.querySelector("[data-sc-last-run]")).toBeNull();
  });

  it("drops a same-request answer to a press made before the intake changed", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    let answer!: (r: unknown) => void;
    const d = deps();
    d.run = vi.fn(() => new Promise((resolve) => { answer = resolve; })) as unknown as typeof d.run;
    await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    // Edited while the press is out: the answer names a request no longer on screen.
    fireEvent.change(screen.getByPlaceholderText(sc.intake.request.placeholder), { target: { value: "Cut the legends." } });
    await act(async () => { answer(same); });
    expect(document.querySelector("[data-sc-same]")).toBeNull();
  });

  it("keeps the request, count and bracket choice when the panel leaves and comes back (a drift link)", async () => {
    const d = deps();
    const deck = "22222222-2222-4222-8222-222222222222";
    const at99 = () => <TuningPanel deckId={deck} permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At()} />;
    noteDeckRoute(`/decks/${deck}`);
    const first = await act(async () => render(at99()));
    fireEvent.change(box(), { target: { value: "Cut the legends." } });
    first.unmount();
    noteDeckRoute(`/decks/${deck}/cards`);
    await act(async () => render(at99()));
    expect(box().value).toBe("Cut the legends.");
  });

  it("starts the next visit fresh: leaving the deck drops the draft", async () => {
    const d = deps();
    const deck = "22222222-2222-4222-8222-222222222222";
    const at99 = () => <TuningPanel deckId={deck} permits={[2]} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2At()} />;
    noteDeckRoute(`/decks/${deck}`);
    const first = await act(async () => render(at99()));
    fireEvent.change(box(), { target: { value: "Cut the legends." } });
    first.unmount();
    noteDeckRoute("/collection");
    noteDeckRoute(`/decks/${deck}`);
    await act(async () => render(at99()));
    expect(box().value).toBe("");
  });

  it("drops the confirm when a restriction changes", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    const d = deps(() => same);
    await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    expect(document.querySelector("[data-sc-same]")).not.toBeNull();
    fireEvent.click(screen.getByText(deckDescriptionCopy.limits.ownOnly));
    expect(document.querySelector("[data-sc-same]")).toBeNull();
  });

  it("asks first: draws no reading state while the press is out, and none for a refusal", async () => {
    let answer!: (r: unknown) => void;
    const d = deps();
    d.run = vi.fn(() => new Promise((resolve) => { answer = resolve; })) as unknown as typeof d.run;
    await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    expect(d.run).toHaveBeenCalledTimes(1);
    // The run is not reserved yet: no reading state, no busy panel, the intake still drawn.
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(screen.queryByText(deckTuningCopy.panel.loadingHeading)).toBeNull();
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
    await act(async () => { answer({ ok: false, message: deckTuningCopy.run.refused }); });
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(screen.getAllByText(deckTuningCopy.run.refused).length).toBeGreaterThan(0);
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
    // The refusal re-reads once (review round 5), and a settled read leaves the intake as it was.
    expect(d.read).toHaveBeenCalledTimes(2);
  });

  it("a refusal for a run started in another tab re-reads, and watches that run", async () => {
    const d = deps(() => ({ ok: false, message: deckTuningCopy.run.refused }));
    await draw(d, v2At());
    const elsewhere: TuningState = {
      ...fresh, run: { id: "other-tab", status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } as never,
    };
    (d.read as ReturnType<typeof vi.fn>).mockImplementation(async () => elsewhere);
    await act(async () => { fireEvent.click(send()); });
    expect(d.read).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe("TuningPanel with Suggested changes v2 on: the wait and the results (UI PR 6)", () => {
  const RUN = "33333333-3333-4333-8333-333333333333";
  const ask = { runId: RUN, requestedCount: 3, units: 1, request: "More removal.", bracket: { choice: "keep" as const, target: 2 }, restrictions: null };
  const lines = [...[0, 1, 2, 3, 4].map((i) => v2Line(`a${i}`, "add", { position: i })), ...[0, 1, 2, 3, 4].map((i) => v2Line(`c${i}`, "cut", { position: 10 + i }))];
  const pending = (items = lines.slice(0, 2)): TuningState => ({
    ...fresh,
    run: { id: RUN, status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0, requestedCount: 3 },
    live: { runId: RUN, phase: "additions", in: { add: false, cut: false }, refilling: { add: false, cut: false }, items, newestPriceAsOf: null, ask },
  });
  const finished: TuningState = {
    ...okRun(RUN), run: { id: RUN, status: "ok", errorClass: null, createdAt: at, droppedCount: 0, requestedCount: 3 }, items: lines, itemsAsk: ask,
  };
  const v2Actions = () => ({ apply: vi.fn(async () => ({ ok: true as const, itemIds: [] })), undo: vi.fn(), pick: vi.fn(async () => ({ ok: true })) });

  it("draws the wait for a run being made, in place of the intake and its press", async () => {
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => pending());
    await draw(d, v2At());
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("wait");
    expect(document.querySelector("[data-sc-intake]")).toBeNull();
    expect(screen.queryByRole("button", { name: sc.intake.send })).toBeNull();
    expect(screen.queryByText(deckTuningCopy.panel.loadingHeading)).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: `${sc.results.pick} Card a0` })); });
    expect(d.v2.pick).toHaveBeenCalledWith("a0", true);
  });

  it("draws a finished v2 run's results with New run, which opens a fresh intake", async () => {
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => finished);
    await draw(d, v2At());
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain("“More removal.”");
    expect(document.querySelector("[data-sc-intake]")).toBeNull();
    // Retired on v2 rows: no Add, Reject, Apply all or Suggest again.
    for (const name of [deckTuningCopy.lists.add, deckTuningCopy.lists.reject, deckTuningCopy.lists.applyAll, deckTuningCopy.panel.again]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    fireEvent.click(screen.getByRole("button", { name: sc.run.newRun }));
    expect(document.querySelector("[data-sc-run]")).toBeNull();
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
    expect(box().value).toBe("");
    // The fresh intake alone: the v2 run's lines never fall into the v10 read-only set.
    expect(document.body.textContent).not.toContain(sc.pastRun);
    expect(document.body.textContent).not.toContain("Card a0");
    expect(screen.queryByRole("button", { name: deckTuningCopy.panel.again })).toBeNull();
  });

  it("hands a press to the panel's watch: the wait is drawn as the lines land, then the results", async () => {
    const d = { ...deps(), v2: v2Actions() };
    let now: TuningState = fresh;
    d.read = vi.fn(async () => now);
    d.run = vi.fn(async () => { now = pending(); return { ok: true }; }) as unknown as typeof d.run;
    await draw(d, v2At());
    await act(async () => { fireEvent.click(send()); });
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("wait");
    now = finished;
    await act(async () => { await new Promise((r) => setTimeout(r, 3200)); });
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    expect(document.querySelector('[role="status"]')!.textContent).toBe(deckTuningCopy.announce.readyLists(5, 5));
  });

  it("the watch waits for its own read: reads slower than the tick still land the finished run", async () => {
    vi.useFakeTimers();
    try {
      const d = { ...deps(), v2: v2Actions() };
      // The first read draws the wait; every watch read after it takes 4 seconds, longer than the 3-second tick.
      d.read = vi.fn()
        .mockResolvedValueOnce(pending())
        .mockImplementation(() => new Promise<TuningState>((r) => { setTimeout(() => r(finished), 4000); }));
      await draw(d, v2At());
      expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("wait");
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    } finally {
      vi.useRealTimers();
    }
  });

  it("New run after a run made here opens an empty request box, not the request just sent", async () => {
    const d = { ...deps(), v2: v2Actions() };
    let now: TuningState = fresh;
    d.read = vi.fn(async () => now);
    d.run = vi.fn(async () => { now = finished; return { ok: true }; }) as unknown as typeof d.run;
    await draw(d, v2At());
    fireEvent.change(box(), { target: { value: "More removal.", selectionStart: 13 } });
    await act(async () => { fireEvent.click(send()); });
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    fireEvent.click(screen.getByRole("button", { name: sc.run.newRun }));
    expect(box().value).toBe("");
  });

  it("a short run's new-run link opens the intake from a run History reopened", async () => {
    const short: TuningState = {
      ...finished,
      items: lines.slice(0, 7),
      review: { runId: RUN, at },
      itemsValidationReport: {
        askedCount: 0, survivedCount: 0, keptCount: 0,
        v2: {
          requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: true }, in: { add: true, cut: true }, refilling: { add: false, cut: false },
          shortReason: { add: null, cut: "notOwned" }, charge: { outcome: "spent" },
        },
      },
    };
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => short);
    await draw(d, v2At(), [2], (node) => <ReviewRunProvider value={{ tool: "suggested", runId: RUN }}>{node}</ReviewRunProvider>);
    expect(document.querySelector('[data-sc-short="bound"]')).not.toBeNull();
    // The head's New run too (History board B): an opened run offers it.
    expect(screen.getByRole("button", { name: sc.run.newRun })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: sc.short.boundLink }));
    expect(document.querySelector("[data-sc-run]")).toBeNull();
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
  });

  it("says a failed rerun above the earlier set it leaves on screen", async () => {
    const RUN2 = "44444444-4444-4444-8444-444444444444";
    const failed: TuningState = { ...finished, run: { id: RUN2, status: "failed", errorClass: "timeout", createdAt: at, droppedCount: 0, requestedCount: 3 } };
    const d = { ...deps(), v2: v2Actions() };
    let now: TuningState = finished;
    d.read = vi.fn(async () => now);
    d.run = vi.fn(async () => { now = failed; return { ok: true }; }) as unknown as typeof d.run;
    await draw(d, v2At());
    fireEvent.click(screen.getByRole("button", { name: sc.run.newRun }));
    await act(async () => { fireEvent.click(send()); });
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    expect(screen.getByTestId("tuning-failure")).toBeTruthy();
  });

  it("draws an open v10 run read-only once the switch is on (the cutover), with the intake for a new run", async () => {
    const d = deps();
    const v10 = lines.map((l) => ({ ...l, typeGroup: undefined, role: undefined, picked: undefined, applySet: undefined }));
    d.read = vi.fn(async () => ({ ...okRun(RUN), items: v10 }));
    await draw(d, v2At());
    expect(document.querySelector("[data-sc-run]")).toBeNull();
    expect(document.body.textContent).toContain(sc.pastRun);
    for (const name of [deckTuningCopy.lists.applyAll, deckTuningCopy.lists.add, deckTuningCopy.lists.reject]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
  });

  it("draws an older paired run read-only with its cards still open to inspection", async () => {
    const d = deps();
    const pair = {
      id: "p1", addOracleId: "add", addName: "Rhystic Study", addTypeLine: "Enchantment", cutOracleId: "cut", cutName: "Divination",
      rationale: "Draw.", rationaleShort: "", evidence: [], position: 0, verdict: "pending" as const, addImageUri: null, cutImageUri: null,
      owned: true, ownedQuantity: 1, availability: null, price: null, bracketAfter: null, applies: true, cutInDeck: true, addInDeck: false,
      cutLocked: false,
    };
    d.read = vi.fn(async () => ({ ...okRun(RUN), items: [pair] }));
    await draw(d, v2At());
    expect(document.body.textContent).toContain(sc.pastRun);
    expect(screen.queryByRole("button", { name: deckTuningCopy.card.apply })).toBeNull();
    expect(screen.getByRole("button", { name: deckTuningCopy.card.open("Divination") })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: deckTuningCopy.card.open("Rhystic Study") })).not.toBeDisabled();
  });

  it("with the switch off, a v10 set keeps Add, Reject and Apply all", async () => {
    const d = deps();
    const v10 = lines.map((l) => ({ ...l, typeGroup: undefined, role: undefined, picked: undefined, applySet: undefined }));
    d.read = vi.fn(async () => ({ ...okRun(RUN), items: v10 }));
    await draw(d, null);
    expect(screen.getByRole("button", { name: deckTuningCopy.lists.applyAll })).toBeTruthy();
    // Each line draws its answers twice (phone and desktop).
    expect(screen.getAllByRole("button", { name: deckTuningCopy.lists.reject })).toHaveLength(20);
    expect(document.body.textContent).not.toContain(sc.pastRun);
  });

  it("with the switch off, a stored v2 run still draws the v2 results: its Apply bar, never v10's Add, Reject or the deck going off 99", async () => {
    // History is what happened: the RUN's own ask decides the renderer, never the reader's switch. Two in and five out
    // would read "the deck goes to 96" under v10's Apply all.
    const uneven = [...lines.slice(0, 2), ...lines.slice(5)];
    const reopened: TuningState = { ...finished, items: uneven, review: { runId: RUN, at, readVersion: 4 } };
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => reopened);
    await draw(d, null, [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    // Read-only with the switch off (ruling F2(a)): its rows drawn, no Apply, Undo or pick control.
    expect(screen.getAllByRole("article", { name: "Card a0" }).length).toBeGreaterThan(0);
    expect(document.querySelector("[data-sc-bar]")).toBeNull();
    expect(document.querySelector("[data-sc-apply]")).toBeNull();
    expect(document.querySelector("[data-sc-pick]")).toBeNull();
    expect(screen.queryByRole("button", { name: sc.bar.undo(2) })).toBeNull();
    for (const name of [deckTuningCopy.lists.add, deckTuningCopy.lists.reject, deckTuningCopy.lists.applyAll]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(document.body.textContent).not.toContain("goes to 96");
    expect(document.body.textContent).not.toContain(sc.pastRun);
    // Small items 8, item 5: the run takes History C's past-run box, since nothing here can be applied now.
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-past")).toBe("stale");
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNoteUncounted);
    // Nor v10's intake under it: no Additional notes, no Kept for this deck, no v10 press.
    expect(screen.queryByRole("button", { name: deckTuningCopy.panel.again })).toBeNull();
    expect(screen.queryByLabelText(deckDescriptionCopy.notes.label)).toBeNull();
    expect(screen.queryByRole("button", { name: deckTuningCopy.panel.suggest })).toBeNull();
  });

  it("with the switch off, the read-only v2 run view calls no write action (apply, undo, pick) on mount or render", async () => {
    const reopened: TuningState = { ...finished, review: { runId: RUN, at, readVersion: 4 } };
    const actions = v2Actions();
    const d = { ...deps(), v2: actions };
    d.read = vi.fn(async () => reopened);
    await draw(d, null, [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    await act(async () => {});
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("results");
    expect(actions.apply).not.toHaveBeenCalled();
    expect(actions.undo).not.toHaveBeenCalled();
    expect(actions.pick).not.toHaveBeenCalled();
  });

  it("with the switch off, a stored v1 run (no stored ask) stays on the v1 view: no v2 bar, its own Add, Reject and Apply all", async () => {
    const v10 = lines.map((l) => ({ ...l, typeGroup: undefined, role: undefined, picked: undefined, applySet: undefined }));
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => ({ ...okRun(RUN), items: v10, itemsAsk: null }));
    await draw(d, null);
    expect(document.querySelector("[data-sc-run]")).toBeNull();
    expect(document.querySelector("[data-sc-bar]")).toBeNull();
    expect(screen.getByRole("button", { name: deckTuningCopy.lists.applyAll })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: deckTuningCopy.lists.add }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: deckTuningCopy.lists.reject }).length).toBeGreaterThan(0);
  });

  it("a stored v2 run's group heads read the same deck count with the switch off as with it on", async () => {
    const figures: RunFigures = { typeCounts: { Instants: 12 }, roles: [{ role: "removal", have: 6, target: 10 }] };
    // N = 5: the results group their lines only from GROUP_FROM_N (4) up, so the fixture's N = 3 draws no heads at all.
    const grouped: TuningState = {
      ...finished,
      run: { ...finished.run!, requestedCount: 5 },
      itemsAsk: { ...ask, requestedCount: 5 },
      review: { runId: RUN, at, readVersion: 4 },
    };
    const heads = async (v2: TuningV2 | null) => {
      const d = { ...deps(), v2: v2Actions() };
      d.read = vi.fn(async () => grouped);
      const view = await draw(d, v2, [2], (node) => (
        <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
      ), figures);
      // Each list's Instants head, as drawn (both lists' lines are Instants).
      const text = [...document.querySelectorAll("[data-sc-group='Instants'] h4")].map((h) => h.textContent ?? "");
      view.unmount();
      return text;
    };
    const on = await heads(v2At());
    const off = await heads(null);
    expect(on).toHaveLength(2);
    for (const head of on) expect(head).toContain(sc.results.typeHead(12));
    expect(off).toEqual(on);
  });

  it("the same stored v2 run with the switch on keeps its Apply bar and pick controls", async () => {
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => ({ ...finished, review: { runId: RUN, at, readVersion: 4 } }));
    await draw(d, v2At(), [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    expect(document.querySelector("[data-sc-bar]")).not.toBeNull();
    expect(document.querySelector("[data-sc-apply]")).not.toBeNull();
    expect(document.querySelector("[data-sc-pick]")).not.toBeNull();
  });

  it("a run History reopened (History B): its way back and meta above the heading, its note and live picks; gone with New run", async () => {
    const reopened: TuningState = { ...finished, review: { runId: RUN, at, readVersion: 4 } };
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => reopened);
    const back = vi.fn();
    await draw(d, v2At(), [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back } }}>{node}</ReviewRunProvider>
    ));
    const meta = document.querySelector("[data-sc-past-meta]") as HTMLElement;
    expect(meta.textContent).toBe(`${tuningHubCopy.history.back}${tuningHubCopy.history.pastMeta("Oct 26", 4, "1 credit")}`);
    // Above the heading, inside the panel.
    expect(meta.compareDocumentPosition(document.getElementById("tuning-heading")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: tuningHubCopy.history.back }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-past")).toBe("live");
    expect(document.querySelector("[data-sc-pick]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: sc.run.newRun }));
    expect(document.querySelector("[data-sc-past-meta]")).toBeNull();
    expect(document.querySelector("[data-sc-intake]")).not.toBeNull();
  });

  it("a reopened run with a set applied names the version it read on desktop (History B)", async () => {
    const SET = "55555555-5555-4555-8555-555555555555";
    const applied = lines.map((l, i) => (i % 5 < 3 ? { ...l, verdict: "accepted" as const, applySet: SET } : l));
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => ({ ...finished, items: applied, review: { runId: RUN, at, readVersion: 4 } }));
    await draw(d, v2At(), [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    expect(document.querySelector("[data-sc-lead-wide]")!.textContent).toBe(` ${sc.history.oldRunRestVersion(4, 4)}`);
  });

  it("a run History reopened after a newer version (History C): read-only, the past-run note, no Apply", async () => {
    const stale: TuningState = { ...finished, review: { runId: RUN, at, readVersion: 3 }, retired: { from: 3, to: 5 } };
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => stale);
    await draw(d, v2At(), [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    expect(document.querySelector("[data-sc-past-meta]")!.textContent).toContain(tuningHubCopy.history.pastMeta("Oct 26", 3, "1 credit"));
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-past")).toBe("stale");
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNoteUncounted);
    expect(document.querySelector("[data-sc-pick]")).toBeNull();
    expect(document.querySelector("[data-sc-bar]")).toBeNull();
    // New run still opens a fresh intake (README item 7: no Suggest again).
    expect(screen.getByRole("button", { name: sc.run.newRun })).toBeTruthy();
  });

  it("History C counts the list's change when the read says how far it moved", async () => {
    const stale: TuningState = { ...finished, review: { runId: RUN, at, readVersion: 3, moved: 7 }, retired: { from: 3, to: 5 } };
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => stale);
    await draw(d, v2At(), [2], (node) => (
      <ReviewRunProvider value={{ tool: "suggested", runId: RUN, past: { at: at.toISOString(), tier: "credit", back: vi.fn() } }}>{node}</ReviewRunProvider>
    ));
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNote(7));
  });

  it("a run reopened without History's v2 chrome (a v10 row) draws no meta line", async () => {
    const d = { ...deps(), v2: v2Actions() };
    d.read = vi.fn(async () => ({ ...finished, review: { runId: RUN, at, readVersion: 4 } }));
    await draw(d, v2At(), [2], (node) => <ReviewRunProvider value={{ tool: "suggested", runId: RUN }}>{node}</ReviewRunProvider>);
    expect(document.querySelector("[data-sc-past-meta]")).toBeNull();
  });
});
