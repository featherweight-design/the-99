// tool discovery B2: opening the Tuning tab is counted (`tuning_opened`, plan §6). A press of the tab row counts
// `from: "tab"` with the hub as its tool, an arrival on Tuning by its address counts `from: "url"` once, with Consider for
// the retired `?tab=consider`, and a press while already on Tuning counts nothing.
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

const capture = vi.hoisted(() => vi.fn());
vi.mock("../../lib/analytics/posthog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/analytics/posthog")>()),
  captureToolEvent: capture,
}));
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

const seen = vi.hoisted(() => ({ panel: null as null | Record<string, unknown>, hub: null as null | Record<string, unknown>, notes: [] as unknown[][] }));
// The Analysis tab, standing in to hand back what the shell gave it.
vi.mock("./analysis-panel", () => ({
  AnalysisPanel: (p: Record<string, unknown>) => { seen.panel = p; return null; },
}));
// The Tuning hub, standing in to hand back the tools the shell gave it.
vi.mock("./tuning-hub", () => ({
  TuningHub: (p: Record<string, unknown>) => { seen.hub = p; return null; },
}));
// A synopsis that has read, so the overview is drawn at all.
vi.mock("./synopsis-state", () => ({
  useDeckSynopsis: () => ({ view: { kind: "ready", state: {}, busy: false, current: true }, write: vi.fn(), retry: vi.fn() }),
}));
vi.mock("./synopsis-note", () => ({
  pressNote: (...args: unknown[]) => { seen.notes.push(args); return null; },
}));

const { BuilderShell } = await import("./builder-shell");

const DECK = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold", name: "Korvold, Fae-Cursed King", colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}", typeLine: "Legendary Creature — Dragon Noble", oracleText: null, imageUri: null,
  },
  partner: null,
  cards: [{ oracleId: "sol-ring", name: "Sol Ring", quantity: 1, typeLine: "Artifact", cardTypeGroup: "Artifacts" as const, role: "other" as const, owned: true }],
  built: 1,
  ownedCount: 1,
  toBuyCount: 0,
  total: 1,
  unresolvedRows: [],
} as unknown as DeckDetail;

function renderAt(initialView: "deck" | "tuning", initialHubTool: "consider" | null = null) {
  return render(
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      initialView={initialView} initialHubTool={initialHubTool} />,
  );
}
const tuningEvents = () => capture.mock.calls.filter(([name]) => name === "tuning_opened").map(([, props]) => props);

describe("BuilderShell — tuning_opened", () => {
  beforeEach(() => capture.mockClear());

  it("counts a press of the Tuning tab once, as the hub, and nothing for a press while already there", () => {
    renderAt("deck");
    expect(tuningEvents()).toEqual([]);
    fireEvent.click(document.getElementById("tab-tuning") as HTMLElement);
    expect(tuningEvents()).toEqual([{ from: "tab", tool: "hub" }]);
    fireEvent.click(document.getElementById("tab-tuning") as HTMLElement);
    expect(tuningEvents()).toHaveLength(1);
  });

  it("counts an arrival on Tuning by its address once, naming Consider for the retired ?tab=consider", () => {
    renderAt("tuning");
    expect(tuningEvents()).toEqual([{ from: "url", tool: "hub" }]);
    capture.mockClear();
    renderAt("tuning", "consider");
    expect(tuningEvents()).toEqual([{ from: "url", tool: "consider" }]);
  });

  it("counts nothing for an arrival on another tab", () => {
    renderAt("deck");
    expect(tuningEvents()).toEqual([]);
  });
});
