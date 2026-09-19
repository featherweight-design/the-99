import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickAddBar } from "../decks/quick-add-bar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * The `add-cards` figure mounts a debounced search, and `useCardSearch` lists
 * `colorIdentity` in its effect dependencies and compares it by identity. A
 * figure passing a fresh array literal would restart that debounce every time
 * the resolver settled — one search every 150ms for as long as the page is
 * open — and nothing else in this suite could see it: every other assertion
 * reads what the panel DREW, and a looping panel draws the right rows.
 *
 * Round 3 of #735 reported it as a live hang. It was not: a prop is rebuilt
 * only when its PARENT renders, and nothing re-renders this figure. The count
 * below is the measurement that settled it, and pinning it is what keeps the
 * hoisted constants from being quietly inlined again.
 */
describe("the add-cards figure's search", () => {
  it("runs once, not on a loop", async () => {
    let calls = 0;
    const search = async () => {
      calls += 1;
      return [];
    };
    // Deliberately the SHAPE THAT WOULD LOOP — a fresh array literal in the
    // parent's render — so this measures the hook's behaviour rather than the
    // figure's hoisting. If `useCardSearch` ever starts re-running on prop
    // identity alone, this fails here rather than in a browser.
    render(
      <QuickAddBar
        deckId="about-figure"
        commanderIdentity={["W", "U"]}
        deckOracleIds={[]}
        commanderShortName="Brago"
        commanderOracleId="about-brago"
        initialQuery="so"
        search={search}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    // One debounce, one request. Two would mean the effect re-fired; a dozen
    // means the loop is real.
    expect(calls).toBe(1);
  });
});
