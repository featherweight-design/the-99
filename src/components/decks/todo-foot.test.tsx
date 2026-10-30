import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { proxyCopy } from "../../lib/copy/proxies";
import { topOffCopy } from "../../lib/copy/top-off";
import { deckTodo, type TodoFacts } from "../../lib/decks/todo";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH } from "./draft-announcer";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { TodoFootFacts } from "./todo-foot";
import { TOUCH_HIT } from "../ui/touch-hit";

vi.mock("../../app/decks/actions", () => ({ fillDeck: vi.fn(), undoFillPass: vi.fn() }));
const { TodoCard, UnresolvedRow } = await import("./todo-card");
const { ProvenanceLedger } = await import("./provenance-line");
const { undoFillPass } = await import("../../app/decks/actions");

const copy = deckVersioningCopy.todoCard;
const VERSION = deckVersioningCopy.pending.versionLine(2, "Sep 1, 2026");
const QUIET: TodoFacts = { firstRun: false, filled: true, cards: 60, unresolved: 0 };
const FULL: TodoFootFacts = {
  version: { number: 2, committedAt: new Date("2026-09-01T00:00:00Z") },
  proxies: 1,
  provenance: { count: 31, panel: <p>the ledger lines</p> },
  otherDrafts: { count: 4, onOpen: vi.fn() },
};
const NONE: TodoFootFacts = { version: null, proxies: 0, provenance: null, otherDrafts: null };

function draw(foot: TodoFootFacts, facts: TodoFacts = QUIET) {
  return render(
    <TodoCard
      todo={deckTodo(facts)}
      deckName="Big Stompy"
      foot={foot}
      renderRow={(row) => (row.kind === "unresolved" ? <UnresolvedRow count={facts.unresolved} next={row.next} onLook={vi.fn()} /> : null)}
    />,
  );
}

const foot = () => document.querySelector("[data-todo-foot]") as HTMLElement;
const provenance = () => screen.getByRole("button", { name: topOffCopy.ledger.header("31") });
const drafts = () => screen.getByRole("button", { name: availabilityCopy.deckRollup.softFoot(4) });

