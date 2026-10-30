// Apply's confirmation with held additions (Small items 4, item 2, the Other-Decks board): each held card coming in
// carries Review changes' Pull, which STAGES the choice; a staged row reads `pulls from {deck}` with Undo; the foot line
// shows only while a held card is coming in. Nothing reaches the server from here.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { Availability, DeckClaim } from "../../lib/decks/availability";
import type { LineItem } from "../../lib/tuning/state";
import { v2Line } from "../../lib/tuning/v2/results-fixture";
import { heldInOtherDecks } from "../../lib/tuning/limits";
import { addMarkOf } from "./suggestion-line";
import { SuggestedChangesConfirm } from "./suggested-changes-confirm";

vi.mock("../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));
vi.mock("../cards/card-detail-provider", async (importActual) => ({
  ...(await importActual<typeof import("../cards/card-detail-provider")>()),
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false }),
  useCardIntent: () => ({}),
  // The source picker's phone sheet names its card with this trigger, which reads the provider itself: a plain button
  // with the shipped name stands in, as no provider is mounted here.
  CardDetailTrigger: ({ name, ariaLabel, children }: { name: string; ariaLabel?: string; children?: React.ReactNode }) => (
    <button type="button" aria-label={ariaLabel ?? `View details for ${name}`}>{children ?? name}</button>
  ),
}));
import { pullCardFromDeck } from "../../app/decks/actions";

const sc = suggestedChangesV2Copy;
const review = deckVersioningCopy.review;

const holder = (id: string, name: string, extra: Partial<DeckClaim> = {}): DeckClaim => ({
  id, name, quantity: 1, mature: true, pending: false, commander: false, senior: true, since: 1, ...extra,
});
const GISHATH = holder("d-gishath", "HD - Gishath");
const KRATOS = holder("d-kratos", "HD - Kratos", { since: 2 });
const THORIN = holder("d-thorin", "HD - Thorin", { since: 3 });
/** Owned, every copy sleeved senior elsewhere: none free from this deck's vantage. */
const heldBy = (...claims: DeckClaim[]): Availability =>
  ({ owned: claims.length, hard: claims.length, soft: 0, free: -1, claims }) as unknown as Availability;

const path = v2Line("a0", "add", { cardName: "Path to Exile", availability: heldBy(GISHATH) });
const atreus = v2Line("a1", "add", { cardName: "Atreus, Impulsive Son", availability: heldBy(KRATOS, THORIN) });
const spare = v2Line("a2", "add", { cardName: "Spare Card", availability: null });
const cut = v2Line("c0", "cut");

