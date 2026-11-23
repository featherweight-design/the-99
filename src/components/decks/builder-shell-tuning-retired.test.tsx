// Suggested changes' own switch is retired (Hugh 2026-11-01): the Tuning tab mounts the hub, which holds Suggested
// changes, and the Analysis panel takes no tool mounts, no hub and no Suggested changes switch (tool discovery B2). The credit
// lines name no feature since 2026-10-12 (Hugh, link, never list: `src/lib/copy/credits.ts`), so no switch reaches
// them: the Overview takes no `tuning` prop and the press notes take only the view and the press.
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

function renderWithAnalysisOnly() {
  seen.panel = null;
  seen.notes = [];
  render(
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      initialView="analysis" />,
  );
  return seen.panel as unknown as Record<string, unknown> & {
    overview: { props: { tuning?: boolean } } | null;
  };
}

describe("BuilderShell — Analysis on, Suggested changes retired", () => {
  it("hands Analysis no hub, no direct tool or Suggested changes switch, and hands no switch to any credit line", () => {
    const panel = renderWithAnalysisOnly();

    // Every Tuning tool lives in the hub, on its own tab: Analysis is handed none of them.
    for (const prop of ["hub", "tuning", "cuts", "mana", "tuningEnabled", "hubDraws"]) expect(panel, prop).not.toHaveProperty(prop);

    // The credit lines name no feature (Hugh, 2026-10-12: link, never list), so no switch reaches
    // them: the Overview takes no `tuning` prop, and the press notes take the view and the press.
    expect(panel.overview?.props.tuning).toBeUndefined();
    expect(seen.notes.length).toBeGreaterThanOrEqual(2);
    expect(seen.notes.every((args) => args.length === 2)).toBe(true);
  });

  it("mounts the hub on the Tuning tab, Consider first and Suggested changes among its tools", () => {
    seen.hub = null;
    render(
      <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
        commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
        initialView="tuning" />,
    );
    const tools = (seen.hub as unknown as { tools: { tool: string }[] }).tools.map((t) => t.tool);
    expect(tools).toEqual(["consider", "suggested", "mana", "cuts", "history"]);
  });
});
