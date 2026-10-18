import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickAddBar } from "../decks/quick-add-bar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * The `add-cards` figure mounts a debounced search. What this pins is narrow,
 * and the narrowness is the point: **the effect behind it does not re-fire on
 * its own output.** One mount, one request. Nothing else in the suite can see
 * that, because every other assertion reads what the panel DREW and a looping
 * panel draws the right rows.
 *
 * It does NOT pin the hazard round 3 of #735 reported — a caller passing a
 * fresh `colorIdentity` array from a component that re-renders, restarting the
 * debounce each time. Two rounds were spent finding that out:
 *
 * - Round 3 called it a live hang. It is not. A prop is rebuilt only when its
 *   PARENT renders, and nothing re-renders that figure: measured at one
 *   resolver call in 1.2s.
 * - Round 4 then caught this test claiming to guard it anyway. The first
 *   version rendered `QuickAddBar` with an inline array and called that "the
 *   shape that would loop" — it is not, since the literal is evaluated once in
 *   the test's own render.
 * - The obvious repair, a parent that re-renders itself a few times, measures
 *   nothing either: the debounce COALESCES those renders into one request, so
 *   a churning caller and a stable one both read 1.
 *
 * Identity churn is therefore invisible to any count-based check short of a
 * parent that re-renders in response to each settle. The defence was the two
 * module constants in the old About page's figure module (retired in discovery
 * R2·7), not this file. Left as a guard against the one class it does catch,
 * and honest about the rest.
 */
describe("the add-cards figure's search", () => {
  it("runs once, and does not re-fire on its own result", async () => {
    let calls = 0;
    const search = async () => {
      calls += 1;
      return [];
    };
    render(
      <QuickAddBar
        deckId="about-figure"
        commanderIdentity={["W", "U"]}
        deckOracleIds={[]}
        commanderShortName="Brago"
        commanderOracleId="about-brago"
        initialQuery="so"
        initialOwnedOnly={false}
        search={search}
        declaredBracket={null}
        noteCounts={EMPTY_NOTE_COUNTS}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    // Adding `rows` to that effect's dependency list reads 5 here, which is
    // the failure path this was run against before being believed.
    expect(calls).toBe(1);
  });
});