type Over = { adds?: LineItem[]; otherDecks?: boolean; staged?: Map<string, DeckClaim>; onStage?: () => void; busy?: boolean };
function draw(over: Over = {}) {
  const onStage = vi.fn(over.onStage);
  const ui = (o: Over) => (
    <SuggestedChangesConfirm
      adds={o.adds ?? [path, atreus, spare]}
      cuts={[cut, cut, cut].map((c, i) => ({ ...c, id: `c${i}` }))}
      bracket=""
      busy={o.busy ?? false}
      onApply={vi.fn()}
      onClose={vi.fn()}
      deckId="d-half-shell"
      ownedFromOtherDecks={o.otherDecks ?? true}
      staged={o.staged ?? new Map()}
      onStage={onStage}
    />
  );
  const view = render(ui(over));
  return { onStage, view, rerender: (o: Over) => view.rerender(ui({ ...over, ...o })) };
}
const row = (id: string) => document.querySelector(`[data-sc-held="${id}"]`) as HTMLElement | null;
const sub = (id: string) => row(id)?.querySelector("[data-sc-held-sub]") as HTMLElement | null;
const foot = () => document.querySelector("[data-sc-held-foot]");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Portalled out of the panel that opens it: drawn in place, a transformed ancestor (the Tuning hub's tool panel) placed its
// fixed frame, the Pull's popover and the source sheet against that panel rather than the window.
describe("the confirmation's frame", () => {
  it("renders outside the tree that mounts it, under document.body", () => {
    const { view } = draw();
    const dialog = screen.getByRole("dialog");
    expect(document.body.contains(dialog)).toBe(true);
    expect(view.container.contains(dialog)).toBe(false);
  });
});

describe("heldInOtherDecks", () => {
  it("is an owned addition with no copy free, and only on a run that offered copies from other decks", () => {
    expect(heldInOtherDecks(path, true)).toBe(true);
    expect(heldInOtherDecks(path, false)).toBe(false);
    expect(heldInOtherDecks(spare, true)).toBe(false);
    expect(heldInOtherDecks({ ...path, availability: { ...path.availability!, free: 1 } }, true)).toBe(false);
    expect(heldInOtherDecks({ ...cut, availability: path.availability }, true)).toBe(false);
  });

  // A brew asks for a copy while a spare still sits in the box: "soft", not held. A pull would take nothing the deck
  // needs, and Apply would skip it as covered, so no Pull is offered and no foot line drawn.
  it("is not a soft claim with a spare copy free", () => {
    const soft = { owned: 2, hard: 0, soft: 1, free: 1, claims: [holder("d-brew", "HD - Brew", { mature: false, senior: false })] } as unknown as Availability;
    const line = v2Line("a5", "add", { cardName: "Soft Card", availability: soft });
    expect(heldInOtherDecks(line, true)).toBe(false);
    draw({ adds: [line] });
    expect(row("a5")).toBeNull();
    expect(foot()).toBeNull();
  });

  it("is a hard claim with none free, and an over-claimed card", () => {
    expect(heldInOtherDecks({ ...path, availability: { ...path.availability!, free: 0 } }, true)).toBe(true);
    expect(heldInOtherDecks(path, true)).toBe(true);
  });
});

describe("SuggestedChangesConfirm, held additions", () => {
  it("draws each held card's holder under its name with Pull it, and a spare card as it was", () => {
    draw();
    expect(sub("a0")!.textContent).toBe(review.heldBy(GISHATH.name));
    expect(sub("a0")!.getAttribute("data-sc-held-sub")).toBe("held");
    expect(screen.getByRole("button", { name: review.pullA11y(path.cardName, GISHATH.name) })).toBeTruthy();
    // Two decks that can give it up: the count, and the picker's trigger.
    expect(sub("a1")!.textContent).toBe(review.heldByMany(2));
    expect(screen.getByRole("button", { name: review.pullManyA11y(atreus.cardName, 2) })).toBeTruthy();
    expect(row("a2")).toBeNull();
  });

  it("says an unpulled card stays in its deck, only while a held card is coming in", () => {
    draw();
    expect(foot()!.textContent).toBe(sc.confirm.heldFoot);
    cleanup();
    draw({ adds: [spare] });
    expect(foot()).toBeNull();
    cleanup();
    // The same lines on a run that did not offer cards from other decks: no Pull, no foot line.
    draw({ otherDecks: false });
    expect(foot()).toBeNull();
    expect(row("a0")).toBeNull();
    expect(screen.queryByRole("button", { name: review.pullA11y(path.cardName, GISHATH.name) })).toBeNull();
  });

  it("stages the choice on Pull it, and never calls the server", async () => {
    const { onStage } = draw();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: review.pullA11y(path.cardName, GISHATH.name) }));
    });
    expect(onStage).toHaveBeenCalledWith("a0", GISHATH);
    expect(pullCardFromDeck).not.toHaveBeenCalled();
  });

  it("reads a staged row as pulls from {deck} in the accent, and Undo takes the choice back", async () => {
    const { onStage } = draw({ staged: new Map([["a0", GISHATH]]) });
    expect(sub("a0")!.textContent).toBe(sc.confirm.pullsFrom(GISHATH.name));
    expect(sub("a0")!.getAttribute("data-sc-held-sub")).toBe("staged");
    // The accent as text is --accent-text (the text inks sweep): the board's `.hs.go` accent, read as text.
    expect(sub("a0")!.style.color).toBe("var(--accent-text)");
    expect(screen.queryByRole("button", { name: review.pullA11y(path.cardName, GISHATH.name) })).toBeNull();
    const undo = screen.getByRole("button", { name: sc.confirm.unstageA11y(path.cardName, GISHATH.name) });
    expect(undo.textContent).toBe(sc.confirm.unstage);
    await act(async () => {
      fireEvent.click(undo);
    });
    expect(onStage).toHaveBeenCalledWith("a0", null);
    // The foot line stays while the held card is still coming in.
    expect(foot()).not.toBeNull();
  });
});

describe("SuggestedChangesConfirm, a holder whose draft already cuts the card", () => {
  const leaving = holder("d-leaving", "HD - Leaving", { draftCut: true });
  const line = v2Line("a8", "add", { cardName: "Leaving Card", availability: heldBy(leaving) });

  it("says the copy is leaving that deck, and still offers Pull it", () => {
    draw({ adds: [line] });
    expect(sub("a8")!.textContent).toBe(review.heldByLeaving(leaving.name));
    expect(screen.getByRole("button", { name: review.pullA11y(line.cardName, leaving.name) })).toBeTruthy();
  });

  it("counts the decks with 2+ sources, and reads pulls from {deck} once staged", () => {
    const many = v2Line("a7", "add", { cardName: "Many Card", availability: heldBy(leaving, KRATOS) });
    draw({ adds: [many] });
    expect(sub("a7")!.textContent).toBe(review.heldByMany(2));
    cleanup();
    draw({ adds: [line], staged: new Map([["a8", leaving]]) });
    expect(sub("a8")!.textContent).toBe(sc.confirm.pullsFrom(leaving.name));
  });
});

