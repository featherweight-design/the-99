import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { BuilderShell } from "./builder-shell";
import { proxyCopy } from "../../lib/copy/proxies";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/decks/d1",
  useSearchParams: () => new URLSearchParams(),
}));

// The COUNT AT ITS CALL SITE. `proxy-count.test.ts` pins the helper, which stays
// green if the shell stops calling it, passes the wrong commander, or drops the
// line — so this renders the header and reads the sentence.
const deck = (over: Partial<DeckDetail>): DeckDetail => ({
  id: "d1",
  name: "HD Gods",
  commander: {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}",
    typeLine: "Legendary Creature — Dragon Noble",
    oracleText: null,
    imageUri: null,
  },
  partner: null,
  cards: [],
  built: 0,
  ownedCount: 0,
  coveredCount: 0,
  toBuyCount: 0,
  total: 0,
  unresolvedRows: [],
  ...over,
} as unknown as DeckDetail);

const card = (over: Record<string, unknown>) => ({
  cmc: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  oracleId: "sol-ring",
  name: "Sol Ring",
  quantity: 1,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts" as const,
  role: "other" as const,
  owned: true,
  ...over,
} as unknown as DeckDetail["cards"][number]);

async function mount(detail: DeckDetail) {
  await act(async () => {
    render(
      <BuilderShell
        deck={detail}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        initialView="deck"
       newestAsOf={null}/>,
    );
  });
}

describe("the proxy count in the deck header", () => {
  it("is absent when the deck prints nothing", async () => {
    await mount(deck({ cards: [card({})], built: 1, ownedCount: 1 }));
    expect(screen.queryByText(proxyCopy.deckHeader.line(1))).toBeNull();
  });

  it("counts a printed body card", async () => {
    await mount(deck({
      cards: [card({ owned: false, proxied: true })], built: 1, ownedCount: 0,
    }));
    expect(screen.getAllByText(proxyCopy.deckHeader.line(1)).length).toBeGreaterThan(0);
  });

  it("counts a printed commander with the list", async () => {
    const detail = deck({
      cards: [card({ owned: false, proxied: true })], built: 1, ownedCount: 0,
    });
    await mount({ ...detail, commander: { ...detail.commander, proxied: true } });
    expect(screen.getAllByText(proxyCopy.deckHeader.line(2)).length).toBeGreaterThan(0);
  });

  it("folds a commander that is also a row on its own list", async () => {
    // One card, one mark — the deduplication the helper does and the call site
    // has to preserve by passing the same ids.
    const detail = deck({
      cards: [card({ oracleId: "korvold", owned: false, proxied: true })],
      built: 1,
      ownedCount: 0,
    });
    await mount({ ...detail, commander: { ...detail.commander, proxied: true } });
    expect(screen.getAllByText(proxyCopy.deckHeader.line(1)).length).toBeGreaterThan(0);
    expect(screen.queryByText(proxyCopy.deckHeader.line(2))).toBeNull();
  });
});
