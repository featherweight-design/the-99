import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import type { CutItem, CutsPanel } from "../../lib/tuning/cuts-state";
import { CutRowView, CutsCountingView, CutsFailedView, CutsView, type CutsViewProps } from "./cuts-view";

// No module mock on purpose: the view draws from props alone, so it renders with no card-detail provider, no server
// action and no auth. A regression that pulls any of them in fails at import, before a case runs.
const copy = deckCutsCopy.panel;

const panel: CutsPanel = {
  run: null,
  items: [],
  itemsReport: null,
  lastOkFingerprint: null,
  lastOkAt: null,
  modelVersionMoved: false,
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  review: null,
  total: 110,
  bodySize: 99,
  over: 10,
  commander: "Zul Ashur, Lich Lord",
  allLocked: false,
  lockedCount: 0,
  keyCount: 8,
  declaredBracket: 2,
  edhrecDecks: 3309,
  thin: false,
  rows: [{ key: "role:draw", source: "role", label: "Card draw", figure: 8, note: "rec 7 · 1 over" }],
  chips: { medianPct: 46, flagCounts: {}, declared: 2 },
  resultCurrent: false,
  asked: 0,
};

const item = (id: string, verdict: CutItem["verdict"] = "pending"): CutItem => ({
  id, cutOracleId: `o-${id}`, cutName: `Card ${id}`, cutTypeLine: "Creature", cutImageUri: null,
  reason: `Why ${id} goes.`, evidence: [], position: 0, verdict,
});

const base = (over: Partial<CutsViewProps> = {}): CutsViewProps => ({
  panel, verdictOf: (i) => i.verdict, running: false, failed: false, refusedRun: false, resultShown: false,
  priorResult: false, reviewing: false, elapsed: "0:00", refused: null, announced: "", onPress: vi.fn(),
  renderRow: (i) => <span>{i.cutName}</span>, ...over,
});

afterEach(cleanup);

describe("CutsView draws from props alone", () => {
  it("draws the count and the Look deeper offer, and the press goes to the handler it was given", () => {
    const onPress = vi.fn();
    render(<CutsView {...base({ onPress })} />);
    expect(screen.getByRole("heading", { name: copy.heading })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws the running band with the clock it was handed, in place of the offer", () => {
    render(<CutsView {...base({ running: true, elapsed: "1:07" })} />);
    expect(screen.getByText(copy.deeper.pending)).toBeTruthy();
    expect(screen.getByText(`${copy.deeper.pendingRead} · 1:07`)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeNull();
  });

  it("draws the named rows through renderRow, with the short slots for what the run did not name", () => {
    const items = [item("a"), item("b")];
    render(<CutsView {...base({ panel: { ...panel, items, asked: 3, resultCurrent: true }, resultShown: true })} />);
    expect(screen.getByText("Card a")).toBeTruthy();
    expect(screen.getByText("Card b")).toBeTruthy();
    expect(screen.getAllByTestId("short-slot")).toHaveLength(1);
  });

  it("draws a refusal the panel kept", () => {
    render(<CutsView {...base({ refused: "That card is locked." })} />);
    expect(screen.getByRole("alert").textContent).toContain("That card is locked.");
  });

  it("draws the failed and counting frames with no props but the heading ref", () => {
    render(<CutsFailedView />);
    expect(screen.getByRole("heading", { name: (n) => n.endsWith(copy.failed.heading) })).toBeTruthy();
    cleanup();
    render(<CutsCountingView />);
    expect(screen.getByText(copy.counting)).toBeTruthy();
  });
});

describe("CutRowView", () => {
  const row = (over: Partial<Parameters<typeof CutRowView>[0]> = {}) => (
    <CutRowView item={item("a")} verdict="pending" reviewing={false} chipSet={panel.chips} busy={false}
      onAnswer={vi.fn()} onOpen={vi.fn()} {...over} />
  );

  it("offers Cut and Keep, and reports each press by kind", () => {
    const onAnswer = vi.fn();
    render(row({ onAnswer }));
    fireEvent.click(screen.getByRole("button", { name: copy.cut }));
    fireEvent.click(screen.getByRole("button", { name: copy.keep }));
    expect(onAnswer.mock.calls).toEqual([["cut"], ["keep"]]);
  });

  it("opens the card from the name, with the hover and intent handlers it was handed", () => {
    const onOpen = vi.fn();
    const onMouseEnter = vi.fn();
    render(row({ onOpen, previewHandlers: { onMouseEnter } }));
    const name = screen.getByRole("button", { name: "Card a" });
    fireEvent.mouseEnter(name);
    fireEvent.click(name);
    expect(onMouseEnter).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("draws an answered cut with its undo, and a kept one with its show-again", () => {
    const onAnswer = vi.fn();
    render(row({ verdict: "accepted", onAnswer }));
    expect(screen.getByTestId("answered-cut")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.undo }));
    expect(onAnswer).toHaveBeenCalledWith("undo");
    cleanup();
    render(row({ verdict: "dismissed", onAnswer }));
    fireEvent.click(screen.getByRole("button", { name: copy.showAgain }));
    expect(onAnswer).toHaveBeenLastCalledWith("restore");
  });

  it("disables every press while one is in flight", () => {
    render(row({ busy: true }));
    expect((screen.getByRole("button", { name: copy.cut }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: copy.keep }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("draws a reopened run's cut the deck has moved past as drawn, never offered", () => {
    render(row({ reviewing: true, item: { ...item("a"), inDeck: false } }));
    expect(screen.getByTestId("answered-broken")).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.cut })).toBeNull();
  });
});
