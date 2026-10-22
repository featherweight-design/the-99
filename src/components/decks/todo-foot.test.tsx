import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { proxyCopy } from "../../lib/copy/proxies";
import { topOffCopy } from "../../lib/copy/top-off";
import { deckTodo, type TodoFacts } from "../../lib/decks/todo";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH } from "./draft-announcer";
import type { TodoFootFacts } from "./todo-foot";

vi.mock("../../app/decks/actions", () => ({ fillDeck: vi.fn() }));
const { TodoCard, UnresolvedRow } = await import("./todo-card");

const copy = deckVersioningCopy.todoCard;
const VERSION = deckVersioningCopy.pending.versionLine(2, "1 Sep 2026");
const QUIET: TodoFacts = { firstRun: false, filled: true, cards: 60, unresolved: 0 };
const FULL: TodoFootFacts = {
  version: { number: 2, committedAt: new Date("2026-09-01T00:00:00Z") },
  proxies: 1,
  provenance: { count: 31, panel: <p>the ledger lines</p> },
  otherDrafts: { count: 4 },
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

  it("leaves an absent segment out with no stray separator, and plain facts are not presses", () => {
    draw({ ...NONE, proxies: 2, otherDrafts: { count: 1 } }, { ...QUIET, unresolved: 2 });
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

  it("opens one disclosure at a time, inside the card under the line", () => {
    draw(FULL, { ...QUIET, unresolved: 2 });
    expect(screen.queryByText("the ledger lines")).toBeNull();
    fireEvent.click(provenance());
    expect(provenance()).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByText("the ledger lines").parentElement!;
    expect(panel.id).toBe(provenance().getAttribute("aria-controls"));
    expect(screen.getByRole("region", { name: copy.head("Big Stompy", "complete") })).toContainElement(panel);
    expect(provenance()).toHaveTextContent(copy.disclosureOpen);

    fireEvent.click(drafts());
    expect(provenance()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("the ledger lines")).toBeNull();
    expect(screen.getByText(availabilityCopy.deckRollup.softBody)).toBeInTheDocument();
    // `.sldp`: the count leads in bold, before the shipped sentence.
    expect(screen.getByText(availabilityCopy.deckRollup.softLead(4)).tagName).toBe("B");

    fireEvent.click(drafts());
    expect(screen.queryByText(availabilityCopy.deckRollup.softBody)).toBeNull();
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
    expect(screen.getByText("the ledger lines")).toBeInTheDocument();
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
