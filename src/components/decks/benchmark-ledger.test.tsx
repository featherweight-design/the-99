import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { DependencyWire, LedgerWireCard, WinLineWire, WireCard } from "../../lib/benchmarks/wire";
import { deckBenchmarksCopy as copy } from "../../lib/copy/deck-benchmarks";
import { benchmarksWire as wire, wireFixtureCard } from "./__fixtures__/benchmarks";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
const { BenchmarkLedger } = await import("./benchmark-ledger");

const L = copy.ledger;
const ART = new Map<string, { name: string; imageUri: string | null }>();
const wc = (name: string, over: Partial<WireCard> = {}): LedgerWireCard => ({ ...wireFixtureCard(name), ...over });

type Props = Partial<React.ComponentProps<typeof BenchmarkLedger>>;
const mount = (which: Props["which"], props: Props = {}) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <BenchmarkLedger benchmarks={wire()} which={which!} art={ART} onClose={() => {}} {...props} />
    </CardDetailProvider>,
  );

const dialog = () => screen.getByRole("dialog");
const groups = () => Array.from(dialog().querySelectorAll<HTMLElement>("[data-ledger-group]"));
const rowNames = (group: HTMLElement) => Array.from(group.querySelectorAll("[data-card-row]")).map((r) => r.querySelector("span.truncate")!.textContent);

const velocity = wire({
  velocity: {
    step: 3, index: 3.4, lands: 36, points: 2.5, averageManaValue: 3.14, commanderTurn: 4, commanderName: "Omnath",
    counted: [
      { card: wc("Rampant Growth", { manaValue: 2, typeLine: "Sorcery" }), points: 1, why: "land" },
      { card: wc("Cultivate", { manaValue: 3, typeLine: "Sorcery" }), points: 0.5, why: "land" },
      { card: wc("Sol Ring", { manaValue: 1, typeLine: "Artifact" }), points: 1, why: "ramp" },
    ],
    notCounted: [{ card: wc("Goblin Electromancer", { manaValue: 2 }), points: 0, why: "costReduction" }],
  },
});

