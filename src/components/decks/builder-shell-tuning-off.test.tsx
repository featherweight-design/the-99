// With Analysis on and Tuning off (TUNING_ENABLED unset), the shell must withhold every surface
// that spends a Suggested-changes credit: no tuning render-prop/section and no tuning-specific
// prompt in the Analysis empty state. The credit lines name no feature since 2026-10-12 (Hugh,
// link, never list: `src/lib/copy/credits.ts`), so no switch reaches them: the Overview takes no
// `tuning` prop and the press notes take only the view and the press.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

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

const seen = vi.hoisted(() => ({ panel: null as null | Record<string, unknown>, notes: [] as unknown[][] }));
// The Analysis tab, standing in to hand back what the shell gave it.
vi.mock("./analysis-panel", () => ({
  AnalysisPanel: (p: Record<string, unknown>) => { seen.panel = p; return null; },
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

function renderWithAnalysisOnly() {
  seen.panel = null;
  seen.notes = [];
  render(
    // tuningEnabled omitted — defaults false, which is Tuning off.
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      analysisEnabled initialView="analysis" />,
  );
  return seen.panel as unknown as {
    tuning?: (permits: number[]) => unknown;
    tuningEnabled?: boolean;
    overview: { props: { tuning?: boolean } } | null;
  };
}

describe("BuilderShell — Analysis on, Tuning off", () => {
  it("mounts no tuning section, withholds the empty-state prompt, and hands no switch to any credit line", () => {
    const panel = renderWithAnalysisOnly();

    // No tuning section/callback: `tuning={!tuningEnabled ? undefined : (permits) => (...)}` in
    // builder-shell.tsx (~line 1594) is the gate; with it removed this reads a function instead.
    expect(panel.tuning).toBeUndefined();

    // The Analysis empty state's own help text promises "suggest more accurate card swaps", so
    // `AnalysisPanel`'s `tuningEnabled` prop — which AnalysisEmpty uses to withhold that field
    // entirely — must be false too.
    expect(panel.tuningEnabled).toBe(false);

    // The credit lines name no feature (Hugh, 2026-10-12: link, never list), so no switch reaches
    // them: the Overview takes no `tuning` prop, and the press notes take the view and the press.
    expect(panel.overview?.props.tuning).toBeUndefined();
    expect(seen.notes.length).toBeGreaterThanOrEqual(2);
    expect(seen.notes.every((args) => args.length === 2)).toBe(true);
  });
});
