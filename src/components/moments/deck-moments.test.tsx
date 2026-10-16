// The deck page's and Games' moments (discovery R1, PR 2): each control registers its moment under the condition the
// screen's own data gives it, and shows the bubble once on screen. The rules themselves are the provider's tests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ARRIVE_MS, MomentsProvider } from "./moments-provider";
import { MOMENTS, type MomentId } from "../../lib/moments/registry";
import { RoleCounterCell } from "../decks/role-counter-cell";
import { GameMatchups } from "../decks/game-matchups";
import { BuilderTabs } from "../decks/builder-tabs";
import { summarizeMatchups } from "../../lib/decks/matchups";
import type { DeckGame } from "../../lib/decks/games";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import { useMomentAnchor } from "./moments-provider";
import { momentsCopy } from "../../lib/copy/moments";

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: async () => {} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/decks/d1" }));

let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    notify = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const ALL = MOMENTS.map((m) => m.id) as MomentId[];

function wrap(node: ReactNode, spent: string[] = []) {
  return render(
    <MomentsProvider live={ALL} spent={spent}>
      {node}
    </MomentsProvider>,
  );
}
async function seen(el: Element) {
  act(() => notify!([{ target: el, isIntersecting: true }]));
  await act(async () => {
    vi.advanceTimersByTime(ARRIVE_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notify = null;
});

describe("M4, the land cell", () => {
  const cell = (balanceMoment: boolean) => (
    <RoleCounterCell label="Land" have={36} target={37} advisory={false} onBalanceMana={() => {}} balanceMoment={balanceMoment} />
  );
  it("carries Mana Balance at the deck's size, once Suggested changes is spent", async () => {
    wrap(cell(true), ["suggested-changes"]);
    await seen(screen.getByRole("button"));
    expect(screen.getByRole("note", { name: momentsCopy.noteName(momentsCopy.manaBalance.tool) })).toBeTruthy();
  });
  it("draws nothing off its size", async () => {
    wrap(cell(false), ["suggested-changes"]);
    await seen(screen.getByRole("button"));
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("M10, the Matchups switch", () => {
  const game = (id: string): DeckGame => ({
    id, result: "win", podSize: 4, playedAt: new Date("2026-10-01"), versionNumber: null, note: null, worked: [], hurt: [],
  });
  const seat: GameOpponent = {
    seat: 1, friend: null, deckName: null, commander: { oracleId: "y", name: "Yuriko", imageUri: null }, partner: null,
    colorIdentity: ["U", "B"], label: null, won: false,
  };
  const matchups = (n: number) => {
    const games = Array.from({ length: n }, (_, i) => game(`g${i}`));
    return summarizeMatchups(games, new Map(games.map((g) => [g.id, [seat]])));
  };
  it("arrives from the deck's third game", async () => {
    wrap(<GameMatchups matchups={matchups(3)} />);
    await seen(screen.getByRole("radiogroup"));
    expect(screen.getByRole("note", { name: momentsCopy.noteName(momentsCopy.matchups.tool) })).toBeTruthy();
  });
  it("not before it", async () => {
    wrap(<GameMatchups matchups={matchups(2)} />);
    await seen(screen.getByRole("radiogroup"));
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("the Analysis tab's anchor", () => {
  function Tabs() {
    const m = useMomentAnchor("suggested-changes", { eligible: true, copy: momentsCopy.suggestedChanges });
    return (
      <BuilderTabs
        tabs={[
          { id: "deck", label: "Your deck", accessibleName: "Your deck" },
          { id: "analysis", label: "Analysis", accessibleName: "Analysis" },
        ]}
        view="deck"
        onViewChange={() => {}}
        anchor={{ view: "analysis", ref: m.ref, describedBy: m["aria-describedby"] }}
      />
    );
  }
  it("lands on the named tab, which the note describes", async () => {
    wrap(<Tabs />);
    const tab = screen.getByRole("tab", { name: "Analysis" });
    await seen(tab);
    const note = screen.getByRole("note", { name: momentsCopy.noteName(momentsCopy.suggestedChanges.tool) });
    expect(tab.getAttribute("aria-describedby")).toBe(note.id);
    expect(screen.getByRole("tab", { name: "Your deck" }).getAttribute("aria-describedby")).toBeNull();
  });
});