describe("BenchmarkLedger, graded", () => {
  it("draws the velocity ledger: mini meter, title, step word, reading, scale and both groups in order", () => {
    mount("velocity", { benchmarks: velocity });
    const d = dialog();
    expect(within(d).getByRole("heading", { level: 2 }).textContent).toBe(copy.names.velocity);
    expect(d.querySelector("[data-mini-meter]")!.getAttribute("data-mini-meter")).toBe("3");
    expect(within(d).getAllByText("Typical").length).toBeGreaterThan(0);
    expect(within(d).getByText(L.readings.velocity(36, "2.5", "3.1"))).toBeTruthy();
    expect(within(d).getByRole("img", { name: copy.stepAria(copy.names.velocity, "Typical", 3) })).toBeTruthy();
    expect(within(d).getByText(L.expectedTurn("Omnath", 4))).toBeTruthy();
    const [counted, notCounted] = groups();
    expect(counted.querySelector("h3")!.textContent).toBe(L.counted);
    expect(notCounted.querySelector("h3")!.textContent).toBe(L.readNotCounted);
    // Points descending, then mana value ascending, then name.
    expect(rowNames(counted)).toEqual(["Sol Ring", "Rampant Growth", "Cultivate"]);
    expect(within(counted).getByText(L.why.speedCost("artifact", 1))).toBeTruthy();
    expect(within(counted).getByText(L.why.landOut(3))).toBeTruthy();
    expect(within(notCounted).getByText(L.why.costReduction)).toBeTruthy();
  });

  it("draws a zero faint and a counted figure strong", () => {
    mount("velocity", { benchmarks: velocity });
    const [counted, notCounted] = groups();
    const zero = notCounted.querySelector("[data-points]")!;
    expect(zero.textContent).toBe("0");
    expect(zero.className).toContain("text-[color:var(--fg-faint)]");
    const half = Array.from(counted.querySelectorAll("[data-points]")).map((p) => p.textContent);
    expect(half).toEqual(["+1", "+1", "+0.5"]);
    expect(counted.querySelector("[data-points]")!.className).toContain("font-semibold");
  });

  it("orders interaction by weight, then mana value, and calls a counterspell a counterspell", () => {
    mount("interaction", {
      benchmarks: wire({
        interaction: {
          step: 2, answers: 3, weighted: 7, cheapInstant: 1, counterspells: 1,
          lines: [
            { card: wc("Beast Within", { manaValue: 3, typeLine: "Instant" }), weight: 2, kind: "removal", instantSpeed: true, cheap: false },
            { card: wc("Counterspell", { manaValue: 2, typeLine: "Instant" }), weight: 3, kind: "counterspell", instantSpeed: true, cheap: true },
            { card: wc("Blasphemous Act", { manaValue: 9, typeLine: "Sorcery" }), weight: 1, kind: "wipe", instantSpeed: false, cheap: false },
            { card: wc("Arcane Denial", { manaValue: 2, typeLine: "Instant" }), weight: 2, kind: "counterspell", instantSpeed: true, cheap: false },
          ],
        },
      }),
    });
    const [counted] = groups();
    expect(rowNames(counted)).toEqual(["Counterspell", "Arcane Denial", "Beast Within", "Blasphemous Act"]);
    expect(within(counted).getAllByText(L.why.counterspell(2), { selector: "[data-why]" })).toHaveLength(2);
    expect(within(counted).getByText(L.why.speedCost("instant", 3))).toBeTruthy();
    expect(within(counted).getByText(L.why.wipe("sorcery", 9))).toBeTruthy();
    expect(Array.from(counted.querySelectorAll("[data-points]")).map((p) => p.textContent)).toEqual(["+3", "+2", "+2", "+1"]);
  });

  it("closes, then switches to Deck stats at the card the ledger is built on", () => {
    const onStats = vi.fn();
    const onClose = vi.fn();
    mount("velocity", { onStats, onClose });
    fireEvent.click(within(dialog()).getByRole("button", { name: new RegExp(L.linkCurve) }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStats).toHaveBeenCalledWith("curve");
  });

  it("links flow and interaction to Jobs, and draws no link without a handler", () => {
    const onStats = vi.fn();
    const { unmount } = mount("flow", { onStats });
    fireEvent.click(within(dialog()).getByRole("button", { name: new RegExp(L.linkJobs) }));
    expect(onStats).toHaveBeenCalledWith("jobs");
    unmount();
    const second = mount("interaction", { onStats });
    fireEvent.click(within(dialog()).getByRole("button", { name: new RegExp(L.linkJobs) }));
    expect(onStats).toHaveBeenLastCalledWith("jobs");
    second.unmount();
    mount("interaction");
    expect(dialog().querySelector("[data-stats-link]")).toBeNull();
  });

  it("prefixes the commander's why", () => {
    mount("flow", { benchmarks: wire({ flow: { step: 3, points: 4, engines: 1, oneShots: 0, lines: [{ card: wc("Tymna", { commander: true }), points: 4, repeatable: true }] } }) });
    expect(within(dialog()).getByText(L.why.commanderPrefix + L.why.repeatable)).toBeTruthy();
  });
});

describe("BenchmarkLedger, win speed", () => {
  const line = (id: string, odds: number, pieces: string[], foundBy: string[]): WinLineWire => ({
    variantId: id, cards: pieces.map((p) => ({ oracleId: `id-${p}`, name: p })), produces: ["Infinite mana"],
    mana: { kind: "unknown" }, steps: [], prerequisites: null, odds, foundBy: foundBy.map((f) => wireFixtureCard(f)),
  });

  it("draws one section per line, best odds first, each with its odds and what finds it", () => {
    mount("win", {
      onStats: vi.fn(),
      benchmarks: wire({
        win: {
          step: 4, odds: 0.2, tutors: [],
          lines: [line("low", 0.04, ["Basalt Monolith", "Kinnan"], []), line("high", 0.14, ["Isochron", "Dramatic"], ["Fabricate", "Whir"])],
        },
      }),
    });
    const d = dialog();
    expect(within(d).getByText(L.readings.win("20%"))).toBeTruthy();
    expect(within(d).getByText(L.readings.winNote)).toBeTruthy();
    expect(d.querySelector("[data-stats-link]")).toBeNull();
    expect(groups()).toHaveLength(0);
    const sections = within(d).getAllByTestId("receipt-combo");
    expect(sections.map((s) => s.querySelector("[data-line-stats]")!.textContent)).toEqual([
      `${L.byT8}14%${L.foundBy}Fabricate · Whir`,
      `${L.byT8}4%`,
    ]);
    // Each piece's name opens its card, as the plates do (State Coverage, "Row press").
    const heading = within(sections[0]).getByRole("heading");
    expect(within(heading).getAllByRole("button").map((b) => b.textContent)).toEqual(["Isochron", "Dramatic"]);
  });
});

describe("BenchmarkLedger, dependencies", () => {
  const graveyard = {
    row: "graveyard", strength: "heavy", count: 3, commander: true,
    landsLeftOut: [wc("Cephalid Coliseum")],
    groups: [{
      group: "usesGraveyard",
      cards: [
        wc("Mulch", { uses: { fills: true, returns: false, grows: false, keywords: [] } } as Partial<WireCard>),
        wc("Eternal Witness", { uses: { fills: false, returns: true, grows: false, keywords: [] } } as Partial<WireCard>),
        wc("Teval", { commander: true, uses: { fills: true, returns: true, grows: false, keywords: ["Flashback"] } } as Partial<WireCard>),
      ],
    }],
  } as DependencyWire;

  it("draws the strength tag left of the title, no scale and no step word, then Broken by and the note", () => {
    mount("graveyard", { benchmarks: wire({ dependencies: [graveyard] }), onStats: vi.fn() });
    const d = dialog();
    const header = within(d).getByRole("heading", { level: 2 }).parentElement!;
    expect(within(d).getByRole("heading", { level: 2 }).textContent).toBe(L.ledgerTitle(copy.deps.rows.graveyard));
    expect(header.firstElementChild!.getAttribute("data-strength-tag")).toBe("heavy");
    expect(header.querySelector("[data-mini-meter]")).toBeNull();
    expect(within(d).queryByRole("img")).toBeNull();
    expect(d.querySelector("[data-broken-by]")!.textContent).toContain(copy.deps.hate.graveyard);
    expect(within(d).getByText(L.landsLeftOut("Cephalid Coliseum"))).toBeTruthy();
    expect(d.querySelector("[data-stats-link]")).toBeNull();
    expect(d.querySelector("[data-points]")).toBeNull();
  });

  it("lists the commander first, each row saying how it uses the graveyard", () => {
    mount("graveyard", { benchmarks: wire({ dependencies: [graveyard] }) });
    const [group] = groups();
    expect(group.querySelector("h3")!.textContent).toBe(L.groups.usesGraveyard);
    expect(rowNames(group)).toEqual(["Teval", "Eternal Witness", "Mulch"]);
    const whys = Array.from(group.querySelectorAll("[data-why]")).map((w) => w.textContent);
    const g = L.why.graveyard;
    expect(whys).toEqual([`${L.why.commanderPrefix}${g.fills}, ${g.returns}, flashback`, g.returns, g.fills]);
  });

  it("draws the artifact groups in order, each card once, with the once note and no why", () => {
    const artifacts = {
      row: "artifacts", strength: "light", count: 3, payoffs: 1, activated: 1,
      groups: [
        { group: "paysOffArtifacts", cards: [wc("Urza")] },
        { group: "artifactAbilities", cards: [wc("Mind Stone")] },
        { group: "otherArtifacts", cards: [wc("Sol Ring")] },
      ],
    } as DependencyWire;
    mount("artifacts", { benchmarks: wire({ dependencies: [artifacts] }) });
    expect(groups().map((g) => g.querySelector("h3")!.textContent)).toEqual([L.groups.paysOffArtifacts, L.groups.artifactAbilities, L.groups.otherArtifacts]);
    expect(dialog().querySelectorAll("[data-card-row]")).toHaveLength(3);
    expect(dialog().querySelector("[data-why]")).toBeNull();
    expect(within(dialog()).getByText(L.onceNote)).toBeTruthy();
  });

  it("marks a combat route that wins outright, and notes reach", () => {
    const combat = { row: "combat", strength: "light", routes: 1, groups: [{ group: "winsOutsideCombat", cards: [wc("Thassa's Oracle", { winsOutright: true } as Partial<WireCard>)] }] } as DependencyWire;
    mount("combat", { benchmarks: wire({ dependencies: [combat] }) });
    expect(within(dialog()).getByText(L.why.winsOutright, { selector: "[data-why]" })).toBeTruthy();
    expect(within(dialog()).getByText(L.reachNote)).toBeTruthy();
  });
});

describe("BenchmarkLedger, rows and focus", () => {
  it("draws the ownership dot only for a card the deck page knows", () => {
    const availability = new Map([["id-Rampant Growth", { owned: false, availability: null }]]);
    mount("velocity", { benchmarks: velocity, availability });
    const rows = Array.from(dialog().querySelectorAll("[data-card-row]"));
    const withDot = rows.filter((r) => r.querySelector("[aria-hidden].rounded-full, span[aria-hidden='true'][class*='rounded-full']"));
    expect(withDot.map((r) => r.querySelector("span.truncate")!.textContent)).toEqual(["Rampant Growth"]);
    // The trigger is named by the card, so the dot's state is said in its description.
    const button = withDot[0].querySelector("button")!;
    expect(document.getElementById(button.getAttribute("aria-describedby")!)!.textContent).toMatch(/^Not owned/);    // Every other row keeps the dot's slot, so names line up; and the row's padding sits inside the
    // trigger, whose inline `padding: 0` would otherwise beat it (the walk's two row defects).
    for (const r of rows) {
      expect(r.querySelector("[data-dot-slot]") !== null).toBe(!withDot.includes(r));
      expect(r.querySelector("button")!.className).not.toMatch(/\bpl-/);
      expect(r.querySelector("[data-row-shell]")!.className).toMatch(/\bpl-\[8px\]/);
    }
  });

  it("returns focus to the opener on close", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <CardDetailProvider fetchCard={async () => null}>
          <button type="button" onClick={() => setOpen(true)}>open ledger</button>
          {open ? <BenchmarkLedger benchmarks={wire()} which="flow" art={ART} onClose={() => setOpen(false)} /> : null}
        </CardDetailProvider>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "open ledger" });
    opener.focus();
    fireEvent.click(opener);
    expect(dialog()).toBeTruthy();
    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: L.closeAria(copy.names.flow) }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
