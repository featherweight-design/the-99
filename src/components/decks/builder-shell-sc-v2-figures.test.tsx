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

const seen = vi.hoisted(() => ({ hub: null as null | Record<string, unknown> }));
vi.mock("./tuning-hub", () => ({
  TuningHub: (p: Record<string, unknown>) => { seen.hub = p; return null; },
}));
// A reading held, so the Tuning tab hands Suggested changes its permits and the hub its panel (tool discovery B2).
vi.mock("./use-deck-profile", async (importActual) => {
  const actual = await importActual<typeof import("./use-deck-profile")>();
  const { deckProfile } = await import("./__fixtures__/deck-profile");
  const state = { kind: "ready" as const, profile: deckProfile(), analyzedAt: "2026-01-02T00:00:00.000Z", fresh: true, versionNumber: null };
  return { ...actual, useDeckProfile: () => ({ state, request: vi.fn(), peek: vi.fn(), peekSettled: true }) };
});
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
  seen.hub = null;
  render(
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      suggestedChangesV2={suggestedChangesV2} initialView="tuning" />,
  );
  // Suggested changes mounts inside the Tuning hub's tile (its own switch is retired): the first tool the hub is handed.
  type Panel = ReactElement<{ runFigures?: RunFigures; v2: unknown }>;
  const hub = seen.hub as unknown as { tools: { tool: string; panel?: Panel | null }[] };
  const suggested = hub.tools.find((t) => t.tool === "suggested")!;
  return suggested.panel!.props;
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
