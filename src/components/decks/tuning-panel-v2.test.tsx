import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { localDay } from "../../lib/copy/credits";
import { strategyName } from "../../lib/copy/strategy-focus";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { noteDeckRoute, resetDeckVisitForTests, visitBaseline } from "../../lib/decks/visit";
import type { TuningState } from "../../lib/tuning/state";
import { usualFor } from "../../lib/tuning/v2/intake";
import type { Bracket } from "../../lib/profile/types";
import { OpenHistoryProvider, OpenRunProvider, type OpenRun } from "./review-run";
import { TuningPanel, type TuningDeps, type TuningFacts, type TuningV2 } from "./tuning-panel";

vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), dismissSuggestion: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(),
  saveDeckLimits: vi.fn(async () => ({ ok: true })), undoSuggestion: vi.fn(),
}));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }), useCardIntent: () => ({}) }));

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

async function draw(d: TuningDeps, v2: TuningV2 | null, permits: Bracket[] = [2], wrap?: (node: React.ReactNode) => React.ReactNode) {
  const panel = <TuningPanel deckId="d1" permits={permits} facts={facts} onLogGame={vi.fn()} deps={d} v2={v2} />;
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

  it("asks once on a same request, and Run it again sends it confirmed", async () => {
    const same = { ok: false, confirm: "same_request", runId: "11111111-1111-4111-8111-111111111111", at: at.toISOString() };
    const d = deps((opts) => ((opts as { confirmed?: boolean }).confirmed ? { ok: true } : same));
    const open = vi.fn<OpenRun>();
    await draw(d, v2At(), [2], (node) => <OpenRunProvider value={open}>{node}</OpenRunProvider>);
    await act(async () => { fireEvent.click(send()); });
    const date = localDay(at);
    const confirm = document.querySelector("[data-sc-same]") as HTMLElement;
    expect(confirm).not.toBeNull();
    expect(confirm.textContent).toContain(sc.intake.same.body(date));
    // The confirm stands in for the action row: nothing reserved, nothing reading.
    expect(screen.queryByRole("button", { name: sc.intake.send })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: sc.intake.same.open(date) }));
    expect(open).toHaveBeenCalledWith("suggested", same.runId, same.at);
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
    expect(d.read).toHaveBeenCalledTimes(1);
  });
});
