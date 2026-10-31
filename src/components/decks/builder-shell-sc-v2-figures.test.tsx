// Suggested changes v2's group heads (`n in the deck`) read the deck's own figures. A stored v2 run is drawn read-only with
// the reader's switch off (#2497), so those figures are a READ the shell hands the panel whatever the switch says: with
// them built only under the switch, the same run read "0 in the deck" switch-off and "12 in the deck" switch-on.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";
import { groupLines } from "../../lib/tuning/v2/results";
import { v2Line } from "../../lib/tuning/v2/results-fixture";
import type { RunFigures } from "./suggested-changes-run";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/notices/actions", () => ({ peekNotices: vi.fn(async () => null), openNotices: vi.fn(async () => null) }));

const seen = vi.hoisted(() => ({ panel: null as null | Record<string, unknown> }));
vi.mock("./analysis-panel", () => ({
  AnalysisPanel: (p: Record<string, unknown>) => { seen.panel = p; return null; },
}));
vi.mock("./synopsis-state", () => ({
  useDeckSynopsis: () => ({ view: { kind: "ready", state: {}, busy: false, current: true }, write: vi.fn(), retry: vi.fn() }),
}));

const { BuilderShell } = await import("./builder-shell");

const card = (id: string, quantity: number, cardTypeGroup: string) => ({
  oracleId: id, name: id, quantity, typeLine: cardTypeGroup, cardTypeGroup, role: "other" as const, owned: true,
});
const DECK = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold", name: "Korvold, Fae-Cursed King", colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}", typeLine: "Legendary Creature — Dragon Noble", oracleText: null, imageUri: null,
  },
  partner: null,
  cards: [card("a", 7, "Instants"), card("b", 5, "Instants"), card("c", 1, "Artifacts")],
  built: 13,
  ownedCount: 13,
  toBuyCount: 0,
  total: 13,
  unresolvedRows: [],
} as unknown as DeckDetail;

/** The props the shell hands Suggested changes' panel, with the reader's v2 switch as given. */
function panelProps(suggestedChangesV2: boolean): { runFigures?: RunFigures; v2: unknown } {
  seen.panel = null;
  render(
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      analysisEnabled tuningEnabled suggestedChangesV2={suggestedChangesV2} initialView="analysis" />,
  );
  const tuning = (seen.panel as unknown as { tuning: (permits: number[]) => ReactElement<{ runFigures?: RunFigures; v2: unknown }> }).tuning;
  return tuning([2]).props;
}

/** The By type head's count a stored run's Instants group draws, as the run view reads it. */
const instantsHead = (figures: RunFigures | undefined) =>
  groupLines([v2Line("a0", "add")], "type", figures ?? { typeCounts: {}, roles: [] }, () => false)[0]!.have;

describe("BuilderShell: a stored v2 run's group heads with Suggested changes v2 off", () => {
  it("hands the panel the deck's figures with the switch off, the same as with it on", () => {
    const on = panelProps(true);
    const off = panelProps(false);
    // The switch still gates the intake and every write: off hands no v2.
    expect(off.v2).toBeNull();
    expect(on.v2).not.toBeNull();
    expect(instantsHead(on.runFigures)).toBe(12);
    expect(instantsHead(off.runFigures)).toBe(12);
    expect(off.runFigures).toEqual(on.runFigures);
  });
});