describe("the to-do card's foot", () => {
  it("states version · proxies · provenance · other drafts, in that order, one separator between each", () => {
    draw(FULL, { ...QUIET, unresolved: 2 });
    expect(foot().textContent).toBe(
      [VERSION, proxyCopy.deckHeader.line(1), `${topOffCopy.ledger.header("31")}${copy.disclosureClosed}`, `${availabilityCopy.deckRollup.softFoot(4)}${copy.disclosureClosed}`].join(copy.footSeparator),
    );
  });

  // A brew has no version to state (deck messages, A9 and A17: the board's foot reads `No version yet`).
  it("says No version yet on a brew's card, in the version's place, and a committed version wins", () => {
    draw({ ...NONE, noVersion: true }, { ...QUIET, unresolved: 2 });
    expect(foot().textContent).toBe(copy.noVersion);
  });

  it("leaves the quiet strip of a brew silent, as shipped", () => {
    draw({ ...NONE, noVersion: true });
    expect(foot()).toBeNull();
  });

  it("states the version rather than No version yet when both are given", () => {
    draw({ ...FULL, noVersion: true }, { ...QUIET, unresolved: 2 });
    expect(foot().textContent).toContain(VERSION);
    expect(foot().textContent).not.toContain(copy.noVersion);
  });

  it("leaves an absent segment out with no stray separator, and plain facts are not presses", () => {
    draw({ ...NONE, proxies: 2, otherDrafts: { count: 1, onOpen: vi.fn() } }, { ...QUIET, unresolved: 2 });
    expect(foot().textContent).toBe(`${proxyCopy.deckHeader.line(2)}${copy.footSeparator}${availabilityCopy.deckRollup.softFoot(1)}${copy.disclosureClosed}`);
    expect(screen.queryByRole("button", { name: proxyCopy.deckHeader.line(2) })).toBeNull();
  });

  // jsdom has no layout, so the structure is what is asserted: the line is a wrapping flex row whose
  // items (segments and separators alike) are its direct children, each carrying the row's vertical
  // padding itself, and nothing takes a negative margin. That is what keeps two presses' hit areas
  // from overlapping when provenance and other drafts land on separate rows.
  it.each([false, true])("lays the line out as padded items with no negative margins (quiet %s)", (quiet) => {
    draw(FULL, quiet ? QUIET : { ...QUIET, unresolved: 2 });
    const line = foot();
    expect(line.className).toContain("flex-wrap");
    expect(line.className).not.toMatch(/(^|\s)(md:)?py-/);
    const pad = quiet ? "py-[10px]" : "py-[9px]";
    const items = [...line.children] as HTMLElement[];
    // version, proxies, provenance, other drafts, and a separator between each.
    expect(items).toHaveLength(7);
    for (const item of items) expect(item.className.split(/\s+/)).toContain(pad);
    for (const el of [line, ...line.querySelectorAll("*")]) expect(el.className.toString()).not.toMatch(/(^|\s)(md:)?-m[ty]?-/);
    expect(provenance().parentElement).toBe(line);
    expect(drafts().parentElement).toBe(line);
  });

  it("opens the provenance disclosure inside the card under the line", () => {
    draw(FULL, { ...QUIET, unresolved: 2 });
    // Closed panels are mounted and hidden, and `aria-controls` names them all the while.
    const panel = screen.getByText("the ledger lines").parentElement!;
    expect(panel.id).toBe(provenance().getAttribute("aria-controls"));
    expect(screen.getByText("the ledger lines")).not.toBeVisible();
    fireEvent.click(provenance());
    expect(provenance()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("the ledger lines")).toBeVisible();
    expect(screen.getByRole("region", { name: copy.head("Big Stompy", "complete") })).toContainElement(panel);
    expect(provenance()).toHaveTextContent(copy.disclosureOpen);

    fireEvent.click(provenance());
    expect(provenance()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("the ledger lines")).not.toBeVisible();
  });

  it("opens the pass sheet from other drafts rather than a panel inside the card (PR 3)", () => {
    const onOpen = vi.fn();
    draw({ ...FULL, otherDrafts: { count: 4, onOpen } }, { ...QUIET, unresolved: 2 });
    expect(drafts()).not.toHaveAttribute("aria-expanded");
    expect(drafts()).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(drafts());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(availabilityCopy.deckRollup.softBody)).toBeNull();
  });

  // A toggle must not tear the ledger down: its lines hold the undo in flight and the refusal.
  it("keeps an undo in flight, and its refusal, across closing and reopening the ledger", async () => {
    let reject!: (e: Error) => void;
    vi.mocked(undoFillPass).mockImplementation(() => new Promise((_, r) => { reject = r; }));
    const cards = [{ oracleId: "a", name: "Card a", typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp", owned: true, quantity: 1, auto: true, availability: null } as DeckDetailCard];
    const pass = { id: "p1", kind: "top_off" as const, ordinal: 1, createdAt: new Date("2026-01-01"), live: 1, kept: 0, removed: 0, openSlots: 5, liveCards: [{ oracleId: "a", quantity: 1 }] };
    const ledgerPanel = <ProvenanceLedger deckId="d" bodySize={99} cards={cards} total={1} passes={[pass]} onShow={vi.fn()} onAnnounce={vi.fn()} />;
    draw({ ...NONE, provenance: { count: 1, panel: ledgerPanel } }, { ...QUIET, unresolved: 2 });
    const toggle = () => screen.getByRole("button", { name: topOffCopy.ledger.header("1") });
    const undo = () => screen.getByRole("button", { name: topOffCopy.ledger.undoAria("1", topOffCopy.ledger.passLabel("1")) });

    fireEvent.click(toggle());
    fireEvent.click(undo());
    expect(undo()).toBeDisabled();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(undo()).toBeDisabled();

    await act(async () => reject(new Error("network")));
    expect(screen.getByText(topOffCopy.ledger.undoFailed)).toBeVisible();
    expect(undo()).not.toBeDisabled();
  });

  it("closes a disclosure whose segment left, so it does not come back open", () => {
    const view = draw(FULL, { ...QUIET, unresolved: 2 });
    fireEvent.click(provenance());
    view.rerender(<TodoCard todo={deckTodo({ ...QUIET, unresolved: 2 })} deckName="Big Stompy" foot={{ ...FULL, provenance: null }} renderRow={() => null} />);
    view.rerender(<TodoCard todo={deckTodo({ ...QUIET, unresolved: 2 })} deckName="Big Stompy" foot={FULL} renderRow={() => null} />);
    expect(provenance()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("the quiet strip", () => {
  it("is the foot alone with nothing to do: no head, no count, no card", () => {
    draw({ ...NONE, version: FULL.version });
    expect(screen.getByText(VERSION)).toBeInTheDocument();
    expect(screen.queryByText(/^Before /)).toBeNull();
    expect(screen.queryByText(copy.count(0))).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    // Not the card: no card shell, the strip's full-bleed ground instead.
    expect(document.querySelector("[data-todo-card]")).toBeNull();
    const strip = foot().parentElement!;
    expect(strip.className).not.toContain("rounded-[12px]");
    expect(strip.className).toContain("[border-bottom:1px_solid_var(--border)]");
  });

  it("is the card, shell and all, once there is a row", () => {
    draw({ ...NONE, version: FULL.version }, { ...QUIET, unresolved: 2 });
    expect(document.querySelector("[data-todo-card]")).toContainElement(foot());
    expect(foot().parentElement!.className).toContain("rounded-[12px]");
  });

  it("keeps an open disclosure when the last row leaves", () => {
    const view = draw(FULL, { ...QUIET, unresolved: 2 });
    fireEvent.click(provenance());
    view.rerender(<TodoCard todo={deckTodo(QUIET)} deckName="Big Stompy" foot={FULL} renderRow={() => null} />);
    expect(screen.getByText("the ledger lines")).toBeVisible();
  });

  it("is absent when there is nothing to do and nothing to state", () => {
    const { container } = draw(NONE);
    expect(container).toBeEmptyDOMElement();
  });
});

// Moved from PendingBanner: a commit or a discard navigates here, which leaves focus on the body.
// The version line is the answer the reader came back for, so it takes focus off the hash.
describe("the version segment", () => {
  it.each([COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH])("takes focus when %s lands it here, and drops the hash", (hash) => {
    history.replaceState(null, "", `/decks/d${hash}`);
    draw({ ...NONE, version: FULL.version });
    expect(document.activeElement).toBe(screen.getByText(VERSION));
    expect(window.location.hash).toBe("");
  });

  it("leaves focus alone on a version nobody just committed", () => {
    history.replaceState(null, "", "/decks/d");
    draw({ ...NONE, version: FULL.version });
    expect(document.activeElement).toBe(document.body);
  });
});

// Combos one piece away (combos close, call 1; `Deck-Page.dc.html`): the segment after the version.
describe("the combos-one-piece-away segment", () => {
  const segment = () => document.querySelector("[data-combos-close]") as HTMLElement | null;

  it("draws nothing at zero or with no read", () => {
    const zero = draw({ ...FULL, nearCombos: { count: 0, onOpen: vi.fn() } }, { ...QUIET, unresolved: 2 });
    expect(segment()).toBeNull();
    zero.unmount();
    draw({ ...FULL, nearCombos: null }, { ...QUIET, unresolved: 2 });
    expect(segment()).toBeNull();
  });

  it("says 1 combo or N combos, after the version and before proxies", () => {
    const one = draw({ ...FULL, nearCombos: { count: 1, onOpen: vi.fn() } }, { ...QUIET, unresolved: 2 });
    expect(segment()).toHaveTextContent(`${combosCloseCopy.segment(1)}${combosCloseCopy.caret}`);
    expect(combosCloseCopy.segment(1)).toBe("1 combo one piece away");
    expect(foot().textContent!.startsWith([VERSION, `${combosCloseCopy.segment(1)}${combosCloseCopy.caret}`, proxyCopy.deckHeader.line(1)].join(copy.footSeparator))).toBe(true);
    one.unmount();
    draw({ ...FULL, nearCombos: { count: 5, onOpen: vi.fn() } }, { ...QUIET, unresolved: 2 });
    expect(screen.getByRole("button", { name: "5 combos one piece away" })).toBe(segment());
  });

  it("counts toward the quiet strip: a brew with nothing to do but combos still draws it", () => {
    draw({ ...NONE, noVersion: true, nearCombos: { count: 3, onOpen: vi.fn() } });
    expect(foot()).not.toBeNull();
    expect(foot().textContent).toBe(`${combosCloseCopy.segment(3)}${combosCloseCopy.caret}`);
  });

  // The card clips its children (`overflow-hidden`), so a hit reaching past the foot would be cut:
  // in the card the button is itself 44 tall on touch; in the quiet strip `TOUCH_HIT` reaches past.
  it("keeps a whole 44px touch target in the to-do card's foot as well as in the strip", () => {
    const card = draw({ ...FULL, nearCombos: { count: 2, onOpen: vi.fn() } }, { ...QUIET, unresolved: 2 });
    expect(segment()!.className).toContain("[@media(pointer:coarse)]:py-[13px]");
    expect(segment()!.className).not.toContain(TOUCH_HIT);
    card.unmount();
    draw({ ...NONE, nearCombos: { count: 2, onOpen: vi.fn() } });
    expect(segment()!.className).toContain(TOUCH_HIT);
  });

  it("opens the list as a dialog on a press", () => {
    const onOpen = vi.fn();
    draw({ ...NONE, nearCombos: { count: 2, onOpen } });
    expect(segment()!.tagName).toBe("BUTTON");
    expect(segment()).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(segment()!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
