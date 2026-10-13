import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { stubViewport } from "../../test-utils/stub-viewport";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";

/** What the row accepts: the deck-scoped candidate, both deck-scoped fields required. */
type RowCandidate = TopOffCandidateWithFacts;
import { TopOffList } from "./top-off-list";

vi.mock("../../app/decks/actions", () => ({
  commitTopOff: vi.fn(),
  chooseBulkFill: vi.fn(),
  bulkFillOptions: vi.fn().mockResolvedValue({
    ok: true,
    collection: { oracleIds: [], shortfalls: [], measuredTypes: true },
    best: { oracleIds: [], shortfalls: [], measuredTypes: true },
  }),
}));

const PARTNER = { oracleId: "p-1", name: "Isochron Scepter" };

const candidate = (over: Partial<RowCandidate> = {}) =>
  ({
    oracleId: "c-1", name: "Dramatic Reversal", typeLine: "Instant", facet: "spell",
    inclusionPct: 40, synergyPts: 20, imageUri: null, owned: true, committedTo: null,
    manaCost: "{1}{U}", price: null, availability: null,
    // Both deck-scoped fields, stated. This file is about `comboPartner`, and `facts` is
    // null so the note draws nothing beside the clause it is measuring.
    facts: null, comboPartner: null,
    ...over,
  }) as RowCandidate;

function list(over: Partial<RowCandidate> = {}) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <TopOffList
        deckId="d-1"
        listId="l-1"
        openSlots={3}
        bodySize={99}
        candidates={[candidate(over)]}
        deckOracleIds={new Set()}
        ticked={new Set()}
        declined={new Set()}
        onTickedChange={() => {}}
        onDeclinedChange={() => {}}
        onAnnounce={() => {}}
        onInflight={() => {}}
        onCommitted={() => {}}
        onClose={() => {}}
        onBarHeight={() => {}}
        newestAsOf={null}
        declaredBracket={null}
        noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
      />
    </CardDetailProvider>,
  );
}

describe("combo awareness states 2 and 3 on the Last 31", () => {
  // THE CLAUSE IS THE SAME SENTENCE IN BOTH STATES. What differs is the row's shipped
  // ownership dot and its shipped BuyTag, neither of which this feature touches.
  it("draws the same sentence whether the card is owned or bought", () => {
    for (const owned of [true, false]) {
      const { container, unmount } = list({ owned, comboPartner: PARTNER });
      expect(
        container.querySelector('[data-testid="combo-clause"]')?.textContent,
      ).toContain("Isochron Scepter");
      unmount();
    }
  });

  // THE PIP TRACK YIELDS ONLY ON A ROW THAT CARRIES A CLAUSE — about 4 of 38 — and the
  // others keep their pips. Phone only: on desktop the cost is one of four fixed columns
  // and the clause sits in the name cell instead.
  it("suppresses the phone pip track on a clause row and nowhere else", () => {
    stubViewport(390);
    // THROUGH THE COST TRACK'S OWN HOOK, never by pip shape. The row's `OwnershipDot` is
    // also a `rounded-full` span, so a shape-based count is satisfied by the dot alone — and
    // a build suppressing the pips at BOTH widths passed this case until it was named.
    const pips = (c: HTMLElement) =>
      c.querySelector("[data-top-off-cost]")?.querySelectorAll("span.rounded-full").length ?? 0;

    const withClause = list({ comboPartner: PARTNER });
    expect(pips(withClause.container), "the clause row kept its pips").toBe(0);
    withClause.unmount();

    const without = list({});
    expect(pips(without.container), "a row with no clause lost its pips").toBeGreaterThan(0);
  });

  // DESKTOP KEEPS ITS PIPS. The clause takes the name cell's tail there, and the four fixed
  // columns after it do not move — so a build that suppressed the cost at both widths would
  // pull every heading off the data it names.
  it("keeps the desktop cost column on a clause row", () => {
    stubViewport(1300);
    const { container } = list({ comboPartner: PARTNER });
    expect(
      container.querySelector("[data-top-off-cost]")?.querySelectorAll("span.rounded-full")
        .length ?? 0,
      "the desktop cost column was suppressed too",
    ).toBeGreaterThan(0);
    expect(
      container.querySelector('[data-testid="combo-clause"]')?.textContent,
    ).toContain("Isochron Scepter");
  });

  // SPOKEN ONCE, and only from the row's own label: the drawn clause is aria-hidden because
  // it stands in for the pip track on one width and sits mid-row on the other, neither of
  // which a reader hears in a useful order.
  it("speaks the combo from the row's accessible name, not from the drawn clause", () => {
    const { container } = list({ comboPartner: PARTNER });
    const box = screen.getAllByRole("checkbox")[0];
    expect(box.getAttribute("aria-label") ?? "").toContain(
      comboAwarenessCopy.a11y.completes("Isochron Scepter"),
    );
    // ASSERTED, not optional-chained. `drawn?.closest(...)` on an absent clause yields
    // `undefined`, which is not null — so the check passed on a build that drew no clause at
    // all and could only ever fail for a missing `aria-hidden`.
    const drawn = container.querySelector('[data-testid="combo-clause"]');
    expect(drawn, "no clause was drawn, so nothing was hidden").not.toBeNull();
    expect(drawn!.closest("[aria-hidden]")).not.toBeNull();
  });

  it("says nothing at all for a candidate with no combo", () => {
    const { container } = list({});
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    const box = screen.getAllByRole("checkbox")[0];
    expect(box.getAttribute("aria-label") ?? "").not.toContain("two-card combo");
  });
});
