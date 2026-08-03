// The reducer's duplicate-oracleId branch, which the builder-level test cannot
// reach: a suggestion row flips to "✓ In deck" after its first add, so the only
// way to add the same card twice before revalidation is from a second surface
// (search). The prediction has to match the server, which increments quantity
// for basics and no-ops for everything else.
import { act, render, screen } from "@testing-library/react";
import { startTransition } from "react";
import { describe, expect, it } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { useOptimisticDeckCards } from "./optimistic-deck";

const solRing: DeckDetailCard = {
  oracleId: "sol-ring", name: "Sol Ring", typeLine: "Artifact",
  cardTypeGroup: "Artifacts", role: "ramp", owned: false, quantity: 1,
};
const forest: DeckDetailCard = {
  oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest",
  cardTypeGroup: "Lands", role: "land", owned: true, quantity: 1,
};

function Harness({ server, add }: { server: DeckDetailCard[]; add: DeckDetailCard[] }) {
  const { cards, addOptimisticCard } = useOptimisticDeckCards(server);
  return (
    <button
      onClick={() => {
        // Dispatched inside a transition and never resolved, so the overrides
        // stay applied for the assertion.
        startTransition(async () => {
          for (const c of add) addOptimisticCard(c);
          await new Promise(() => {});
        });
      }}
    >
      {cards.map((c) => `${c.name}:${c.quantity}`).join("|") || "empty"}
    </button>
  );
}

async function apply(server: DeckDetailCard[], add: DeckDetailCard[]) {
  render(<Harness server={server} add={add} />);
  const button = screen.getByRole("button");
  await act(async () => { button.click(); });
  return button.textContent;
}

describe("useOptimisticDeckCards", () => {
  it("appends a card the deck does not hold", async () => {
    expect(await apply([], [solRing])).toBe("Sol Ring:1");
  });

  it("leaves a non-basic alone when it is already in the deck", async () => {
    expect(await apply([solRing], [solRing])).toBe("Sol Ring:1");
  });

  it("increments a basic land, which may run copies", async () => {
    expect(await apply([forest], [forest])).toBe("Forest:2");
  });
});
