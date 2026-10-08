// The deeper-looks boundary: the shell hands HELP_ME_CHOOSE_ENABLED, as `deeperLooks`, to every
// surface that draws a credit line (the overview, Suggested changes, and the press notes beside
// Analyze). A default-false prop is how a switch ships dead, so this reads what each one RECEIVES
// from a shell that was handed true, rather than trusting the prop is threaded.
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

function received(deeperLooks: boolean | undefined) {
  seen.panel = null;
  seen.notes = [];
  render(
    // tuningEnabled: this test is about deeperLooks threading, not the tuning switch itself —
    // on, so `panel.tuning` still mounts and the Suggested-changes credit line can be read.
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      analysisEnabled tuningEnabled initialView="analysis" {...(deeperLooks === undefined ? {} : { deeperLooks })} />,
  );
  const panel = seen.panel as unknown as { overview: { props: { deeperLooks?: boolean } } | null; tuning: (permits: number[]) => { props: { deeperLooks?: boolean } } };
  return {
    overview: panel.overview?.props.deeperLooks,
    tuning: panel.tuning([]).props.deeperLooks,
    notes: seen.notes.map((args) => args[2]),
  };
}

describe("BuilderShell — the deeper-looks flag reaches every credit line", () => {
  it("hands true to the overview, Suggested changes and both press notes", () => {
    const got = received(true);
    expect(got.overview).toBe(true);
    expect(got.tuning).toBe(true);
    expect(got.notes.length).toBeGreaterThanOrEqual(2);
    expect(got.notes.every((d) => d === true)).toBe(true);
  });

  it("hands false when the page passes nothing, so the lines read as before the looks", () => {
    const got = received(undefined);
    expect([got.overview, got.tuning]).toEqual([false, false]);
    expect(got.notes.every((d) => d === false)).toBe(true);
  });
});