describe("SuggestedChangesConfirm, a guarded holder", () => {
  // The guard tag is aria-hidden; the row's name carries why no Pull is offered, as Review changes' row does.
  it.each([
    ["commander", { commander: true }, (deck: string, card: string) => review.commanderGuardA11y(deck, card)],
    ["locked", { locked: true }, (deck: string, card: string) => lockedCardsCopy.pull.a11y(deck, card)],
  ] as const)("describes a %s holder's row by its guard sentence, and offers no Pull", (_kind, extra, sentence) => {
    const guarded = holder("d-guard", "HD - Guard", { ...extra, senior: true });
    const line = v2Line("a9", "add", { cardName: "Guarded Card", availability: heldBy(guarded) });
    draw({ adds: [line] });
    const name = within(row("a9")!).getByRole("button", { name: /Guarded Card/, description: sentence(guarded.name, line.cardName) });
    expect(name.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.queryByRole("button", { name: review.pullA11y(line.cardName, guarded.name) })).toBeNull();
  });

  it("describes nothing on a holder that can give the copy up", () => {
    draw({ adds: [path] });
    expect(row("a0")!.querySelector("[aria-describedby]")).toBeNull();
  });
});

describe("SuggestedChangesConfirm while Apply is in flight", () => {
  it("holds Pull it, Pull it ▾ and Undo until Apply settles", async () => {
    const { onStage } = draw({ busy: true, staged: new Map([["a1", KRATOS]]) });
    const pullIt = screen.getByRole("button", { name: review.pullA11y(path.cardName, GISHATH.name) }) as HTMLButtonElement;
    const undo = screen.getByRole("button", { name: sc.confirm.unstageA11y(atreus.cardName, KRATOS.name) }) as HTMLButtonElement;
    expect(pullIt.disabled).toBe(true);
    expect(undo.disabled).toBe(true);
    await act(async () => {
      fireEvent.click(pullIt);
      fireEvent.click(undo);
    });
    expect(onStage).not.toHaveBeenCalled();
  });

  it("closes a picker left open when Apply starts, and holds its trigger", async () => {
    const { rerender } = draw();
    const trigger = () => screen.getByRole("button", { name: review.pullManyA11y(atreus.cardName, 2) }) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(trigger());
    });
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    await act(async () => {
      rerender({ busy: true });
    });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(trigger().disabled).toBe(true);
  });
});

// The orchestrator's ruling (#2425): the results list's held mark and Apply's confirmation decide by ONE predicate, so a
// card is held on both sides or on neither.
describe("the results mark and the confirmation agree on a held card", () => {
  const soft = holder("d-brew", "HD - Brew", { mature: false, senior: false });
  const cases = [
    ["a soft claim with a spare copy", { owned: 2, hard: 0, soft: 1, free: 1, claims: [soft] }, false],
    ["a hard claim with none free", { owned: 1, hard: 1, soft: 0, free: 0, claims: [GISHATH] }, true],
    ["an over-claimed card", { owned: 1, hard: 2, soft: 0, free: -1, claims: [GISHATH, KRATOS] }, true],
  ] as const;
  it.each(cases)("%s: marked and held alike", (_label, availability, held) => {
    const line = v2Line("a7", "add", { cardName: "Shared Card", availability: availability as unknown as Availability });
    expect(heldInOtherDecks(line, true)).toBe(held);
    const mark = render(<>{addMarkOf(line, null, { ownedFromOtherDecks: true })}</>);
    expect(mark.container.querySelector("[data-availability]") !== null).toBe(held);
    // Never a buy tag on an owned card of such a run, held or free.
    expect(mark.container.textContent).not.toMatch(/buy/);
    mark.unmount();
    draw({ adds: [line] });
    expect(row("a7") !== null).toBe(held);
    expect(foot() !== null).toBe(held);
  });

  it("leaves an Any card run's marker as it was: a soft claim with a spare is still marked there", () => {
    const line = v2Line("a8", "add", {
      cardName: "Any Card", availability: { owned: 2, hard: 0, soft: 1, free: 1, claims: [soft] } as unknown as Availability,
    });
    const mark = render(<>{addMarkOf(line, null)}</>);
    expect(mark.container.querySelector("[data-availability]")?.getAttribute("data-availability")).toBe("soft");
  });
});
