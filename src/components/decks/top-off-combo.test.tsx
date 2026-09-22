import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { stubViewport } from "../../test-utils/stub-viewport";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { TopOffCandidate } from "../../lib/decks/last-slots";

/** What the row accepts: a candidate plus the one deck-scoped field it may carry. */
type RowCandidate = TopOffCandidate & {
  comboPartner?: { oracleId: string; name: string } | null;
};
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
      expect(container.textContent).toContain(
        comboAwarenessCopy.clause.completes("Isochron Scepter"),
      );
      unmount();
    }
  });

  // THE PIP TRACK YIELDS ONLY ON A ROW THAT CARRIES A CLAUSE — about 4 of 38 — and the
  // others keep their pips. Phone only: on desktop the cost is one of four fixed columns
  // and the clause sits in the name cell instead.
  it("suppresses the phone pip track on a clause row and nowhere else", () => {
    stubViewport(390);
    // Located as `CostPips` draws them — round spans inside the run — because the component
    // carries no test id of its own and the row mounts the track twice, once per width.
    const pips = (c: HTMLElement) => c.querySelectorAll("span.rounded-full").length;

    const withClause = list({ comboPartner: PARTNER });
    const clauseRowPips = pips(withClause.container);
    withClause.unmount();

    const without = list({});
    expect(
      clauseRowPips,
      "the clause row kept as many pips as a row without one",
    ).toBeLessThan(pips(without.container));
  });

  // DESKTOP KEEPS ITS PIPS. The clause takes the name cell's tail there, and the four fixed
  // columns after it do not move — so a build that suppressed the cost at both widths would
  // pull every heading off the data it names.
  it("keeps the desktop cost column on a clause row", () => {
    stubViewport(1300);
    const { container } = list({ comboPartner: PARTNER });
    expect(
      container.querySelectorAll("span.rounded-full").length,
      "the desktop cost column was suppressed too",
    ).toBeGreaterThan(0);
    expect(container.textContent).toContain(
      comboAwarenessCopy.clause.completes("Isochron Scepter"),
    );
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
    const drawn = container.querySelector('[data-testid="combo-clause"]');
    expect(drawn?.closest("[aria-hidden]")).not.toBeNull();
  });

  it("says nothing at all for a candidate with no combo", () => {
    const { container } = list({});
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    const box = screen.getAllByRole("checkbox")[0];
    expect(box.getAttribute("aria-label") ?? "").not.toContain("two-card combo");
  });
});
